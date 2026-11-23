/**
 * SYNCRO — Punto de Entrada Principal de la Aplicación (app.html)
 * Orquesta módulos ES desacoplados: estado, servicios, temporizador,
 * bioma vivo, calendario inteligente, diario cifrado y accesibilidad.
 */

import {
  state,
  saveState,
  replaceState,
  seed,
  guardian,
  GUARDIANS,
  GUARDIAN_NAMES,
  GUARDIAN_LOCK,
  ACHIEVEMENTS,
  achUnlocked,
  guardianLocked,
  levelTitle,
  addXP,
  addDrops,
  markActive,
  bestStreak,
  keyOf,
  esc,
  resolveActiveInstitution,
} from './core/state.js';
import { authService } from './services/authService.js';
import { dbService } from './services/dbService.js';
import { aiService } from './services/aiService.js';
import { analyticsService } from './services/analyticsService.js';
import { $, $$, toast, openOverlay, closeOverlay, openInfo, celebrate, initModals } from './ui/modals.js';
import { T, initTimerModule, updateTimerDuration, startTimer, requestViewLeave, Notify } from './modules/timer.js';
import { initBiomeModule, renderBiome, unlockedSpeciesCount } from './modules/biome.js';
import { initCalendarModule, renderCalendar, renderCalTray, markSlotsDone } from './modules/calendar.js';
import { Journal, renderJournalTimeline } from './modules/journal.js';
import { initChatbot } from './modules/chatbot.js';

const ROLE_LABEL = {
  universitario: 'Estudiante universitario',
  remoto: 'Trabajador remoto',
  emprendedor: 'Emprendedor/a',
  opositor: 'Preparando un examen',
  mayor: 'Aprendiendo a mi ritmo',
  otro: 'Otro',
};

const BREAKDOWN_TEMPLATES = {
  estudio: ['Revisar temario y subrayar conceptos clave', 'Resumir ideas principales en 1 página', 'Resolver 5 ejercicios prácticos sin apuntes', 'Repasar errores con técnica activa'],
  tesis: ['Definir esquema de subtítulos (sin redactar aún)', 'Reunir 3 fuentes académicas verificadas', 'Escribir primer borrador imperfecto de 200 palabras', 'Revisar citas y coherencia final'],
  tecnico: ['Definir requisitos mínimos y casos borde', 'Crear estructura base del módulo', 'Implementar versión funcional mínima', 'Probar y refactorizar detalles'],
  remoto: ['Listar entregables críticos de hoy', 'Bloquear 25 min sin Slack ni correo para avance central', 'Enviar avance parcial para feedback temprano', 'Cerrar pendientes menores y documentar'],
};

