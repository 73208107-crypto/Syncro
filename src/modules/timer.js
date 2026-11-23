/**
 * SYNCRO — Módulo de Temporizador Adaptativo, Bioacústica WebAudio,
 * Pausas Guiadas y Escudo de Pestaña (con sensibilidad mouseleave configurable).
 * Mantiene el temporizador basado en reloj del sistema (Date.now()) para evitar desfases.
 */

import {
  state,
  saveState,
  seed,
  guardian,
  GUARDIAN_NAMES,
  addXP,
  addDrops,
  markActive,
  dayIdx,
  isDevMode,
} from '../core/state.js';
import { $, $$, toast, openOverlay, closeOverlay, celebrate } from '../ui/modals.js';
import { analyticsService } from '../services/analyticsService.js';
import { dbService } from '../services/dbService.js';
import { authService } from '../services/authService.js';

const BASE_TITLE = document.title;

export const MODES = {
  classic: { label: 'Enfoque clásico · 25 / 5', focus: 25 * 60, brk: 5 * 60 },
  deep: { label: 'Enfoque profundo · 50 / 10', focus: 50 * 60, brk: 10 * 60 },
  noPerfection: { label: 'Avance sin perfección · 5 min (reloj oculto)', focus: 5 * 60, brk: 2 * 60, hideClock: true },
};

const BREAK_GUIDES = {
  breath: [
    'Inhala suavemente por la nariz (4s)…',
    'Sostén el aire sin tensión (4s)…',
    'Exhala despacio por la boca (4s)…',
    'Descansa en calma antes del siguiente ciclo (4s)…',
  ],
  twenty: [
    'Mira un punto lejano a más de 6 metros durante 20 segundos.',
    'Parpadea despacio para lubricar los ojos y relaja la mandíbula.',
    'Suelta los hombros y aleja la mirada de la pantalla.',
    'Respira profundo antes de retomar.',
  ],
  stretch: [
    'Estira los brazos hacia arriba y alarga la espalda.',
    'Gira suavemente el cuello de izquierda a derecha.',
    'Rota los hombros hacia atrás 5 veces.',
    'Sacude las manos y relaja las muñecas.',
  ],
};

