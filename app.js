// ===================================================
// SYNCRO · MVP · app.js (v3)
// Estado en localStorage + SPA + Pomodoro + sonido + escudo
// ===================================================
'use strict';

const KEY = 'syncro_state_v3';
const SESSION_KEY = 'syncro_session'; // la crea index.html al registrarse o iniciar sesión
const BASE_TITLE = document.title;
const SEEDS = {
  cantuta: { name: 'flor de cantuta', stages: ['🌱', '🌿', '🌷', '🌺'] },
  queñual: { name: 'queñual', stages: ['🌱', '🌿', '🌳', '🌲'] },
  chachacoma: { name: 'chachacoma', stages: ['🌱', '🌿', '🌾', '🌼'] },
};
const GUARDIANS = { alpaca: '🦙', oso: '🐻', condor: '🦅', puma: '🐆', gallito: '🐓' };
const GUARDIAN_NAMES = { alpaca: 'Alpaca Andina', oso: 'Oso de Anteojos', condor: 'Cóndor', puma: 'Puma', gallito: 'Gallito de las rocas' };
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
  profile: { trigger: null, schedule: null, seed: 'cantuta', guardian: 'alpaca', role: null, ageRange: '', institution: '', freq: null, blockPref: 'classic', goal: '', bienestarConsent: false, reminder: true },
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
  stats: { blocks: 0, noPerf: 0, minutes: 0, dropsEarned: 0, bestStreak: 0, community: 0 },
  plan: { est: 9, real: 6 },
  squads: [{ name: 'Código Andino', n: 4, active: true }, { name: 'Los Incas', n: 3 }],
  insight: null,
  lastActive: null,
  onboarded: false,
  tutorialDone: false,
  accountEmail: null,
  heat: {},                                   // 'YYYY-MM-DD' -> minutos de enfoque
  calendar: { weekStart: null, slots: [] },   // bloques de la semana actual
  moodLog: [],                                // check-ins: { ts, d, dow, hour, energy, mood, jid? }
  achievements: {},                           // id -> fecha de desbloqueo
  rescue: null,
  gapDays: 0,
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
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}
function loadState() {
  const s = clone(defaultState);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      Object.assign(s, p);
      for (const k of ['user', 'profile', 'checkIn', 'focus', 'daily', 'stats', 'plan', 'calendar'])
        s[k] = { ...defaultState[k], ...(p[k] || {}) };
    }
  } catch (e) { console.warn('Estado corrupto, reiniciando.'); }
  // Cada cuenta tiene su propio progreso: si cambió la cuenta, se parte de cero
  const ses = getSession();
  if (ses) {
    if (s.accountEmail && s.accountEmail !== ses.email) Object.assign(s, clone(defaultState));
    s.accountEmail = ses.email;
    if (!s.user.name && !s.onboarded) s.user.name = String(ses.name || '').split(' ')[0];
  }
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
  if (state.calendar.weekStart !== wk) state.calendar = { weekStart: wk, slots: [] };
  const cutoff = keyOf(new Date(Date.now() - 100 * 864e5));
  Object.keys(state.heat).forEach(k => { if (k < cutoff) delete state.heat[k]; });
  if (state.daily.date === t) return null;
  if (state.lastActive) {
    const gap = Math.round((new Date(t) - new Date(state.lastActive)) / 864e5);
    state.gapDays = gap;
    if (gap >= 3) state.rescue = { daysAway: gap };     // vuelta amable: sin mensajes de racha rota ni XP perdido
    if (gap > 1) {
      const missed = gap - 1;
      if (state.user.shields >= missed) {
        state.user.shields -= missed;
        msg = gap >= 3 ? null : `Tu escudo protegió tu racha 🛡 (${missed} día${missed > 1 ? 's' : ''}).`;
      } else {
        state.user.streak = 0;
        msg = gap >= 3 ? null : 'Nueva racha, sin culpa. Hoy empezamos de nuevo 🌱';
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
  if (!state.daily.counted) {
    state.daily.counted = true; state.user.streak += 1;
    state.stats.bestStreak = Math.max(state.stats.bestStreak || 0, state.user.streak);
  }
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
  if (view === 'calendar') renderCalendar();
  else if (view === 'profile') renderProfile();
  else if (view === 'biome') renderBiomeLive(true);
  else if (view === 'progress') renderTimeline();
  else stopGrowth();
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
  state.stats.dropsEarned += n;
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
  $('#sidebarName').title = u.name || 'Estudiante';
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
  updateWeatherUI();

  const tips = [];
  if (SCHEDULES[p.schedule]) tips.push(`Tus tareas difíciles rinden más en ${SCHEDULES[p.schedule]}.`);
  if (TRIGGER_TIPS[p.trigger]) tips.push(`Tip: ${TRIGGER_TIPS[p.trigger]}`);
  if (p.freq === 'siempre') tips.push('Si arrancar cuesta, empieza con 5 minutos: lo difícil es empezar, no seguir.');
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
  markSlotsDone(id);
  saveState(); renderDashboard(); renderMissions(); renderProgress(); checkAchievements();
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
  // Registro para el calendario (horas de baja energía) y la línea de tiempo emocional
  const now = new Date(), entry = { ts: now.getTime(), d: keyOf(now), dow: dayIdx(), hour: now.getHours(), energy: c.energy, mood: c.mood };
  state.moodLog.push(entry); if (state.moodLog.length > 300) state.moodLog.splice(0, state.moodLog.length - 300);
  saveState(); renderDashboard(); renderMissions(); updateTimerDuration(); renderTimeline();
  const text = $('#journalText').value.trim();
  if (text) {
    Journal.add(text, { d: entry.d, dow: entry.dow }).then(id => {
      if (id) { entry.jid = id; saveState(); $('#journalText').value = ''; renderTimeline(); toast('Nota guardada, cifrada en este dispositivo 🔒'); }
      else toast('Tu navegador no permite el cifrado: no guardamos la nota.');
    });
  }
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
  state.stats.blocks++; state.stats.minutes += mins;
  state.heat[keyOf(new Date())] = (state.heat[keyOf(new Date())] || 0) + mins;
  if (groupSession) { state.stats.community++; groupSession = false; }
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
      markSlotsDone(m.id);
    }
  }
  T.remaining = T.duration;
  saveState(); renderDashboard(); renderMissions(); renderProgress(); renderTimer(); checkAchievements();
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

let groupSession = false;   // el bloque en curso cuenta como sesión en comunidad
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
  groupSession = true;
  startTimer(); toast('Pomodoro grupal iniciado con Código Andino.');
});

