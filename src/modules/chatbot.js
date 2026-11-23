/**
 * SYNCRO — Widget de Chat conectado a n8n
 * Crea su propio DOM (botón flotante + panel accesible), por lo que funciona
 * igual en index.html y app.html. Todo texto se inserta con textContent
 * (sin innerHTML) para evitar XSS con respuestas del bot.
 */

import { CONFIG } from '../config.js';
import { n8nService } from '../services/n8nService.js';

const HISTORY_KEY = 'syncro_n8n_history_v1';
const MAX_HISTORY = 40;

const ERROR_TEXT = {
  not_configured:
    'El asistente aún no está conectado. Falta pegar el enlace de n8n en n8n-config.js (WEBHOOK_URL).',
  timeout: 'El asistente tardó demasiado en responder. Intenta de nuevo en un momento.',
  network:
    'No pude comunicarme con el asistente. Revisa tu conexión (o que el CORS del webhook permita este dominio).',
  empty: 'El asistente respondió sin texto. Intenta reformular tu mensaje.',
  default: 'Algo salió mal al contactar al asistente. Intenta de nuevo.',
};

function loadHistory() {
  try {
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(arr) ? arr.filter((m) => m && typeof m.text === 'string').slice(-MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

function saveHistory(list) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-MAX_HISTORY)));
  } catch {
    // ignore
  }
}

function el(tag, attrs = {}, text = '') {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  if (text) node.textContent = text;
  return node;
}

/**
 * @param {{ surface?: 'app'|'landing', getView?: () => string }} opts
 */
export function initChatbot({ surface = 'app', getView = () => '' } = {}) {
  const cfg = CONFIG.n8n;
  if (!cfg.enabled) return;
  if (surface === 'landing' && !cfg.showOnLanding) return;
  if (surface === 'app' && !cfg.showOnApp) return;
  if (document.getElementById('sbotRoot')) return;

  let history = loadHistory();
  let busy = false;

  const root = el('div', { id: 'sbotRoot', class: `sbot sbot--${surface}` });

  const fab = el('button', {
    type: 'button',
    class: 'sbot-fab',
    'aria-label': `Abrir chat con ${cfg.botName}`,
    'aria-expanded': 'false',
    'aria-controls': 'sbotPanel',
  });
  fab.append(el('span', { class: 'sbot-fab-ico', 'aria-hidden': 'true' }, cfg.botAvatar));

  const panel = el('section', {
    id: 'sbotPanel',
    class: 'sbot-panel',
    role: 'dialog',
    'aria-label': `Chat con ${cfg.botName}`,
    hidden: '',
  });

  const head = el('header', { class: 'sbot-head' });
  head.append(el('span', { class: 'sbot-avatar', 'aria-hidden': 'true' }, cfg.botAvatar));
  const title = el('div', { class: 'sbot-title' });
  title.append(el('strong', {}, cfg.botName), el('small', {}, 'Asistente en línea'));
  head.append(title);
  const resetBtn = el('button', { type: 'button', class: 'sbot-icon-btn', 'aria-label': 'Nueva conversación', title: 'Nueva conversación' }, '↺');
  const closeBtn = el('button', { type: 'button', class: 'sbot-icon-btn', 'aria-label': 'Cerrar chat', title: 'Cerrar' }, '✕');
  head.append(resetBtn, closeBtn);

  const log = el('div', { class: 'sbot-log', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
  const chips = el('div', { class: 'sbot-chips' });

  const form = el('form', { class: 'sbot-form', autocomplete: 'off' });
  const input = el('textarea', {
    class: 'sbot-input',
    rows: '1',
    maxlength: '1000',
    placeholder: cfg.placeholder,
    'aria-label': 'Mensaje para el asistente',
  });
  const sendBtn = el('button', { type: 'submit', class: 'sbot-send', 'aria-label': 'Enviar mensaje' }, '➤');
  form.append(input, sendBtn);

  panel.append(head, log, chips, form);
  root.append(fab, panel);
  document.body.appendChild(root);

  // ---------- render ----------
  function addBubble(role, text, { persist = true } = {}) {
    const row = el('div', { class: `sbot-msg sbot-msg--${role}` });
    row.append(el('div', { class: 'sbot-bubble' }, text));
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    if (persist && role !== 'error') {
      history.push({ role, text });
      saveHistory(history);
    }
    return row;
  }

  function renderInitial() {
    log.textContent = '';
    addBubble('bot', cfg.welcome, { persist: false });
    history.forEach((m) => addBubble(m.role === 'user' ? 'user' : 'bot', m.text, { persist: false }));
    renderChips();
  }

  function renderChips() {
    chips.textContent = '';
    if (history.length || !cfg.quickReplies.length) return;
    cfg.quickReplies.forEach((q) => {
      const b = el('button', { type: 'button', class: 'sbot-chip' }, q);
      b.addEventListener('click', () => send(q));
      chips.appendChild(b);
    });
  }

  function setBusy(on) {
    busy = on;
    sendBtn.disabled = on;
    input.disabled = on;
    root.classList.toggle('is-busy', on);
  }

  function showTyping() {
    const row = el('div', { class: 'sbot-msg sbot-msg--bot sbot-typing', 'aria-label': 'El asistente está escribiendo' });
    const b = el('div', { class: 'sbot-bubble' });
    for (let i = 0; i < 3; i++) b.appendChild(el('i'));
    row.appendChild(b);
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
    return row;
  }

  // ---------- acciones ----------
  async function send(text) {
    const clean = String(text || '').trim();
    if (!clean || busy) return;
    chips.textContent = '';
    addBubble('user', clean);
    input.value = '';
    autoGrow();
    setBusy(true);
    const typing = showTyping();
    const res = await n8nService.sendMessage(clean, { source: surface, view: getView() });
    typing.remove();
    setBusy(false);
    if (res.ok) addBubble('bot', res.reply);
    else addBubble('error', ERROR_TEXT[res.error] || ERROR_TEXT.default);
    input.focus();
  }

  function autoGrow() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 110) + 'px';
  }

  function open() {
    panel.hidden = false;
    root.classList.add('is-open');
    fab.setAttribute('aria-expanded', 'true');
    input.focus();
    log.scrollTop = log.scrollHeight;
  }

  function close() {
    panel.hidden = true;
    root.classList.remove('is-open');
    fab.setAttribute('aria-expanded', 'false');
    fab.focus();
  }

  fab.addEventListener('click', () => (panel.hidden ? open() : close()));
  closeBtn.addEventListener('click', close);
  resetBtn.addEventListener('click', () => {
    history = [];
    saveHistory(history);
    n8nService.resetSession();
    renderInitial();
    input.focus();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    send(input.value);
  });
  input.addEventListener('input', autoGrow);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input.value);
    }
  });
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });

  renderInitial();
}