// ============ MOTOR DE AUDIO (WebAudio procedural sin descargas) ============
export const Sound = {
  ctx: null,
  master: null,
  srcs: [],

  _ensureCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!this.ctx) this.ctx = new AC();
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  },

  _noiseBuffer(type) {
    const ctx = this.ctx;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        data[i] = last * 3.5;
      } else {
        data[i] = w * 0.45;
      }
    }
    return buf;
  },

  play(kind = state.focus.sound) {
    this.stop();
    const ctx = this._ensureCtx();
    if (!ctx) return;

    const vol = Math.max(0, Math.min(1, (state.focus.soundVolume ?? 70) / 100));
    const master = (this.master = ctx.createGain());
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(vol * 0.7, ctx.currentTime + 0.8);

    const add = (node) => (this.srcs.push(node), node);
    const noise = (type) => {
      const s = add(ctx.createBufferSource());
      s.buffer = this._noiseBuffer(type);
      s.loop = true;
      s.start();
      return s;
    };
    const filt = (type, freq, q = 1) => {
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    };
    const gain = (v) => {
      const g = ctx.createGain();
      g.gain.value = v;
      return g;
    };
    const chain = (...nodes) => nodes.reduce((a, b) => (a.connect(b), b));

    if (kind === 'rain') {
      chain(noise('white'), filt('highpass', 900), filt('lowpass', 6500), gain(0.22), master);
    } else if (kind === 'wind') {
      const g = gain(0.35);
      chain(noise('brown'), filt('bandpass', 500, 0.6), g, master);
      const lfo = add(ctx.createOscillator());
      lfo.frequency.value = 0.12;
      const d = gain(0.15);
      lfo.connect(d);
      d.connect(g.gain);
      lfo.start();
    } else if (kind === 'fire') {
      chain(noise('brown'), filt('lowpass', 380), gain(0.35), master);
      chain(noise('white'), filt('bandpass', 2400, 1.2), gain(0.05), master);
    } else if (kind === 'river') {
      chain(noise('brown'), filt('bandpass', 720, 0.5), gain(0.3), master);
      chain(noise('white'), filt('lowpass', 1800), gain(0.08), master);
    } else if (kind === 'night') {
      chain(noise('brown'), filt('lowpass', 280), gain(0.18), master);
      const osc = add(ctx.createOscillator());
      osc.type = 'sine';
      osc.frequency.value = 4100;
      const g = gain(0.015);
      chain(osc, g, master);
      osc.start();
    } else if (kind === 'lofi') {
      [220, 277.18, 329.63].forEach((freq) => {
        const osc = add(ctx.createOscillator());
        osc.type = 'triangle';
        osc.frequency.value = freq;
        chain(osc, filt('lowpass', 600), gain(0.05), master);
        osc.start();
      });
    } else if (kind === 'binaural') {
      [
        [-1, 200],
        [1, 240],
      ].forEach(([panVal, freq]) => {
        const osc = add(ctx.createOscillator());
        osc.type = 'sine';
        osc.frequency.value = freq;
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) {
          pan.pan.value = panVal;
          chain(osc, gain(0.08), pan, master);
        } else {
          chain(osc, gain(0.06), master);
        }
        osc.start();
      });
    }
  },

  setVolume(val) {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, val / 100)) * 0.7, this.ctx.currentTime, 0.1);
    }
  },

  stop() {
    if (!this.master) return;
    const m = this.master;
    const s = this.srcs;
    try {
      m.gain.cancelScheduledValues(0);
      m.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
    } catch {
      // ignore
    }
    setTimeout(() => {
      s.forEach((n) => {
        try {
          n.stop();
        } catch {
          // ignore
        }
      });
      try {
        m.disconnect();
      } catch {
        // ignore
      }
    }, 350);
    this.master = null;
    this.srcs = [];
  },

  alarm(tone = state.focus.alarmTone) {
    if (state.focus.alarmMuted) return;
    const ctx = this._ensureCtx();
    if (!ctx) return;
    const vol = Math.max(0.05, ((state.focus.alarmVolume ?? 80) / 100) * 0.25);
    const freqs = tone === 'bowl' ? [256, 384] : tone === 'alert' ? [660, 880, 660] : [523.25, 659.25, 783.99];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = tone === 'bowl' ? 'sine' : 'triangle';
      osc.frequency.value = f;
      const t0 = ctx.currentTime + idx * 0.18;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (tone === 'bowl' ? 1.1 : 0.45));
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 1.2);
    });
  },
};

