// ===================================================
// SYNCRO · MVP · app.js (v3)
// Estado en localStorage + SPA + Pomodoro + sonido + escudo
// ===================================================
'use strict';

const KEY = 'syncro_state_v3';
const BASE_TITLE = document.title;
const SEEDS = {
  cantuta: { name: 'flor de cantuta', stages: ['🌱', '🌿', '🌷', '🌺'] },
  queñual: { name: 'queñual', stages: ['🌱', '🌿', '🌳', '🌲'] },
  chachacoma: { name: 'chachacoma', stages: ['🌱', '🌿', '🌾', '🌼'] },
};
const GUARDIANS = { alpaca: '🦙', oso: '🐻', condor: '🦅' };
const GUARDIAN_NAMES = { alpaca: 'Alpaca Andina', oso: 'Oso de Anteojos', condor: 'Cóndor' };
const LOW_MOODS = ['ansioso', 'agobiado', 'cansado'];
const TRIGGER_TIPS = {
  redes: 'activa el Escudo antes de empezar cada bloque.',
  perfeccionismo: 'prueba el modo "Avance sin perfección".',
  desorganizacion: 'usa SincroPlan para desglosar tu tarea.',
  cansancio: 'haz el check-in: ajustamos los bloques a tu energía.',
};
const SCHEDULES = { manana: 'la mañana', tarde: 'la tarde', noche: 'la noche' };
const TUTORS = [['Ana', 'Cálculo II'], ['Luis', 'Programación'], ['Rosa', 'Estadística'], ['Diego', 'Física I']];
const FICHAS = {
  flora: ['Zona botánica andina', [
    ['🌺', 'Cantuta (Cantua buxifolia)', 'Flor nacional del Perú, asociada a la cultura inca.'],
    ['🌲', 'Queñual (Polylepis)', 'Bosques de altura que ayudan a retener agua en las cuencas.'],
    ['🌿', 'Chachacoma (Senecio nutans)', 'Planta andina usada en infusiones contra el mal de altura.']]],
  fauna: ['Refugio de fauna local', [
    ['🦙', 'Alpaca', 'Camélido andino criado por su fibra suave.'],
    ['🦅', 'Cóndor andino', 'Una de las aves voladoras más grandes del mundo.'],
    ['🐻', 'Oso de anteojos', 'El único oso de Sudamérica; vive en bosques andinos.']]],
  infra: ['Infraestructura sostenible', [
    ['🌳', 'Parques y arborización', 'Jornadas con especies nativas junto a la Municipalidad.'],
    ['🚲', 'Ciclovías', 'Movilidad sin emisiones para la ciudad.'],
    ['💧', 'Captación de agua', 'Sistemas que aprovechan la lluvia para riego.']]],
};
const NOPERF_REPLIES = [
  [/perfec|salir bien|fall|mal\b|error|no me va/i, 'Eso suena a miedo a no hacerlo bien. Es muy común y no dice nada sobre tu capacidad.'],
  [/cansad|sueñ|agotad|energ/i, 'Estás cansado y eso es válido. Un bloque corto cuenta igual que uno largo.'],
  [/celular|redes|tiktok|insta|whats|notific/i, 'Las distracciones aparecen cuando la tarea incomoda. Deja el celular lejos solo 5 minutos.'],
  [/no sé|empez|dónde|donde|abrum/i, 'Cuando todo se ve enorme, empezar duele. Solo necesitas el primer paso, no todo el camino.'],
];

const defaultState = {
  user: { name: '', level: 12, xp: 850, xpMax: 1000, streak: 12, shields: 2, drops: 1240, earthPoints: 320 },
  profile: { trigger: null, schedule: null, seed: 'cantuta', guardian: 'alpaca' },
  checkIn: { energy: 5, mood: null, saved: false, lowEnergy: false },
  missions: [
    { id: 'm1', base: true, title: 'Completar 2 sesiones Pomodoro de Estructura de Datos', xp: 50, drops: 15, target: 2, progress: 0, done: false },
    { id: 'm2', base: true, title: 'Redactar primer borrador del informe de Liderazgo', xp: 40, drops: 10, target: 1, progress: 0, done: false },
    { id: 'm3', base: true, title: 'Leer 10 páginas de bibliografía', xp: 30, drops: 5, target: 1, progress: 0, done: false },
  ],
  focus: { mode: 'classic', sound: 'rain', soundOn: false, shield: true, activeMission: null, alarmMuted: false, autoFullscreen: true },
  weekly: [3, 4.5, 2, 5, 3.5, 1, 0.5],
  weekKey: null,
  daily: { date: null, blocks: 0, minutes: 0, distractions: 0, counted: false, checkInXp: false },
  stats: { blocks: 0, noPerf: 0 },
  plan: { est: 9, real: 6 },
  squads: [{ name: 'Código Andino', n: 4, active: true }, { name: 'Los Incas', n: 3 }],
  insight: null,
  lastActive: null,
  onboarded: false,
};

// ============ HELPERS ============
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayIdx = () => (new Date().getDay() + 6) % 7; // Lun = 0
const clone = (o) => JSON.parse(JSON.stringify(o));
const formatTime = (sec) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
const levelTitle = (l) => l >= 20 ? 'Guardián Legendario' : l >= 10 ? 'Guardián Enfocado' : l >= 5 ? 'Brote Constante' : 'Semilla Curiosa';
const seed = () => SEEDS[state.profile.seed] || SEEDS.cantuta;
const guardian = () => GUARDIANS[state.profile.guardian] || '🦙';

