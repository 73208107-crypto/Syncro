/**
 * SYNCRO — Servicio de Persistencia en la Nube (Supabase PostgreSQL + RLS)
 * Sincroniza missions, focus_sessions, mood_logs, calendar_slots, biome_progress
 * y captura leads B2B. Opera en modo local-first si el backend aún no está configurado.
 */

import { CONFIG } from '../config.js';
import { authService, STATE_KEY } from './authService.js';

const B2B_LOCAL_KEY = 'syncro_b2b_leads_v1';

function authHeaders() {
  const ses = authService.getSession();
  const token = ses?.accessToken || CONFIG.supabase.anonKey;
  return {
    'Content-Type': 'application/json',
    apikey: CONFIG.supabase.anonKey,
    Authorization: `Bearer ${token}`,
  };
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
   * Sincroniza el progreso de bioma y sesiones con Supabase (no bloqueante).
   */
  async syncStateToCloud(state) {
    if (!CONFIG.supabase.enabled) return { synced: false, mode: 'local' };
    const ses = authService.getSession();
    if (!ses || ses.mode === 'guest' || !ses.accessToken) return { synced: false, mode: 'guest' };

    try {
      await fetch(`${CONFIG.supabase.url}/rest/v1/biome_progress`, {
        method: 'POST',
        headers: { ...authHeaders(), Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_id: ses.id,
          drops: state.biome.drops,
          earth_points: state.biome.earth,
          streak: state.user.streak,
          total_minutes: state.stats.minutes,
          updated_at: new Date().toISOString(),
        }),
      });
      return { synced: true, mode: 'cloud' };
    } catch {
      return { synced: false, mode: 'offline' };
    }
  },

  async logFocusSession({ durationMinutes, mode, missionId = null }) {
    if (!CONFIG.supabase.enabled) return;
    const ses = authService.getSession();
    if (!ses || ses.mode === 'guest' || !ses.accessToken) return;
    try {
      await fetch(`${CONFIG.supabase.url}/rest/v1/focus_sessions`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          user_id: ses.id,
          duration_minutes: durationMinutes,
          mode,
          mission_id: missionId,
          completed_at: new Date().toISOString(),
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
      const res = await fetch(CONFIG.endpoints.b2bLeads, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CONFIG.supabase.anonKey,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { ok: true, mode: 'cloud' };
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
      const ses = authService.getSession();
      if (ses?.accessToken) {
        try {
          await fetch(`${CONFIG.supabase.url}/functions/v1/delete-account`, {
            method: 'POST',
            headers: authHeaders(),
          });
        } catch {
          // continuar borrado local
        }
      }
    }
  },
};