// ============ PROGRESO ============
function renderProgress() {
  const w = state.weekly, max = Math.max(...w, 1), total = w.reduce((a, b) => a + b, 0);
  $('#weeklyChart').innerHTML = w.map((h, i) =>
    `<div class="bar-col ${i === dayIdx() ? 'today' : ''}" style="height:${(h / max) * 100}%" data-hours="${h} h"></div>`).join('');
  const hh = Math.floor(total), mm = Math.round((total - hh) * 60);
  $('#weeklyTotal').innerHTML = `<strong>${hh} h ${mm} m</strong> esta semana · hoy: ${state.daily.minutes} min`;
  renderAchievements();
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

// ============ ONBOARDING (5 pasos) ============
const ONB_STEPS = $$('.onb-step').length;
let onbCur = 1;
$('#onbDots').innerHTML = '<span class="dot"></span>'.repeat(ONB_STEPS);
const stepShow = (n) => {
  onbCur = Number(n);
  $$('.onb-step').forEach(st => st.classList.toggle('hidden', st.dataset.step !== String(n)));
  $$('#onbDots .dot').forEach((d, i) => d.classList.toggle('active', i === onbCur - 1));
  $('#onbCount').textContent = `Paso ${onbCur} de ${ONB_STEPS}`;
  const modal = $('.onboarding-modal');
  modal.scrollTop = 0;
  if (onbCur > 1) (modal.querySelector(`.onb-step[data-step="${onbCur}"] input`) || modal).focus?.();
};
function validateOnbStep1() {
  const nameOk = $('#nameInput').value.trim().length > 0;
  const roleOk = !!$('input[name="role"]:checked');
  $('#nameInput').setAttribute('aria-invalid', String(!nameOk));
  $('#onbError1').textContent = !nameOk ? 'Escribe cómo quieres que te llamemos.'
    : !roleOk ? 'Elige qué te describe mejor para ajustar SYNCRO a ti.' : '';
  if (!nameOk) $('#nameInput').focus();
  return nameOk && roleOk;
}
$$('.onb-step [data-next]').forEach(b => b.addEventListener('click', () => {
  if (onbCur === 1 && !validateOnbStep1()) return;
  stepShow(b.dataset.next);
}));
$$('.onb-step [data-back]').forEach(b => b.addEventListener('click', () => stepShow(b.dataset.back)));
$('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('.onb-step[data-step="1"] [data-next]').click(); });
$$('input[name="role"]').forEach(r => r.addEventListener('change', () => { $('#onbError1').textContent = ''; }));
$('#nameInput').addEventListener('input', () => { $('#nameInput').setAttribute('aria-invalid', 'false'); $('#onbError1').textContent = ''; });

function freshStart() {   // cuenta real nueva: parte de cero (los números de demo no cuentan para logros ni bioma)
  if (state.onboarded) return;
  Object.assign(state.user, { level: 1, xp: 0, xpMax: 300, streak: 0, shields: 2, drops: 0, earthPoints: 0 });
  state.weekly = [0, 0, 0, 0, 0, 0, 0]; state.stats = { ...defaultState.stats };
  state.heat = {}; state.moodLog = []; state.achievements = {}; state.calendar = { weekStart: keyOf(weekMonday()), slots: [] };
}
function afterOnboarding() {
  closeOverlay($('#onboarding'));
  renderDashboard(); renderMissions(); renderTimer();
  setTimeout(() => startTutorial(), 350);
}
$$('[data-skip]').forEach(b => b.addEventListener('click', () => {
  const ses = getSession();
  if (!state.user.name && ses) state.user.name = String(ses.name || '').split(' ')[0];
  freshStart(); state.onboarded = true; saveState();
  afterOnboarding();
}));
$('#finishOnboarding').addEventListener('click', () => {
  const val = (n) => $(`input[name="${n}"]:checked`)?.value || null;
  const name = $('#nameInput').value.trim();
  if (name) state.user.name = name;
  const goal = $('#goalInput').value.trim();
  Object.assign(state.profile, {
    role: val('role'), ageRange: $('#ageInput').value, institution: $('#institutionInput').value.trim(),
    trigger: val('trigger'), freq: val('freq'), schedule: val('schedule'),
    blockPref: val('blockPref') || 'classic', goal,
    seed: val('seed') || 'cantuta', guardian: val('guardian') || 'alpaca',
    bienestarConsent: $('#consentBienestar').checked, reminder: $('#consentReminder').checked,
  });
  // El tamaño de bloque elegido pasa a ser el modo inicial del temporizador
  state.focus.mode = state.profile.blockPref;
  $$('input[name="mode"]').forEach(r => r.checked = r.value === state.focus.mode);
  updateTimerDuration();
  // El objetivo grande se convierte en la primera misión del día
  if (goal) {
    state.missions = state.missions.filter(m => m.id !== 'goal');
    state.missions.unshift({ id: 'goal', base: true, title: `Dar el primer paso en: ${goal}`, xp: 40, drops: 10, target: 1, progress: 0, done: false });
  }
  freshStart(); state.onboarded = true; saveState();
  afterOnboarding();
  toast(`¡Bienvenido${name ? ', ' + name : ''}! 🌱`);
});

// ============ TUTORIAL GUIADO ============
const TOUR = [
  { emoji: '🌱', title: 'Así se usa SYNCRO', text: 'Cada día sigues un ciclo corto: check-in, misión, bloque protegido e impacto. Te lo mostramos en menos de un minuto, sobre la herramienta real.', tip: 'Puedes repetirlo cuando quieras con el botón “Tutorial”.' },
  { view: 'dashboard', target: '#checkInCard', title: '1. Check-in emocional', text: 'Mueve la barra de energía y elige cómo te sientes. Si estás agotado, SYNCRO activa el modo ligero y baja tus bloques a 15 minutos.', tip: 'Guardar el check-in suma +5 XP cada día.' },
  { view: 'dashboard', target: '.missions-col', title: '2. Misiones de hoy', text: 'Tu objetivo grande se divide en tareas pequeñas. Pulsa “Iniciar” para vincular una misión al temporizador, o ✓ para marcarla como hecha.', tip: 'Si te bloqueas, el botón verde de 5 minutos te ayuda a arrancar sin perfección.' },
  { view: 'plan', target: '#view-plan .card', title: '3. SincroPlan', text: 'Escribe una tarea grande y los días que tienes: la IA la desglosa en micro-pasos con fecha meta. Añádelos a tus misiones de hoy con un clic.', tip: 'Más abajo compara cuánto tiempo crees tener con el que realmente tienes.' },
  { view: 'calendar', target: '#view-calendar .cal-card', title: '4. Calendario de estudio', text: 'Arrastra tus misiones a un horario (o tócalas y luego toca la hora). Las zonas rayadas son tus horas de baja energía: ahí SYNCRO te sugiere tareas ligeras.', tip: 'Exporta la semana a Google Calendar con el botón .ics.' },
  { view: 'focus', target: '#timerCard', title: '5. Bloque protegido', text: 'Elige Clásico 25/5, Profundo 50/10 o 5 minutos sin perfección, y pulsa Iniciar. Tu semilla crece mientras te concentras.', tip: 'Al terminar, una pausa guiada te ayuda a recuperar energía.' },
  { view: 'focus', target: '#view-focus .focus-grid .card:nth-child(2)', title: 'Escudo anti-distracción', text: 'Si cambias de pestaña durante un bloque, tu Guardián te intercepta. Si te vas de todos modos, solo se reinicia el bloque: sin castigos.', tip: 'Prueba “Simular distracción” para ver la alerta.' },
  { view: 'biome', target: '#biomeLive', title: '6. Impacto verificado', text: 'Tu bioma reacciona a tu esfuerzo: sol, niebla o arcoíris según tu día, estaciones reales y fauna que aparece con tus logros. Mueve la línea para ver crecer tus plantas.', tip: 'Con 7 días seguidos, un cóndor sobrevuela tu valle.' },
  { view: 'community', target: '.community-grid', title: 'Comunidad', text: 'Únete a una cuadrilla con un código, estudia en sala sincronizada o pide orientación a un tutor par.' },
  { view: 'progress', target: '#view-progress .card', title: 'Tu progreso', text: 'Mira tus horas de la semana, tus logros y los insights de la IA. Es para conocerte, no para presionarte.', tip: 'Si tu ánimo baja varios días, te mostraremos apoyo privado.' },
  { view: 'profile', target: '.profile-hero', title: 'Tu perfil', text: 'Edita tus datos, cambia tu guardián, elige modo claro u oscuro, exporta tus datos o borra tu diario cuando quieras.', tip: 'Los guardianes 🐆 y 🐓 se desbloquean con logros.' },
  { emoji: '🚀', title: '¡Todo listo!', text: 'Empieza por lo más simple: tu check-in de hoy. Son 30 segundos y SYNCRO ajusta el resto.', last: true },
];
const tour = { i: 0, el: null, active: false };
const tourVisible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

function buildTour() {
  if (tour.el) return;
  const el = document.createElement('div');
  el.className = 'tour-layer hidden';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'tourTitle');
  el.innerHTML = '<div class="tour-block"></div><div class="tour-spot none"></div><div class="tour-pop" id="tourPop"></div>';
  document.body.appendChild(el);
  tour.el = el;
  const stop = (e) => e.preventDefault();
  el.addEventListener('wheel', stop, { passive: false });
  el.addEventListener('touchmove', stop, { passive: false });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-tour]'); if (!b) return;
    if (b.dataset.tour === 'next') tourGo(tour.i + 1);
    else if (b.dataset.tour === 'prev') tourGo(tour.i - 1);
    else if (b.dataset.tour === 'skip') endTour(false);
    else if (b.dataset.tour === 'done') endTour(true);
  });
  window.addEventListener('resize', () => tour.active && tourPlace(false));
  window.addEventListener('scroll', () => tour.active && tourPlace(false), { passive: true });
  document.addEventListener('keydown', e => {
    if (!tour.active) return;
    if (e.key === 'Escape') endTour(false);
    else if (e.key === 'ArrowRight') { e.preventDefault(); tourGo(tour.i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); tourGo(tour.i - 1); }
    else if (e.key === 'Tab' && !tour.el.querySelector('#tourPop').contains(document.activeElement)) {
      e.preventDefault(); tour.el.querySelector('[data-tour="next"], [data-tour="done"]')?.focus();
    }
  });
}