// ============ PERSISTENCIA ============
function loadState() {
  const s = clone(defaultState);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      Object.assign(s, p);
      for (const k of ['user', 'profile', 'checkIn', 'focus', 'daily', 'stats', 'plan'])
        s[k] = { ...defaultState[k], ...(p[k] || {}) };
    }
  } catch (e) { console.warn('Estado corrupto, reiniciando.'); }
  return s;
}
let state = loadState();
function saveState() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* modo privado */ }
}

// Cambio de día: reinicia misiones y check-in; protege racha con escudos
function rollover() {
  const t = keyOf(new Date());
  let msg = null;
  const monday = new Date(); monday.setDate(monday.getDate() - dayIdx());
  const wk = keyOf(monday);
  if (state.weekKey && state.weekKey !== wk) state.weekly = [0, 0, 0, 0, 0, 0, 0];
  state.weekKey = wk;
  if (state.daily.date === t) return null;
  if (state.lastActive) {
    const gap = Math.round((new Date(t) - new Date(state.lastActive)) / 864e5);
    if (gap > 1) {
      const missed = gap - 1;
      if (state.user.shields >= missed) {
        state.user.shields -= missed;
        msg = `Tu escudo protegió tu racha 🛡 (${missed} día${missed > 1 ? 's' : ''}).`;
      } else {
        state.user.streak = 0;
        msg = 'Nueva racha, sin culpa. Hoy empezamos de nuevo 🌱';
      }
    }
  }
  state.missions = state.missions.filter(m => m.base || !m.done).map(m => ({ ...m, done: false, progress: 0 }));
  state.checkIn = { ...defaultState.checkIn };
  state.daily = { ...defaultState.daily, date: t };
  state.lastActive = t;
  saveState();
  return msg;
}
function markActive() {
  if (!state.daily.counted) { state.daily.counted = true; state.user.streak += 1; }
}

// ============ UI BÁSICA ============
let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3400);
}
let lastFocus = null;
function openOverlay(el) {
  lastFocus = document.activeElement;
  el.classList.remove('hidden');
  (el.querySelector('input:not([type=radio]),button') || el).focus?.();
}
function closeOverlay(el) {
  el.classList.add('hidden');
  lastFocus?.focus?.();
}
let infoAction = null;
function openInfo(title, html, ok = 'Entendido', onOk = null) {
  $('#infoTitle').textContent = title;
  $('#infoBody').innerHTML = html;
  $('#closeInfo').textContent = ok;
  infoAction = onOk;
  openOverlay($('#infoModal'));
}
$('#closeInfo').addEventListener('click', () => {
  if (infoAction && infoAction() === false) return;
  closeOverlay($('#infoModal'));
});
$$('.overlay').forEach(o => o.addEventListener('mousedown', e => {
  if (e.target === o && o.id !== 'onboarding') closeOverlay(o);
}));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const o = $$('.overlay:not(.hidden)').pop();
  if (o && o.id !== 'onboarding') closeOverlay(o);
});
function celebrate(title, text, emoji = '🎉') {
  $('#missionModalTitle').textContent = title;
  $('#missionModalText').textContent = text;
  $('#celebEmoji').textContent = emoji;
  openOverlay($('#missionModal'));
}
$('#closeMissionModal').addEventListener('click', () => closeOverlay($('#missionModal')));

