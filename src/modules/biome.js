/**
 * SYNCRO — Módulo del Bioma Vivo (Santuario Andino)
 * Motor visual SVG multicapa del santuario con ciclo día/noche, clima,
 * estaciones, lluvia animada al regar, flora/fauna andina en SVG y
 * micro-interacciones táctiles con los guardianes.
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
  { at: 140, label: 'Floración', icon: '🌺' },
  { at: 240, label: 'Santuario vivo', icon: '🏔️' },
];

const TIME_MODES = [
  { id: 'auto', label: 'Automático' },
  { id: 'dawn', label: '🌅 Amanecer' },
  { id: 'day', label: '☀️ Día' },
  { id: 'dusk', label: '🌆 Atardecer' },
  { id: 'night', label: '🌙 Noche' },
];

const ANIMAL_MESSAGES = {
  alpaca: [
    'Respira hondo, vas a tu propio ritmo.',
    'Un bloque pequeño también nutre el valle.',
    'Sin prisa ni culpa: hoy ya cuenta.',
    '¡Qué bien se siente el aire de altura!',
  ],
  vicuna: [
    'Tu ligereza y enfoque abren camino.',
    '3 bloques o más: ¡ya tomaste impulso!',
    'Avanzar con calma llega más lejos.',
  ],
  oso: [
    'El bosque nublado crece con tu constancia.',
    'Cuidar tu descanso también es avanzar.',
    'Tu santuario ya alberga un ecosistema diverso.',
  ],
  condor: [
    'Desde lo alto se ve todo lo que has construido.',
    '7 días seguidos: ¡tu constancia vuela alto!',
    'Cuando las nubes suben, un paso pequeño las despeja.',
  ],
};

let growthAnim = null;
let manualTimeOverride = 'auto';
let bubbleTimer = null;
let audioCtx = null;

/* ---------------- Audio sutil (Web Audio API, sin archivos externos) ---------------- */
function playSoftChime(freq = 523.25, type = 'sine', duration = 0.24) {
  try {
    if (state.focus && state.focus.alarmMuted) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.18, now + duration * 0.6);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  } catch (_) {
    // Ignorar silenciosamente si el navegador bloquea audio sin gesto
  }
}

function playWaterSound() {
  const notes = [440, 523.25, 659.25, 783.99];
  notes.forEach((n, idx) => {
    setTimeout(() => playSoftChime(n, 'sine', 0.22), idx * 95);
  });
}