// ============ NAVEGACIÓN ============
function switchView(view, force = false) {
  if (T.running && state.focus.shield && view !== 'focus' && !force) {
    requestViewLeave(view);
    return;
  }
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${view}`));
  $$('.nav-item, .bn-item').forEach((b) => b.classList.toggle('active', b.dataset.view === view));

  if (view === 'biome') {
    renderBiome();
    renderProgress();
  }
  if (view === 'calendar') renderCalendar();
  if (view === 'profile') renderProfile();
}

// ============ DASHBOARD ============
function renderDashboard() {
  const u = state.user;
  const h = new Date().getHours();
  const sal = h < 12 ? '¡Buenos días' : h < 19 ? '¡Buenas tardes' : '¡Buenas noches';
  const first = (u.name || '').split(' ')[0];

  if ($('#greeting')) $('#greeting').textContent = first ? `${sal}, ${first}!` : `${sal}!`;
  if ($('#sidebarName')) $('#sidebarName').textContent = u.name || 'Invitado';
  if ($('#sidebarLevel')) $('#sidebarLevel').textContent = `Nivel ${u.level}`;
  if ($('#sidebarAvatar')) $('#sidebarAvatar').textContent = (u.name || '🌱').charAt(0).toUpperCase();
  if ($('#sidebarGuardianMini')) $('#sidebarGuardianMini').textContent = guardian();

  if ($('#dashDrops')) $('#dashDrops').textContent = state.biome.drops;
  if ($('#dropsCount')) $('#dropsCount').textContent = state.biome.drops;
  if ($('#earthCount')) $('#earthCount').textContent = state.biome.earth;
  if ($('#streakDays')) $('#streakDays').textContent = u.streak;
  if ($('#shieldsCount')) $('#shieldsCount').textContent = u.shields;
  if ($('#levelTag')) $('#levelTag').textContent = `Nivel ${u.level} · ${levelTitle(u.level)}`;
  if ($('#xpText')) $('#xpText').textContent = `${u.xp} / 300 XP`;
  if ($('#xpFill')) $('#xpFill').style.width = `${Math.min(100, Math.round((u.xp / 300) * 100))}%`;

  const schedTip = $('#scheduleTip');
  if (schedTip) {
    const map = {
      manana: '🌅 Tu mejor energía suele estar en la mañana. Protege tu primer bloque.',
      tarde: '☀️ Tu pico cognitivo está en la tarde. Reserva ahí tu misión principal.',
      noche: '🌙 Te concentras mejor de noche. Usa pausas 20-20-20 para cuidar tu vista.',
    };
    schedTip.textContent = map[state.profile.schedule] || '';
  }

  if ($('#previewFlower')) $('#previewFlower').textContent = seed().stages[3];
  if ($('#previewGuardian')) $('#previewGuardian').textContent = guardian();

  // Inyección dinámica de convenio institucional (B2B)
  const inst = resolveActiveInstitution();
  const wbHeading = $('#wellbeingHeading');
  if (wbHeading) wbHeading.textContent = inst.wellbeingLabel;
  const wbBadge = $('#institutionBadge');
  if (wbBadge) {
    if (inst.name) {
      wbBadge.textContent = `🏛️ Convenio: ${inst.name}`;
      wbBadge.classList.remove('hidden');
    } else {
      wbBadge.classList.add('hidden');
    }
  }
}

// ============ MISIONES (CRUD COMPLETO EN DASHBOARD) ============
function renderActiveMission() {
  const m = state.missions.find((x) => x.id === state.focus.activeMission && !x.done);
  const lbl = $('#activeMissionLabel');
  if (lbl) {
    lbl.textContent = m ? `🎯 Misión activa: ${m.title}` : 'Sin misión vinculada: el bloque suma XP igual.';
  }
}

function renderMissions() {
  const list = $('#missionsList');
  if (!list) return;
  const dur = state.checkIn.lowEnergy ? '15 min (adaptado)' : '25 min';
  list.innerHTML =
    state.missions
      .map(
        (m) => `
      <div class="mission ${m.done ? 'done' : ''}" data-id="${m.id}">
        <button type="button" class="mission-check" aria-label="Completar: ${esc(m.title)}" aria-pressed="${m.done}">✓</button>
        <div class="mission-info">
          <div class="mission-title">${esc(m.title)}</div>
          <div class="mission-meta">
            <span class="pill violet">+${m.xp} XP</span>
            <span class="pill emerald">+${m.drops} Gotas</span>
            <span class="pill">${m.target > 1 ? `${m.progress}/${m.target} bloques` : dur}</span>
          </div>
        </div>
        <div class="mission-actions">
          <button type="button" class="btn ghost sm" data-start="${m.id}" ${m.done ? 'disabled' : ''}>${
            state.focus.activeMission === m.id ? 'Activa' : 'Iniciar'
          }</button>
          <button type="button" class="icon-btn mission-edit" data-edit="${m.id}" title="Editar misión" aria-label="Editar: ${esc(m.title)}">✎</button>
          <button type="button" class="icon-btn mission-del" data-del="${m.id}" title="Eliminar misión" aria-label="Eliminar: ${esc(m.title)}">✕</button>
        </div>
      </div>`
      )
      .join('') ||
    '<p class="muted small" style="margin:4px 2px">No tienes misiones hoy. Añade una abajo o usa el desglosador guiado.</p>';

  const count = $('#missionsCount');
  if (count) count.textContent = `${state.missions.filter((m) => m.done).length} / ${state.missions.length}`;
  renderActiveMission();
}

function editMission(id) {
  const m = state.missions.find((x) => x.id === id);
  if (!m) return;
  openInfo(
    'Editar misión',
    `<label class="field-label" for="missionEditInput">Nombre de la misión</label>
     <input class="input" id="missionEditInput" maxlength="80" value="${esc(m.title)}" />`,
    'Guardar',
    () => {
      const title = $('#missionEditInput')?.value.trim();
      if (!title) {
        toast('La misión necesita un nombre.');
        return false;
      }
      m.title = title;
      (state.calendar.slots || []).forEach((s) => {
        if (s.missionId === id) s.title = title;
      });
      saveState();
      renderMissions();
      renderCalTray();
      if ($('#view-calendar')?.classList.contains('active')) renderCalendar();
      toast('Misión actualizada.');
    }
  );
  requestAnimationFrame(() => {
    const inp = $('#missionEditInput');
    if (inp) {
      inp.focus();
      inp.select();
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          $('#closeInfo')?.click();
        }
      });
    }
  });
}

function deleteMission(id) {
  const m = state.missions.find((x) => x.id === id);
  if (!m) return;
  if (T.running && state.focus.activeMission === id) {
    toast('Esta misión está vinculada a un bloque en curso. Pausa el bloque para eliminarla.');
    return;
  }
  state.missions = state.missions.filter((x) => x.id !== id);
  state.calendar.slots = (state.calendar.slots || []).filter((s) => s.missionId !== id);
  if (state.focus.activeMission === id) state.focus.activeMission = null;
  saveState();
  renderMissions();
  renderCalTray();
  renderDashboard();
  if ($('#view-calendar')?.classList.contains('active')) renderCalendar();
  toast('Misión eliminada.');
}

function completeMission(id) {
  const m = state.missions.find((x) => x.id === id);
  if (!m || m.done) return;
  m.done = true;
  m.progress = m.target;
  if (state.focus.activeMission === id) state.focus.activeMission = null;
  markActive();
  const ups = addXP(m.xp);
  addDrops(m.drops);
  markSlotsDone(id);
  saveState();
  renderDashboard();
  renderMissions();
  renderProgress();
  checkAchievements();
  celebrate(
    '¡Misión completada!',
    `+${m.xp} XP · +${m.drops} Gotas de riego${ups ? ` · ¡Nivel ${state.user.level}!` : ''}`
  );
}

// ============ CHECK-IN EMOCIONAL ============
function initCheckIn() {
  const range = $('#energyRange');
  const valEl = $('#energyValue');
  if (range) {
    range.value = String(state.checkIn.energy || 5);
    if (valEl) valEl.textContent = String(state.checkIn.energy || 5);
    range.addEventListener('input', (e) => {
      state.checkIn.energy = Number(e.target.value);
      if (valEl) valEl.textContent = String(state.checkIn.energy);
    });
  }

  $$('#moodChips .chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.mood === state.checkIn.mood);
    chip.addEventListener('click', () => {
      state.checkIn.mood = chip.dataset.mood;
      $$('#moodChips .chip').forEach((c) => c.classList.toggle('active', c === chip));
    });
  });

  $('#saveCheckIn')?.addEventListener('click', async () => {
    const energy = Number($('#energyRange')?.value || 5);
    const mood = state.checkIn.mood || 'tranquilo';
    const note = ($('#journalText')?.value || '').trim();
    const lowEnergy = energy <= 4 || mood === 'agobiado' || mood === 'cansado';

    state.checkIn = { energy, mood, lowEnergy, date: keyOf() };
    state.stats.checkIns = (state.stats.checkIns || 0) + 1;
    state.moodLogs = (state.moodLogs || []).concat({ date: keyOf(), energy, mood }).slice(-30);

    if (note && Journal.ok()) {
      try {
        await Journal.add({ text: note, energy, mood });
        if ($('#journalText')) $('#journalText').value = '';
        state.achievements.journal_1 = state.achievements.journal_1 || Date.now();
      } catch {
        // ignore
      }
    }

    const m1 = state.missions.find((m) => m.id === 'm1' && !m.done);
    if (m1) {
      m1.done = true;
      m1.progress = 1;
      addXP(m1.xp);
      addDrops(m1.drops);
    }

    markActive();
    saveState();
    updateTimerDuration();
    renderDashboard();
    renderMissions();
    checkAchievements();

    analyticsService.trackOnce('first_checkin', { energy, mood, low_energy: lowEnergy });
    analyticsService.track('checkin_saved', { energy, mood, low_energy: lowEnergy });

    const banner = $('#checkInBanner');
    if (banner) {
      banner.classList.remove('hidden');
      banner.textContent = lowEnergy
        ? '🌿 Modo ligero activado: ajustamos tus bloques a 15 min y priorizamos micro-pasos sin culpa.'
        : '✨ Check-in guardado. Tu espacio está calibrado para tu nivel de energía actual.';
    }
    toast('Check-in guardado ✓');
  });
}

// ============ DESGLOSADOR GUIADO & SINCROPLAN (con aiService) ============
function initBreakdownAndPlan() {
  const updateIllusion = () => {
    const est = Math.max(1, Number($('#estHours')?.value || 10));
    const real = Math.max(0, Number($('#realHours')?.value || 6));
    const pct = Math.min(100, Math.round((real / est) * 100));
    if ($('#illusionFill')) $('#illusionFill').style.width = `${pct}%`;
    if ($('#illusionPill')) {
      $('#illusionPill').textContent = pct < 60 ? 'Ilusión de tiempo alta' : pct < 85 ? 'Estimación moderada' : 'Estimación realista';
    }
    if ($('#illusionText')) {
      $('#illusionText').textContent = `Crees tener ${est} h, pero realmente tienes ${real} h (${pct}%). Planifica con ${real} h.`;
    }
  };

  $('#estHours')?.addEventListener('input', updateIllusion);
  $('#realHours')?.addEventListener('input', updateIllusion);
  updateIllusion();

  $('#openBreakdownBtn')?.addEventListener('click', () => openOverlay($('#breakdownModal')));
  $('#closeBreakdownModal')?.addEventListener('click', () => closeOverlay($('#breakdownModal')));
  $('#cancelBreakdownModal')?.addEventListener('click', () => closeOverlay($('#breakdownModal')));

  $('#applyBreakdownBtn')?.addEventListener('click', async () => {
    const title = ($('#bdTaskTitle')?.value || '').trim();
    if (!title) {
      toast('Escribe el nombre de la tarea grande.');
      $('#bdTaskTitle')?.focus();
      return;
    }
    const tplKey = $('input[name="bdTemplate"]:checked')?.value || 'estudio';
    const res = await aiService.breakdownTask({ task: title, days: 7, lowEnergy: state.checkIn.lowEnergy });

    if (res.quotaExceeded) {
      toast(res.message);
      return;
    }

    const steps =
      res.source === 'edge-ai'
        ? res.steps.map((s) => s.title)
        : (BREAKDOWN_TEMPLATES[tplKey] || BREAKDOWN_TEMPLATES.estudio).map((s) => `${s} · ${title}`);

    steps.slice(0, 3).forEach((stTitle, idx) => {
      state.missions.push({
        id: 'bd_' + Date.now().toString(36) + idx,
        title: stTitle.slice(0, 80),
        xp: 25,
        drops: 6,
        target: 1,
        progress: 0,
        done: false,
      });
    });

    if ($('#bdTaskTitle')) $('#bdTaskTitle').value = '';
    saveState();
    renderMissions();
    renderCalTray();
    closeOverlay($('#breakdownModal'));
    toast(`✨ Añadimos ${Math.min(3, steps.length)} micro-pasos a tus misiones de hoy.`);
  });

  // SincroPlan vista completa (si el usuario navega a ella)
  $('#breakdownBtn')?.addEventListener('click', async () => {
    const task = ($('#taskInput')?.value || '').trim();
    const days = Math.max(1, Number($('#dateInput')?.value || 10));
    if (!task) {
      toast('Describe la tarea que deseas desglosar.');
      return;
    }
    const res = await aiService.breakdownTask({ task, days, lowEnergy: state.checkIn.lowEnergy });
    if (res.quotaExceeded) {
      toast(res.message);
      return;
    }
    state.plan.steps = res.steps;
    saveState();
    const list = $('#subtasksList');
    if (list) {
      list.innerHTML = res.steps
        .map((s, i) => `<div class="subtask-row"><span>Día ${s.day}: ${esc(s.title)}</span><button type="button" class="btn ghost sm" data-add-step="${i}">+ Hoy</button></div>`)
        .join('');
    }
  });

  $('#subtasksList')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-step]');
    if (!btn) return;
    const step = state.plan.steps[Number(btn.dataset.addStep)];
    if (!step) return;
    state.missions.push({ id: 'sp_' + Date.now().toString(36), title: step.title.slice(0, 80), xp: 25, drops: 6, target: 1, progress: 0, done: false });
    saveState();
    renderMissions();
    toast('Paso añadido a Misiones de hoy.');
  });

  $('#mentalDumpBtn')?.addEventListener('click', async () => {
    const txt = ($('#mentalDump')?.value || '').trim();
    const reply = await aiService.validateMentalDump(txt);
    const box = $('#mentalDumpReply');
    if (box) {
      box.classList.remove('hidden');
      box.textContent = reply;
    }
  });
}

// ============ PROGRESO Y LOGROS ============
function checkAchievements() {
  const unlock = (id) => {
    if (!state.achievements[id]) state.achievements[id] = Date.now();
  };
  if (state.stats.blocks >= 1) unlock('first_block');
  if (state.stats.checkIns >= 1) unlock('first_checkin');
  if (state.stats.noPerfBlocks >= 1) unlock('no_perf');
  if (state.stats.blocks >= 3) unlock('blocks_3');
  if (state.user.streak >= 3) unlock('streak_3');
  if (state.user.streak >= 7) unlock('streak_7');
  if (unlockedSpeciesCount() >= 4) unlock('species_4');
  if ((state.biome.waters || 0) >= 3) unlock('water_3');
  saveState();
}

function renderProgress() {
  const chart = $('#weeklyChart');
  const totalEl = $('#weeklyTotal');
  if (chart) {
    const max = Math.max(1, ...(state.weekly || [0]));
    chart.innerHTML = (state.weekly || [0, 0, 0, 0, 0, 0, 0])
      .map((h) => `<div class="chart-bar-wrap"><div class="chart-bar" style="height:${Math.max(8, Math.round((h / max) * 100))}%" title="${h} h"></div></div>`)
      .join('');
    const total = (state.weekly || []).reduce((a, b) => a + b, 0);
    if (totalEl) totalEl.textContent = `${total.toFixed(1)} h esta semana`;
  }

  const achList = $('#achList');
  const achCount = $('#achCount');
  if (achList) {
    const unlocked = ACHIEVEMENTS.filter((a) => achUnlocked(a.id)).length;
    if (achCount) achCount.textContent = `${unlocked} / ${ACHIEVEMENTS.length}`;
    achList.innerHTML = ACHIEVEMENTS.map(
      (a) => `
      <div class="ach-item ${achUnlocked(a.id) ? 'unlocked' : 'locked'}">
        <span class="ach-ico">${a.icon}</span>
        <div>
          <strong>${esc(a.name)}</strong>
          <p class="muted small">${esc(a.desc)}</p>
        </div>
      </div>`
    ).join('');
  }

  renderJournalTimeline();
}

// ============ PERFIL, SENSIBILIDAD MOUSELEAVE, OPT-IN IA Y GDPR ============
function syncNotifUI() {
  const granted = Notify.supported() && Notification.permission === 'granted' && state.profile.notifications;
  const t1 = $('#notifToggle');
  const t2 = $('#pfNotif');
  if (t1) t1.checked = granted;
  if (t2) t2.checked = granted;
}

function renderProfile() {
  const u = state.user;
  const p = state.profile;
  const ses = authService.getSession() || {};

  if ($('#pfAvatar')) $('#pfAvatar').textContent = (u.name || '🌱').charAt(0).toUpperCase();
  if ($('#pfGuardian')) $('#pfGuardian').textContent = guardian();
  if ($('#pfName')) $('#pfName').textContent = u.name || 'Estudiante';
  if ($('#pfHandle')) $('#pfHandle').textContent = ses.username ? `@${ses.username} · ${ses.email}` : ses.email || 'Modo prueba local';
  if ($('#pfMeta')) {
    $('#pfMeta').textContent =
      [ROLE_LABEL[p.role], p.ageRange && `${p.ageRange} años`, p.institution].filter(Boolean).join(' · ') ||
      'Completa tu perfil para personalizar SYNCRO.';
  }
  if ($('#pfLevel')) $('#pfLevel').textContent = `Nivel ${u.level} · ${levelTitle(u.level)}`;
  if ($('#pfStreak')) $('#pfStreak').textContent = `🔥 ${u.streak} días`;
  if ($('#pfAch')) $('#pfAch').textContent = `🏅 ${ACHIEVEMENTS.filter((a) => achUnlocked(a.id)).length}/${ACHIEVEMENTS.length} logros`;

  if ($('#pfBlocks')) $('#pfBlocks').textContent = state.stats.blocks;
  if ($('#pfHours')) $('#pfHours').textContent = (state.stats.minutes / 60).toFixed(1);
  if ($('#pfBest')) $('#pfBest').textContent = bestStreak();
  if ($('#pfDrops')) $('#pfDrops').textContent = (state.stats.dropsEarned || 0).toLocaleString('es-PE');

  if ($('#pfNameInput')) $('#pfNameInput').value = u.name || '';
  if ($('#pfUserInput')) $('#pfUserInput').value = ses.username || '';
  if ($('#pfEmailInput')) $('#pfEmailInput').value = ses.email || '';
  if ($('#pfRole')) $('#pfRole').value = p.role || '';
  if ($('#pfAge')) $('#pfAge').value = p.ageRange || '';
  if ($('#pfInstitution')) $('#pfInstitution').value = p.institution || '';
  if ($('#pfGoal')) $('#pfGoal').value = p.goal || '';
  if ($('#pfTrigger')) $('#pfTrigger').value = p.trigger || '';
  if ($('#pfSchedule')) $('#pfSchedule').value = p.schedule || '';
  if ($('#pfBlock')) $('#pfBlock').value = p.blockPref || 'classic';
  if ($('#pfSeed')) $('#pfSeed').value = p.seed || 'cantuta';
  if ($('#pfMouseLeave')) $('#pfMouseLeave').value = p.mouseleaveSensitivity || 'normal';
  if ($('#pfBienestar')) $('#pfBienestar').checked = Boolean(p.bienestarConsent);
  if ($('#pfJournalAiOptIn')) $('#pfJournalAiOptIn').checked = Boolean(p.journalAiOptIn);
  if ($('#pfReminder')) $('#pfReminder').checked = p.reminder !== false;

  const gSel = $('#pfGuardianSel');
  if (gSel) {
    gSel.innerHTML = Object.keys(GUARDIANS)
      .map((k) => {
        const lock = guardianLocked(k);
        const need = lock ? ACHIEVEMENTS.find((a) => a.id === GUARDIAN_LOCK[k])?.name || '' : '';
        return `<option value="${k}" ${lock ? 'disabled' : ''}>${GUARDIANS[k]} ${GUARDIAN_NAMES[k]}${
          lock ? ` · 🔒 logro “${need}”` : ''
        }</option>`;
      })
      .join('');
    gSel.value = p.guardian || 'alpaca';
  }

  const accInfo = $('#accountInfo');
  if (accInfo) {
    const planLbl = ses.plan === 'pro' ? 'SYNCRO Pro' : ses.plan === 'b2b' ? 'Licencia Institucional' : 'Plan Gratis (Esencial)';
    accInfo.textContent = ses.mode === 'guest' ? 'Sesión en modo prueba (almacenamiento local)' : `${ses.email || 'Cuenta activa'} · ${planLbl}`;
  }
  syncNotifUI();
}

function initProfile() {
  const toggleNotif = async (checked) => {
    if (!checked) {
      state.profile.notifications = false;
      saveState();
      syncNotifUI();
      return;
    }
    const perm = await Notify.request();
    state.profile.notifications = perm === 'granted';
    saveState();
    syncNotifUI();
    toast(perm === 'granted' ? '🔔 Notificaciones activadas.' : 'Tu navegador bloqueó las notificaciones.');
  };

  $('#notifToggle')?.addEventListener('change', (e) => toggleNotif(e.target.checked));
  $('#pfNotif')?.addEventListener('change', (e) => toggleNotif(e.target.checked));

  $('#profileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const p = state.profile;
    const name = ($('#pfNameInput')?.value || '').trim();
    if (!name) {
      $('#pfNameInput')?.focus();
      toast('Escribe tu nombre.');
      return;
    }
    const oldBlock = p.blockPref;
    const goal = ($('#pfGoal')?.value || '').trim();
    state.user.name = name;

    Object.assign(p, {
      role: $('#pfRole')?.value || null,
      ageRange: $('#pfAge')?.value || '',
      institution: ($('#pfInstitution')?.value || '').trim(),
      goal,
      trigger: $('#pfTrigger')?.value || null,
      schedule: $('#pfSchedule')?.value || null,
      blockPref: $('#pfBlock')?.value || 'classic',
      seed: $('#pfSeed')?.value || 'cantuta',
      guardian: guardianLocked($('#pfGuardianSel')?.value) ? p.guardian : $('#pfGuardianSel')?.value || 'alpaca',
      mouseleaveSensitivity: $('#pfMouseLeave')?.value || 'normal',
      bienestarConsent: Boolean($('#pfBienestar')?.checked),
      journalAiOptIn: Boolean($('#pfJournalAiOptIn')?.checked),
      reminder: Boolean($('#pfReminder')?.checked),
    });

    if (p.blockPref !== oldBlock && !T.running) {
      state.focus.mode = p.blockPref;
      $$('input[name="mode"]').forEach((r) => (r.checked = r.value === p.blockPref));
      updateTimerDuration();
    }

    const gm = state.missions.find((m) => m.id === 'goal');
    if (goal && gm) gm.title = `Dar el primer paso en: ${goal}`;
    else if (goal) {
      state.missions.unshift({
        id: 'goal',
        base: true,
        title: `Dar el primer paso en: ${goal}`,
        xp: 40,
        drops: 10,
        target: 1,
        progress: 0,
        done: false,
      });
    } else if (gm && !gm.done) {
      state.missions = state.missions.filter((m) => m.id !== 'goal');
    }

    saveState();
    renderDashboard();
    renderMissions();
    renderProfile();
    renderCalTray();
    renderJournalTimeline();

    const savedMsg = $('#pfSaved');
    if (savedMsg) {
      savedMsg.textContent = 'Cambios guardados ✓';
      setTimeout(() => (savedMsg.textContent = ''), 2500);
    }
  });

  // Exportación JSON (portabilidad GDPR / LPDP)
  $('#pfExport')?.addEventListener('click', async () => {
    const ses = authService.getSession() || {};
    let journal = [];
    if (Journal.ok()) {
      try {
        journal = (await Journal.all()).map(({ iv, ct, ...rest }) => rest);
      } catch {
        // ignore
      }
    }
    const payload = JSON.stringify(
      {
        exportadoEl: new Date().toISOString(),
        cuenta: { nombre: ses.name, usuario: ses.username, correo: ses.email, proveedor: ses.provider },
        estado: state,
        diario: journal,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `syncro-mis-datos-${keyOf()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Tus datos se descargaron como JSON.');
  });

  // Restaurar respaldo JSON
  let pendingRestore = null;
  $('#pfImportBtn')?.addEventListener('click', () => $('#pfImportInput')?.click());
  $('#pfImportInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '{}'));
        const candidate = parsed.estado || parsed.state || (parsed.user && parsed.focus ? parsed : null);
        if (!candidate) {
          toast('El archivo no parece ser un respaldo válido de SYNCRO.');
          return;
        }
        pendingRestore = candidate;
        if ($('#rstUserName')) $('#rstUserName').textContent = candidate.user?.name || 'Usuario';
        if ($('#rstUserLevel')) $('#rstUserLevel').textContent = `Nivel ${candidate.user?.level || 1} · 🔥 ${candidate.user?.streak || 0} días`;
        if ($('#rstBlocks')) $('#rstBlocks').textContent = String(candidate.stats?.blocks || 0);
        if ($('#rstDate')) $('#rstDate').textContent = parsed.exportadoEl ? new Date(parsed.exportadoEl).toLocaleDateString('es-PE') : 'Reciente';
        openOverlay($('#restoreConfirmModal'));
      } catch {
        toast('Error al leer el archivo JSON.');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  });

  $('#cancelRestoreBtn')?.addEventListener('click', () => {
    pendingRestore = null;
    closeOverlay($('#restoreConfirmModal'));
  });
  $('#confirmRestoreBtn')?.addEventListener('click', () => {
    if (!pendingRestore) return;
    replaceState(pendingRestore);
    pendingRestore = null;
    closeOverlay($('#restoreConfirmModal'));
    renderDashboard();
    renderMissions();
    renderProfile();
    renderBiome();
    toast('Copia de seguridad restaurada ✓');
  });

  // Borrado de diario y derecho al olvido (borrado total de cuenta)
  $('#pfClearJournal')?.addEventListener('click', () => {
    openInfo(
      'Borrar diario emocional',
      '<p>Esta acción eliminará permanentemente todas las notas cifradas de tu diario en este dispositivo.</p>',
      'Sí, borrar diario',
      async () => {
        await Journal.clear();
        renderJournalTimeline();
        toast('Tu diario emocional fue borrado.');
      }
    );
  });

  $('#pfDeleteAccount')?.addEventListener('click', () => {
    openInfo(
      'Eliminar cuenta y todos tus datos',
      '<p>Se eliminarán permanentemente tu progreso, misiones, diario cifrado y cuenta local/remota (derecho al olvido). Esta acción no se puede deshacer.</p>',
      'Eliminar todo',
      async () => {
        await Journal.clear();
        await dbService.deleteAccountData();
        authService.deleteLocalAccount();
        location.href = 'index.html';
      }
    );
  });

  $('#bienestarBtn')?.addEventListener('click', () => {
    const inst = resolveActiveInstitution();
    openInfo(
      inst.wellbeingLabel,
      `<p>Si atraviesas días de sobrecarga sostenida, pedir apoyo es un acto de cuidado. Puedes contactar a un profesional de salud mental o a la línea de orientación gratuita de tu país.</p>
       <p class="muted small">SYNCRO es una herramienta de productividad y regulación cotidiana; no reemplaza atención psicológica profesional.</p>`
    );
  });
}