// ============ NAVEGACIÓN ============
function switchView(view, force = false) {
  if (T.running && state.focus.shield && view !== 'focus' && !force) {
    pendingView = view;
    triggerExitAlert(`Intento de ir a "${view.toUpperCase()}" durante el enfoque`);
    return;
  }
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#view-' + view)?.classList.add('active');
  $$('.nav-item, .bn-item').forEach(n => {
    const on = n.dataset.view === view;
    n.classList.toggle('active', on);
    on ? n.setAttribute('aria-current', 'page') : n.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
$$('[data-view]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
$$('[data-goto]').forEach(b => b.addEventListener('click', () => switchView(b.dataset.goto)));

// ============ XP / DROPS ============
function addXP(n) {
  let ups = 0;
  state.user.xp += n;
  while (state.user.xp >= state.user.xpMax) { state.user.xp -= state.user.xpMax; state.user.level++; ups++; }
  return ups;
}
function addDrops(n) {
  state.user.drops += n;
  state.user.earthPoints += Math.round(n / 4);
}
const levelMsg = (ups) => ups ? ` · ¡Subiste al nivel ${state.user.level}!` : '';

// ============ RENDER: DASHBOARD ============
function renderDashboard() {
  const u = state.user, p = state.profile;
  const name = u.name || 'estudiante';
  $('#greeting').textContent = `¡Hola, ${name}!`;
  $('#streakDays').textContent = u.streak;
  $('#shieldsCount').textContent = u.shields;
  $('#sidebarName').textContent = u.name || 'Estudiante';
  $('#sidebarLevel').textContent = `Nivel ${u.level}`;
  $('#sidebarAvatar').textContent = (u.name || '🌱').charAt(0).toUpperCase();
  $('#levelTag').textContent = `Nivel ${u.level} · ${levelTitle(u.level)}`;
  $('#xpText').textContent = `${u.xp} / ${u.xpMax} XP`;
  $('#xpFill').style.width = `${(u.xp / u.xpMax) * 100}%`;
  $('#dropsCount').textContent = u.drops.toLocaleString('es-PE');
  $('#earthCount').textContent = u.earthPoints;
  $('#biomeDrops').textContent = u.drops.toLocaleString('es-PE');
  $('#biomeEarth').textContent = u.earthPoints;

  const done = state.missions.filter(m => m.done).length;
  $('#biomeFill').style.width = `${Math.max(15, (done / Math.max(1, state.missions.length)) * 100)}%`;
  $('#previewFlower').textContent = seed().stages[3];
  $('#previewGuardian').textContent = guardian();
  $('#sidebarGuardianMini').textContent = guardian();
  $('#ribbonGuardian').textContent = `${guardian()} Tu ${GUARDIAN_NAMES[p.guardian] || 'guardián'} protege tu ${seed().name}`;
  $('#achSeedName').textContent = `Guardián de ${p.seed === 'cantuta' ? 'la Cantuta' : 'tu ' + seed().name}`;

  const tips = [];
  if (SCHEDULES[p.schedule]) tips.push(`Tus tareas difíciles rinden más en ${SCHEDULES[p.schedule]}.`);
  if (TRIGGER_TIPS[p.trigger]) tips.push(`Tip: ${TRIGGER_TIPS[p.trigger]}`);
  $('#scheduleTip').textContent = tips.join(' ');

  const c = state.checkIn;
  $('#energyValue').textContent = c.energy;
  $('#energyRange').value = c.energy;
  $$('#moodChips .chip').forEach(ch => ch.classList.toggle('active', ch.dataset.mood === c.mood));
  const b = $('#checkInBanner');
  b.classList.toggle('hidden', !c.saved);
  b.innerHTML = c.lowEnergy
    ? '<strong>Modo ligero activado.</strong> Ajustamos tus bloques a 15 min y priorizamos pausas y respiración.'
    : '<strong>¡Check-in guardado!</strong> Tienes energía para bloques de 25 min.';
}

// ============ MISIONES ============
function renderMissions() {
  const dur = state.checkIn.lowEnergy ? '15 min (adaptado)' : '25 min';
  $('#missionsList').innerHTML = state.missions.map(m => `
    <div class="mission ${m.done ? 'done' : ''}" data-id="${m.id}">
      <button class="mission-check" aria-label="Completar: ${esc(m.title)}" aria-pressed="${m.done}">✓</button>
      <div class="mission-info">
        <div class="mission-title">${esc(m.title)}</div>
        <div class="mission-meta">
          <span class="pill violet">+${m.xp} XP</span>
          <span class="pill emerald">+${m.drops} Gotas</span>
          <span class="pill">${m.target > 1 ? `${m.progress}/${m.target} bloques` : dur}</span>
        </div>
      </div>
      <button class="btn ghost sm" data-start="${m.id}" ${m.done ? 'disabled' : ''}>${state.focus.activeMission === m.id ? 'Activa' : 'Iniciar'}</button>
    </div>`).join('');
  $('#missionsCount').textContent = `${state.missions.filter(m => m.done).length} / ${state.missions.length}`;
  renderActiveMission();
}
$('#missionsList').addEventListener('click', e => {
  const row = e.target.closest('.mission');
  if (!row) return;
  const id = row.dataset.id;
  if (e.target.closest('.mission-check')) return completeMission(id);
  if (e.target.closest('[data-start]')) {
    state.focus.activeMission = id; saveState();
    renderMissions(); switchView('focus');
    toast('Misión vinculada al temporizador 🎯');
  }
});
function renderActiveMission() {
  const m = state.missions.find(x => x.id === state.focus.activeMission && !x.done);
  $('#activeMissionLabel').textContent = m ? `🎯 Misión activa: ${m.title}` : 'Sin misión vinculada: el bloque suma XP igual.';
}
function completeMission(id) {
  const m = state.missions.find(x => x.id === id);
  if (!m || m.done) return;
  m.done = true; m.progress = m.target;
  if (state.focus.activeMission === id) state.focus.activeMission = null;
  markActive();
  const ups = addXP(m.xp); addDrops(m.drops);
  saveState(); renderDashboard(); renderMissions(); renderProgress();
  celebrate('¡Misión completada!', `+${m.xp} XP · +${m.drops} Gotas de riego${levelMsg(ups)}`);
}

// ============ CHECK-IN ============
$('#energyRange').addEventListener('input', e => {
  state.checkIn.energy = Number(e.target.value);
  $('#energyValue').textContent = state.checkIn.energy;
});
$$('#moodChips .chip').forEach(chip => chip.addEventListener('click', () => {
  const was = chip.classList.contains('active');
  state.checkIn.mood = was ? null : chip.dataset.mood;
  $$('#moodChips .chip').forEach(c => c.classList.toggle('active', c === chip && !was));
}));
$('#saveCheckIn').addEventListener('click', () => {
  const c = state.checkIn;
  c.saved = true;
  c.lowEnergy = c.energy <= 3 || LOW_MOODS.includes(c.mood);
  if (!state.daily.checkInXp) { state.daily.checkInXp = true; addXP(5); toast('Check-in guardado · +5 XP'); }
  saveState(); renderDashboard(); renderMissions(); updateTimerDuration();
});

// ============ SONIDO (WebAudio, sin archivos) ============
const Sound = {
  ctx: null, master: null, srcs: [],
  buf(type) {
    const n = this.ctx.sampleRate * 2, b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w * 0.5;
    }
    return b;
  },
  play(kind) {
    this.stop();
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = this.ctx || new AC();
    ctx.resume();
    const m = this.master = ctx.createGain();
    m.gain.value = 0; m.connect(ctx.destination);
    m.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.5);
    const add = (n) => (this.srcs.push(n), n);
    const noise = (t) => { const s = add(ctx.createBufferSource()); s.buffer = this.buf(t); s.loop = true; s.start(); return s; };
    const filt = (type, f, q = 1) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; return x; };
    const gain = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const chain = (...n) => n.reduce((a, b) => (a.connect(b), b));
    if (kind === 'rain') chain(noise('white'), filt('highpass', 900), filt('lowpass', 7000), gain(0.18), m);
    else if (kind === 'wind') {
      const g = gain(0.35); chain(noise('brown'), filt('bandpass', 500, 0.6), g, m);
      const lfo = add(ctx.createOscillator()); lfo.frequency.value = 0.12;
      const d = gain(0.15); lfo.connect(d); d.connect(g.gain); lfo.start();
    } else if (kind === 'river') {
      chain(noise('brown'), filt('lowpass', 1000), gain(0.5), m);
      chain(noise('white'), filt('bandpass', 2800, 0.8), gain(0.04), m);
    } else if (kind === 'lofi') {
      [220, 261.63, 329.63, 392].forEach(f => {
        const o = add(ctx.createOscillator()); o.type = 'triangle'; o.frequency.value = f;
        chain(o, filt('lowpass', 900), gain(0.05), m); o.start();
      });
    } else if (kind === 'binaural') {
      [[-1, 200], [1, 210]].forEach(([p, f]) => {
        const o = add(ctx.createOscillator()); o.frequency.value = f;
        const pan = ctx.createStereoPanner(); pan.pan.value = p;
        chain(o, gain(0.08), pan, m); o.start();
      });
    }
  },
  stop() {
    if (!this.master) return;
    const m = this.master, s = this.srcs;
    m.gain.cancelScheduledValues(0); m.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    setTimeout(() => { s.forEach(n => { try { n.stop(); } catch (e) { } }); m.disconnect(); }, 600);
    this.master = null; this.srcs = [];
  },
  alarm() {
    if (state.focus.alarmMuted) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = this.ctx = this.ctx || new AC(); ctx.resume();
      [580, 440, 680, 520].forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.11;
        o.type = 'sawtooth'; o.frequency.value = f;
        g.gain.setValueAtTime(0.001, t);
        g.gain.exponentialRampToValueAtTime(0.14, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.22);
      });
    } catch (e) { /* audio bloqueado */ }
  },
  chime() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = this.ctx || new AC(); ctx.resume();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.18;
      o.frequency.value = f; g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.15, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.85);
    });
  },
};
function syncSound() {
  state.focus.soundOn && T.running ? Sound.play(state.focus.sound) : Sound.stop();
  const b = $('#soundToggle');
  b.textContent = state.focus.soundOn ? '🔊 Sonido activado' : '🔇 Sonido apagado';
  b.setAttribute('aria-pressed', state.focus.soundOn);
}
$('#soundToggle').addEventListener('click', () => {
  state.focus.soundOn = !state.focus.soundOn; saveState(); syncSound();
  if (state.focus.soundOn && !T.running) toast('El sonido empezará cuando inicies el temporizador.');
});
$$('.sound-item').forEach(btn => btn.addEventListener('click', () => {
  $$('.sound-item').forEach(b => b.classList.toggle('active', b === btn));
  state.focus.sound = btn.dataset.sound; saveState();
  if (T.running && state.focus.soundOn) syncSound();
}));

