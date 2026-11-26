/**
 * SYNCRO — Estado Reactivo Centralizado y Catálogo de Dominio
 * Consolida el estado de usuario, perfil, misiones, calendario, bioma,
 * logros y sincronización local/remota a través de dbService.
 */

import { CONFIG } from '../config.js';
import { authService, resolveInstitutionFromEmail } from './../services/authService.js';
import { dbService } from './../services/dbService.js';

export const SEEDS = {
  cantuta: { name: 'Cantuta', stages: ['🌱', '🌿', '🌷', '🌺'] },
  'queñual': { name: 'Queñual', stages: ['🌱', '🌿', '🌲', '🌳'] },
  chachacoma: { name: 'Chachacoma', stages: ['🌱', '🌿', '🍀', '🪴'] },
};

export const GUARDIANS = { alpaca: '🦙', vicuna: '🦌', condor: '🦅', oso: '🐻' };
export const GUARDIAN_NAMES = {
  alpaca: 'Alpaca',
  vicuna: 'Vicuña',
  condor: 'Cóndor andino',
  oso: 'Oso de anteojos',
};
export const GUARDIAN_LOCK = { vicuna: 'blocks_3', condor: 'streak_7', oso: 'species_4' };

export const ACHIEVEMENTS = [
  { id: 'first_block', icon: '🌱', name: 'Primera semilla', desc: 'Completaste tu primer bloque de enfoque.' },
  { id: 'first_checkin', icon: '🌤', name: 'Te escuchaste', desc: 'Hiciste tu primer check-in emocional.' },
  { id: 'no_perf', icon: '✨', name: 'Avance sin perfección', desc: 'Empezaste con 5 minutos sin exigirte el 100%.' },
  { id: 'blocks_3', icon: '🦌', name: 'Vicuña curiosa', desc: 'Completaste 3 bloques. Desbloqueas al guardián Vicuña.' },
  { id: 'journal_1', icon: '🔒', name: 'Soltaste la mente', desc: 'Escribiste tu primera nota en el diario cifrado.' },
  { id: 'streak_3', icon: '🌈', name: 'Arcoíris andino', desc: 'Mantuviste tu constancia 3 días seguidos.' },
  { id: 'streak_7', icon: '🦅', name: 'Vuelo del cóndor', desc: '7 días de constancia. Desbloqueas al guardián Cóndor.' },
  { id: 'species_4', icon: '🐻', name: 'Santuario diverso', desc: 'Desbloqueaste 4 especies nativas y al Oso de Anteojos.' },
  { id: 'water_3', icon: '💧', name: 'Manos que riegan', desc: 'Regaste tu santuario 3 veces con tus gotas.' },
];

export const BASE_MISSIONS = [
  { id: 'm1', base: true, title: 'Hacer tu check-in emocional del día', xp: 20, drops: 5, target: 1, progress: 0, done: false },
  { id: 'm2', base: true, title: 'Completar 1 bloque de enfoque sin culpa', xp: 35, drops: 10, target: 1, progress: 0, done: false },
  { id: 'm3', base: true, title: 'Regar tu santuario o planificar 1 bloque', xp: 25, drops: 5, target: 1, progress: 0, done: false },
];

export function defaultState() {
  return {
    accountEmail: null,
    user: { name: '', xp: 0, level: 1, streak: 0, shields: 2, onboarded: false, toured: false, lastActive: null },
    profile: {
      role: null,
      ageRange: '',
      institution: '',
      goal: '',
      trigger: null,
      schedule: null,
      blockPref: 'classic',
      seed: 'cantuta',
      guardian: 'alpaca',
      bienestarConsent: false,
      journalAiOptIn: false,
      reminder: true,
      notifications: false,
      mouseleaveSensitivity: 'normal', // 'off' | 'normal' | 'strict'
    },
    checkIn: { energy: 5, mood: null, lowEnergy: false, date: null },
    missions: BASE_MISSIONS.map((m) => ({ ...m })),
    plan: { est: 10, real: 6, task: '', days: 10, steps: [] },
    focus: {
      mode: 'classic',
      shield: true,
      autoFs: true,
      soundOn: false,
      sound: 'rain',
      soundVolume: 70,
      alarmTone: 'chime',
      alarmVolume: 80,
      alarmMuted: false,
      activeMission: null,
    },
    biome: { drops: 0, earth: 0, collectiveHours: 0, waters: 0 },
    calendar: { slots: [], weekOffset: 0 },
    daily: { date: null, distractions: 0, blocks: 0 },
    stats: { blocks: 0, minutes: 0, totalMinutes: 0, dropsEarned: 0, noPerfBlocks: 0, checkIns: 0 },
    history: {},
    weekly: [0, 0, 0, 0, 0, 0, 0],
    moodLogs: [],
    achievements: {},
    ui: { sidebarCollapsed: false },
  };
}