/* ---------------- SVG de Flora Andina ---------------- */
function getPlantSvg(species, stage) {
  if (species === 'ichu') {
    return `<svg viewBox="0 0 40 36" class="bl-svg-plant" aria-hidden="true">
      <path d="M20 34 Q14 20 8 11 M20 34 Q18 18 15 6 M20 34 Q22 17 26 7 M20 34 Q27 21 33 13" stroke="#D4A373" stroke-width="2.2" stroke-linecap="round" fill="none"/>
      <path d="M20 34 Q16 23 12 16 M20 34 Q24 22 29 16" stroke="#E9C46A" stroke-width="1.6" stroke-linecap="round" fill="none"/>
    </svg>`;
  }

  if (species === 'wildflower') {
    return `<svg viewBox="0 0 36 42" class="bl-svg-plant" aria-hidden="true">
      <path d="M18 40 Q17 28 18 16" stroke="#15803D" stroke-width="2.4" stroke-linecap="round" fill="none"/>
      <path d="M18 30 Q10 27 9 22 Q15 23 18 28" fill="#22C55E"/>
      <path d="M18 28 Q26 25 27 20 Q21 21 18 26" fill="#16A34A"/>
      <circle cx="18" cy="13" r="4.5" fill="#FDE047"/>
      <circle cx="13" cy="14" r="3" fill="#FB7185"/>
      <circle cx="23" cy="14" r="3" fill="#FB7185"/>
      <circle cx="18" cy="9" r="3" fill="#F43F5E"/>
      <circle cx="18" cy="14" r="2.5" fill="#FEF08A"/>
    </svg>`;
  }

  if (stage === 0) {
    // Semilla / brote tierno con rocío
    return `<svg viewBox="0 0 48 52" class="bl-svg-plant" aria-hidden="true">
      <ellipse cx="24" cy="47" rx="11" ry="3.5" fill="rgba(6,78,59,0.45)"/>
      <path d="M24 46 Q24 34 24 25" stroke="#22C55E" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M24 30 Q12 24 11 16 Q21 17 24 26" fill="#4ADE80"/>
      <path d="M24 27 Q35 21 37 14 Q27 15 24 24" fill="#22C55E"/>
      <circle cx="31" cy="18" r="2" fill="#BAE6FD" opacity="0.9"/>
    </svg>`;
  }

  if (species === 'queñual') {
    if (stage === 1) {
      return `<svg viewBox="0 0 64 76" class="bl-svg-plant" aria-hidden="true">
        <ellipse cx="32" cy="71" rx="15" ry="4" fill="rgba(6,78,59,0.4)"/>
        <path d="M32 70 Q29 52 33 36" stroke="#9A3412" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M31 50 Q22 44 19 38" stroke="#9A3412" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        <circle cx="32" cy="30" r="14" fill="#15803D"/>
        <circle cx="22" cy="36" r="10" fill="#16A34A"/>
        <circle cx="42" cy="35" r="10" fill="#22C55E"/>
        <circle cx="32" cy="24" r="8" fill="#4ADE80" opacity="0.55"/>
      </svg>`;
    }
    return `<svg viewBox="0 0 88 104" class="bl-svg-plant" aria-hidden="true">
      <ellipse cx="44" cy="98" rx="22" ry="5" fill="rgba(6,78,59,0.42)"/>
      <path d="M44 97 Q38 74 45 52 Q48 44 42 36" stroke="#9A3412" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M42 74 Q28 64 22 50" stroke="#B45309" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      <path d="M45 66 Q60 56 66 44" stroke="#9A3412" stroke-width="4.2" stroke-linecap="round" fill="none"/>
      <circle cx="24" cy="44" r="16" fill="#14532D"/>
      <circle cx="64" cy="40" r="17" fill="#15803D"/>
      <circle cx="44" cy="30" r="22" fill="#16A34A"/>
      <circle cx="32" cy="38" r="13" fill="#22C55E"/>
      <circle cx="54" cy="32" r="13" fill="#4ADE80" opacity="0.65"/>
    </svg>`;
  }

  if (species === 'chachacoma') {
    if (stage === 1) {
      return `<svg viewBox="0 0 60 66" class="bl-svg-plant" aria-hidden="true">
        <ellipse cx="30" cy="61" rx="14" ry="4" fill="rgba(6,78,59,0.38)"/>
        <path d="M30 60 Q28 45 20 34 M30 60 Q32 42 40 32 M30 60 L30 28" stroke="#166534" stroke-width="3" stroke-linecap="round" fill="none"/>
        <ellipse cx="20" cy="32" rx="9" ry="7" fill="#0D9488"/>
        <ellipse cx="40" cy="30" rx="9" ry="7" fill="#14B8A6"/>
        <ellipse cx="30" cy="24" rx="10" ry="8" fill="#2DD4BF"/>
      </svg>`;
    }
    return `<svg viewBox="0 0 76 80" class="bl-svg-plant" aria-hidden="true">
      <ellipse cx="38" cy="74" rx="20" ry="5" fill="rgba(6,78,59,0.4)"/>
      <circle cx="24" cy="48" r="15" fill="#0F766E"/>
      <circle cx="52" cy="48" r="15" fill="#0D9488"/>
      <circle cx="38" cy="38" r="18" fill="#14B8A6"/>
      <circle cx="30" cy="34" r="11" fill="#2DD4BF" opacity="0.7"/>
      <circle cx="24" cy="40" r="3.2" fill="#FEF08A"/>
      <circle cx="39" cy="26" r="3.5" fill="#FEF9C3"/>
      <circle cx="50" cy="42" r="3.2" fill="#FEF08A"/>
      <circle cx="34" cy="46" r="2.8" fill="#FDE047"/>
    </svg>`;
  }

  // Cantuta (flor sagrada de los Andes) por defecto
  if (stage === 1) {
    return `<svg viewBox="0 0 60 70" class="bl-svg-plant" aria-hidden="true">
      <ellipse cx="30" cy="65" rx="13" ry="3.5" fill="rgba(6,78,59,0.4)"/>
      <path d="M30 64 Q28 44 22 28" stroke="#15803D" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M30 64 Q33 46 40 32" stroke="#16A34A" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      <ellipse cx="22" cy="46" rx="7" ry="3.5" transform="rotate(-25 22 46)" fill="#22C55E"/>
      <ellipse cx="38" cy="48" rx="7" ry="3.5" transform="rotate(25 38 48)" fill="#16A34A"/>
      <path d="M22 28 Q16 33 17 40 Q22 38 24 33 Z" fill="#F43F5E"/>
      <path d="M40 32 Q45 37 43 43 Q38 41 37 36 Z" fill="#FB7185"/>
    </svg>`;
  }

  return `<svg viewBox="0 0 84 96" class="bl-svg-plant" aria-hidden="true">
    <ellipse cx="42" cy="90" rx="20" ry="5" fill="rgba(6,78,59,0.42)"/>
    <path d="M42 89 Q37 64 26 38 Q22 28 16 26" stroke="#15803D" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <path d="M42 89 Q46 62 56 36 Q61 27 68 25" stroke="#166534" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <path d="M42 89 Q42 58 42 26" stroke="#16A34A" stroke-width="3.4" stroke-linecap="round" fill="none"/>
    <ellipse cx="31" cy="62" rx="9" ry="4" transform="rotate(-28 31 62)" fill="#22C55E"/>
    <ellipse cx="53" cy="60" rx="9" ry="4" transform="rotate(28 53 60)" fill="#16A34A"/>
    <ellipse cx="34" cy="46" rx="8" ry="3.6" transform="rotate(-20 34 46)" fill="#4ADE80"/>
    <ellipse cx="50" cy="44" rx="8" ry="3.6" transform="rotate(20 50 44)" fill="#22C55E"/>
    <!-- Flores colgantes de Cantuta (campanillas fucsia/amarillo) -->
    <g>
      <path d="M16 26 L12 40 Q16 44 21 40 Z" fill="#E11D48"/>
      <path d="M14 38 Q16 45 19 38" fill="#FACC15"/>
    </g>
    <g>
      <path d="M42 26 L36 42 Q42 47 48 42 Z" fill="#F43F5E"/>
      <path d="M39 40 Q42 48 45 40" fill="#FDE047"/>
    </g>
    <g>
      <path d="M68 25 L63 39 Q68 43 73 39 Z" fill="#E11D48"/>
      <path d="M66 37 Q68 44 71 37" fill="#FACC15"/>
    </g>
  </svg>`;
}