// ============ TIMER (basado en reloj, no se desfasa) ============
const T = { running: false, remaining: 1500, duration: 1500, endAt: 0, iv: null };
function getModeDuration(mode) {
  if (mode === 'deep') return 50 * 60;
  if (mode === 'noPerfection') return 5 * 60;
  return (state.checkIn.lowEnergy ? 15 : 25) * 60;
}
function modeLabel() {
  const m = state.focus.mode;
  if (m === 'deep') return 'Enfoque profundo · 50 / 10';
  if (m === 'noPerfection') return 'Avance sin perfección · 5 min (reloj oculto)';
  return state.checkIn.lowEnergy ? 'Enfoque ligero · 15 / 5' : 'Enfoque clásico · 25 / 5';
}
function updateTimerDuration() {
  if (T.running) return;
  T.duration = T.remaining = getModeDuration(state.focus.mode);
  renderTimer();
}
function renderTimer() {
  const hide = state.focus.mode === 'noPerfection' && T.running;
  const disp = $('#timerDisplay');
  disp.textContent = hide ? '···' : formatTime(T.remaining);
  disp.classList.toggle('running', T.running);
  $('#ribbonTimer').textContent = hide ? '•• : ••' : formatTime(T.remaining);
  $('#focusTopRibbon').classList.toggle('hidden', !T.running);
  document.body.classList.toggle('has-focus-ribbon', T.running);
  document.body.classList.toggle('focus-running', T.running);
  $('#timerCard').classList.toggle('active-session', T.running);
  $('#timerModeLabel').textContent = modeLabel();
  $('#startPauseBtn').textContent = T.running ? 'Pausar' : (T.remaining < T.duration ? 'Continuar' : 'Iniciar');
  $$('input[name="mode"]').forEach(r => r.disabled = T.running);
  const prog = Math.min(1, 1 - T.remaining / T.duration);
  $('#timerFill').style.width = `${prog * 100}%`;
  const st = seed().stages;
  $('#seedVisual').textContent = st[prog < 0.2 ? 0 : prog < 0.6 ? 1 : prog < 0.95 ? 2 : 3];
  if (!titleBlink) document.title = T.running && !hide ? `${formatTime(T.remaining)} · SYNCRO` : BASE_TITLE;
}
function tick() {
  T.remaining = Math.max(0, Math.round((T.endAt - Date.now()) / 1000));
  T.remaining <= 0 ? finishBlock() : renderTimer();
}
function startTimer() {
  if (T.running) return;
  closeBreak();
  if (state.focus.autoFullscreen) enterFullscreen();
  T.running = true; T.endAt = Date.now() + T.remaining * 1000;
  T.iv = setInterval(tick, 250);
  renderTimer(); syncSound();
}
function pauseTimer() {
  T.running = false; clearInterval(T.iv); T.iv = null;
  renderTimer(); syncSound();
}
function resetTimer() {
  if (T.running && state.focus.shield) return triggerExitAlert('Intento de reiniciar o cancelar el bloque');
  pauseTimer(); T.remaining = T.duration; renderTimer();
}