// ============ NOTIFICACIONES ============
export const Notify = {
  supported() {
    return typeof Notification !== 'undefined';
  },
  async request() {
    if (!this.supported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    return Notification.requestPermission();
  },
  send(title, body, tag = 'syncro') {
    if (!state.profile.notifications || !this.supported() || Notification.permission !== 'granted') return;
    try {
      new Notification(title, { body, tag, icon: './icons/icon-192.png' });
    } catch {
      // ignore
    }
  },
};

// ============ ESTADO DEL TEMPORIZADOR (basado en Date.now()) ============
export const T = {
  running: false,
  duration: 25 * 60,
  remaining: 25 * 60,
  endAt: null,
  interval: null,
  breakInterval: null,
  breakEndAt: null,
  breakKind: 'breath',
  breakPhase: 0,
};

let callbacks = {
  onComplete: () => {},
  onSwitchView: () => {},
};
let pendingView = null;
let lastExitAlert = 0;

export function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function fsEl() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export function exitFullscreen() {
  if (fsEl()) {
    (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {});
  }
}

export function enterFullscreen() {
  const el = document.documentElement;
  (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {});
}

export function updateTimerDuration() {
  const m = MODES[state.focus.mode] || MODES.classic;
  const adapted = state.checkIn.lowEnergy && state.focus.mode === 'classic' ? 15 * 60 : m.focus;
  T.duration = adapted;
  T.remaining = adapted;
  renderTimer();
}

export function renderTimer() {
  const m = MODES[state.focus.mode] || MODES.classic;
  const display = $('#timerDisplay');
  const fill = $('#timerFill');
  const modeLabel = $('#timerModeLabel');
  const seedVis = $('#seedVisual');
  const startBtn = $('#startPauseBtn');
  const ribbon = $('#focusTopRibbon');
  const ribbonTimer = $('#ribbonTimer');
  const ribbonGuardian = $('#ribbonGuardian');

  const pct = T.duration > 0 ? Math.min(100, Math.max(0, ((T.duration - T.remaining) / T.duration) * 100)) : 0;
  if (display) {
    display.textContent = m.hideClock && T.running ? 'En curso ✨' : formatTime(T.remaining);
  }
  if (fill) fill.style.width = `${pct}%`;
  if (modeLabel) {
    modeLabel.textContent =
      state.checkIn.lowEnergy && state.focus.mode === 'classic'
        ? 'Modo ligero automático · 15 / 5'
        : m.label;
  }
  if (seedVis) {
    const stages = seed().stages;
    const idx = Math.min(stages.length - 1, Math.floor((pct / 100) * stages.length));
    seedVis.textContent = stages[idx];
  }
  if (startBtn) startBtn.textContent = T.running ? 'Pausar' : T.remaining < T.duration ? 'Continuar' : 'Iniciar';
  if (ribbon) ribbon.classList.toggle('hidden', !T.running);
  if (ribbonTimer) ribbonTimer.textContent = formatTime(T.remaining);
  if (ribbonGuardian) ribbonGuardian.textContent = `${guardian()} Tu guardián protege tu semilla`;

  document.body.classList.toggle('focus-locked', T.running && state.focus.shield);
}

export function startTimer() {
  if (T.running) return;
  T.running = true;
  T.endAt = Date.now() + T.remaining * 1000;
  if (state.focus.autoFs && !fsEl()) enterFullscreen();
  if (state.focus.soundOn) Sound.play(state.focus.sound);

  clearInterval(T.interval);
  T.interval = setInterval(() => {
    T.remaining = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000));
    renderTimer();
    if (T.remaining <= 0) {
      completeFocusBlock();
    }
  }, 500);
  renderTimer();
}

export function pauseTimer() {
  if (!T.running) return;
  T.running = false;
  clearInterval(T.interval);
  T.interval = null;
  if (T.endAt) T.remaining = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1000));
  T.endAt = null;
  Sound.stop();
  renderTimer();
}

function resetTimer() {
  pauseTimer();
  exitFullscreen();
  updateTimerDuration();
}

function completeFocusBlock() {
  pauseTimer();
  exitFullscreen();
  Sound.alarm();

  const mins = Math.max(5, Math.round(T.duration / 60));
  const xp = Math.max(20, mins * 2);
  const drops = Math.max(4, Math.round(mins / 3));

  markActive();
  const ups = addXP(xp);
  addDrops(drops);

  state.stats.blocks += 1;
  state.stats.minutes += mins;
  state.stats.totalMinutes = (state.stats.totalMinutes || 0) + mins;
  if (state.focus.mode === 'noPerfection') state.stats.noPerfBlocks += 1;
  state.daily.blocks += 1;
  state.weekly[dayIdx()] = Math.round(((state.weekly[dayIdx()] || 0) + mins / 60) * 10) / 10;
  state.biome.collectiveHours = Math.round(((state.biome.collectiveHours || 0) + mins / 60) * 10) / 10;

  if (state.focus.activeMission) {
    const m = state.missions.find((x) => x.id === state.focus.activeMission && !x.done);
    if (m) {
      m.progress = Math.min(m.target, (m.progress || 0) + 1);
      if (m.progress >= m.target) m.done = true;
    }
  }

  saveState();
  dbService.logFocusSession({ durationMinutes: mins, mode: state.focus.mode, missionId: state.focus.activeMission });
  analyticsService.trackOnce('first_block_completed', { duration_min: mins, mode: state.focus.mode });
  analyticsService.track('block_completed', { duration_min: mins, mode: state.focus.mode });

  Notify.send('🎉 ¡Bloque completado!', `+${xp} XP y +${drops} gotas para tu santuario.`, 'syncro-block-done');

  T.remaining = T.duration;
  renderTimer();
  callbacks.onComplete({ mins, xp, drops, ups });

  // Si es invitado y es su primer bloque, invitar amablemente a crear cuenta
  const ses = authService.getSession();
  if (ses?.mode === 'guest' && state.stats.blocks === 1) {
    openOverlay($('#guestSignupModal'));
  } else {
    celebrate(
      '¡Bloque completado!',
      `+${xp} XP · +${drops} Gotas de riego${ups ? ` · ¡Subiste al Nivel ${state.user.level}!` : ''}`,
      seed().stages[3]
    );
  }

  startGuidedBreak();
}

