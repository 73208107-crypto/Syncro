/**
 * SYNCRO — Servicio de IA (Edge Functions + Control de Cuotas por Plan)
 * Toda llamada a modelos de lenguaje (Gemini / OpenAI) pasa por Edge Functions
 * para nunca exponer claves en el navegador. Incluye control de cuota semanal
 * (3 desgloses/semana en Gratis, ilimitado en Pro) y respaldo local empático.
 */

import { CONFIG } from '../config.js';
import { authService } from './authService.js';

const QUOTA_KEY = 'syncro_ai_quota_v1';

const FALLBACK_NOPERF_REPLIES = [
  [/código|program|bug|error|fallar|funcionar/i, 'El código nunca sale limpio a la primera. Escribe una versión que apenas compile; después la mejoras.'],
  [/tesis|informe|ensayo|redact|escribir|página/i, 'La página en blanco intimida porque quieres escribir el borrador final. Escribe 5 líneas malas solo para romper el hielo.'],
  [/examen|parcial|nota|aprobar|jalar|estudiar/i, 'No tienes que dominar todo hoy. Elige un solo tema y repásalo durante 15 minutos.'],
  [/cansad|agotad|sueño|no puedo|abrum|ansie|estrés/i, 'Cuando el cerebro está saturado, exigirle el 100% empeora el bloqueo. Hoy cuenta avanzar un 10% y descansar.'],
  [/tiempo|tarde|mañana|plazo|entrega/i, 'La culpa por no haber empezado antes consume la energía de hoy. Arranca con un bloque de 5 minutos ahora.'],
];

const FALLBACK_THEMES = [
  { name: 'exámenes y entregas', re: /examen|parcial|entrega|plazo|tarea|trabajo|tesis|nota|proyecto/i },
  { name: 'perfeccionismo', re: /perfect|mal|fallar|no me sale|suficiente|miedo|duda|error/i },
  { name: 'cansancio o sueño', re: /cansad|agotad|sueño|dorm|fatiga|sin energía|no puedo/i },
  { name: 'distracciones', re: /celular|tiktok|redes|distra|notific|youtube|instagram/i },
  { name: 'calma y avance', re: /bien|tranquil|logr|avanc|content|orgull|enfoc/i },
];

function currentWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

function getQuotaRecord() {
  try {
    const rec = JSON.parse(localStorage.getItem(QUOTA_KEY) || '{}');
    const wk = currentWeekKey();
    if (rec.week !== wk) return { week: wk, count: 0 };
    return rec;
  } catch {
    return { week: currentWeekKey(), count: 0 };
  }
}

function incrementQuota() {
  const rec = getQuotaRecord();
  rec.count += 1;
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(rec));
  } catch {
    // ignore
  }
  return rec;
}

export const aiService = {
  getQuotaStatus() {
    const ses = authService.getSession();
    const isPro = ses?.plan === 'pro' || ses?.plan === 'b2b';
    const rec = getQuotaRecord();
    const limit = isPro ? CONFIG.quotas.proWeeklyBreakdowns : CONFIG.quotas.freeWeeklyBreakdowns;
    return {
      plan: ses?.plan || 'free',
      used: rec.count,
      limit,
      remaining: isPro ? Infinity : Math.max(0, limit - rec.count),
      allowed: isPro || rec.count < limit,
    };
  },

  /**
   * Desglosa una tarea compleja en 5 micro-pasos usando Edge Function segura
   * o generador adaptativo local cuando se trabaja offline.
   */
  async breakdownTask({ task, days = 7, lowEnergy = false }) {
    const quota = this.getQuotaStatus();
    if (!quota.allowed) {
      return {
        quotaExceeded: true,
        message: `Alcanzaste el límite de ${quota.limit} desgloses con IA esta semana en el plan Gratis. Actualiza a SYNCRO Pro para desgloses ilimitados.`,
        steps: [],
      };
    }

    if (CONFIG.endpoints.aiEdgeFunction) {
      try {
        const ses = authService.getSession();
        const res = await fetch(CONFIG.endpoints.aiEdgeFunction, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ses?.accessToken ? { Authorization: `Bearer ${ses.accessToken}` } : {}),
          },
          body: JSON.stringify({ action: 'breakdown', task, days, lowEnergy }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.steps) && data.steps.length) {
            incrementQuota();
            return { quotaExceeded: false, source: 'edge-ai', steps: data.steps };
          }
        }
      } catch {
        // fallback local
      }
    }

    // Generador local estructurado (modo offline / sin backend configurado)
    const clean = task.trim();
    const dayStep = Math.max(1, Math.floor(days / 5));
    const blockMin = lowEnergy ? 15 : 25;
    const steps = [
      { title: `Definir alcance mínimo de "${clean}" (${blockMin} min)`, day: 1, done: false },
      { title: `Reunir fuentes, insumos y esquema base para "${clean}"`, day: Math.min(days, 1 + dayStep), done: false },
      { title: `Crear primer borrador imperfecto (sin editar) de "${clean}"`, day: Math.min(days, 1 + dayStep * 2), done: false },
      { title: `Revisar, pulir puntos críticos y validar "${clean}"`, day: Math.min(days, 1 + dayStep * 3), done: false },
      { title: `Cierre final y entrega de "${clean}"`, day: days, done: false },
    ];
    incrementQuota();
    return { quotaExceeded: false, source: 'local', steps };
  },

  /**
   * Valida una descarga mental con tono empático y micro-acción sin culpa.
   */
  async validateMentalDump(text) {
    const clean = (text || '').trim();
    if (!clean) return 'Tómate un respiro. Empezar con 5 minutos imperfectos ya rompe la parálisis.';

    if (CONFIG.endpoints.aiEdgeFunction) {
      try {
        const ses = authService.getSession();
        const res = await fetch(CONFIG.endpoints.aiEdgeFunction, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(ses?.accessToken ? { Authorization: `Bearer ${ses.accessToken}` } : {}),
          },
          body: JSON.stringify({ action: 'validate_emotion', text: clean }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.reply) return data.reply;
        }
      } catch {
        // fallback local
      }
    }

    const hit = FALLBACK_NOPERF_REPLIES.find(([re]) => re.test(clean));
    return hit
      ? hit[1]
      : 'Es completamente válido sentir resistencia ante una tarea exigente. Activa un bloque de 5 minutos sin buscar perfección: el único objetivo es empezar.';
  },

  /**
   * Analiza patrones del diario SOLO si el usuario activó opt-in explícito.
   */
  analyzeJournalPatterns(entries, { optIn = false } = {}) {
    if (!optIn) {
      return {
        optInRequired: true,
        summary: 'Tus notas permanecen 100% cifradas solo en tu dispositivo. Activa el análisis por IA en Perfil si deseas ver patrones.',
        themes: [],
      };
    }
    if (!entries.length) {
      return { optInRequired: false, summary: 'Aún no hay suficientes notas para detectar patrones.', themes: [] };
    }
    const counts = FALLBACK_THEMES.map((t) => ({
      name: t.name,
      count: entries.filter((e) => t.re.test(e.text || '')).length,
    }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);

    return {
      optInRequired: false,
      themes: counts.slice(0, 3),
      summary: counts.length
        ? `Temas recurrentes detectados localmente: ${counts
            .slice(0, 3)
            .map((c) => `${c.name} (${c.count})`)
            .join(', ')}.`
        : 'Tus notas reflejan variedad de temas sin un patrón dominante aún.',
    };
  },
};