function finishBlock() {
  const mins = Math.round(T.duration / 60);
  pauseTimer();
  exitFullscreen();
  const xp = Math.max(10, mins), drops = Math.max(2, Math.round(mins / 5));
  state.daily.blocks++; state.daily.minutes += mins;
  state.stats.blocks++;
  if (state.focus.mode === 'noPerfection') state.stats.noPerf++;
  state.weekly[dayIdx()] = Math.round((state.weekly[dayIdx()] + mins / 60) * 100) / 100;
  markActive();
  let ups = addXP(xp); addDrops(drops);

  const m = state.missions.find(x => x.id === state.focus.activeMission && !x.done);
  let extra = '';
  if (m) {
    m.progress = Math.min(m.target, m.progress + 1);
    if (m.progress >= m.target) {
      m.done = true; state.focus.activeMission = null;
      ups += addXP(m.xp); addDrops(m.drops);
      extra = ` · Misión lista: +${m.xp} XP`;
    }
  }
  T.remaining = T.duration;
  saveState(); renderDashboard(); renderMissions(); renderProgress(); renderTimer();
  Sound.chime();
  celebrate('¡Bloque completado!', `+${xp} XP · +${drops} Gotas${extra}${levelMsg(ups)}`, '🌺');
  if (state.focus.mode !== 'noPerfection') openBreak();
}

$('#startPauseBtn').addEventListener('click', () => T.running ? pauseTimer() : startTimer());
$('#resetBtn').addEventListener('click', resetTimer);
$('#addFiveBtn').addEventListener('click', () => {
  T.duration += 300; T.remaining += 300;
  if (T.running) T.endAt += 300000;
  renderTimer();
});
$$('input[name="mode"]').forEach(r => r.addEventListener('change', e => {
  state.focus.mode = e.target.value; saveState(); updateTimerDuration();
}));
window.addEventListener('beforeunload', e => { if (T.running) { e.preventDefault(); e.returnValue = ''; } });

// ============ PANTALLA COMPLETA ============
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function enterFullscreen() {
  const el = document.documentElement;
  if (fsEl()) return;
  try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => { }); } catch (e) { }
}
function exitFullscreen() {
  if (!fsEl()) return;
  try { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => { }); } catch (e) { }
}
function updateFsBtn() {
  const b = $('#fsToggle'), on = !!fsEl();
  b.setAttribute('aria-pressed', on);
  b.textContent = on ? '⛶ Salir de pantalla completa' : '⛶ Pantalla completa';
}
$('#fsToggle').addEventListener('click', () => fsEl() ? exitFullscreen() : enterFullscreen());
$('#autoFs').addEventListener('change', e => { state.focus.autoFullscreen = e.target.checked; saveState(); });
function onFsChange() {
  updateFsBtn();
  // Salir de pantalla completa (Esc) en pleno bloque = intento de fuga
  if (!fsEl() && T.running && state.focus.shield && state.focus.autoFullscreen)
    triggerExitAlert('Saliste de la pantalla completa durante el enfoque');
}
document.addEventListener('fullscreenchange', onFsChange);
document.addEventListener('webkitfullscreenchange', onFsChange);

