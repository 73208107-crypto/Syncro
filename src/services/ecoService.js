/**
 * SYNCRO — Servicio de Impacto Ecológico Verificable
 * Consulta métricas reales de la plataforma desde un endpoint configurable,
 * evitando cifras estáticas ficticias en la landing y el santuario.
 */

import { CONFIG } from '../config.js';
import { STATE_KEY } from './authService.js';

function getLocalVerifiedTelemetry() {
  try {
    const st = JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    const localHours = st?.stats?.minutes ? Math.round((st.stats.minutes / 60) * 10) / 10 : 0;
    const localBlocks = st?.stats?.blocks || 0;
    return { localHours, localBlocks };
  } catch {
    return { localHours: 0, localBlocks: 0 };
  }
}

export const ecoService = {
  /**
   * Obtiene métricas reales de impacto desde el endpoint configurado.
   * Si el endpoint aún no está conectado, retorna métricas transparentes
   * del reto activo + aporte verificado del dispositivo (sin inflar cifras).
   */
  async fetchImpactMetrics() {
    if (CONFIG.endpoints.ecoMetrics) {
      try {
        const res = await fetch(CONFIG.endpoints.ecoMetrics, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          return {
            source: 'live-api',
            verifiedHours: Number(data.verified_hours || 0),
            sponsoredTrees: Number(data.sponsored_trees || 0),
            protectedAreaM2: Number(data.protected_area_m2 || 0),
            activeUsers: Number(data.active_users || 0),
            challengeGoalHours: Number(data.challenge_goal_hours || 150),
            updatedAt: data.updated_at || new Date().toISOString(),
            certificates: Array.isArray(data.certificates) ? data.certificates : [],
          };
        }
      } catch {
        // degradación transparente si no hay red o endpoint aún no publicado
      }
    }

    const { localHours } = getLocalVerifiedTelemetry();
    return {
      source: 'local-transparent',
      verifiedHours: localHours,
      sponsoredTrees: Math.floor(localHours / 50),
      protectedAreaM2: Math.round(localHours * 2),
      activeUsers: localHours > 0 ? 1 : 0,
      challengeGoalHours: 150,
      updatedAt: new Date().toISOString(),
      certificates: [],
    };
  },
};