/* ---------------- SVG de Fauna Andina ---------------- */
function getAnimalSvg(kind) {
  if (kind === 'vicuna') {
    return `<svg viewBox="0 0 68 72" class="bl-svg-animal" aria-hidden="true">
      <ellipse cx="34" cy="67" rx="16" ry="3.5" fill="rgba(0,0,0,0.28)"/>
      <!-- Patas delgadas -->
      <path d="M24 46 L22 65 M30 47 L29 65 M42 47 L43 65 M47 46 L49 65" stroke="#B45309" stroke-width="3.2" stroke-linecap="round"/>
      <!-- Cuerpo canela -->
      <ellipse cx="36" cy="42" rx="16" ry="10" fill="#D97706"/>
      <!-- Pechera blanca -->
      <path d="M21 38 Q18 47 26 50 Q28 43 24 36 Z" fill="#FEF3C7"/>
      <!-- Cuello largo -->
      <path d="M23 39 L20 18" stroke="#D97706" stroke-width="7.5" stroke-linecap="round"/>
      <!-- Cabeza y orejas -->
      <ellipse cx="18" cy="17" rx="6.5" ry="5" fill="#F59E0B"/>
      <path d="M17 13 L15 5 M21 13 L23 6" stroke="#D97706" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="15.5" cy="16.5" r="1.4" fill="#1E293B"/>
      <ellipse cx="13" cy="18.5" rx="2.5" ry="1.8" fill="#FEF3C7"/>
      <!-- Colita -->
      <path d="M51 39 Q57 38 55 44" stroke="#B45309" stroke-width="3" stroke-linecap="round" fill="none"/>
    </svg>`;
  }

  if (kind === 'oso') {
    return `<svg viewBox="0 0 74 68" class="bl-svg-animal" aria-hidden="true">
      <ellipse cx="37" cy="63" rx="20" ry="4" fill="rgba(0,0,0,0.3)"/>
      <!-- Patas -->
      <rect x="20" y="45" width="9" height="17" rx="4.5" fill="#1E1B18"/>
      <rect x="44" y="45" width="9" height="17" rx="4.5" fill="#1E1B18"/>
      <!-- Cuerpo robusto -->
      <ellipse cx="37" cy="41" rx="20" ry="15" fill="#292524"/>
      <ellipse cx="37" cy="44" rx="11" ry="9" fill="#44403C" opacity="0.5"/>
      <!-- Cabeza y orejas -->
      <circle cx="24" cy="25" r="12" fill="#292524"/>
      <circle cx="15" cy="15" r="4.2" fill="#1C1917"/>
      <circle cx="32" cy="15" r="4.2" fill="#1C1917"/>
      <!-- Anteojos crema característicos -->
      <circle cx="20" cy="24" r="3.8" fill="none" stroke="#FEF3C7" stroke-width="2.2"/>
      <circle cx="28" cy="24" r="3.8" fill="none" stroke="#FEF3C7" stroke-width="2.2"/>
      <circle cx="20" cy="24" r="1.4" fill="#0F172A"/>
      <circle cx="28" cy="24" r="1.4" fill="#0F172A"/>
      <!-- Hocico -->
      <ellipse cx="24" cy="29.5" rx="4.5" ry="3.2" fill="#FDE68A"/>
      <ellipse cx="24" cy="28.3" rx="2" ry="1.3" fill="#0F172A"/>
    </svg>`;
  }

  // Alpaca por defecto (esponjosa con chalinita andina)
  return `<svg viewBox="0 0 68 74" class="bl-svg-animal" aria-hidden="true">
    <ellipse cx="34" cy="69" rx="17" ry="3.8" fill="rgba(0,0,0,0.28)"/>
    <!-- Patas -->
    <path d="M24 49 L24 67 M30 50 L30 67 M41 50 L41 67 M46 49 L46 67" stroke="#E2E8F0" stroke-width="4" stroke-linecap="round"/>
    <path d="M24 65 L24 67 M30 65 L30 67 M41 65 L41 67 M46 65 L46 67" stroke="#475569" stroke-width="4" stroke-linecap="round"/>
    <!-- Cuerpo esponjoso -->
    <circle cx="27" cy="43" r="11" fill="#F8FAFC"/>
    <circle cx="37" cy="42" r="12" fill="#F8FAFC"/>
    <circle cx="46" cy="44" r="10" fill="#F1F5F9"/>
    <circle cx="52" cy="40" r="5" fill="#F8FAFC"/>
    <!-- Cuello esponjoso -->
    <rect x="19" y="19" width="11" height="24" rx="5.5" fill="#F8FAFC"/>
    <!-- Chalinita andina (lliclla) -->
    <path d="M18 33 Q24 37 31 33 L32 37 Q24 41 18 37 Z" fill="#E11D48"/>
    <path d="M19 35 Q24 38 30 35" stroke="#FACC15" stroke-width="1.4" stroke-dasharray="2 2" fill="none"/>
    <!-- Cabeza y orejas -->
    <circle cx="23" cy="18" r="8.5" fill="#FFFFFF"/>
    <ellipse cx="19" cy="9" rx="2.6" ry="5.5" transform="rotate(-12 19 9)" fill="#F8FAFC"/>
    <ellipse cx="26" cy="9" rx="2.6" ry="5.5" transform="rotate(12 26 9)" fill="#F8FAFC"/>
    <ellipse cx="19" cy="9.5" rx="1.2" ry="3" transform="rotate(-12 19 9.5)" fill="#FDA4AF"/>
    <ellipse cx="26" cy="9.5" rx="1.2" ry="3" transform="rotate(12 26 9.5)" fill="#FDA4AF"/>
    <!-- Carita -->
    <circle cx="19.5" cy="17.5" r="1.5" fill="#0F172A"/>
    <circle cx="25.5" cy="17.5" r="1.5" fill="#0F172A"/>
    <circle cx="17.2" cy="19.8" r="1.7" fill="#FDA4AF" opacity="0.65"/>
    <circle cx="27.8" cy="19.8" r="1.7" fill="#FDA4AF" opacity="0.65"/>
    <path d="M21 20.5 Q22.5 22 24 20.5" stroke="#475569" stroke-width="1.3" stroke-linecap="round" fill="none"/>
  </svg>`;
}

