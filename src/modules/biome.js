/**
 * SYNCRO — Módulo del Bioma Vivo (Santuario Andino)
 * Motor visual del santuario, riego con gotas, clima/estaciones,
 * especies nativas desbloqueables y reto colectivo sincronizado con ecoService.
 */

import { state, saveState, seed, guardian, GUARDIAN_NAMES } from '../core/state.js';
import { $, $$, toast, openInfo } from '../ui/modals.js';
import { ecoService } from '../services/ecoService.js';

const FLORA_FICHAS = [
  { icon: '🌺', name: 'Cantuta (Cantua buxifolia)', desc: 'Flor sagrada de los Andes, símbolo de constancia y resiliencia en altura.' },
  { icon: '🌲', name: 'Queñual (Polylepis)', desc: 'Árbol nativo altoandino que captura agua de neblina y protege suelos.' },
  { icon: '🌿', name: 'Chachacoma (Escallonia)', desc: 'Arbusto aromático andino resistente al frío extremo.' },
];

const FAUNA_FICHAS = [
  { icon: '🦙', name: 'Alpaca', desc: 'Tu compañera inicial de calma y ritmo sostenido.' },
  { icon: '🦌', name: 'Vicuña', desc: 'Se desbloquea al completar 3 bloques de enfoque.' },
  { icon: '🦅', name: 'Cóndor andino', desc: 'Sobrevuela tu santuario al alcanzar 7 días de racha.' },
  { icon: '🐻', name: 'Oso de anteojos', desc: 'Guardián del bosque nublado; se desbloquea con 4 especies activas.' },
];

const STAGES = [
  { at: 0, label: 'Semilla', icon: '🌱' },
  { at: 60, label: 'Brote', icon: '🌿' },
  { at: 140, label: 'Floración', icon: '🌷' },
  { at: 240, label: 'Santuario vivo', icon: '🌺' },
];

let growthAnim = null;

function currentSeason() {
  const m = new Date().getMonth();
  if (m >= 8 && m <= 10) return { id: 'primavera', label: '🌸 Primavera andina' };
  if (m >= 11 || m <= 1) return { id: 'verano', label: '☀️ Temporada de lluvias' };
  if (m >= 2 && m <= 4) return { id: 'otono', label: '🍂 Otoño andino' };
  return { id: 'invierno', label: '❄️ Temporada seca' };
}

export function currentWeather() {
  const allDone = state.missions.length > 0 && state.missions.every((m) => m.done);
  const workedToday = state.daily.blocks > 0 || state.missions.some((m) => m.done);
  if (state.user.streak >= 3 && workedToday) return { id: 'rainbow', chip: '🌈 Arcoíris', caption: 'Tu constancia de 3+ días ilumina el santuario.' };
  if (allDone) return { id: 'sunny', chip: '☀️ Soleado', caption: 'Completaste tus misiones de hoy. Tu santuario brilla.' };
  if (workedToday) return { id: 'clear', chip: '⛅ Despejando', caption: 'Ya avanzaste hoy. Cada bloque nutre el ecosistema.' };
  return { id: 'cloudy', chip: '🌫️ Niebla suave', caption: 'Hoy aún no avanzas. Un bloque de 5 minutos disipa la niebla sin culpa.' };
}

export function unlockedSpeciesCount() {
  const earth = state.biome.earth || 0;
  let count = 1;
  if (earth >= 40) count += 1;
  if (earth >= 80) count += 1;
  if (earth >= 140) count += 1;
  if (state.stats.blocks >= 3) count += 1;
  if (state.user.streak >= 7) count += 1;
  if (earth >= 240) count += 1;
  return Math.min(7, count);
}

export function renderBiomeScene(overrideEarth = null) {
  const earth = overrideEarth !== null ? overrideEarth : state.biome.earth || 0;
  const scene = $('#blScene');
  const plantsEl = $('#blPlants');
  const faunaEl = $('#blFauna');
  const weather = currentWeather();
  const season = currentSeason();

  if (scene) {
    scene.dataset.weather = weather.id;
    scene.dataset.season = season.id;
  }
  if ($('#blWeatherChip')) $('#blWeatherChip').textContent = weather.chip;
  if ($('#blSeasonChip')) $('#blSeasonChip').textContent = season.label;
  if ($('#blCaption')) $('#blCaption').textContent = weather.caption;
  if ($('#previewWeather')) $('#previewWeather').textContent = weather.chip;
  if ($('#blCondor')) $('#blCondor').style.opacity = state.user.streak >= 7 ? '1' : '0.12';
  if ($('#condorHint')) {
    $('#condorHint').textContent =
      state.user.streak >= 7 ? '¡Desbloqueado!' : `Te faltan ${Math.max(0, 7 - state.user.streak)} días.`;
  }

  if (plantsEl) {
    const s = seed().stages;
    const items = [s[0]];
    if (earth >= 40) items.push(s[1]);
    if (earth >= 100) items.push(s[2]);
    if (earth >= 180) items.push(s[3]);
    if (earth >= 240) items.push('🌳');
    plantsEl.innerHTML = items.map((ic) => `<span class="bl-plant">${ic}</span>`).join('');
  }

  if (faunaEl) {
    const animals = [guardian()];
    if (state.stats.blocks >= 3 && state.profile.guardian !== 'vicuna') animals.push('🦌');
    if (unlockedSpeciesCount() >= 4 && state.profile.guardian !== 'oso') animals.push('🐻');
    faunaEl.innerHTML = animals.map((ic) => `<span class="bl-animal">${ic}</span>`).join('');
  }

  const range = $('#growthRange');
  if (range && overrideEarth === null) range.value = String(Math.min(320, earth));
  if ($('#growthLabel')) $('#growthLabel').textContent = `${earth} puntos Tierra`;

  const stagesEl = $('#blStages');
  if (stagesEl) {
    stagesEl.innerHTML = STAGES.map(
      (st) => `<span class="pill ${earth >= st.at ? 'emerald' : ''}">${st.icon} ${st.label}</span>`
    ).join('');
  }
}