// ============ PAUSA GUIADA ============
function startGuidedBreak() {
  const box = $('#guidedBreak');
  if (!box) return;
  const m = MODES[state.focus.mode] || MODES.classic;
  box.classList.remove('hidden');
  T.breakEndAt = Date.now() + m.brk * 1000;
  T.breakPhase = 0;

  clearInterval(T.breakInterval);
  const tick = () => {
    const left = Math.max(0, Math.ceil((T.breakEndAt - Date.now()) / 1000));
    const clock = $('#breakClock');
    if (clock) clock.textContent = formatTime(left);
    const lines = BREAK_GUIDES[T.breakKind] || BREAK_GUIDES.breath;
    const textEl = $('#guidedText');
    const circle = $('#breathCircle');
    const phaseIdx = Math.floor(((m.brk - left) / 4) % lines.length);
    if (textEl) textEl.textContent = lines[phaseIdx];
    if (circle) circle.dataset.phase = String(phaseIdx);
    if (left <= 0) endGuidedBreak();
  };
  tick();
  T.breakInterval = setInterval(tick, 1000);
}

function endGuidedBreak() {
  clearInterval(T.breakInterval);
  T.breakInterval = null;
  $('#guidedBreak')?.classList.add('hidden');
}

// ============ ESCUDO DE PESTAÑA (WEB) ============
export function renderShield() {
  const on = state.focus.shield;
  const s = $('#shieldStatus');
  if (s) {
    s.textContent = on ? 'ACTIVO' : 'INACTIVO';
    s.classList.toggle('emerald', on);
  }
  const toggleBtn = $('#toggleShield');
  if (toggleBtn) toggleBtn.textContent = on ? 'Pausar' : 'Activar';
  const simBtn = $('#simulateDistraction');
  if (simBtn) {
    simBtn.disabled = !on;
    if (isDevMode()) simBtn.classList.add('dev-visible');
  }
  const muteBtn = $('#muteAlertSoundBtn');
  if (muteBtn) muteBtn.textContent = state.focus.alarmMuted ? '🔇 Silenciado' : '🔔 Sonido activo';
}

export function triggerExitAlert(reason = 'Cambio de pestaña o ventana') {
  const modal = $('#blockModal');
  if (!modal || !modal.classList.contains('hidden')) return;
  lastExitAlert = Date.now();
  if (T.running) pauseTimer();

  const u = state.user;
  const mins = Math.round(T.duration / 60);
  if ($('#alertReasonBadge')) $('#alertReasonBadge').textContent = 'PAUSA CONSCIENTE';
  if ($('#alertUserName')) $('#alertUserName').textContent = (u.name || 'estudiante').split(' ')[0];
  if ($('#alertSeedTitleInline')) $('#alertSeedTitleInline').textContent = seed().name;
  if ($('#alertGuardianEmoji')) $('#alertGuardianEmoji').textContent = guardian();
  if ($('#alertHealthySeed')) $('#alertHealthySeed').textContent = seed().stages[2] || '🌱';
  if ($('#blockMinutesLeft')) $('#blockMinutesLeft').textContent = `${formatTime(T.remaining)} restantes`;
  if ($('#alertReward')) $('#alertReward').textContent = `+${Math.max(10, mins)} XP`;
  if ($('#alertDropsReward')) $('#alertDropsReward').textContent = `+${Math.max(2, Math.round(mins / 5))} 💧`;
  if ($('#alertStreakRisk')) $('#alertStreakRisk').textContent = `🔥 ${u.streak} días`;
  if ($('#alertReasonText')) $('#alertReasonText').textContent = reason;

  state.daily.distractions += 1;
  saveState();
  openOverlay(modal);
  Sound.alarm();
  document.title = '⏸ En pausa · SYNCRO';
  if (document.hidden) {
    Notify.send('⏸ Pausa consciente · SYNCRO', 'Tu bloque está en pausa protegida. Vuelve cuando quieras continuar.', 'syncro-shield');
  }
}