function tourPlace(scroll) {
  const st = TOUR[tour.i], spot = tour.el.querySelector('.tour-spot'), pop = tour.el.querySelector('#tourPop');
  const t = st.target ? $$(st.target).find(tourVisible) : null;
  if (!t) { spot.className = 'tour-spot none'; pop.classList.add('center'); pop.style.top = pop.style.left = ''; return; }
  pop.classList.remove('center');
  if (scroll) t.scrollIntoView({ block: 'center', inline: 'nearest' });
  const r = t.getBoundingClientRect(), pad = 8, vw = innerWidth, vh = innerHeight;
  const top = Math.max(r.top, 6), bottom = Math.min(r.bottom, vh - 6);
  spot.className = 'tour-spot';
  Object.assign(spot.style, { top: `${top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${Math.max(0, bottom - top) + pad * 2}px` });
  const pw = pop.offsetWidth, ph = pop.offsetHeight, gap = 14;
  let y;
  if (vh - bottom - pad >= ph + gap) y = bottom + pad + gap;          // debajo
  else if (top - pad >= ph + gap) y = top - pad - gap - ph;           // encima
  else y = Math.max(12, vh - ph - 12);                                // elemento muy grande: al pie de la pantalla
  pop.style.top = `${y}px`;
  pop.style.left = `${Math.min(Math.max(12, r.left + r.width / 2 - pw / 2), vw - pw - 12)}px`;
}

function tourRender() {
  const st = TOUR[tour.i], pop = tour.el.querySelector('#tourPop');
  const first = tour.i === 0, last = !!st.last;
  pop.innerHTML = `
    ${st.emoji ? `<div class="tour-emoji" aria-hidden="true">${st.emoji}</div>` : ''}
    <h3 id="tourTitle">${esc(st.title)}</h3>
    <p>${esc(st.text)}</p>
    ${st.tip ? `<p class="tour-tip">💡 ${esc(st.tip)}</p>` : ''}
    <div class="tour-progress" aria-hidden="true">${TOUR.map((_, i) => `<i class="${i === tour.i ? 'on' : ''}"></i>`).join('')}</div>
    <div class="tour-foot">
      ${last ? '<span></span>' : '<button class="tour-skip" data-tour="skip">Saltar tutorial</button>'}
      <div class="tour-btns">
        ${first ? '' : '<button class="btn ghost sm" data-tour="prev">Atrás</button>'}
        ${last ? '<button class="btn primary" data-tour="done">Empezar mi check-in</button>'
               : `<button class="btn primary sm" data-tour="next">${first ? 'Comenzar recorrido' : 'Siguiente'}</button>`}
      </div>
    </div>`;
  tour.el.querySelector('[data-tour="next"], [data-tour="done"]')?.focus({ preventScroll: true });
  tourPlace(true);
  requestAnimationFrame(() => tourPlace(false));
}

function tourGo(n) {
  if (n < 0 || n >= TOUR.length) return;
  tour.i = n;
  const v = TOUR[n].view;
  if (v) { switchView(v, true); window.scrollTo({ top: 0, behavior: 'instant' }); }
  tourRender();
}

function startTutorial(force = false) {
  if (!$('#onboarding').classList.contains('hidden')) return;
  if (T.running) return toast('Pausa o termina tu bloque para ver el tutorial.');
  buildTour();
  tour.active = true; tour.i = 0;
  tour.el.classList.remove('hidden');
  tourRender();
}
function endTour(finished) {
  tour.active = false;
  tour.el.classList.add('hidden');
  state.tutorialDone = true; saveState();
  switchView('dashboard', true);
  if (finished) {
    setTimeout(() => {
      $('#checkInCard').scrollIntoView({ block: 'center', behavior: 'smooth' });
      $('#energyRange').focus({ preventScroll: true });
    }, 120);
  }
}
$$('[data-replay-tour]').forEach(b => b.addEventListener('click', () => startTutorial(true)));

// ============ CUENTA ============
$$('[data-logout]').forEach(b => b.addEventListener('click', () => {
  if (T.running && !confirm('Tienes un bloque en curso. ¿Cerrar sesión de todos modos?')) return;
  try { localStorage.removeItem(SESSION_KEY); } catch (e) { }
  location.href = 'index.html';
}));
(function renderAccount() {
  const ses = getSession();
  if (!ses) return;
  $('#accountInfo').textContent = `${ses.name} · ${ses.email} · ${ses.provider === 'google' ? 'Google (simulado)' : 'usuario @' + ses.username}`;
})();

// =====================================================================
// NUEVAS FUNCIONES · logros, calendario, bioma vivo, diario, rescate, perfil, tema
// =====================================================================