export async function renderBiome({ onAfterWater = () => {} } = {}) {
  renderBiomeScene();
  if ($('#biomeDrops')) $('#biomeDrops').textContent = state.biome.drops;
  if ($('#biomeEarth')) $('#biomeEarth').textContent = state.biome.earth;
  if ($('#biomeSpecies')) $('#biomeSpecies').textContent = `${unlockedSpeciesCount()} / 7`;
  if ($('#biomeStreak')) $('#biomeStreak').textContent = state.user.streak;

  const pct = Math.min(100, Math.round(((state.biome.earth || 0) / 320) * 100));
  if ($('#biomeFill')) $('#biomeFill').style.width = `${pct}%`;

  const waterBtn = $('#waterBiomeBtn');
  if (waterBtn) waterBtn.disabled = (state.biome.drops || 0) < 20;

  // Sincronizar barra de reto colectivo con ecoService
  const metrics = await ecoService.fetchImpactMetrics();
  const hours = Math.max(metrics.verifiedHours, state.biome.collectiveHours || 0);
  const goal = metrics.challengeGoalHours || 150;
  if ($('#collectiveText')) $('#collectiveText').textContent = `${hours.toFixed(1)} / ${goal} h`;
  if ($('#collectiveFill')) $('#collectiveFill').style.width = `${Math.min(100, Math.round((hours / goal) * 100))}%`;
}

export function initBiomeModule({ onWatered = () => {} } = {}) {
  $('#waterBiomeBtn')?.addEventListener('click', () => {
    if ((state.biome.drops || 0) < 20) {
      toast('Necesitas 20 gotas de riego. Completa bloques o misiones para ganar más.');
      return;
    }
    state.biome.drops -= 20;
    state.biome.earth = (state.biome.earth || 0) + 25;
    state.biome.waters = (state.biome.waters || 0) + 1;
    saveState();

    const scene = $('#blScene');
    if (scene) {
      scene.classList.add('watering');
      setTimeout(() => scene.classList.remove('watering'), 1400);
    }
    toast('💧 ¡Santuario regado! +25 Puntos Tierra.');
    renderBiome();
    onWatered();
  });

  $('#growthRange')?.addEventListener('input', (e) => {
    renderBiomeScene(Number(e.target.value));
  });

  $('#growthPlay')?.addEventListener('click', () => {
    const btn = $('#growthPlay');
    if (growthAnim) {
      clearInterval(growthAnim);
      growthAnim = null;
      if (btn) btn.textContent = '▶ Ver crecimiento';
      renderBiomeScene();
      return;
    }
    let val = 0;
    if (btn) btn.textContent = '⏹ Detener';
    growthAnim = setInterval(() => {
      val += 20;
      if (val > 320) {
        clearInterval(growthAnim);
        growthAnim = null;
        if (btn) btn.textContent = '▶ Ver crecimiento';
        renderBiomeScene();
        return;
      }
      renderBiomeScene(val);
    }, 260);
  });

  // Sub-pestañas: Mi Santuario | Mi Progreso
  $('#subtabSantuario')?.addEventListener('click', () => {
    $('#subtabSantuario').classList.add('active');
    $('#subtabSantuario').setAttribute('aria-selected', 'true');
    $('#subtabProgreso').classList.remove('active');
    $('#subtabProgreso').setAttribute('aria-selected', 'false');
    $('#santuarioSubView')?.classList.remove('hidden');
    $('#progresoSubView')?.classList.add('hidden');
  });

  $('#subtabProgreso')?.addEventListener('click', () => {
    $('#subtabProgreso').classList.add('active');
    $('#subtabProgreso').setAttribute('aria-selected', 'true');
    $('#subtabSantuario').classList.remove('active');
    $('#subtabSantuario').setAttribute('aria-selected', 'false');
    $('#progresoSubView')?.classList.remove('hidden');
    $('#santuarioSubView')?.classList.add('hidden');
  });

  // Fichas botánicas / fauna / transparencia
  $$('[data-fichas]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const kind = btn.dataset.fichas;
      if (kind === 'flora') {
        openInfo(
          'Zona botánica andina',
          FLORA_FICHAS.map((f) => `<p><strong>${f.icon} ${f.name}:</strong> ${f.desc}</p>`).join('')
        );
      } else if (kind === 'fauna') {
        openInfo(
          'Refugio de fauna local',
          FAUNA_FICHAS.map((f) => `<p><strong>${f.icon} ${f.name}:</strong> ${f.desc}</p>`).join('')
        );
      } else {
        openInfo(
          'Conservación responsable',
          '<p>Cada meta colectiva de horas verificadas se traduce en conservación financiada junto a aliados ambientales como ARBIO Perú. Los comprobantes auditables se publican en el panel de transparencia.</p>'
        );
      }
    });
  });

  $$('[data-transp]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.transp;
      if (k === 'arbio') {
        openInfo('Comprobante del Reto', '<p>Al completar las 150 horas colectivas verificadas, publicaremos aquí el certificado auditable emitido por ARBIO Perú.</p>');
      } else if (k === 'geo') {
        openInfo('Santuario Virtual', '<p>Tu progreso personal en el Santuario Andino refleja tus hábitos reales de enfoque y descanso saludable.</p>');
      } else {
        openInfo('Fondo ESG Comercial', '<p>El 10% de las suscripciones SYNCRO Pro y licencias institucionales B2B se destina directamente a proyectos de reforestación verificable.</p>');
      }
    });
  });
}