// ============ ESCUDO: ALERTA DE FUGA ============
let titleBlink = null, pendingView = null, lastExitAlert = 0;
function startTitleBlink() {
  stopTitleBlink();
  const sn = seed().name.toUpperCase();
  let on = false;
  titleBlink = setInterval(() => {
    document.title = on ? `🚨 ¡VUELVE A SYNCRO! TU ${sn} SE MARCHITA 🥀` : '🛡️ ¡Tu guardián te necesita! — SYNCRO';
    on = !on;
  }, 850);
}
function stopTitleBlink() {
  if (titleBlink) { clearInterval(titleBlink); titleBlink = null; }
  document.title = BASE_TITLE;
}
function renderShield() {
  const on = state.focus.shield;
  const s = $('#shieldStatus');
  s.textContent = on ? 'ACTIVO' : 'INACTIVO';
  s.classList.toggle('emerald', on);
  $('#toggleShield').textContent = on ? 'Desactivar escudo' : 'Activar escudo';
  $('#simulateDistraction').disabled = !on;
  $('#muteAlertSoundBtn').textContent = state.focus.alarmMuted ? '🔇 Alarma silenciada' : '🔊 Alarma activa';
}
function triggerExitAlert(reason = 'Intento de salir de la sesión') {
  if (!$('#blockModal').classList.contains('hidden')) return;
  lastExitAlert = Date.now();
  if (T.running) pauseTimer();   // el reloj espera mientras decides
  const u = state.user, mins = Math.round(T.duration / 60);
  $('#alertReasonBadge').textContent = reason.toUpperCase();
  $('#alertUserName').textContent = (u.name || 'estudiante').split(' ')[0];
  $('#alertSeedTitleInline').textContent = seed().name;
  $('#alertGuardianName').textContent = GUARDIAN_NAMES[state.profile.guardian] || 'Guardián';
  $('#alertGuardianEmoji').textContent = guardian();
  $('#alertHealthySeed').textContent = seed().stages[3];
  $('#blockMinutesLeft').textContent = formatTime(T.remaining);
  $('#alertReward').textContent = `+${Math.max(10, mins)} XP · +${Math.max(2, Math.round(mins / 5))} 💧`;
  $('#alertStreakRisk').textContent = `🔥 ${u.streak} días`;
  $('#stayFocused').textContent = `🛡️ ¡Volver al enfoque y salvar mi ${seed().name}!`;
  state.daily.distractions++; saveState();
  openOverlay($('#blockModal'));
  $('#stayFocused').focus();
  Sound.alarm();
  startTitleBlink();
}
$('#toggleShield').addEventListener('click', () => {
  state.focus.shield = !state.focus.shield; saveState(); renderShield();
});
$('#simulateDistraction').addEventListener('click', () => triggerExitAlert('Simulación de intento de abandonar'));
$('#ribbonTriggerAlertBtn').addEventListener('click', () => triggerExitAlert('Alerta activada desde la cinta de enfoque'));
$('#muteAlertSoundBtn').addEventListener('click', () => {
  state.focus.alarmMuted = !state.focus.alarmMuted; saveState(); renderShield();
});
// Sitios bloqueados: al tocarlos durante un bloque, el escudo interviene
function siteAlert(li) {
  if (!T.running || !state.focus.shield) return toast('Inicia un bloque con el escudo activo y lo verás en acción.');
  triggerExitAlert(`Intento de abrir ${li.dataset.site} (bloqueado)`);
}
$('#blockedSitesList').addEventListener('click', e => { const li = e.target.closest('li'); if (li) siteAlert(li); });
$('#blockedSitesList').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const li = e.target.closest('li'); if (li) { e.preventDefault(); siteAlert(li); }
});

$('#stayFocused').addEventListener('click', () => {
  closeOverlay($('#blockModal'));
  stopTitleBlink();
  pendingView = null;
  switchView('focus', true);
  startTimer();
  toast(`¡Gran decisión! Tu ${seed().name} sigue creciendo.`);
});
$('#leaveAnyway').addEventListener('click', () => {
  closeOverlay($('#blockModal'));
  stopTitleBlink();
  pauseTimer(); exitFullscreen();
  T.remaining = T.duration; renderTimer();
  if (pendingView) { const d = pendingView; pendingView = null; switchView(d, true); }
  toast('Sesión cancelada. Sin culpa: respira y vuelve cuando estés listo.');
});

// Detectores de intención de salida (solo con bloque en curso y escudo activo)
document.addEventListener('mouseleave', e => {
  if (!T.running || !state.focus.shield || fsEl()) return;
  if (e.clientY <= 12 && Date.now() - lastExitAlert > 4000) triggerExitAlert('Cursor saliendo hacia la barra del navegador');
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && T.running && state.focus.shield) triggerExitAlert('Cambio de pestaña o ventana durante el enfoque');
});

// ============ PAUSA GUIADA ============
const Brk = { iv: null, t0: 0, len: 300, kind: 'breath' };
const BREAK_TEXT = {
  twenty: 'Mira algo a unos 6 metros durante 20 segundos. Parpadea despacio.',
  stretch: 'Cuello de lado a lado · 5 círculos de hombros hacia atrás · abre y cierra las manos · estira los brazos arriba.',
};
function setBreakKind(k) {
  Brk.kind = k;
  $$('[data-break]').forEach(c => c.classList.toggle('active', c.dataset.break === k));
  $('#breathCircle').classList.toggle('off', k !== 'breath');
  if (k !== 'breath') $('#guidedText').textContent = BREAK_TEXT[k];
}
function openBreak() {
  Brk.len = state.focus.mode === 'deep' ? 600 : 300;
  Brk.t0 = Date.now();
  $('#guidedBreak').classList.remove('hidden');
  setBreakKind('breath');
  clearInterval(Brk.iv); Brk.iv = setInterval(breakTick, 250); breakTick();
}
function breakTick() {
  const el = (Date.now() - Brk.t0) / 1000, left = Math.max(0, Math.ceil(Brk.len - el));
  $('#breakClock').textContent = formatTime(left);
  if (Brk.kind === 'breath') {
    const ph = Math.floor(el / 4) % 4;
    $('#breathCircle').dataset.phase = ph;
    $('#guidedText').textContent = `${['Inhala', 'Sostén', 'Exhala', 'Espera'][ph]} · ${4 - Math.floor(el % 4)}`;
  }
  if (left <= 0) { closeBreak(); Sound.chime(); toast('Pausa terminada. ¿Listo para otro bloque?'); }
}
function closeBreak() {
  clearInterval(Brk.iv); Brk.iv = null;
  $('#guidedBreak').classList.add('hidden');
}
$$('[data-break]').forEach(c => c.addEventListener('click', () => setBreakKind(c.dataset.break)));
$('#endBreak').addEventListener('click', closeBreak);