export function getCondorSvg() {
  return `<svg viewBox="0 0 88 40" class="bl-svg-condor" aria-hidden="true">
    <path d="M44 21 Q26 6 4 14 Q18 22 36 25 Z" fill="#1E293B"/>
    <path d="M44 21 Q62 6 84 14 Q70 22 52 25 Z" fill="#1E293B"/>
    <path d="M12 15 Q26 11 36 19" stroke="#E2E8F0" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <path d="M76 15 Q62 11 52 19" stroke="#E2E8F0" stroke-width="2.2" stroke-linecap="round" fill="none"/>
    <ellipse cx="44" cy="23" rx="8" ry="4.5" fill="#0F172A"/>
    <circle cx="48" cy="22" r="3" fill="#F8FAFC"/>
    <circle cx="52" cy="21" r="2.2" fill="#334155"/>
    <path d="M54 21 L58 22.5 L54 23 Z" fill="#F59E0B"/>
  </svg>`;
}

/* ---------------- Ciclo día/noche, estación y clima ---------------- */
export function currentTimeOfDay() {
  if (manualTimeOverride !== 'auto') {
    const found = TIME_MODES.find((t) => t.id === manualTimeOverride);
    return { id: manualTimeOverride, label: found ? found.label : '☀️ Día', isManual: true };
  }
  const h = new Date().getHours();
  if (h >= 5 && h < 8) return { id: 'dawn', label: '🌅 Amanecer', isManual: false };
  if (h >= 8 && h < 17) return { id: 'day', label: '☀️ Día', isManual: false };
  if (h >= 17 && h < 20) return { id: 'dusk', label: '🌆 Atardecer', isManual: false };
  return { id: 'night', label: '🌙 Noche', isManual: false };
}

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
  if (state.user.streak >= 3 && workedToday) {
    return { id: 'rainbow', chip: '🌈 Arcoíris', caption: 'Tu constancia de 3+ días ilumina la cordillera.' };
  }
  if (allDone) {
    return { id: 'sun', chip: '☀️ Despejado', caption: 'Completaste tus misiones de hoy. Tu santuario brilla.' };
  }
  if (workedToday) {
    return { id: 'clear', chip: '⛅ Despejando', caption: 'Ya avanzaste hoy. Cada bloque nutre tu ecosistema.' };
  }
  return { id: 'fog', chip: '🌫️ Niebla suave', caption: 'Hoy aún no avanzas. Un bloque de 5 minutos disipa la niebla sin culpa.' };
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

