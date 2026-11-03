// ===================================================
// SYNCRO · MVP · app.js
// Estado persistente en localStorage + SPA + Pomodoro
// ===================================================

const STORAGE_KEY = 'syncro_state_v2';

const defaultState = {
  user: {
    name: 'Guillermo',
    level: 12,
    xp: 850,
    xpMax: 1000,
    streak: 12,
    shields: 2,
    drops: 1240,
    earthPoints: 320,
  },
  checkIn: { energy: 5, mood: null, saved: false, lowEnergy: false },
  missions: [
    { id: 'm1', title: 'Completar 2 sesiones Pomodoro de Estructura de Datos', xp: 50, drops: 15, done: false },
    { id: 'm2', title: 'Redactar primer borrador del informe de Liderazgo', xp: 40, drops: 10, done: false },
    { id: 'm3', title: 'Leer 10 páginas de bibliografía', xp: 30, drops: 5, done: false },
  ],
  focus: { mode: 'classic', sound: 'rain', shield: true },
  weekly: [3, 4.5, 2, 5, 3.5, 1, 0.5],
  onboarded: false,
};

let state = loadState();
let timerState = {
  running: false,
  remaining: 25 * 60,
  interval: null,
  duration: 25 * 60,
};

// ============ PERSISTENCIA ============
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState, ...JSON.parse(raw) };
  } catch (e) { console.warn('Estado corrupto, reiniciando.'); }
  return JSON.parse(JSON.stringify(defaultState));
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ============ HELPERS ============
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function getModeDuration(mode) {
  if (mode === 'deep') return 50 * 60;
  if (mode === 'noPerfection') return 5 * 60;
  // classic
  if (state.checkIn.lowEnergy) return 15 * 60;
  return 25 * 60;
}

function formatTime(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function modeLabel() {
  const m = state.focus.mode;
  if (m === 'deep') return 'Enfoque profundo · 50 / 10';
  if (m === 'noPerfection') return 'Avance sin perfección · 5 min (reloj oculto)';
  if (state.checkIn.lowEnergy) return 'Enfoque ligero · 15 / 5';
  return 'Enfoque clásico · 25 / 5';
}

// ============ NAVEGACIÓN ============
function switchView(view) {
  $$('.view').forEach(v => v.classList.remove('active'));
  const target = $('#view-' + view);
  if (target) target.classList.add('active');

  $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
  $$('.bn-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});
$$('[data-goto]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.goto));
});

// ============ RENDER: DASHBOARD ============
function renderDashboard() {
  const u = state.user;
  $('#greeting').textContent = `¡Hola, ${u.name}!`;
  $('#streakDays').textContent = u.streak;
  $('#shieldsCount').textContent = u.shields;
  $('#sidebarName').textContent = u.name;
  $('#sidebarLevel').textContent = `Nivel ${u.level}`;
  $('#sidebarAvatar').textContent = u.name.charAt(0);

  $('#levelTag').textContent = `Nivel ${u.level} · Guardián Enfocado`;
  $('#xpText').textContent = `${u.xp} / ${u.xpMax} XP`;
  $('#xpFill').style.width = `${(u.xp / u.xpMax) * 100}%`;

  $('#dropsCount').textContent = u.drops;
  $('#earthCount').textContent = u.earthPoints;
  $('#biomeDrops').textContent = u.drops;
  $('#biomeEarth').textContent = u.earthPoints;

  // Bioma progress basado en misiones completadas
  const done = state.missions.filter(m => m.done).length;
  $('#biomeFill').style.width = `${Math.max(15, (done / state.missions.length) * 100)}%`;

  // Check-in
  $('#energyValue').textContent = state.checkIn.energy;
  $('#energyRange').value = state.checkIn.energy;
  $$('#moodChips .chip').forEach(c =>
    c.classList.toggle('active', c.dataset.mood === state.checkIn.mood)
  );
  const banner = $('#checkInBanner');
  banner.classList.toggle('hidden', !state.checkIn.saved || !state.checkIn.lowEnergy);
}

// ============ RENDER: MISIONES ============
function renderMissions() {
  const list = $('#missionsList');
  const durationLabel = state.checkIn.lowEnergy ? '15 min (adaptado)' : '25 min';
  list.innerHTML = state.missions.map(m => `
    <div class="mission ${m.done ? 'done' : ''}" data-id="${m.id}">
      <button class="mission-check" aria-label="Completar misión">✓</button>
      <div class="mission-info">
        <div class="mission-title">${m.title}</div>
        <div class="mission-meta">
          <span class="pill violet">+${m.xp} XP</span>
          <span class="pill emerald">+${m.drops} Gotas</span>
          <span class="pill">${durationLabel}</span>
        </div>
      </div>
      <button class="btn ghost sm" data-start="${m.id}">Iniciar</button>
    </div>
  `).join('');

  const doneCount = state.missions.filter(m => m.done).length;
  $('#missionsCount').textContent = `${doneCount} / ${state.missions.length}`;

  list.querySelectorAll('.mission').forEach(row => {
    const id = row.dataset.id;
    row.querySelector('.mission-check').addEventListener('click', () => completeMission(id));
    row.querySelector('[data-start]').addEventListener('click', () => {
      switchView('focus');
    });
  });
}

// ============ CHECK-IN ============
$('#energyRange')?.addEventListener('input', (e) => {
  state.checkIn.energy = Number(e.target.value);
  $('#energyValue').textContent = state.checkIn.energy;
});

$$('#moodChips .chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const isActive = chip.classList.contains('active');
    $$('#moodChips .chip').forEach(c => c.classList.remove('active'));
    state.checkIn.mood = isActive ? null : chip.dataset.mood;
    if (!isActive) chip.classList.add('active');
  });
});

