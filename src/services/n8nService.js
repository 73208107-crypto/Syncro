/**
 * SYNCRO — Servicio de Bot n8n (cliente de Webhook / Chat Trigger)
 * Envía mensajes a un workflow de n8n y normaliza la respuesta.
 * La URL se configura en /n8n-config.js (window.SYNCRO_N8N → CONFIG.n8n).
 *
 * Contrato de envío (POST, JSON) — compatible con Webhook y Chat Trigger:
 *   {
 *     action: 'sendMessage',
 *     sessionId: 'syncro_xxx',      // memoria de conversación en el nodo AI Agent
 *     chatInput: 'texto del usuario',
 *     message:   'texto del usuario', // alias
 *     source: 'app' | 'landing',
 *     user:    { id, name, plan },    // solo si SEND_CONTEXT
 *     context: { view, locale, page } // solo si SEND_CONTEXT
 *   }
 *
 * Respuestas aceptadas: { output | reply | text | message | response | answer }
 * como string, un arreglo de ellos, o texto plano.
 */

import { CONFIG } from '../config.js';
import { authService } from './authService.js';

const SESSION_KEY = 'syncro_n8n_session_v1';
const PLACEHOLDER_RE = /PEGA_AQUI|TU_ENLACE|^\s*$/i;

function newSessionId() {
  const rnd =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return `syncro_${rnd}`;
}

function extractReply(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data.trim();
  if (Array.isArray(data)) {
    return data.map(extractReply).filter(Boolean).join('\n\n');
  }
  if (typeof data === 'object') {
    for (const key of ['output', 'reply', 'text', 'message', 'response', 'answer']) {
      if (typeof data[key] === 'string' && data[key].trim()) return data[key].trim();
    }
    if (data.json) return extractReply(data.json);
    if (data.data) return extractReply(data.data);
  }
  return '';
}

export const n8nService = {
  /** ¿Hay un enlace real configurado? */
  isConfigured() {
    const url = CONFIG.n8n.webhookUrl;
    return Boolean(CONFIG.n8n.enabled && url && !PLACEHOLDER_RE.test(url) && /^https?:\/\//i.test(url));
  },

  getSessionId() {
    try {
      let id = localStorage.getItem(SESSION_KEY);
      if (!id) {
        id = newSessionId();
        localStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch {
      return (this._memSession ||= newSessionId());
    }
  },

  resetSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    this._memSession = null;
    return this.getSessionId();
  },

  /**
   * Envía un mensaje al bot. Devuelve { ok, reply, error }.
   * error ∈ 'not_configured' | 'timeout' | 'network' | 'http_<status>' | 'empty'
   */
  async sendMessage(text, { source = 'app', view = '' } = {}) {
    const clean = String(text || '').trim();
    if (!clean) return { ok: false, reply: '', error: 'empty' };
    if (!this.isConfigured()) return { ok: false, reply: '', error: 'not_configured' };

    const cfg = CONFIG.n8n;
    const sessionId = this.getSessionId();
    const payload = {
      action: 'sendMessage',
      sessionId,
      chatInput: clean,
      message: clean,
      source,
    };

    if (cfg.sendContext) {
      const ses = authService.getSession();
      payload.user = {
        id: ses?.id || null,
        name: ses?.name || 'Invitado',
        plan: ses?.plan || 'free',
        ...(cfg.sendEmail && ses?.email ? { email: ses.email } : {}),
      };
      payload.context = {
        view: view || null,
        locale: (typeof navigator !== 'undefined' && navigator.language) || 'es',
        page: typeof location !== 'undefined' ? location.pathname : '',
      };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (cfg.authHeaderName && cfg.authHeaderValue) headers[cfg.authHeaderName] = cfg.authHeaderValue;

    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), cfg.timeoutMs) : null;

    try {
      const res = await fetch(cfg.webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: ctrl?.signal,
      });
      if (!res.ok) return { ok: false, reply: '', error: `http_${res.status}` };

      const raw = await res.text();
      let data = raw;
      try {
        data = JSON.parse(raw);
      } catch {
        // texto plano
      }
      const reply = extractReply(data);
      return reply ? { ok: true, reply, error: null } : { ok: false, reply: '', error: 'empty' };
    } catch (err) {
      return { ok: false, reply: '', error: err?.name === 'AbortError' ? 'timeout' : 'network' };
    } finally {
      if (timer) clearTimeout(timer);
    }
  },
};