/* ---------------- Lluvia animada y partículas ---------------- */
function spawnRainAnimation() {
  const rainEl = $('#blRain');
  const scene = $('#blScene');
  if (!rainEl || !scene) return;

  rainEl.innerHTML = '';
  const drops = 26;
  for (let i = 0; i < drops; i += 1) {
    const drop = document.createElement('span');
    drop.className = 'bl-drop';
    drop.style.left = `${4 + Math.random() * 92}%`;
    drop.style.animationDelay = `${(Math.random() * 0.75).toFixed(2)}s`;
    drop.style.animationDuration = `${(0.75 + Math.random() * 0.45).toFixed(2)}s`;
    rainEl.appendChild(drop);
  }

  scene.classList.remove('watering');
  // Forzar reflow para reiniciar la animación si el usuario riega seguido
  void scene.offsetWidth;
  scene.classList.add('watering');

  setTimeout(() => {
    scene.classList.remove('watering');
    rainEl.innerHTML = '';
  }, 1900);
}

function showAnimalReaction(btn, animalKey) {
  const scene = $('#blScene');
  const bubble = $('#blBubble');
  if (!scene || !bubble) return;

  // Salto elástico del animal
  btn.classList.remove('happy-hop');
  void btn.offsetWidth;
  btn.classList.add('happy-hop');
  setTimeout(() => btn.classList.remove('happy-hop'), 700);

  // Destellos sobre el animal
  const sparkles = $('#blSparkles');
  if (sparkles) {
    const rect = btn.getBoundingClientRect();
    const sceneRect = scene.getBoundingClientRect();
    const cx = ((rect.left + rect.width / 2 - sceneRect.left) / sceneRect.width) * 100;
    const cy = ((rect.top - sceneRect.top) / sceneRect.height) * 100;
    for (let i = 0; i < 4; i += 1) {
      const sp = document.createElement('span');
      sp.className = 'bl-sparkle';
      sp.textContent = i % 2 === 0 ? '✦' : '✨';
      sp.style.left = `${Math.max(8, Math.min(92, cx + (Math.random() * 10 - 5)))}%`;
      sp.style.top = `${Math.max(12, Math.min(82, cy + (Math.random() * 8 - 4)))}%`;
      sp.style.animationDelay = `${i * 70}ms`;
      sparkles.appendChild(sp);
      setTimeout(() => sp.remove(), 950);
    }
  }

  // Mensaje cálido sin culpa
  const msgs = ANIMAL_MESSAGES[animalKey] || ANIMAL_MESSAGES.alpaca;
  const pick = msgs[Math.floor(Math.random() * msgs.length)];
  const label = GUARDIAN_NAMES[animalKey] || 'Guardián';
  bubble.innerHTML = `<strong>${label}:</strong> ${pick}`;

  const rect = btn.getBoundingClientRect();
  const sceneRect = scene.getBoundingClientRect();
  const leftPct = Math.max(22, Math.min(78, ((rect.left + rect.width / 2 - sceneRect.left) / sceneRect.width) * 100));
  const topPx = Math.max(12, rect.top - sceneRect.top - 52);
  bubble.style.left = `${leftPct}%`;
  bubble.style.top = `${topPx}px`;
  bubble.classList.add('show');

  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 3600);

  const pitchMap = { alpaca: 523.25, vicuna: 587.33, oso: 392.0, condor: 659.25 };
  playSoftChime(pitchMap[animalKey] || 523.25, 'triangle', 0.22);
}