// ============ TEMA CLARO / OSCURO ============
function setTheme(t, persist = true) {
  const theme = t === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  if (persist) { try { localStorage.setItem('syncro_theme', theme); } catch (e) { } }
  $('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#EEF2F8' : '#0B132B');
  $$('[data-theme-toggle]').forEach(b => { (b.querySelector('.tool-ico') || b).textContent = theme === 'light' ? '☀️' : '🌙'; });
  $$('[data-theme-set]').forEach(b => b.classList.toggle('active', b.dataset.themeSet === theme));
}
const currentTheme = () => document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
$$('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => setTheme(currentTheme() === 'light' ? 'dark' : 'light')));
$$('[data-theme-set]').forEach(b => b.addEventListener('click', () => setTheme(b.dataset.themeSet)));

// ============ LOGROS NARRATIVOS ============
const bestStreak = () => Math.max(state.user.streak, state.stats.bestStreak || 0);
const ACHIEVEMENTS = [
  { id: 'semilla', icon: '🌱', name: 'Primera semilla', goal: 'Completa 1 bloque de enfoque', story: 'Completaste tu primer bloque. Todo bosque empieza con una semilla.',
    value: () => state.stats.blocks, target: 1, reward: { kind: 'especie', emoji: '🦋', name: 'Mariposa' } },
  { id: 'raices', icon: '🌿', name: 'Raíces profundas', goal: 'Mantén una racha de 7 días', story: 'Siete días seguidos cuidando tu atención: tus raíces ya sostienen el suelo.',
    value: () => bestStreak(), target: 7, reward: { kind: 'especie', emoji: '🦌', name: 'Taruca' } },
  { id: 'cantuta', icon: '🌺', name: 'Guardián de la Cantuta', goal: 'Acumula 100 gotas de riego', story: 'Tu cantuta floreció con 100 gotas de riego, y un puma vigila el valle.',
    value: () => state.stats.dropsEarned, target: 100, reward: { kind: 'guardián', key: 'puma', emoji: '🐆', name: 'Puma' } },
  { id: 'rebano', icon: '🦙', name: 'Compañero del rebaño', goal: 'Haz 5 sesiones en comunidad', story: 'Cinco sesiones junto a tu cuadrilla: estudiar acompañado lo cambia todo.',
    value: () => state.stats.community, target: 5, reward: { kind: 'especie', emoji: '🦜', name: 'Guacamayo' } },
  { id: 'cumbre', icon: '🏔️', name: 'Cumbre andina', goal: 'Reúne 50 horas verificadas', story: 'Cincuenta horas de enfoque verificado: llegaste a la cumbre y el gallito de las rocas te recibe.',
    value: () => Math.floor((state.stats.minutes / 60) * 10) / 10, target: 50, reward: { kind: 'guardián', key: 'gallito', emoji: '🐓', name: 'Gallito de las rocas' } },
];
const achUnlocked = (id) => !!state.achievements[id];
const unlockedSpecies = () => ACHIEVEMENTS.filter(a => achUnlocked(a.id) && a.reward.kind === 'especie').map(a => a.reward);
const GUARDIAN_LOCK = { puma: 'cantuta', gallito: 'cumbre' };
const guardianLocked = (key) => !!GUARDIAN_LOCK[key] && !achUnlocked(GUARDIAN_LOCK[key]);

function checkAchievements(silent = false) {
  const fresh = ACHIEVEMENTS.filter(a => !achUnlocked(a.id) && a.value() >= a.target);
  if (!fresh.length) return [];
  fresh.forEach(a => { state.achievements[a.id] = keyOf(new Date()); });
  saveState();
  if (!silent) setTimeout(() => toast(`🏅 Logro: ${fresh[0].name} · desbloqueaste ${fresh[0].reward.emoji} ${fresh[0].reward.name}`), 1000);
  renderAchievements();
  return fresh;
}
function renderAchievements() {
  const list = $('#achList'); if (!list) return;
  const n = ACHIEVEMENTS.filter(a => achUnlocked(a.id)).length;
  $('#achCount').textContent = `${n} de ${ACHIEVEMENTS.length} logros`;
  list.innerHTML = ACHIEVEMENTS.map(a => {
    const on = achUnlocked(a.id), v = Math.min(a.value(), a.target), pct = Math.round((v / a.target) * 100);
    const shown = a.id === 'cumbre' ? `${v.toFixed(1)} / ${a.target} h` : `${v} / ${a.target}`;
    return `<div class="ach-item ${on ? 'unlocked' : ''}" data-ach="${a.id}">
      <div class="ic" aria-hidden="true">${a.icon}</div>
      <div>
        <h4>${esc(a.name)} ${on ? '✓' : ''}</h4>
        <p>${esc(on ? a.story : a.goal)}</p>
        ${on ? '' : `<div class="bar"><div class="bar-fill emerald" style="width:${pct}%"></div></div><span class="small muted">${shown}</span>`}
        <div class="reward">${on ? 'Desbloqueaste' : 'Desbloquea'}: ${a.reward.emoji} ${esc(a.reward.name)} (${a.reward.kind})</div>
      </div></div>`;
  }).join('');
}

// ============ CALENDARIO DE ESTUDIO ============
const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);           // 6:00 – 22:00
const LIGHT_TASKS = ['Lectura ligera 20 min', 'Repaso suave de apuntes', 'Ordenar apuntes y escritorio', 'Caminata y respiración 4-4-4-4'];
const PEAK = { manana: [7, 12], tarde: [13, 18], noche: [19, 22] };
let calSel = null;   // { t: 'mission', id } | { t: 'light', title }

const weekMonday = () => { const d = new Date(); d.setDate(d.getDate() - dayIdx()); d.setHours(0, 0, 0, 0); return d; };
function ensureWeek() {
  const wk = keyOf(weekMonday());
  if (state.calendar.weekStart !== wk) state.calendar = { weekStart: wk, slots: [] };
}
const slotAt = (d, h) => state.calendar.slots.find(s => s.day === d && s.hour === h);

// Horas de baja energía aprendidas de los check-ins (≥2 registros bajos en el mismo día y ventana de 3 h)
function lowSet() {
  const counts = {}, set = new Set();
  state.moodLog.forEach(e => {
    if (e.energy <= 3 || LOW_MOODS.includes(e.mood)) { const k = `${e.dow}-${e.hour}`; counts[k] = (counts[k] || 0) + 1; }
  });
  for (let d = 0; d < 7; d++) for (const h of HOURS) {
    let n = 0; for (let k = h - 1; k <= h + 1; k++) n += counts[`${d}-${k}`] || 0;
    if (n >= 2) set.add(`${d}-${h}`);
  }
  return set;
}
const peakRange = () => PEAK[state.profile.schedule] || null;

function placeSlot(day, hour, item, opts = {}) {
  ensureWeek();
  if (slotAt(day, hour)) { toast('Ese horario ya está ocupado.'); return null; }
  const slot = {
    id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), day, hour, status: 'scheduled', autoAdjusted: !!opts.auto,
    kind: item.t === 'mission' ? 'mission' : 'light',
    missionId: item.t === 'mission' ? item.id : null,
    title: item.t === 'mission' ? (state.missions.find(m => m.id === item.id)?.title || 'Misión') : item.title,
  };
  state.calendar.slots.push(slot);
  return slot;
}
function markSlotsDone(missionId) {
  state.calendar.slots.forEach(s => { if (s.missionId === missionId) s.status = 'done'; });
}