$('#saveCheckIn')?.addEventListener('click', () => {
  state.checkIn.saved = true;
  state.checkIn.lowEnergy = state.checkIn.energy <= 3 || state.checkIn.mood === 'ansioso';
  saveState();
  renderDashboard();
  renderMissions();
  updateTimerDuration();
});

// ============ XP / NIVEL / DROPS ============
function addXP(amount) {
  state.user.xp += amount;
  while (state.user.xp >= state.user.xpMax) {
    state.user.xp -= state.user.xpMax;
    state.user.level += 1;
  }
}
function addDrops(amount) {
  state.user.drops += amount;
  state.user.earthPoints += Math.round(amount / 4);
}

function completeMission(id) {
  const mission = state.missions.find(m => m.id === id);
  if (!mission || mission.done) return;

  mission.done = true;
  addXP(mission.xp);
  addDrops(mission.drops);
  state.user.streak = state.user.streak || 1;
  saveState();
  renderDashboard();
  renderMissions();

  $('#missionModalText').textContent = `+${mission.xp} XP · +${mission.drops} Gotas de riego`;
  $('#missionModal').classList.remove('hidden');
}

$('#closeMissionModal')?.addEventListener('click', () => {
  $('#missionModal').classList.add('hidden');
});

// ============ TIMER ============
function updateTimerDuration() {
  timerState.duration = getModeDuration(state.focus.mode);
  timerState.remaining = timerState.duration;
  renderTimer();
}

function renderTimer() {
  const display = $('#timerDisplay');
  if (!display) return;
  if (state.focus.mode === 'noPerfection' && timerState.running) {
    display.textContent = '···';
  } else {
    display.textContent = formatTime(timerState.remaining);
  }
  display.classList.toggle('running', timerState.running);
  $('#timerModeLabel').textContent = modeLabel();
  $('#startPauseBtn').textContent = timerState.running ? 'Pausar' : 'Iniciar';

  // Semilla según % transcurrido
  const progress = 1 - (timerState.remaining / timerState.duration);
  const seed = $('#seedVisual');
  if (progress < 0.2) seed.textContent = '🌱';
  else if (progress < 0.6) seed.textContent = '🌿';
  else if (progress < 0.95) seed.textContent = '🌷';
  else seed.textContent = '🌺';
}

function tick() {
  if (!timerState.running) return;
  timerState.remaining -= 1;
  if (timerState.remaining <= 0) {
    finishBlock();
    return;
  }
  renderTimer();
}

function startTimer() {
  if (timerState.running) return;
  timerState.running = true;
  timerState.interval = setInterval(tick, 1000);
  renderTimer();
}

function pauseTimer() {
  timerState.running = false;
  if (timerState.interval) clearInterval(timerState.interval);
  timerState.interval = null;
  renderTimer();
}

function resetTimer() {
  pauseTimer();
  timerState.remaining = timerState.duration;
  renderTimer();
}

function finishBlock() {
  pauseTimer();
  const xpGain = 25;
  addXP(xpGain);
  addDrops(5);
  saveState();
  renderDashboard();

  $('#missionModalText').textContent = `Bloque completado · +${xpGain} XP · +5 Gotas`;
  $('#missionModal').classList.remove('hidden');

  $('#guidedBreak').classList.remove('hidden');
  timerState.remaining = timerState.duration;
  renderTimer();
}

$('#startPauseBtn')?.addEventListener('click', () => {
  timerState.running ? pauseTimer() : startTimer();
});
$('#resetBtn')?.addEventListener('click', resetTimer);
$('#addFiveBtn')?.addEventListener('click', () => {
  timerState.remaining += 5 * 60;
  renderTimer();
});

$$('input[name="mode"]').forEach(r => {
  r.addEventListener('change', (e) => {
    state.focus.mode = e.target.value;
    saveState();
    updateTimerDuration();
  });
});