// ============ ONBOARDING & RESCATE ============
function initOnboarding() {
  const modal = $('#onboarding');
  if (!modal) return;

  const completeOnboarding = (directFive = false) => {
    const name = ($('#nameInput')?.value || '').trim();
    const sched = $('input[name="schedule"]:checked')?.value || 'manana';
    const blockPref = directFive ? 'noPerfection' : $('input[name="blockPref"]:checked')?.value || 'classic';

    if (name) state.user.name = name;
    state.profile.schedule = sched;
    state.profile.blockPref = blockPref;
    state.focus.mode = blockPref;
    state.user.onboarded = true;
    saveState();

    $$('input[name="mode"]').forEach((r) => (r.checked = r.value === blockPref));
    updateTimerDuration();
    closeOverlay(modal);
    renderDashboard();
    analyticsService.trackOnce('onboarding_completed', { direct_five: directFive, block_pref: blockPref });

    if (directFive) {
      switchView('focus', true);
      startTimer();
      toast('✨ Modo Avance sin Perfección iniciado (5 min).');
    }
  };

  $('#finishOnboarding')?.addEventListener('click', () => completeOnboarding(false));
  $('#onbDirectStartBtn')?.addEventListener('click', () => completeOnboarding(true));

  if (!state.user.onboarded) {
    if ($('#nameInput') && state.user.name) $('#nameInput').value = state.user.name;
    openOverlay(modal);
  }
}