function renderCalTray() {
  ensureWeek();
  const scheduled = new Set(state.calendar.slots.map(s => s.missionId).filter(Boolean));
  const pending = state.missions.filter(m => !m.done);
  const chip = (attrs, cls, label) => `<button type="button" class="cal-chip ${cls}" draggable="true" ${attrs}><span>${label}</span></button>`;
  const sel = (t, k) => calSel && calSel.t === t && (calSel.id === k || calSel.title === k) ? 'sel' : '';
  $('#calTray').innerHTML = pending.map(m =>
    chip(`data-t="mission" data-k="${esc(m.id)}"`, sel('mission', m.id), `${scheduled.has(m.id) ? '✓ ' : ''}${esc(m.title)}`)).join('')
    + LIGHT_TASKS.slice(0, 3).map(t => chip(`data-t="light" data-k="${esc(t)}"`, 'light ' + sel('light', t), `🍃 ${esc(t)}`)).join('');
}
function renderCalendar() {
  ensureWeek();
  const mon = weekMonday(), today = dayIdx(), nowH = new Date().getHours();
  const low = lowSet(), pk = peakRange();
  let html = '<div class="cal-head"></div>' + DAY_SHORT.map((n, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    return `<div class="cal-head ${i === today ? 'today' : ''}">${n}<small>${d.getDate()}</small></div>`;
  }).join('');
  for (const h of HOURS) {
    html += `<div class="cal-hour">${h}:00</div>`;
    for (let d = 0; d < 7; d++) {
      const s = slotAt(d, h);
      const cls = [low.has(`${d}-${h}`) ? 'low' : '', pk && h >= pk[0] && h < pk[1] ? 'peak' : '',
        d < today || (d === today && h < nowH) ? 'past' : '', d === today ? 'today-col' : '', s ? '' : 'armed'].join(' ');
      const block = s ? `<div class="cal-block ${s.kind === 'light' ? 'light' : ''} ${s.status === 'done' ? 'done' : ''}" draggable="true" data-slot="${s.id}" title="${esc(s.title)}">
          <span class="cb-title">${s.autoAdjusted ? '<span class="auto" title="Ajustado según tu energía">✨</span> ' : ''}${esc(s.title)}</span>
          <button type="button" data-act="done" aria-label="${s.status === 'done' ? 'Marcar pendiente' : 'Marcar hecho'}">✓</button>
          <button type="button" data-act="del" aria-label="Quitar del calendario">✕</button></div>` : '';
      html += `<div class="cal-cell ${cls}" role="gridcell" data-day="${d}" data-hour="${h}" aria-label="${DAY_SHORT[d]} ${h}:00">${block}</div>`;
    }
  }
  $('#calGrid').innerHTML = html;
  const a = new Date(mon), b = new Date(mon); b.setDate(b.getDate() + 6);
  const fmt = (x) => x.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
  $('#calWeekLabel').textContent = `Semana del ${fmt(a)} al ${fmt(b)} · ${state.calendar.slots.length} bloques programados`
    + (low.size ? ' · Las zonas rayadas son horas en las que sueles sentirte agotado.' : ' · Con más check-ins aprenderemos tus horas de baja energía.');
  renderCalTray(); renderHeat();
}
function dropOnCell(day, hour, data) {
  ensureWeek();
  const low = lowSet().has(`${day}-${hour}`);
  if (data.t === 'slot') {
    const s = state.calendar.slots.find(x => x.id === data.id); if (!s) return;
    if (slotAt(day, hour)) return toast('Ese horario ya está ocupado.');
    s.day = day; s.hour = hour;
  } else {
    const item = data.t === 'mission' ? { t: 'mission', id: data.k } : { t: 'light', title: data.k };
    if (item.t === 'mission' && low) {
      toast('Ese horario suele agotarte. Te sugerimos una tarea ligera aquí 🍃');
    }
    if (!placeSlot(day, hour, item)) return;
  }
  calSel = null; saveState(); renderCalendar();
}
$('#calTray').addEventListener('click', e => {
  const c = e.target.closest('.cal-chip'); if (!c) return;
  const same = calSel && calSel.t === c.dataset.t && (calSel.id === c.dataset.k || calSel.title === c.dataset.k);
  calSel = same ? null : (c.dataset.t === 'mission' ? { t: 'mission', id: c.dataset.k } : { t: 'light', title: c.dataset.k });
  renderCalTray();
  $('#calHelp').textContent = calSel ? 'Ahora toca el horario donde quieres programarla.' : 'Arrastra una misión a un horario, o toca la misión y luego el horario.';
});
$('#calGrid').addEventListener('click', e => {
  const btn = e.target.closest('.cal-block button');
  if (btn) {
    const id = btn.closest('.cal-block').dataset.slot, s = state.calendar.slots.find(x => x.id === id); if (!s) return;
    if (btn.dataset.act === 'del') state.calendar.slots = state.calendar.slots.filter(x => x.id !== id);
    else s.status = s.status === 'done' ? 'scheduled' : 'done';
    saveState(); renderCalendar(); return;
  }
  const cell = e.target.closest('.cal-cell'); if (!cell || cell.querySelector('.cal-block')) return;
  const d = +cell.dataset.day, h = +cell.dataset.hour;
  if (calSel) return dropOnCell(d, h, calSel.t === 'mission' ? { t: 'mission', k: calSel.id } : { t: 'light', k: calSel.title });
  if (lowSet().has(`${d}-${h}`)) {                      // slot de baja energía: sugerencia automática
    placeSlot(d, h, { t: 'light', title: LIGHT_TASKS[(d + h) % LIGHT_TASKS.length] }, { auto: true });
    saveState(); renderCalendar(); toast('Horario de baja energía: añadimos una tarea ligera 🍃'); return;
  }
  toast('Elige primero una misión arriba para programarla aquí.');
});
// Arrastrar y soltar
document.addEventListener('dragstart', e => {
  const chip = e.target.closest?.('.cal-chip'), blk = e.target.closest?.('.cal-block');
  if (!chip && !blk) return;
  const data = chip ? { t: chip.dataset.t, k: chip.dataset.k } : { t: 'slot', id: blk.dataset.slot };
  e.dataTransfer.setData('text/plain', JSON.stringify(data)); e.dataTransfer.effectAllowed = 'move';
});
$('#calGrid').addEventListener('dragover', e => { const c = e.target.closest('.cal-cell'); if (c) { e.preventDefault(); c.classList.add('over'); } });
$('#calGrid').addEventListener('dragleave', e => e.target.closest?.('.cal-cell')?.classList.remove('over'));
$('#calGrid').addEventListener('drop', e => {
  const c = e.target.closest('.cal-cell'); if (!c) return;
  e.preventDefault(); c.classList.remove('over');
  try { dropOnCell(+c.dataset.day, +c.dataset.hour, JSON.parse(e.dataTransfer.getData('text/plain'))); } catch (err) { }
});

// Planificación automática: misiones en tu mejor energía, tareas ligeras en tu baja energía
function autoPlan() {
  ensureWeek();
  const [a, b] = peakRange() || [8, 12], low = lowSet(), today = dayIdx(), nowH = new Date().getHours();
  const days = []; for (let d = today; d <= 6; d++) days.push(d);
  const free = (d, h) => !slotAt(d, h) && !low.has(`${d}-${h}`) && !(d === today && h <= nowH);
  const pending = state.missions.filter(m => !m.done && !state.calendar.slots.some(s => s.missionId === m.id));
  let nm = 0, nl = 0;
  pending.forEach((m, i) => {
    outer: for (let k = 0; k < days.length; k++) {
      const d = days[(i + k) % days.length];
      for (let h = a; h < b; h++) if (free(d, h)) { placeSlot(d, h, { t: 'mission', id: m.id }, { auto: true }); nm++; break outer; }
    }
  });
  for (const d of days) {
    if (nl >= 3) break;
    const h = HOURS.find(x => low.has(`${d}-${x}`) && !slotAt(d, x) && !(d === today && x <= nowH));
    if (h !== undefined) { placeSlot(d, h, { t: 'light', title: LIGHT_TASKS[(nl + d) % LIGHT_TASKS.length] }, { auto: true }); nl++; }
  }
  saveState(); renderCalendar();
  toast(nm || nl ? `Planifiqué ${nm} misión(es) en tu mejor energía y ${nl} tarea(s) ligera(s) en tu baja energía.` : 'No hay misiones pendientes por programar.');
}
$('#calAutoPlan').addEventListener('click', autoPlan);