// ============ ANTI-PARÁLISIS ============
function startAntiParalysis() {
  switchView('focus');
  if (T.running) return toast('Ya tienes un bloque en curso. ¡Sigue así!');
  state.focus.mode = 'noPerfection'; saveState();
  $$('input[name="mode"]').forEach(r => r.checked = r.value === 'noPerfection');
  updateTimerDuration(); startTimer();
}
$('#antiParalysisBtn').addEventListener('click', startAntiParalysis);

// ============ SINCROPLAN ============
$('#breakdownBtn').addEventListener('click', () => {
  const task = $('#taskInput').value.trim();
  if (!task) { toast('Escribe primero la tarea que quieres desglosar.'); return $('#taskInput').focus(); }
  const days = Math.max(1, Math.min(60, Number($('#dateInput').value) || 10));
  const steps = [
    'Definir alcance y objetivo', 'Reunir 3 fuentes o materiales clave',
    'Hacer un primer borrador feo (sin editar)', 'Desarrollar y mejorar lo esencial', 'Revisar, pulir y entregar',
  ];
  $('#subtasksList').innerHTML = steps.map((s, i) => `
    <div class="subtask" data-title="${esc(`${s} — ${task}`)}">
      <span><strong>${i + 1}.</strong> ${esc(s)}<small>Meta: día ${Math.max(1, Math.round(days * (i + 1) / steps.length))} de ${days}</small></span>
      <button class="btn ghost sm">Añadir a hoy</button>
    </div>`).join('');
});
$('#subtasksList').addEventListener('click', e => {
  const btn = e.target.closest('button'), row = e.target.closest('.subtask');
  if (!btn || btn.disabled) return;
  state.missions.push({ id: 'c' + Date.now(), title: row.dataset.title, xp: 20, drops: 5, target: 1, progress: 0, done: false });
  btn.textContent = 'Añadida ✓'; btn.disabled = true;
  saveState(); renderMissions(); renderDashboard();
  toast('Añadida a tus misiones de hoy.');
});

function renderIllusion() {
  const est = Number($('#estHours').value) || 0, real = Number($('#realHours').value) || 0;
  state.plan = { est, real }; saveState();
  const pct = est ? Math.min(100, Math.round(real / est * 100)) : 0;
  const lost = est ? 1 - real / est : 0;
  const f = $('#illusionFill'), pill = $('#illusionPill');
  f.style.width = pct + '%';
  f.className = 'bar-fill ' + (lost >= 0.3 ? 'coral' : lost >= 0.1 ? 'amber' : 'emerald');
  pill.className = 'pill ' + (lost >= 0.3 ? 'coral' : lost >= 0.1 ? '' : 'emerald');
  pill.textContent = lost >= 0.3 ? '🔴 Prioridad crítica: empieza hoy' : lost >= 0.1 ? '🟡 Atención: tu tiempo real es menor' : '🟢 Tu estimación es realista';
  $('#illusionText').textContent = `Crees tener ${est} h, pero realmente tienes ${real} h (${pct}%). Planifica con ${real} h.`;
}
['#estHours', '#realHours'].forEach(s => $(s).addEventListener('input', renderIllusion));

$('#mentalDumpBtn').addEventListener('click', () => {
  const text = $('#mentalDump').value.trim(), reply = $('#mentalDumpReply');
  reply.classList.remove('hidden');
  if (!text) { reply.textContent = 'Escribe primero lo que te frena.'; return; }
  const hit = NOPERF_REPLIES.find(([re]) => re.test(text));
  reply.innerHTML = `<strong>Lo escuchamos.</strong> ${hit ? hit[1] : 'Lo que sientes es válido.'} No tiene que quedar perfecto hoy: haz un borrador feo durante 5 minutos y luego decides si sigues.
    <div style="margin-top:10px"><button class="btn primary sm" id="dumpStart">Empezar 5 min sin perfección</button></div>`;
  $('#mentalDump').value = '';
  $('#dumpStart').addEventListener('click', startAntiParalysis);
});

// ============ BIOMA ============
document.addEventListener('click', e => {
  const b = e.target.closest('[data-fichas]');
  if (!b) return;
  const [title, items] = FICHAS[b.dataset.fichas];
  openInfo(title, `<div class="fichas">${items.map(([i, n, d]) => `<div class="ficha"><span>${i}</span><div><strong>${n}</strong><p>${d}</p></div></div>`).join('')}</div>`);
});

