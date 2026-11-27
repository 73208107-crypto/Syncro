/**
 * SYNCRO — Servicio de Persistencia en la Nube (Supabase PostgreSQL + RLS)
 * Sincronización bidireccional (subida + descarga entre dispositivos) de progreso,
 * sesiones de enfoque, check-ins emocionales y leads B2B.
 * Compatible con claves Publishable (sb_publishable_...) y Legacy anon.
 */

import { CONFIG } from '../config.js';
import { authService, STATE_KEY } from './authService.js';

const B2B_LOCAL_KEY = 'syncro_b2b_leads_v1';

function authHeaders(ses = authService.getSession()) {
  const headers = {
    'Content-Type': 'application/json',
    apikey: CONFIG.supabase.anonKey,
  };
  // Solo enviar Authorization: Bearer cuando hay un JWT real de usuario autenticado
  if (ses?.accessToken) {
    headers.Authorization = `Bearer ${ses.accessToken}`;
  }
  return headers;
}

export const dbService = {
  loadLocalState() {
    try {
      return JSON.parse(localStorage.getItem(STATE_KEY) || 'null');
    } catch {
      return null;
    }
  },

  saveLocalState(state) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Descarga el progreso guardado en Supabase para el usuario autenticado.
   */
  async loadStateFromCloud() {
    if (!CONFIG.supabase.enabled) return { ok: false, mode: 'local' };
    const ses = await authService.refreshSessionIfNeeded();
    if (!ses || ses.mode === 'guest' || !ses.accessToken) return { ok: false, mode: 'guest' };

    try {
      const url = `${CONFIG.supabase.url}/rest/v1/biome_progress?user_id=eq.${encodeURIComponent(ses.id)}&select=drops,earth_points,streak,total_minutes,state_json,updated_at&limit=1`;
      const res = await fetch(url, {
        method: 'GET',
        headers: authHeaders(ses),
      });
      if (!res.ok) return { ok: false, mode: 'error', status: res.status };
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return { ok: true, empty: true, mode: 'cloud' };

      const cloudState = row.state_json && typeof row.state_json === 'object' ? row.state_json : null;
      const updatedMs = row.updated_at ? Date.parse(row.updated_at) : 0;
      return {
        ok: true,
        empty: false,
        mode: 'cloud',
        updatedAt: updatedMs || cloudState?.updatedAt || 0,
        state: cloudState,
        summary: {
          drops: row.drops,
          earth: row.earth_points,
          streak: row.streak,
          minutes: row.total_minutes,
        },
      };
    } catch {
      return { ok: false, mode: 'offline' };
    }
  },

  /**
   * Sincroniza el progreso completo (bioma, misiones, calendario, perfil) con Supabase.
   */
  async syncStateToCloud(state) {
    if (!CONFIG.supabase.enabled) return { synced: false, mode: 'local' };
    const ses = await authService.refreshSessionIfNeeded();
    if (!ses || ses.mode === 'guest' || !ses.accessToken) return { synced: false, mode: 'guest' };

    try {
      const snapshot = { ...state, updatedAt: state.updatedAt || Date.now() };
      const res = await fetch(`${CONFIG.supabase.url}/rest/v1/biome_progress?on_conflict=user_id`, {
        method: 'POST',
        headers: { ...authHeaders(ses), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_id: ses.id,
          drops: state.biome?.drops || 0,
          earth_points: state.biome?.earth || 0,
          streak: state.user?.streak || 0,
          total_minutes: state.stats?.minutes || 0,
          state_json: snapshot,
          updated_at: new Date().toISOString(),
        }),
      });
      return { synced: res.ok, mode: res.ok ? 'cloud' : 'error', status: res.status };
    } catch {
      return { synced: false, mode: 'offline' };
    }
  },

  async logFocusSession({ durationMinutes, mode, missionId = null }) {
    if (!CONFIG.supabase.enabled) return;
    const ses = await authService.refreshSessionIfNeeded();
    if (!ses || ses.mode === 'guest' || !ses.accessToken) return;
    try {
      await fetch(`${CONFIG.supabase.url}/rest/v1/focus_sessions`, {
        method: 'POST',
        headers: { ...authHeaders(ses), Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: ses.id,
          duration_minutes: Math.max(1, Math.round(Number(durationMinutes) || 1)),
          mode: mode || 'classic',
          mission_id: missionId,
          completed_at: new Date().toISOString(),
        }),
      });
    } catch {
      // silent fallback
    }
  },

  async logMood({ energy, mood, loggedDate = null }) {
    if (!CONFIG.supabase.enabled) return;
    const ses = await authService.refreshSessionIfNeeded();
    if (!ses || ses.mode === 'guest' || !ses.accessToken) return;
    try {
      const clampedEnergy = Math.min(10, Math.max(1, Math.round(Number(energy) || 5)));
      await fetch(`${CONFIG.supabase.url}/rest/v1/mood_logs`, {
        method: 'POST',
        headers: { ...authHeaders(ses), Prefer: 'return=minimal' },
        body: JSON.stringify({
          user_id: ses.id,
          energy: clampedEnergy,
          mood: String(mood || 'tranquilo'),
          ...(loggedDate ? { logged_date: loggedDate } : {}),
        }),
      });
    } catch {
      // silent fallback
    }
  },

  async submitB2BLead({ organization, contactName, email, role, size, message }) {
    const payload = {
      organization: organization.trim(),
      contact_name: contactName.trim(),
      email: email.trim().toLowerCase(),
      role: role.trim(),
      team_size: size,
      message: message.trim(),
      created_at: new Date().toISOString(),
    };

    if (CONFIG.supabase.enabled && CONFIG.endpoints.b2bLeads) {
      try {
        const res = await fetch(CONFIG.endpoints.b2bLeads, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: CONFIG.supabase.anonKey,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) return { ok: true, mode: 'cloud' };
      } catch {
        // fallback local
      }
    }

    // Respaldo local para pruebas / entorno estático
    try {
      const list = JSON.parse(localStorage.getItem(B2B_LOCAL_KEY) || '[]');
      list.push(payload);
      localStorage.setItem(B2B_LOCAL_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
    return { ok: true, mode: 'local' };
  },

  async deleteAccountData() {
    if (CONFIG.supabase.enabled) {
      const ses = await authService.refreshSessionIfNeeded();
      if (ses?.accessToken) {
        try {
          await fetch(`${CONFIG.supabase.url}/functions/v1/delete-account`, {
            method: 'POST',
            headers: authHeaders(ses),
          });
        } catch {
          // continuar borrado local
        }
      }
    }
  },
};