export function keyOf(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dayIdx(d = new Date()) {
  return (d.getDay() + 6) % 7;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function deepMerge(base, patch) {
  if (!patch || typeof patch !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = deepMerge(base[k], v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

const listeners = new Set();

export let state = loadInitialState();

export function loadInitialState() {
  const saved = dbService.loadLocalState();
  const merged = deepMerge(defaultState(), saved || {});
  const ses = authService.ensureGuestSession();

  if (ses?.email && !merged.accountEmail) {
    merged.accountEmail = ses.email;
  }
  if (ses?.name && ses.mode !== 'guest' && !merged.user.name) {
    merged.user.name = ses.name;
  }

  // Limpiar contadores diarios si cambió la fecha
  const today = keyOf();
  if (merged.daily.date !== today) {
    merged.daily = { date: today, distractions: 0, blocks: 0 };
  }
  return merged;
}

export function replaceState(next) {
  state = deepMerge(defaultState(), next);
  saveState();
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let cloudSyncTimer = null;
export function saveState() {
  dbService.saveLocalState(state);
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch {
      // ignore
    }
  });
  clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    dbService.syncStateToCloud(state);
  }, 1500);
}

export function seed() {
  return SEEDS[state.profile.seed] || SEEDS.cantuta;
}

export function guardian() {
  return GUARDIANS[state.profile.guardian] || '🦙';
}

export function achUnlocked(id) {
  return Boolean(state.achievements[id]);
}

export function guardianLocked(key) {
  const req = GUARDIAN_LOCK[key];
  return req ? !achUnlocked(req) : false;
}

export function levelTitle(lvl) {
  if (lvl < 3) return 'Iniciando';
  if (lvl < 6) return 'Constante';
  if (lvl < 10) return 'Guardián del Enfoque';
  return 'Protector Andino';
}

export function addXP(amount) {
  let ups = 0;
  state.user.xp += amount;
  while (state.user.xp >= 300) {
    state.user.xp -= 300;
    state.user.level += 1;
    ups += 1;
  }
  return ups;
}

export function addDrops(amount) {
  state.biome.drops += amount;
  state.stats.dropsEarned += amount;
}

export function markActive() {
  const today = keyOf();
  state.history[today] = (state.history[today] || 0) + 1;
  if (state.user.lastActive === today) return;
  const yesterday = keyOf(new Date(Date.now() - 86400000));
  if (state.user.lastActive === yesterday) {
    state.user.streak += 1;
  } else if (!state.user.lastActive) {
    state.user.streak = 1;
  } else if (state.user.shields > 0) {
    state.user.shields -= 1;
    state.user.streak += 1;
  } else {
    state.user.streak = 1;
  }
  state.user.lastActive = today;
}

export function bestStreak() {
  const dates = Object.keys(state.history || {}).sort();
  if (!dates.length) return state.user.streak || 0;
  let best = 1;
  let cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T12:00:00');
    const curr = new Date(dates[i] + 'T12:00:00');
    const diff = Math.round((curr - prev) / 86400000);
    if (diff === 1) {
      cur += 1;
      if (cur > best) best = cur;
    } else if (diff > 1) {
      cur = 1;
    }
  }
  return Math.max(best, state.user.streak || 0);
}

/**
 * Resuelve dinámicamente el nombre de red de bienestar / convenio B2B
 * a partir del correo institucional o institución declarada en el perfil.
 */
export function resolveActiveInstitution() {
  const ses = authService.getSession();
  const byEmail = resolveInstitutionFromEmail(ses?.email || '');
  if (byEmail) return byEmail;

  const customInst = (state.profile.institution || '').trim();
  if (customInst) {
    return {
      name: customInst,
      wellbeingLabel: `Red de Bienestar · ${customInst}`,
      communityLabel: `Comunidad · ${customInst}`,
      plan: ses?.plan || 'free',
    };
  }
  return {
    name: null,
    wellbeingLabel: 'Red de Bienestar',
    communityLabel: 'Comunidad',
    plan: ses?.plan || 'free',
  };
}

export function isDevMode() {
  return CONFIG.devMode;
}