// ============ COMUNIDAD ============
function renderSquads() {
  $('#squadList').innerHTML = state.squads.map(s => `<li class="${s.active ? 'active' : ''}"><strong>${esc(s.name)}</strong> <span class="muted">${s.n} / 4</span></li>`).join('');
}
$('#joinSquad').addEventListener('click', () => {
  openInfo('Unirse a una cuadrilla',
    '<p class="muted">Ingresa el código que te compartió tu grupo.</p><input class="input" id="squadCode" maxlength="8" placeholder="Ej. ANDINO7" aria-label="Código de cuadrilla" />',
    'Unirme', () => {
      const code = $('#squadCode').value.trim().toUpperCase();
      if (code.length < 4) { toast('El código debe tener al menos 4 caracteres.'); return false; }
      state.squads.push({ name: 'Cuadrilla ' + code, n: 1 });
      saveState(); renderSquads(); toast(`Te uniste a la cuadrilla ${code} (demo local).`);
    });
});
let tutorSel = null;
function renderTutors() {
  const q = $('#tutorSearch').value.trim().toLowerCase();
  const list = TUTORS.filter(([n, c]) => `${n} ${c}`.toLowerCase().includes(q));
  $('#tutorList').innerHTML = list.length
    ? list.map(([n, c]) => `<li><button class="tutor ${tutorSel === n ? 'active' : ''}" data-t="${n}"><strong>${n}</strong> · ${c}</button></li>`).join('')
    : '<li class="muted" style="padding:10px 12px">Sin resultados. Prueba otro curso.</li>';
}
$('#tutorSearch').addEventListener('input', renderTutors);
$('#tutorList').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  tutorSel = b.dataset.t; renderTutors();
});
$('#askTutor').addEventListener('click', () => {
  if (!tutorSel) return toast('Elige primero un tutor de la lista.');
  toast(`Solicitud enviada a ${tutorSel} (demo).`);
});
$('#groupPomodoro').addEventListener('click', () => {
  switchView('focus');
  if (T.running) return toast('Ya tienes un bloque en curso.');
  startTimer(); toast('Pomodoro grupal iniciado con Código Andino.');
});

// ============ PROGRESO ============
function renderProgress() {
  const w = state.weekly, max = Math.max(...w, 1), total = w.reduce((a, b) => a + b, 0);
  $('#weeklyChart').innerHTML = w.map((h, i) =>
    `<div class="bar-col ${i === dayIdx() ? 'today' : ''}" style="height:${(h / max) * 100}%" data-hours="${h} h"></div>`).join('');
  const hh = Math.floor(total), mm = Math.round((total - hh) * 60);
  $('#weeklyTotal').innerHTML = `<strong>${hh} h ${mm} m</strong> esta semana · hoy: ${state.daily.minutes} min`;
  const u = state.user, s = state.stats;
  const ok = { streak: u.streak >= 7, blocks: s.blocks >= 1, earth: u.earthPoints >= 300, noperf: s.noPerf >= 1 };
  $$('[data-ach]').forEach(a => {
    a.classList.toggle('locked', !ok[a.dataset.ach]);
    a.title = ok[a.dataset.ach] ? 'Desbloqueado' : 'Aún bloqueado';
  });
  $('#insightCard').classList.toggle('hidden', state.insight === 'ignored');
  const accepted = state.insight === 'accepted';
  $('#acceptInsight').parentElement.classList.toggle('hidden', accepted);
}
$('#acceptInsight').addEventListener('click', () => {
  state.insight = 'accepted'; saveState(); renderProgress();
  toast('Aplicado: lecturas ligeras los miércoles y cálculo los jueves 9:00 AM.');
});
$('#ignoreInsight').addEventListener('click', () => { state.insight = 'ignored'; saveState(); renderProgress(); });
$('#bienestarBtn').addEventListener('click', () => openInfo('Bienestar UC',
  '<p class="muted">Esta es una versión demo: no se envía ningún dato. En la versión real solo compartiríamos un resumen anónimo y siempre con tu consentimiento previo.</p><p class="muted">Si te sientes mal ahora, busca a alguien de confianza o acude a Bienestar Universitario.</p>'));

// ============ ONBOARDING ============
const stepShow = (n) => {
  $$('.onb-step').forEach(s => s.classList.toggle('hidden', s.dataset.step !== String(n)));
  $$('.steps .dot').forEach((d, i) => d.classList.toggle('active', i === n - 1));
};
$$('.onb-step [data-next]').forEach(b => b.addEventListener('click', () => stepShow(b.dataset.next)));
$$('.onb-step [data-back]').forEach(b => b.addEventListener('click', () => stepShow(b.dataset.back)));
$$('[data-skip]').forEach(b => b.addEventListener('click', () => {
  closeOverlay($('#onboarding')); state.onboarded = true; saveState();
}));
$('#finishOnboarding').addEventListener('click', () => {
  const val = (n) => $(`input[name="${n}"]:checked`)?.value || null;
  const name = $('#nameInput').value.trim();
  if (name) state.user.name = name;
  Object.assign(state.profile, {
    trigger: val('trigger'), schedule: val('schedule'),
    seed: val('seed') || 'cantuta', guardian: val('guardian') || 'alpaca',
  });
  state.onboarded = true; saveState();
  closeOverlay($('#onboarding'));
  renderDashboard(); renderTimer();
  toast(`¡Bienvenido${name ? ', ' + name : ''}! Empieza con tu check-in 🌱`);
});

// ============ RESET ============
$('#resetDemo').addEventListener('click', () => {
  if (!confirm('¿Reiniciar el estado de la demo?')) return;
  try { localStorage.removeItem(KEY); } catch (e) { }
  location.reload();
});

// ============ INIT ============
function init() {
  const msg = rollover();
  $$('input[name="mode"]').forEach(r => r.checked = r.value === state.focus.mode);
  $$('.sound-item').forEach(b => b.classList.toggle('active', b.dataset.sound === state.focus.sound));
  $('#estHours').value = state.plan.est; $('#realHours').value = state.plan.real;
  $('#nameInput').value = state.user.name;
  renderDashboard(); renderMissions(); renderProgress(); renderSquads(); renderTutors();
  $('#autoFs').checked = state.focus.autoFullscreen; updateFsBtn();
  renderShield(); renderIllusion(); updateTimerDuration(); syncSound();
  if (!state.onboarded) { openOverlay($('#onboarding')); stepShow(1); }
  else if (msg) setTimeout(() => toast(msg), 600);
}
init();