function checkRescueModal() {
  if (!state.user.lastActive) return;
  const last = new Date(state.user.lastActive + 'T12:00:00');
  const diffDays = Math.floor((Date.now() - last.getTime()) / 86400000);
  if (diffDays >= 3) {
    if ($('#rescueGuardian')) $('#rescueGuardian').textContent = guardian();
    if ($('#rescueSub')) $('#rescueSub').textContent = `Han pasado ${diffDays} días. Sin culpa: tu progreso sigue intacto.`;
    openOverlay($('#rescueModal'));
  }
  $('#rescueGo')?.addEventListener('click', () => {
    closeOverlay($('#rescueModal'));
    state.focus.mode = 'noPerfection';
    updateTimerDuration();
    switchView('focus', true);
    startTimer();
  });
  $('#rescueLook')?.addEventListener('click', () => {
    closeOverlay($('#rescueModal'));
    switchView('biome', true);
  });
}

// ============ ARRANQUE PRINCIPAL ============
function bootstrap() {
  initModals();

  // Ocultar splash tras carga inicial
  const splash = $('#appSplash');
  if (splash) {
    setTimeout(() => { splash.classList.add('done'); splash.style.display = 'none'; }, 220);
  }

  // Banner de modo invitado
  const ses = authService.ensureGuestSession();
  if (ses.mode === 'guest') {
    $('#guestModeBanner')?.classList.remove('hidden');
  } else {
    analyticsService.checkRetention(ses.since);
  }

  // Navegación principal (sidebar + bottom nav + data-goto)
  $$('.nav-item, .bn-item').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
  $$('[data-goto]').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.goto));
  });

  // Contraer/expandir barra lateral
  const applySidebar = () => {
    document.body.classList.toggle('sidebar-collapsed', Boolean(state.ui.sidebarCollapsed));
    $('#sidebarToggle')?.setAttribute('aria-expanded', String(!state.ui.sidebarCollapsed));
  };
  applySidebar();
  $('#sidebarToggle')?.addEventListener('click', () => {
    state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
    saveState();
    applySidebar();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
      saveState();
      applySidebar();
    }
  });

  // Monitor Online/Offline
  const updateOnline = () => {
    $('#sidebarOfflineBadge')?.classList.toggle('hidden', navigator.onLine);
  };
  window.addEventListener('online', updateOnline);
  window.addEventListener('offline', updateOnline);
  updateOnline();

  // Eventos de Misiones (CRUD en Dashboard)
  $('#missionsList')?.addEventListener('click', (e) => {
    const row = e.target.closest('.mission');
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.closest('.mission-check')) return completeMission(id);
    if (e.target.closest('[data-edit]')) return editMission(id);
    if (e.target.closest('[data-del]')) return deleteMission(id);
    if (e.target.closest('[data-start]')) {
      state.focus.activeMission = id;
      saveState();
      renderMissions();
      switchView('focus');
      toast('Misión vinculada al temporizador 🎯');
    }
  });

  $('#missionForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const inp = $('#missionNew');
    const title = (inp?.value || '').trim();
    if (!title) {
      toast('Escribe qué quieres lograr hoy.');
      inp?.focus();
      return;
    }
    state.missions.push({
      id: 'c' + Date.now().toString(36),
      title,
      xp: 20,
      drops: 5,
      target: 1,
      progress: 0,
      done: false,
    });
    inp.value = '';
    saveState();
    renderMissions();
    renderCalTray();
    renderDashboard();
    toast('Misión añadida.');
    inp.focus();
  });

  // Botón Anti-Parálisis 5 min
  $('#antiParalysisBtn')?.addEventListener('click', () => {
    state.focus.mode = 'noPerfection';
    $$('input[name="mode"]').forEach((r) => (r.checked = r.value === 'noPerfection'));
    updateTimerDuration();
    switchView('focus', true);
    startTimer();
    toast('✨ ¡5 minutos sin perfección! El reloj está oculto para quitar presión.');
  });

  // Tutorial rápido
  $$('[data-replay-tour]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openInfo(
        'Guía rápida de SYNCRO',
        `<ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:8px;">
          <li><strong>Check-in diario:</strong> indica tu energía y estado de ánimo para calibrar la duración de tus bloques.</li>
          <li><strong>Misiones de hoy:</strong> crea, edita o desglosa tareas grandes en micro-pasos manejables.</li>
          <li><strong>Enfoque protegido:</strong> inicia un bloque de 5, 25 o 50 minutos con bioacústica andina y pausas guiadas.</li>
          <li><strong>Santuario Andino:</strong> riega tu ecosistema con tus gotas y sigue tu línea de tiempo emocional cifrada.</li>
        </ol>`
      );
    });
  });

  // Cerrar sesión
  $$('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      authService.signOut();
      location.href = 'index.html';
    });
  });

  // Inicializar módulos
  initTimerModule({
    onComplete: () => {
      renderDashboard();
      renderMissions();
      renderBiome();
      renderProgress();
      checkAchievements();
    },
    onSwitchView: switchView,
  });
  initBiomeModule({
    onWatered: () => {
      renderDashboard();
      checkAchievements();
    },
  });
  initCalendarModule();
  initCheckIn();
  initBreakdownAndPlan();
  initProfile();

  renderDashboard();
  renderMissions();
  renderBiome();
  renderProgress();
  initOnboarding();
  checkRescueModal();
  initChatbot({
    surface: 'app',
    getView: () => document.querySelector('.view.active')?.id?.replace('view-', '') || '',
  });

  // Registrar Service Worker PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
else bootstrap();