// ============ ESCUDO / DISTRACCIONES ============
$('#simulateDistraction')?.addEventListener('click', () => {
  if (!state.focus.shield) return;
  const minutesLeft = Math.max(1, Math.ceil(timerState.remaining / 60));
  $('#blockMinutesLeft').textContent = minutesLeft;
  $('#blockModal').classList.remove('hidden');
  if (timerState.running) pauseTimer();
});
$('#stayFocused')?.addEventListener('click', () => {
  $('#blockModal').classList.add('hidden');
  if (!timerState.running) startTimer();
});
$('#leaveAnyway')?.addEventListener('click', () => {
  $('#blockModal').classList.add('hidden');
});

// ============ SONIDOS ============
$$('.sound-item').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.sound-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.focus.sound = btn.dataset.sound;
    saveState();
  });
});

// ============ ANTI-PARÁLISIS ============
$('#antiParalysisBtn')?.addEventListener('click', () => {
  state.focus.mode = 'noPerfection';
  saveState();
  $$('input[name="mode"]').forEach(r => r.checked = r.value === 'noPerfection');
  updateTimerDuration();
  switchView('focus');
  startTimer();
});

// ============ PAUSA GUIADA ============
$('#endBreak')?.addEventListener('click', () => {
  $('#guidedBreak').classList.add('hidden');
  timerState.remaining = timerState.duration;
  renderTimer();
});

// ============ SINCROPLAN ============
$('#breakdownBtn')?.addEventListener('click', () => {
  const input = $('#taskInput').value.trim() || 'Proyecto final';
  const subtasks = [
    'Definir estructura y objetivos',
    'Buscar 3 fuentes confiables',
    'Redactar introducción',
    'Desarrollar marco teórico',
    'Preparar conclusiones',
  ];
  $('#subtasksList').innerHTML = subtasks.map((t, i) => `
    <div class="subtask">
      <span><strong>${i + 1}.</strong> ${t}</span>
      <button class="btn ghost sm">Añadir</button>
    </div>
  `).join('');
});

$('#mentalDumpBtn')?.addEventListener('click', () => {
  const text = $('#mentalDump').value.trim();
  const reply = $('#mentalDumpReply');
  if (!text) {
    reply.textContent = 'Escribe primero lo que te frena.';
    reply.classList.remove('hidden');
    return;
  }
  reply.innerHTML = `<strong>Lo escuchamos.</strong> No tiene que quedar perfecto hoy. Solo hagamos un borrador feo durante 5 minutos y luego decides si continúas.`;
  reply.classList.remove('hidden');
});

// ============ COMUNIDAD ============
$('#groupPomodoro')?.addEventListener('click', () => {
  switchView('focus');
  startTimer();
});

// ============ PROGRESO: CHART ============
function renderChart() {
  const chart = $('#weeklyChart');
  if (!chart) return;
  const max = Math.max(...state.weekly, 1);
  chart.innerHTML = state.weekly.map((h, i) => {
    const pct = (h / max) * 100;
    return `<div class="bar-col" style="height:${pct}%" data-hours="${h} h"></div>`;
  }).join('');
}

// ============ ONBOARDING ============
function showOnboarding() {
  $('#onboarding').classList.remove('hidden');
  $$('.onb-step').forEach(s => s.classList.toggle('hidden', s.dataset.step !== '1'));
  updateDots(1);
}
function updateDots(step) {
  $$('.steps .dot').forEach((d, i) => d.classList.toggle('active', i === step - 1));
}
$$('.onb-step [data-next]').forEach(btn => {
  btn.addEventListener('click', () => {
    const next = btn.dataset.next;
    $$('.onb-step').forEach(s => s.classList.toggle('hidden', s.dataset.step !== next));
    updateDots(Number(next));
  });
});
$$('.onb-step [data-back]').forEach(btn => {
  btn.addEventListener('click', () => {
    const prev = btn.dataset.back;
    $$('.onb-step').forEach(s => s.classList.toggle('hidden', s.dataset.step !== prev));
    updateDots(Number(prev));
  });
});
$$('[data-skip]').forEach(btn => {
  btn.addEventListener('click', () => {
    $('#onboarding').classList.add('hidden');
    state.onboarded = true;
    saveState();
  });
});
$('#finishOnboarding')?.addEventListener('click', () => {
  const trigger = $('input[name="trigger"]:checked');
  const schedule = $('input[name="schedule"]:checked');
  if (trigger) state.checkIn.mood = trigger.value;
  $('#onboarding').classList.add('hidden');
  state.onboarded = true;
  saveState();
  renderDashboard();
});

// ============ RESET DEMO ============
$('#resetDemo')?.addEventListener('click', () => {
  if (!confirm('¿Reiniciar el estado de la demo?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
});

// ============ INIT ============
function init() {
  renderDashboard();
  renderMissions();
  renderChart();

  state.focus.mode = state.focus.mode || 'classic';
  $$('input[name="mode"]').forEach(r => r.checked = r.value === state.focus.mode);
  $$('.sound-item').forEach(b => b.classList.toggle('active', b.dataset.sound === state.focus.sound));

  updateTimerDuration();

  if (!state.onboarded) {
    showOnboarding();
  }
}

document.addEventListener('DOMContentLoaded', init);