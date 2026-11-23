/**
 * SYNCRO — Módulo de Calendario Semanal Inteligente y Heatmap de Constancia
 * Detecta franjas de baja energía según check-ins, permite asignar misiones
 * por drag & drop o toque, y exporta a .ics / Google Calendar.
 */

import { state, saveState, keyOf, dayIdx, esc } from '../core/state.js';
import { $, $$, toast } from '../ui/modals.js';

const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const HOURS = [8, 10, 12, 14, 16, 18, 20];

let selectedMissionId = null;
let selectedDayIdx = dayIdx();
let fullWeekMode = false;

function getLowEnergyHours() {
  const pref = state.profile.schedule;
  if (pref === 'manana') return [18, 20];
  if (pref === 'tarde') return [8, 20];
  if (pref === 'noche') return [8, 10];
  return [14];
}

function getPeakHours() {
  const pref = state.profile.schedule;
  if (pref === 'manana') return [8, 10];
  if (pref === 'tarde') return [14, 16];
  if (pref === 'noche') return [18, 20];
  return [10, 16];
}

export function renderCalTray() {
  const tray = $('#calTray');
  if (!tray) return;
  const openMissions = state.missions.filter((m) => !m.done);
  tray.innerHTML = openMissions.length
    ? openMissions
        .map(
          (m) => `
        <button type="button" class="cal-chip ${selectedMissionId === m.id ? 'selected' : ''}" draggable="true" data-mid="${m.id}">
          🎯 ${esc(m.title)}
        </button>`
        )
        .join('')
    : '<span class="muted small">Todas tus misiones de hoy están completadas.</span>';
}

export function renderCalendar() {
  const grid = $('#calGrid');
  const dayChips = $('#calDayChips');
  if (!grid) return;

  renderCalTray();

  if (dayChips) {
    dayChips.innerHTML = DAYS.map(
      (d, idx) =>
        `<button type="button" class="chip ${selectedDayIdx === idx ? 'active' : ''}" data-day-idx="${idx}">${d}</button>`
    ).join('');
  }

  const lowHours = getLowEnergyHours();
  const peakHours = getPeakHours();
  const visibleDays = fullWeekMode || window.innerWidth > 768 ? [0, 1, 2, 3, 4, 5, 6] : [selectedDayIdx];

  let html = `<div class="cal-head"></div>${visibleDays.map((d) => `<div class="cal-head">${DAYS[d]}</div>`).join('')}`;
  HOURS.forEach((h) => {
    html += `<div class="cal-time">${String(h).padStart(2, '0')}:00</div>`;
    visibleDays.forEach((d) => {
      const slot = (state.calendar.slots || []).find((s) => s.day === d && s.hour === h);
      const isLow = lowHours.includes(h);
      const isPeak = peakHours.includes(h);
      const cls = ['cal-cell', isLow ? 'low' : '', isPeak ? 'peak' : '', slot?.done ? 'done' : ''].filter(Boolean).join(' ');
      html += `
        <div class="${cls}" data-day="${d}" data-hour="${h}" tabindex="0" role="gridcell">
          ${
            slot
              ? `<div class="cal-slot"><span>${esc(slot.title)}</span><button type="button" class="cal-rm" data-rm-slot="${d}-${h}" aria-label="Quitar">×</button></div>`
              : ''
          }
        </div>`;
    });
  });

  grid.style.gridTemplateColumns = `64px repeat(${visibleDays.length}, minmax(105px, 1fr))`;
  grid.innerHTML = html;
  renderHeatmap();
}

export function renderHeatmap() {
  const grid = $('#heatGrid');
  const totalEl = $('#heatTotal');
  if (!grid) return;

  const cells = [];
  const today = new Date();
  let activeDays = 0;
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const k = keyOf(d);
    const count = state.history[k] || 0;
    if (count > 0) activeDays += 1;
    const icon = count === 0 ? '·' : count === 1 ? '🌱' : count === 2 ? '🌿' : count === 3 ? '🌷' : '🌺';
    cells.push(`<span class="heat-cell lvl-${Math.min(4, count)}" title="${k}: ${count} actividad(es)">${icon}</span>`);
  }
  grid.innerHTML = cells.join('');
  if (totalEl) totalEl.textContent = `${activeDays} días activos en las últimas 12 semanas`;
}

export function markSlotsDone(missionId) {
  (state.calendar.slots || []).forEach((s) => {
    if (s.missionId === missionId) s.done = true;
  });
}

function assignSlot(day, hour, missionId) {
  const m = state.missions.find((x) => x.id === missionId);
  if (!m) return;
  state.calendar.slots = (state.calendar.slots || []).filter((s) => !(s.day === day && s.hour === hour));
  state.calendar.slots.push({ day, hour, missionId: m.id, title: m.title, done: m.done });
  selectedMissionId = null;
  saveState();
  renderCalendar();
  toast(`Programado: "${m.title}" el ${DAYS[day]} a las ${String(hour).padStart(2, '0')}:00.`);
}