export function requestViewLeave(viewName) {
  pendingView = viewName;
  triggerExitAlert(`Intento de ir a "${viewName.toUpperCase()}" durante el enfoque`);
}

export function initTimerModule({ onComplete, onSwitchView }) {
  callbacks = { onComplete, onSwitchView };

  // Controles del temporizador
  $('#startPauseBtn')?.addEventListener('click', () => (T.running ? pauseTimer() : startTimer()));
  $('#resetBtn')?.addEventListener('click', resetTimer);
  $('#addFiveBtn')?.addEventListener('click', () => {
    T.duration += 5 * 60;
    T.remaining += 5 * 60;
    if (T.running && T.endAt) T.endAt += 5 * 60 * 1000;
    renderTimer();
    toast('+5 minutos añadidos al bloque.');
  });
  $('#fsToggle')?.addEventListener('click', () => {
    if (fsEl()) exitFullscreen();
    else enterFullscreen();
  });
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(fsEl());
    const btn = $('#fsToggle');
    if (btn) btn.setAttribute('aria-pressed', String(active));
    if (!active && T.running && state.focus.shield && state.focus.autoFs) {
      triggerExitAlert('Saliste de pantalla completa durante el enfoque');
    }
  });

  // Selector de modo Pomodoro
  $$('input[name="mode"]').forEach((radio) => {
    radio.checked = radio.value === state.focus.mode;
    radio.addEventListener('change', () => {
      if (T.running) {
        toast('Pausa el bloque actual para cambiar de modo.');
        radio.checked = false;
        const cur = $(`input[name="mode"][value="${state.focus.mode}"]`);
        if (cur) cur.checked = true;
        return;
      }
      state.focus.mode = radio.value;
      saveState();
      updateTimerDuration();
    });
  });

  const autoFs = $('#autoFs');
  if (autoFs) {
    autoFs.checked = Boolean(state.focus.autoFs);
    autoFs.addEventListener('change', () => {
      state.focus.autoFs = autoFs.checked;
      saveState();
    });
  }

  // Burbuja sonora
  const syncSoundUI = () => {
    const btn = $('#soundToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', String(state.focus.soundOn));
      btn.textContent = state.focus.soundOn ? '🔊 Sonido activo' : '🔇 Sonido apagado';
    }
    $$('#soundList .sound-item').forEach((b) => b.classList.toggle('active', b.dataset.sound === state.focus.sound));
    const vol = $('#soundVolume');
    const lbl = $('#soundVolLabel');
    if (vol) vol.value = String(state.focus.soundVolume ?? 70);
    if (lbl) lbl.textContent = `${state.focus.soundVolume ?? 70}%`;
    const toneSel = $('#alarmToneSelect');
    const aVol = $('#alarmVolume');
    const aLbl = $('#alarmVolLabel');
    if (toneSel) toneSel.value = state.focus.alarmTone || 'chime';
    if (aVol) aVol.value = String(state.focus.alarmVolume ?? 80);
    if (aLbl) aLbl.textContent = `${state.focus.alarmVolume ?? 80}%`;
  };

  $('#soundToggle')?.addEventListener('click', () => {
    state.focus.soundOn = !state.focus.soundOn;
    saveState();
    if (state.focus.soundOn) Sound.play(state.focus.sound);
    else Sound.stop();
    syncSoundUI();
  });

  $$('#soundList .sound-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.focus.sound = btn.dataset.sound;
      saveState();
      if (state.focus.soundOn) Sound.play(state.focus.sound);
      syncSoundUI();
    });
  });

  $('#soundVolume')?.addEventListener('input', (e) => {
    state.focus.soundVolume = Number(e.target.value);
    Sound.setVolume(state.focus.soundVolume);
    saveState();
    syncSoundUI();
  });

  $('#alarmToneSelect')?.addEventListener('change', (e) => {
    state.focus.alarmTone = e.target.value;
    saveState();
  });

  $('#alarmVolume')?.addEventListener('input', (e) => {
    state.focus.alarmVolume = Number(e.target.value);
    saveState();
    syncSoundUI();
  });

  $('#testAlarmBtn')?.addEventListener('click', () => Sound.alarm(state.focus.alarmTone));

  // Pausas guiadas
  $$('#guidedBreak [data-break]').forEach((chip) => {
    chip.addEventListener('click', () => {
      T.breakKind = chip.dataset.break;
      $$('#guidedBreak [data-break]').forEach((c) => c.classList.toggle('active', c === chip));
    });
  });
  $('#endBreak')?.addEventListener('click', endGuidedBreak);

  // Escudo de pestaña
  $('#toggleShield')?.addEventListener('click', () => {
    state.focus.shield = !state.focus.shield;
    saveState();
    renderShield();
  });
  $('#simulateDistraction')?.addEventListener('click', () => triggerExitAlert('Prueba de pausa consciente (modo desarrollador)'));
  $('#muteAlertSoundBtn')?.addEventListener('click', () => {
    state.focus.alarmMuted = !state.focus.alarmMuted;
    saveState();
    renderShield();
  });

  $('#stayFocused')?.addEventListener('click', () => {
    closeOverlay($('#blockModal'));
    document.title = BASE_TITLE;
    pendingView = null;
    callbacks.onSwitchView('focus', true);
    startTimer();
    toast(`¡Seguimos! Tu ${seed().name} continúa creciendo.`);
  });

  $('#leaveAnyway')?.addEventListener('click', () => {
    closeOverlay($('#blockModal'));
    document.title = BASE_TITLE;
    pauseTimer();
    exitFullscreen();
    const elapsedSec = T.duration - T.remaining;
    const elapsedMin = Math.floor(elapsedSec / 60);
    if (elapsedMin >= 2) {
      const xpGained = Math.round(elapsedMin * 1.5);
      const dropsGained = Math.max(1, Math.round(elapsedMin / 5));
      addXP(xpGained); // Bug fix: anteriormente llamaba addXp (ReferenceError)
      addDrops(dropsGained);
      state.stats.totalMinutes = (state.stats.totalMinutes || 0) + elapsedMin;
      state.stats.minutes = (state.stats.minutes || 0) + elapsedMin;
      state.weekly[dayIdx()] = Math.round(((state.weekly[dayIdx()] || 0) + elapsedMin / 60) * 10) / 10;
      saveState();
      callbacks.onComplete({ mins: elapsedMin, xp: xpGained, drops: dropsGained, ups: 0 });
      toast(`Bloque finalizado sin culpa. Guardamos tus ${elapsedMin} min (+${xpGained} XP, +${dropsGained} 💧).`);
    } else {
      toast('Bloque pausado sin culpa. Respira y vuelve cuando estés listo.');
    }
    T.remaining = T.duration;
    renderTimer();
    if (pendingView) {
      const dest = pendingView;
      pendingView = null;
      callbacks.onSwitchView(dest, true);
    }
  });

  // Detector de mouseleave con sensibilidad configurable desde Perfil
  document.addEventListener('mouseleave', (e) => {
    const sens = state.profile.mouseleaveSensitivity || 'normal';
    if (sens === 'off') return;
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (isTouch || !T.running || !state.focus.shield || fsEl()) return;
    const thresholdY = sens === 'strict' ? 40 : 12;
    const triggerByEdge = sens === 'strict' ? true : e.clientY <= thresholdY;
    if (triggerByEdge && Date.now() - lastExitAlert > 4000) {
      triggerExitAlert('Cursor saliendo hacia la barra del navegador');
    }
  });

  document.addEventListener('visibilitychange', () => {
    const isTouch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (isTouch) return;
    if (document.hidden && T.running && state.focus.shield) {
      triggerExitAlert('Cambio de pestaña o ventana durante el enfoque');
    }
  });

  $('#closeGuestSignupModal')?.addEventListener('click', () => closeOverlay($('#guestSignupModal')));

  syncSoundUI();
  renderShield();
  updateTimerDuration();
}