/* ---------------- Render principal de la escena ---------------- */
export function renderBiomeScene(overrideEarth = null) {
  const earth = overrideEarth !== null ? overrideEarth : state.biome.earth || 0;
  const scene = $('#blScene');
  const plantsEl = $('#blPlants');
  const faunaEl = $('#blFauna');
  const condorEl = $('#blCondor');
  const weather = currentWeather();
  const season = currentSeason();
  const timeOfDay = currentTimeOfDay();
  const seedKey = (state.profile && state.profile.seed) || 'cantuta';

  if (scene) {
    scene.dataset.weather = weather.id;
    scene.dataset.season = season.id;
    scene.dataset.time = timeOfDay.id;
    scene.classList.toggle('lush', earth >= 140);
  }

  // Sincronizar también la miniatura del Dashboard
  const dashPreview = $('#dashBiomePreview');
  if (dashPreview) {
    dashPreview.dataset.weather = weather.id;
    dashPreview.dataset.season = season.id;
    dashPreview.dataset.time = timeOfDay.id;
  }

  if ($('#blWeatherChip')) $('#blWeatherChip').textContent = weather.chip;
  if ($('#blSeasonChip')) $('#blSeasonChip').textContent = season.label;
  if ($('#blTimeChip')) {
    $('#blTimeChip').textContent = timeOfDay.label;
    $('#blTimeChip').title = 'Toca para cambiar la hora del cielo (Auto / Amanecer / Día / Atardecer / Noche)';
  }
  if ($('#blCaption')) $('#blCaption').textContent = weather.caption;
  if ($('#previewWeather')) $('#previewWeather').textContent = weather.chip;

  // Cóndor andino en SVG con vuelo real al desbloquearse
  if (condorEl) {
    if (!condorEl.dataset.svgReady) {
      condorEl.innerHTML = getCondorSvg();
      condorEl.dataset.svgReady = '1';
    }
    const unlockedCondor = state.user.streak >= 7 || earth >= 260;
    condorEl.classList.toggle('on', unlockedCondor);
    condorEl.classList.toggle('locked', !unlockedCondor);
  }
  if ($('#condorHint')) {
    $('#condorHint').textContent =
      state.user.streak >= 7 ? '¡Desbloqueado!' : `Te faltan ${Math.max(0, 7 - state.user.streak)} días.`;
  }

  // Flora distribuida orgánicamente por etapas y profundidad
  if (plantsEl) {
    const mainStage = earth >= 200 ? 2 : earth >= 60 ? 1 : 0;
    const alt1 = seedKey === 'cantuta' ? 'queñual' : 'cantuta';
    const alt2 = seedKey === 'chachacoma' ? 'cantuta' : 'chachacoma';

    const slots = [
      { at: 0, species: 'ichu', stage: 0, left: 8, bottom: 20, size: 34, delay: 0.2 },
      { at: 0, species: seedKey, stage: mainStage, left: 22, bottom: 18, size: mainStage === 0 ? 44 : mainStage === 1 ? 62 : 82, delay: 0.0 },
      { at: 20, species: 'wildflower', stage: 0, left: 36, bottom: 14, size: 32, delay: 1.1 },
      { at: 40, species: alt2, stage: earth >= 140 ? 2 : 1, left: 50, bottom: 26, size: earth >= 140 ? 68 : 52, delay: 0.6 },
      { at: 80, species: 'ichu', stage: 0, left: 62, bottom: 22, size: 36, delay: 1.7 },
      { at: 100, species: alt1, stage: earth >= 220 ? 2 : 1, left: 74, bottom: 28, size: earth >= 220 ? 86 : 64, delay: 0.9 },
      { at: 140, species: 'wildflower', stage: 0, left: 15, bottom: 12, size: 34, delay: 1.4 },
      { at: 180, species: seedKey, stage: 2, left: 86, bottom: 20, size: 78, delay: 0.4 },
      { at: 240, species: 'queñual', stage: 2, left: 6, bottom: 32, size: 90, delay: 1.9 },
    ];

    const visible = slots.filter((p) => earth >= p.at);
    plantsEl.innerHTML = visible
      .map(
        (p, idx) => `
        <div class="bl-plant on" data-stage="${p.stage}" style="left:${p.left}%;bottom:${p.bottom}px;width:${p.size}px;--sway-delay:${p.delay}s;--pop-delay:${idx * 55}ms">
          <i>${getPlantSvg(p.species, p.stage)}</i>
        </div>`
      )
      .join('');
  }

  // Fauna distribuida sin solaparse + botones interactivos
  if (faunaEl) {
    const primary = (state.profile && state.profile.guardian) || 'alpaca';
    const animals = [{ key: primary === 'condor' ? 'alpaca' : primary, left: 30, bottom: 10, rx: '34px', size: 62 }];

    if (state.stats.blocks >= 3 && primary !== 'vicuna') {
      animals.push({ key: 'vicuna', left: 56, bottom: 18, rx: '-28px', size: 58 });
    }
    if ((unlockedSpeciesCount() >= 4 || earth >= 160) && primary !== 'oso') {
      animals.push({ key: 'oso', left: 12, bottom: 16, rx: '24px', size: 62 });
    }

    faunaEl.innerHTML = animals
      .map(
        (a, i) => `
        <button type="button" class="bl-animal" data-animal="${a.key}" aria-label="Saludar a ${GUARDIAN_NAMES[a.key] || a.key}" title="Toca para saludar" style="left:${a.left}%;bottom:${a.bottom}px;width:${a.size}px;--rx:${a.rx};--roam-delay:${i * -4}s">
          ${getAnimalSvg(a.key)}
        </button>`
      )
      .join('');
  }

  const range = $('#growthRange');
  if (range && overrideEarth === null) range.value = String(Math.min(320, earth));
  if ($('#growthLabel')) $('#growthLabel').textContent = `${earth} puntos Tierra`;

  // Tarjetas de etapas (.bl-stage) usando el diseño real del CSS
  const stagesEl = $('#blStages');
  if (stagesEl) {
    let currentIdx = 0;
    STAGES.forEach((st, i) => {
      if (earth >= st.at) currentIdx = i;
    });
    stagesEl.innerHTML = STAGES.map((st, i) => {
      const reached = earth >= st.at;
      const isCurrent = i === currentIdx;
      return `
        <div class="bl-stage ${reached ? 'reached' : ''} ${isCurrent ? 'current' : ''}">
          <span class="em">${st.icon}</span>
          <strong>${st.label}</strong>
          <small>${st.at} pts</small>
        </div>`;
    }).join('');
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
  // Riego con lluvia animada, ondas en laguna y sonido suave
  $('#waterBiomeBtn')?.addEventListener('click', () => {
    if ((state.biome.drops || 0) < 20) {
      toast('Necesitas 20 gotas de riego. Completa bloques o misiones para ganar más.');
      return;
    }
    state.biome.drops -= 20;
    state.biome.earth = (state.biome.earth || 0) + 25;
    state.biome.waters = (state.biome.waters || 0) + 1;
    saveState();

    spawnRainAnimation();
    playWaterSound();
    toast('💧 ¡Santuario regado! +25 Puntos Tierra.');
    renderBiome();
    onWatered();
  });

  // Selector táctil de hora del día (Auto -> Amanecer -> Día -> Atardecer -> Noche)
  $('#blTimeChip')?.addEventListener('click', () => {
    const idx = TIME_MODES.findIndex((t) => t.id === manualTimeOverride);
    const next = TIME_MODES[(idx + 1) % TIME_MODES.length];
    manualTimeOverride = next.id;
    renderBiomeScene();
    playSoftChime(493.88, 'sine', 0.16);
  });

  // Micro-interacción táctil al tocar cualquier guardián (fauna o cóndor)
  $('#blFauna')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.bl-animal');
    if (!btn) return;
    showAnimalReaction(btn, btn.dataset.animal);
  });

  $('#blCondor')?.addEventListener('click', (e) => {
    const condor = e.currentTarget;
    showAnimalReaction(condor, 'condor');
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
    renderBiomeScene(0);
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
    }, 280);
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