function exportICS() {
  const slots = state.calendar.slots || [];
  if (!slots.length) {
    toast('Programa al menos un bloque en el calendario antes de exportar.');
    return;
  }
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);

  const fmtICS = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const events = slots.map((s, idx) => {
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + s.day, s.hour, 0, 0);
    const end = new Date(start.getTime() + 50 * 60000);
    return [
      'BEGIN:VEVENT',
      `UID:syncro-${idx}-${Date.now()}@syncro.app`,
      `DTSTAMP:${fmtICS(new Date())}`,
      `DTSTART:${fmtICS(start)}`,
      `DTEND:${fmtICS(end)}`,
      `SUMMARY:SYNCRO · ${s.title}`,
      'DESCRIPTION:Bloque de enfoque programado con SYNCRO.',
      'END:VEVENT',
    ].join('\r\n');
  });

  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SYNCRO//Study Calendar//ES', ...events, 'END:VCALENDAR'].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `syncro-calendario-${keyOf()}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Calendario exportado (.ics).');
}

export function initCalendarModule() {
  $('#calTray')?.addEventListener('click', (e) => {
    const chip = e.target.closest('[data-mid]');
    if (!chip) return;
    selectedMissionId = selectedMissionId === chip.dataset.mid ? null : chip.dataset.mid;
    renderCalTray();
  });

  $('#calTray')?.addEventListener('dragstart', (e) => {
    const chip = e.target.closest('[data-mid]');
    if (!chip) return;
    e.dataTransfer?.setData('text/plain', chip.dataset.mid);
    selectedMissionId = chip.dataset.mid;
  });

  $('#calGrid')?.addEventListener('dragover', (e) => {
    if (e.target.closest('.cal-cell')) e.preventDefault();
  });

  $('#calGrid')?.addEventListener('drop', (e) => {
    const cell = e.target.closest('.cal-cell');
    if (!cell) return;
    e.preventDefault();
    const mid = e.dataTransfer?.getData('text/plain') || selectedMissionId;
    if (mid) assignSlot(Number(cell.dataset.day), Number(cell.dataset.hour), mid);
  });

  $('#calGrid')?.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm-slot]');
    if (rm) {
      const [d, h] = rm.dataset.rmSlot.split('-').map(Number);
      state.calendar.slots = (state.calendar.slots || []).filter((s) => !(s.day === d && s.hour === h));
      saveState();
      renderCalendar();
      return;
    }
    const cell = e.target.closest('.cal-cell');
    if (cell && selectedMissionId) {
      assignSlot(Number(cell.dataset.day), Number(cell.dataset.hour), selectedMissionId);
    }
  });

  $('#calDayChips')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-day-idx]');
    if (!btn) return;
    selectedDayIdx = Number(btn.dataset.dayIdx);
    renderCalendar();
  });

  $('#calPrevDay')?.addEventListener('click', () => {
    selectedDayIdx = (selectedDayIdx + 6) % 7;
    renderCalendar();
  });
  $('#calNextDay')?.addEventListener('click', () => {
    selectedDayIdx = (selectedDayIdx + 1) % 7;
    renderCalendar();
  });
  $('#calToggleMode')?.addEventListener('click', () => {
    fullWeekMode = !fullWeekMode;
    const btn = $('#calToggleMode');
    if (btn) btn.textContent = fullWeekMode ? '📅 Ver día' : '📆 Ver semana completa';
    renderCalendar();
  });

  $('#calAutoPlan')?.addEventListener('click', () => {
    const openMissions = state.missions.filter((m) => !m.done);
    if (!openMissions.length) {
      toast('Añade primero alguna misión para planificar tu semana.');
      return;
    }
    const peak = getPeakHours();
    openMissions.forEach((m, idx) => {
      const d = (dayIdx() + idx) % 7;
      const h = peak[idx % peak.length] || 10;
      state.calendar.slots = (state.calendar.slots || []).filter((s) => !(s.day === d && s.hour === h));
      state.calendar.slots.push({ day: d, hour: h, missionId: m.id, title: m.title, done: false });
    });
    saveState();
    renderCalendar();
    toast('✨ Semana planificada en tus horarios de mejor energía.');
  });

  $('#calExportIcs')?.addEventListener('click', exportICS);
  $('#calExportGoogle')?.addEventListener('click', () => {
    const first = (state.calendar.slots || [])[0];
    const title = encodeURIComponent(first ? `SYNCRO · ${first.title}` : 'Bloque de enfoque SYNCRO');
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`, '_blank', 'noopener');
  });
}