// Exportación .ics (importable en Google Calendar, Outlook y Apple Calendar)
const icsEsc = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
function buildIcs() {
  const mon = weekMonday(), p = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SYNCRO//Calendario de estudio//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:SYNCRO · Estudio'];
  [...state.calendar.slots].sort((x, y) => x.day - y.day || x.hour - y.hour).forEach(s => {
    const st = new Date(mon); st.setDate(mon.getDate() + s.day); st.setHours(s.hour, 0, 0, 0);
    const en = new Date(st); en.setHours(en.getHours() + 1);
    L.push('BEGIN:VEVENT', `UID:${s.id}@syncro.local`, `DTSTAMP:${stamp}`, `DTSTART:${fmt(st)}`, `DTEND:${fmt(en)}`,
      `SUMMARY:${icsEsc('SYNCRO · ' + s.title)}`, `DESCRIPTION:${icsEsc(s.kind === 'light' ? 'Tarea ligera para tu horario de baja energía.' : 'Bloque de enfoque programado en SYNCRO.')}`,
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:Tu bloque de SYNCRO empieza pronto', 'END:VALARM', 'END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.join('\r\n');
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function exportIcs() {
  ensureWeek();
  if (!state.calendar.slots.length) { toast('Programa al menos un bloque para exportar.'); return false; }
  download(`syncro-semana-${state.calendar.weekStart}.ics`, buildIcs(), 'text/calendar;charset=utf-8');
  return true;
}
$('#calExportIcs').addEventListener('click', () => { if (exportIcs()) toast('Archivo .ics descargado.'); });
$('#calExportGoogle').addEventListener('click', () => {
  if (!exportIcs()) return;
  window.open('https://calendar.google.com/calendar/r/settings/export', '_blank', 'noopener');
  toast('En Google Calendar: Configuración › Importar y exportar › Importar, y elige el archivo .ics que acabas de descargar.');
});

// Jardín de constancia (heatmap 🌱→🌺)
const heatEmoji = (m) => m <= 0 ? '' : m < 25 ? '🌱' : m < 60 ? '🌿' : m < 120 ? '🌷' : '🌺';
function renderHeat() {
  const grid = $('#heatGrid'); if (!grid) return;
  const start = weekMonday(); start.setDate(start.getDate() - 7 * 11);
  const todayKey = keyOf(new Date()), now = new Date(); now.setHours(23, 59, 59, 999);
  let html = '', total = 0, active = 0;
  for (let i = 0; i < 84; i++) {
    const dt = new Date(start); dt.setDate(start.getDate() + i);
    const k = keyOf(dt), m = state.heat[k] || 0, future = dt > now;
    if (!future) { total += m; if (m > 0) active++; }
    const label = `${dt.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })} · ${m} min`;
    html += `<div class="heat-cell ${future ? 'future' : ''} ${k === todayKey ? 'today' : ''} ${m ? '' : 'empty'}" title="${label}" aria-label="${label}">${heatEmoji(m) || '·'}</div>`;
  }
  grid.innerHTML = html;
  $('#heatTotal').textContent = `${(total / 60).toFixed(1)} h · ${active} días activos en 12 semanas`;
}

// ============ BIOMA VIVO ============
const STAGE_AT = [0, 40, 120, 260];
const STAGE_NAMES = ['Brote', 'Plántula', 'Planta joven', 'Floración plena'];
const stageFor = (p) => STAGE_AT.reduce((s, t, i) => p >= t ? i : s, 0);
function currentSeason() {
  const now = new Date(), m = now.getMonth();           // hemisferio sur
  const key = (m === 11 || m <= 1) ? 'verano' : m <= 4 ? 'otoño' : m <= 7 ? 'invierno' : 'primavera';
  const startMonth = { verano: 11, otoño: 2, invierno: 5, primavera: 8 }[key];
  const start = new Date(now.getFullYear() - (key === 'verano' && m <= 1 ? 1 : 0), startMonth, 1);
  const week = Math.floor((now - start) / (7 * 864e5)) + 1;
  return { key, week, emoji: { verano: '☀️', otoño: '🍂', invierno: '❄️', primavera: '🌸' }[key] };
}
function biomeWeather() {
  const total = state.missions.length, done = state.missions.filter(m => m.done).length;
  if (state.user.streak >= 3 && state.daily.counted) return 'rainbow';
  if (total > 0 && done === total) return 'sun';
  if (!state.daily.counted && (new Date().getHours() >= 14 || (state.gapDays || 0) >= 2)) return 'fog';
  return 'cloudy';
}
const WEATHER = {
  rainbow: ['🌈 Arcoíris', () => `Tu racha de ${state.user.streak} días pintó un arcoíris sobre el valle.`],
  sun: ['☀️ Soleado', () => 'Completaste tus misiones de hoy: el sol brilla sobre tu bioma.'],
  fog: ['🌫️ Niebla', () => 'Hay niebla en el valle. Un bloque de 5 minutos la disipa, sin presión.'],
  cloudy: ['⛅ Nublado', () => 'Cielo abierto con nubes. Tu primer bloque del día despeja el horizonte.'],
};
const PLANT_X = [6, 17, 28, 39, 50, 61, 72, 83, 92], PLANT_Y = [10, 0, 16, 4, 18, 2, 12, 6, 14];
let blPoints = null, blAnim = null, blFaunaSig = '';
function ensurePlants() {
  const box = $('#blPlants'); if (box.children.length) return;
  box.innerHTML = PLANT_X.map((x, i) => `<div class="bl-plant" data-i="${i}" style="left:${x}%;bottom:${PLANT_Y[i]}px"><i>🌱</i></div>`).join('');
}
function setBiomePoints(p) {
  blPoints = p;
  ensurePlants();
  const keys = [state.profile.seed, ...Object.keys(SEEDS).filter(k => k !== state.profile.seed)];
  $$('.bl-plant').forEach((el, i) => {
    const on = p >= i * 45, st = stageFor(Math.max(0, p - i * 30));
    el.classList.toggle('on', i === 0 || on);
    el.dataset.stage = st;
    el.firstElementChild.textContent = (SEEDS[keys[i % keys.length]] || SEEDS.cantuta).stages[st];
  });
  $('#growthRange').value = p;
  $('#growthLabel').textContent = `${p} / ${state.user.earthPoints} puntos Tierra`;
  const cur = stageFor(p), st = seed().stages;
  $('#blStages').innerHTML = STAGE_AT.map((t, i) =>
    `<div class="bl-stage ${i <= cur ? 'reached' : ''} ${i === cur ? 'current' : ''}"><span class="em">${st[i]}</span><strong>${STAGE_NAMES[i]}</strong><small>desde ${t} pts</small></div>`).join('');
}
function stopGrowth() { if (blAnim) { cancelAnimationFrame(blAnim); blAnim = null; } }
function animateGrowth(ms) {
  stopGrowth();
  const target = state.user.earthPoints, t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
    setBiomePoints(Math.round(e * target));
    blAnim = k < 1 ? requestAnimationFrame(step) : null;
  };
  setBiomePoints(0);
  blAnim = requestAnimationFrame(step);
}
function renderFauna() {
  const species = unlockedSpecies();
  const sig = [state.profile.guardian, ...species.map(s => s.emoji)].join('|');
  if (sig === blFaunaSig) return;
  blFaunaSig = sig;
  const list = [{ emoji: guardian(), fly: false }, ...species.map(s => ({ emoji: s.emoji, fly: ['🦋', '🦜'].includes(s.emoji) }))];
  $('#blFauna').innerHTML = list.map((a, i) =>
    `<div class="bl-animal ${a.fly ? 'fly' : ''}" style="left:${12 + i * 16}%;--rx:${70 + (i % 3) * 40}px;animation-duration:${14 + i * 3}s;animation-delay:-${i * 4}s" aria-hidden="true">${a.emoji}</div>`).join('');
}
function updateWeatherUI() {
  const w = biomeWeather(), [label] = WEATHER[w];
  if ($('#previewWeather')) $('#previewWeather').textContent = label;
  return w;
}
function renderBiomeLive(entering = false) {
  const sc = $('#blScene'); if (!sc) return;
  const w = updateWeatherUI(), season = currentSeason();
  sc.dataset.weather = w; sc.dataset.season = season.key;
  $('#blWeatherChip').textContent = WEATHER[w][0];
  $('#blSeasonChip').textContent = `${season.emoji} ${season.key[0].toUpperCase() + season.key.slice(1)} · semana ${season.week}`;
  $('#blCaption').textContent = WEATHER[w][1]();
  sc.setAttribute('aria-label', `Bioma: ${WEATHER[w][0]}, ${season.key}, ${state.user.earthPoints} puntos Tierra`);
  const condor = state.user.streak >= 7;
  $('#blCondor').classList.toggle('on', condor);
  $('#condorHint').textContent = condor ? '¡Hoy sobrevuela tu valle!' : `Llevas ${state.user.streak} de 7 días.`;
  renderFauna();
  $('#growthRange').max = Math.max(1, state.user.earthPoints);
  if (entering) animateGrowth(1800);
  else if (!blAnim) setBiomePoints(state.user.earthPoints);
}
$('#growthPlay').addEventListener('click', () => animateGrowth(4500));
$('#growthRange').addEventListener('input', e => { stopGrowth(); setBiomePoints(+e.target.value); });

// ============ DIARIO EMOCIONAL (cifrado AES-GCM en este dispositivo) ============
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const Journal = {
  _key: null, _cache: new Map(),
  ok() { return !!(window.crypto && crypto.subtle && window.indexedDB); },
  store() { return 'syncro_journal_v1:' + (state.accountEmail || 'local'); },
  read() { try { return JSON.parse(localStorage.getItem(this.store())) || []; } catch (e) { return []; } },
  write(l) { try { localStorage.setItem(this.store(), JSON.stringify(l)); return true; } catch (e) { return false; } },
  idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('syncro_keys', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('k');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  },
  // La clave AES es NO extraíble y vive en IndexedDB: el texto cifrado en localStorage no se puede leer sin ella
  async key() {
    if (this._key) return this._key;
    const db = await this.idb(), id = this.store();
    let k = await new Promise((res, rej) => { const q = db.transaction('k').objectStore('k').get(id); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    if (!k) {
      k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await new Promise((res, rej) => { const tx = db.transaction('k', 'readwrite'); tx.objectStore('k').put(k, id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    }
    return this._key = k;
  },
  async add(text, meta) {
    if (!this.ok()) return null;
    try {
      const key = await this.key(), iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)));
      const e = { id: 'j' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4), ts: Date.now(), ...meta, iv: b64(iv), ct: b64(ct) };
      const l = this.read(); l.push(e); if (l.length > 200) l.splice(0, l.length - 200);
      if (!this.write(l)) return null;
      this._cache.set(e.id, text); return e.id;
    } catch (err) { return null; }
  },
  async all() {
    const out = [];
    for (const e of this.read()) {
      let text = this._cache.get(e.id);
      if (text === undefined) {
        try { text = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(e.iv) }, await this.key(), unb64(e.ct))); this._cache.set(e.id, text); }
        catch (err) { text = ''; }
      }
      out.push({ ...e, text });
    }
    return out;
  },
  clear() { try { localStorage.removeItem(this.store()); } catch (e) { } this._cache.clear(); },
  async dropKey() {
    this._key = null;
    try { const db = await this.idb(), id = this.store(); await new Promise(res => { const tx = db.transaction('k', 'readwrite'); tx.objectStore('k').delete(id); tx.oncomplete = res; tx.onerror = res; }); } catch (e) { }
  },
};

const MOODS = { motivado: ['😊', 'Motivado', '#10B981'], tranquilo: ['😌', 'Tranquilo', '#22D3EE'], ansioso: ['😰', 'Ansioso', '#F59E0B'], agobiado: ['😵', 'Agobiado', '#FB923C'], cansado: ['😴', 'Cansado', '#9D4EDD'] };
const THEMES = [
  ['ansiedad', /ansied|ansios|nervios|estr[eé]s|angusti|agobi|preocup/i, 'prueba 5 minutos de respiración 4-4-4-4 antes de empezar'],
  ['evaluaciones', /examen|parcial|evaluaci|prueba|exposici/i, 'divide el repaso en bloques de 25 minutos con pausas'],
  ['el lunes', /lunes|semana que viene|inicio de semana/i, 'reserva un ritual de cierre el fin de semana'],
  ['sueño y cansancio', /sue[ñn]|dorm|cansad|agotad|insomn|desvel/i, 'cuida tu descanso y usa bloques ligeros de 15 minutos'],
  ['distracciones', /redes|celular|tiktok|insta|whats|youtube|notific/i, 'activa el Escudo antes de cada bloque'],
  ['perfeccionismo', /perfec|salir bien|fallar|no me sale|miedo a/i, 'usa el modo Avance sin perfección'],
  ['soledad', /\bsol[oa]\b|soledad|aislad|nadie/i, 'estudia en una cuadrilla de Comunidad'],
];
const DIA_PL = ['Los lunes', 'Los martes', 'Los miércoles', 'Los jueves', 'Los viernes', 'Los sábados', 'Los domingos'];
function analyzeJournal(entries) {
  const out = [], rx = (n) => THEMES.find(t => t[0] === n)[1];
  const sun = entries.filter(e => e.dow === 6 && rx('ansiedad').test(e.text) && rx('el lunes').test(e.text));
  if (sun.length >= 2) out.push({
    text: 'Los domingos mencionas ansiedad por el lunes. Te sugerimos un ritual de cierre el sábado por la noche: 10 minutos para planear el lunes y soltar pendientes.',
    action: { label: 'Agendar ritual el sábado 9 PM', run: () => {
      ensureWeek();
      if (slotAt(5, 21)) return toast('Ya tienes algo el sábado a las 9 PM.');
      placeSlot(5, 21, { t: 'light', title: 'Ritual de cierre: planear el lunes y soltar pendientes' }, { auto: true });
      saveState(); renderCalendar(); toast('Ritual agendado en tu calendario 🌙');
    } },
  });
  let best = null;
  for (const [name, re, tip] of THEMES) {
    const by = {}; entries.forEach(e => { if (re.test(e.text)) by[e.dow] = (by[e.dow] || 0) + 1; });
    for (const [d, n] of Object.entries(by)) if (n >= 2 && (!best || n > best.n)) best = { name, d: +d, n, tip };
  }
  if (best && !(out.length && best.name === 'ansiedad' && best.d === 6)) out.push({ text: `${DIA_PL[best.d]} aparece “${best.name}” en tus notas (${best.n} veces). Una idea: ${best.tip}.` });
  const last = state.moodLog.slice(-5);
  if (last.length >= 3 && last.reduce((a, e) => a + e.energy, 0) / last.length < 4)
    out.push({ text: 'Tu energía viene baja estos días. Prioriza bloques de 5 a 15 minutos y cuida tus pausas: avanzar poco también cuenta.' });
  return out.slice(0, 3);
}
let tlToken = 0;
async function renderTimeline() {
  const token = ++tlToken, log = state.moodLog.slice(-14);
  const spark = $('#moodSpark');
  if (log.length < 2) spark.innerHTML = '<p class="empty">Guarda tu check-in unos días y aquí verás cómo se mueve tu energía.</p>';
  else {
    const W = 600, H = 90, x = (i) => 14 + i * ((W - 28) / (log.length - 1)), y = (e) => H - 12 - ((e - 1) / 9) * (H - 28);
    spark.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Energía de tus últimos check-ins">
      <polyline fill="none" stroke="var(--cyan-400)" stroke-width="2.5" stroke-linejoin="round" points="${log.map((e, i) => `${x(i)},${y(e.energy)}`).join(' ')}"/>
      ${log.map((e, i) => `<circle cx="${x(i)}" cy="${y(e.energy)}" r="5" fill="${(MOODS[e.mood] || [])[2] || '#9CA3AF'}"><title>${e.d} · energía ${e.energy}</title></circle>`).join('')}</svg>`;
  }
  let entries = [];
  if (Journal.ok()) { try { entries = await Journal.all(); } catch (e) { entries = []; } }
  if (token !== tlToken) return;
  const texts = new Map(entries.map(e => [e.id, e.text]));
  const ins = analyzeJournal(entries);
  const box = $('#journalInsights');
  box.innerHTML = ins.length ? ins.map((i, n) => `<div class="j-insight"><p><strong>INSIGHT DE IA</strong></p><p>${esc(i.text)}</p>${i.action ? `<button class="btn primary sm" data-jins="${n}">${esc(i.action.label)}</button>` : ''}</div>`).join('')
    : `<p class="empty">${entries.length < 3 ? 'Escribe 3 o más notas en tu check-in y buscaremos patrones por ti.' : 'Aún no vemos patrones repetidos. Sigue escribiendo.'}</p>`;
  box.querySelectorAll('[data-jins]').forEach(b => b.addEventListener('click', () => ins[+b.dataset.jins].action.run()));
  const list = [...state.moodLog].slice(-10).reverse();
  $('#journalList').innerHTML = list.length ? list.map(e => {
    const m = MOODS[e.mood] || ['🙂', 'Sin ánimo marcado', '#9CA3AF'], t = e.jid ? texts.get(e.jid) : '';
    const when = new Date(e.ts).toLocaleString('es-PE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    return `<li style="--dot:${m[2]}"><div class="mt-head"><span>${esc(when)}</span><span class="pill">${m[0]} ${esc(m[1])}</span><span class="pill">⚡ ${e.energy}/10</span></div>${t ? `<p class="mt-text">${esc(t)}</p>` : ''}</li>`;
  }).join('') : '<li class="muted">Todavía no hay registros. Tu primer check-in aparecerá aquí.</li>';
}

// ============ RESCATE (vuelta amable) ============
function showRescue() {
  const r = state.rescue; if (!r) return;
  state.rescue = null; saveState();
  $('#rescueTitle').textContent = `Te extrañamos${state.user.name ? ', ' + state.user.name : ''}`;
  $('#rescueText').textContent = 'Tu bioma te espera. Empecemos con solo 5 minutos, sin presión.';
  $('#rescueSub').textContent = `Estuviste ${r.daysAway} días fuera, y está bien. Aquí no hay castigos: solo un primer paso pequeño.`;
  $('#rescueGuardian').textContent = guardian();
  openOverlay($('#rescueModal'));
}
$('#rescueGo').addEventListener('click', () => {
  closeOverlay($('#rescueModal'));
  state.focus.mode = 'noPerfection'; saveState();
  $$('input[name="mode"]').forEach(r => r.checked = r.value === 'noPerfection');
  updateTimerDuration(); switchView('focus', true);
  toast('Modo “Avance sin perfección” activado: solo 5 minutos 🌱');
});
$('#rescueLook').addEventListener('click', () => { closeOverlay($('#rescueModal')); switchView('biome', true); });

// ============ PERFIL ============
const ROLE_LABEL = { universitario: 'Estudiante universitario', remoto: 'Trabajador remoto', emprendedor: 'Emprendedor/a', opositor: 'Preparando un examen', mayor: 'Aprendiendo a mi ritmo', otro: 'Otro' };
function renderProfile() {
  const u = state.user, p = state.profile, ses = getSession() || {};
  $('#pfAvatar').textContent = (u.name || '🌱').charAt(0).toUpperCase();
  $('#pfGuardian').textContent = guardian();
  $('#pfName').textContent = u.name || 'Estudiante';
  $('#pfHandle').textContent = ses.username ? `@${ses.username} · ${ses.email}` : (ses.email || '');
  $('#pfMeta').textContent = [ROLE_LABEL[p.role], p.ageRange && `${p.ageRange} años`, p.institution].filter(Boolean).join(' · ') || 'Completa tu perfil para personalizar SYNCRO.';
  $('#pfLevel').textContent = `Nivel ${u.level} · ${levelTitle(u.level)}`;
  $('#pfStreak').textContent = `🔥 ${u.streak} días`;
  $('#pfAch').textContent = `🏅 ${ACHIEVEMENTS.filter(a => achUnlocked(a.id)).length}/${ACHIEVEMENTS.length} logros`;
  $('#pfBlocks').textContent = state.stats.blocks;
  $('#pfHours').textContent = (state.stats.minutes / 60).toFixed(1);
  $('#pfBest').textContent = bestStreak();
  $('#pfDrops').textContent = state.stats.dropsEarned.toLocaleString('es-PE');
  $('#pfNameInput').value = u.name; $('#pfUserInput').value = ses.username || ''; $('#pfEmailInput').value = ses.email || '';
  $('#pfRole').value = p.role || ''; $('#pfAge').value = p.ageRange || ''; $('#pfInstitution').value = p.institution || ''; $('#pfGoal').value = p.goal || '';
  $('#pfTrigger').value = p.trigger || ''; $('#pfSchedule').value = p.schedule || ''; $('#pfBlock').value = p.blockPref || 'classic'; $('#pfSeed').value = p.seed;
  $('#pfBienestar').checked = !!p.bienestarConsent; $('#pfReminder').checked = p.reminder !== false;
  $('#pfGuardianSel').innerHTML = Object.keys(GUARDIANS).map(k => {
    const lock = guardianLocked(k), need = lock ? ACHIEVEMENTS.find(a => a.id === GUARDIAN_LOCK[k]).name : '';
    return `<option value="${k}" ${lock ? 'disabled' : ''}>${GUARDIANS[k]} ${GUARDIAN_NAMES[k]}${lock ? ` · 🔒 logro “${need}”` : ''}</option>`;
  }).join('');
  $('#pfGuardianSel').value = p.guardian;
  setTheme(currentTheme(), false);
}
$('#profileForm').addEventListener('submit', e => {
  e.preventDefault();
  const p = state.profile, name = $('#pfNameInput').value.trim();
  if (!name) { $('#pfNameInput').focus(); return toast('Escribe tu nombre.'); }
  const oldBlock = p.blockPref, goal = $('#pfGoal').value.trim();
  state.user.name = name;
  Object.assign(p, {
    role: $('#pfRole').value || null, ageRange: $('#pfAge').value, institution: $('#pfInstitution').value.trim(), goal,
    trigger: $('#pfTrigger').value || null, schedule: $('#pfSchedule').value || null, blockPref: $('#pfBlock').value,
    seed: $('#pfSeed').value, guardian: guardianLocked($('#pfGuardianSel').value) ? p.guardian : $('#pfGuardianSel').value,
    bienestarConsent: $('#pfBienestar').checked, reminder: $('#pfReminder').checked,
  });
  if (p.blockPref !== oldBlock && !T.running) {
    state.focus.mode = p.blockPref;
    $$('input[name="mode"]').forEach(r => r.checked = r.value === p.blockPref); updateTimerDuration();
  }
  const gm = state.missions.find(m => m.id === 'goal');
  if (goal && gm) gm.title = `Dar el primer paso en: ${goal}`;
  else if (goal) state.missions.unshift({ id: 'goal', base: true, title: `Dar el primer paso en: ${goal}`, xp: 40, drops: 10, target: 1, progress: 0, done: false });
  else if (gm && !gm.done) state.missions = state.missions.filter(m => m.id !== 'goal');
  saveState(); renderDashboard(); renderMissions(); renderProfile(); renderCalTray(); blFaunaSig = '';
  $('#pfSaved').textContent = 'Cambios guardados ✓'; setTimeout(() => { $('#pfSaved').textContent = ''; }, 2500);
});
$('#pfExport').addEventListener('click', async () => {
  const ses = getSession() || {};
  let journal = []; if (Journal.ok()) { try { journal = (await Journal.all()).map(({ iv, ct, ...r }) => r); } catch (e) { } }
  download(`syncro-mis-datos-${keyOf(new Date())}.json`, JSON.stringify({ exportadoEl: new Date().toISOString(), cuenta: { nombre: ses.name, usuario: ses.username, correo: ses.email, proveedor: ses.provider }, estado: state, diario: journal }, null, 2), 'application/json');
  toast('Tus datos se descargaron como JSON.');
});
$('#pfClearJournal').addEventListener('click', () => {
  if (!confirm('¿Borrar todas las notas de tu diario? Esta acción no se puede deshacer.')) return;
  Journal.clear(); state.moodLog.forEach(e => { delete e.jid; }); saveState(); renderTimeline(); toast('Tu diario se borró de este dispositivo.');
});
$('#pfDeleteAccount').addEventListener('click', async () => {
  if (!confirm('¿Eliminar tu cuenta y todo tu progreso de este dispositivo? No se puede deshacer.')) return;
  const ses = getSession();
  try {
    if (ses) localStorage.setItem('syncro_users', JSON.stringify((JSON.parse(localStorage.getItem('syncro_users')) || []).filter(u => u.email !== ses.email)));
    Journal.clear(); await Journal.dropKey();
    localStorage.removeItem(KEY); localStorage.removeItem(SESSION_KEY);
  } catch (e) { }
  location.href = 'index.html';
});


// ============ BARRA LATERAL: CONTRAER / EXPANDIR (queda la tira de íconos) ============
$$('#sidebarNav .nav-item').forEach(b => {            // nombre accesible y tooltip cuando solo se ve el ícono
  const label = b.querySelector('span:not(.nav-lock-badge)')?.textContent.trim();
  if (label) { b.title = label; b.setAttribute('aria-label', label); }
});
function setSidebar(open, persist = true) {
  document.body.classList.toggle('sidebar-collapsed', !open);
  const t = $('#sidebarToggle');
  t.setAttribute('aria-expanded', String(open));
  t.setAttribute('aria-label', open ? 'Contraer barra lateral' : 'Expandir barra lateral');
  t.title = `${open ? 'Contraer' : 'Expandir'} barra lateral (Ctrl+B)`;
  if (persist) { try { localStorage.setItem('syncro_sidebar', open ? 'open' : 'closed'); } catch (e) { } }
}
$('#sidebarToggle').addEventListener('click', () => setSidebar(document.body.classList.contains('sidebar-collapsed')));
document.addEventListener('keydown', e => {            // Ctrl/Cmd + B también contrae y expande
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
    e.preventDefault(); setSidebar(document.body.classList.contains('sidebar-collapsed'));
  }
});
try { setSidebar(localStorage.getItem('syncro_sidebar') !== 'closed', false); } catch (e) { setSidebar(true, false); }

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
  try { setTheme(localStorage.getItem('syncro_theme') || 'dark', false); } catch (e) { setTheme('dark', false); }
  renderAchievements(); checkAchievements(true); updateWeatherUI(); renderTimeline();
  if (!state.onboarded) { openOverlay($('#onboarding')); stepShow(1); }
  else if (state.rescue) setTimeout(showRescue, 500);
  else if (msg) setTimeout(() => toast(msg), 600);
}
init();
