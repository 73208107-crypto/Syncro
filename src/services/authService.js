/**
 * SYNCRO — Servicio de Autenticación
 * Preparado para Supabase Auth (JWT + Google OAuth real + verificación por correo)
 * con respaldo local cifrado (SHA-256) cuando no hay backend configurado.
 */

import { CONFIG } from '../config.js';
import { analyticsService } from './analyticsService.js';

export const USERS_KEY = 'syncro_users';
export const SESSION_KEY = 'syncro_session';
export const STATE_KEY = 'syncro_state_v3';

const readJSON = (k, fb) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? fb;
  } catch {
    return fb;
  }
};

const writeJSON = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch {
    return false;
  }
};

export async function hashPassword(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('syncro::' + text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    const bytes = new TextEncoder().encode('syncro::' + text);
    return 'plain::' + btoa(String.fromCharCode(...bytes));
  }
}

export function deriveUserIdentity(email, existingUsers = []) {
  const local = email.split('@')[0] || 'usuario';
  const name =
    local
      .replace(/[._\d]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase()) || 'Usuario';
  const base = local.replace(/[^a-z0-9._]/gi, '').slice(0, 16) || 'usuario';
  let username = base;
  let n = 1;
  while (existingUsers.some((u) => (u.username || '').toLowerCase() === username.toLowerCase())) {
    username = base + ++n;
  }
  return { name, username };
}

export function resolveInstitutionFromEmail(email = '') {
  const domain = String(email).split('@')[1]?.toLowerCase() || '';
  return CONFIG.institutions[domain] || null;
}

export const authService = {
  getSession() {
    return readJSON(SESSION_KEY, null);
  },

  ensureGuestSession() {
    const ses = this.getSession();
    if (ses) return ses;
    const guest = {
      mode: 'guest',
      name: 'Invitado',
      id: 'guest_' + Date.now().toString(36),
      plan: 'free',
      since: Date.now(),
    };
    writeJSON(SESSION_KEY, guest);
    return guest;
  },

  getUsers() {
    return readJSON(USERS_KEY, []);
  },

  async signUpWithEmail({ email, password, diagnostic = null }) {
    const cleanEmail = email.trim().toLowerCase();

    // Ruta BaaS real (Supabase Auth)
    if (CONFIG.supabase.enabled) {
      const res = await fetch(`${CONFIG.supabase.url}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CONFIG.supabase.anonKey,
        },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          data: { diagnostic },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || data.error_description || 'No se pudo crear la cuenta.');
      const { name, username } = deriveUserIdentity(cleanEmail);
      const sessionObj = {
        id: data.user?.id || 'u' + Date.now().toString(36),
        name,
        username,
        email: cleanEmail,
        provider: 'email',
        plan: resolveInstitutionFromEmail(cleanEmail)?.plan || 'free',
        accessToken: data.access_token || null,
        since: Date.now(),
      };
      this._persistSession(sessionObj, { fresh: true, diagnostic });
      analyticsService.track('signup_completed', { provider: 'email', backend: 'supabase' });
      return sessionObj;
    }

    // Respaldo local (sin backend configurado)
    const users = this.getUsers();
    if (users.some((u) => u.email === cleanEmail)) {
      throw new Error('Ese correo ya tiene cuenta. Inicia sesión.');
    }
    const { name, username } = deriveUserIdentity(cleanEmail, users);
    const user = {
      id: 'u' + Date.now().toString(36),
      name,
      username,
      email: cleanEmail,
      passHash: await hashPassword(password),
      provider: 'email',
      plan: resolveInstitutionFromEmail(cleanEmail)?.plan || 'free',
      createdAt: Date.now(),
    };
    users.push(user);
    if (!writeJSON(USERS_KEY, users)) {
      throw new Error('No pudimos guardar tu cuenta: el navegador bloquea el almacenamiento.');
    }
    const sessionObj = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      provider: 'email',
      plan: user.plan,
      since: Date.now(),
    };
    this._persistSession(sessionObj, { fresh: true, diagnostic });
    analyticsService.track('signup_completed', { provider: 'email', backend: 'local' });
    return sessionObj;
  },

  async signInWithEmail({ identifier, password }) {
    const id = identifier.trim().toLowerCase();

    if (CONFIG.supabase.enabled) {
      const res = await fetch(`${CONFIG.supabase.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CONFIG.supabase.anonKey,
        },
        body: JSON.stringify({ email: id, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Correo o contraseña incorrectos.');
      const { name, username } = deriveUserIdentity(id);
      const sessionObj = {
        id: data.user?.id || 'u' + Date.now().toString(36),
        name: data.user?.user_metadata?.name || name,
        username,
        email: id,
        provider: 'email',
        plan: resolveInstitutionFromEmail(id)?.plan || 'free',
        accessToken: data.access_token || null,
        since: Date.now(),
      };
      this._persistSession(sessionObj, { fresh: false });
      return sessionObj;
    }

    const user = this.getUsers().find((u) => (u.email === id || (u.username || '').toLowerCase() === id) && u.passHash);
    const ok = user && user.passHash === (await hashPassword(password));
    if (!ok) {
      throw new Error('Usuario o contraseña incorrectos. Revisa los datos o crea una cuenta.');
    }
    const sessionObj = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      provider: user.provider || 'email',
      plan: user.plan || resolveInstitutionFromEmail(user.email)?.plan || 'free',
      since: Date.now(),
    };
    this._persistSession(sessionObj, { fresh: false });
    return sessionObj;
  },

  /**
   * Inicia Google OAuth real vía Supabase cuando está configurado.
   * Si el proyecto se ejecuta sin backend configurado, indica al flujo de UI
   * que solicite acceso directo con correo sin banners de simulación.
   */
  signInWithGoogle() {
    if (CONFIG.supabase.enabled) {
      const redirectTo = encodeURIComponent(new URL('app.html', window.location.href).toString());
      window.location.href = `${CONFIG.supabase.url}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
      return { redirected: true };
    }
    return { redirected: false, needsEmailFallback: true };
  },

  async requestPasswordReset(email) {
    const cleanEmail = email.trim().toLowerCase();
    if (CONFIG.supabase.enabled) {
      const res = await fetch(`${CONFIG.supabase.url}/auth/v1/recover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: CONFIG.supabase.anonKey,
        },
        body: JSON.stringify({ email: cleanEmail }),
      });
      if (!res.ok) throw new Error('No pudimos enviar el enlace de recuperación.');
      return true;
    }
    return true;
  },

  signOut() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
  },

  deleteLocalAccount() {
    const ses = this.getSession();
    try {
      if (ses?.email) {
        const filtered = this.getUsers().filter((u) => u.email !== ses.email);
        writeJSON(USERS_KEY, filtered);
      }
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(STATE_KEY);
    } catch {
      // ignore
    }
  },

  _persistSession(sessionObj, { fresh = false, diagnostic = null } = {}) {
    try {
      const st = readJSON(STATE_KEY, null);
      if (fresh || (st && st.accountEmail && st.accountEmail !== sessionObj.email)) {
        localStorage.removeItem(STATE_KEY);
      }
      if (diagnostic) {
        const next = readJSON(STATE_KEY, null) || {};
        next.profile = next.profile || {};
        next.profile.trigger = diagnostic.trigger;
        next.profile.role = diagnostic.role;
        next.profile.schedule = diagnostic.schedule;
        next.profile.seed = next.profile.seed || 'cantuta';
        next.profile.guardian = next.profile.guardian || 'alpaca';
        writeJSON(STATE_KEY, next);
      }
    } catch {
      // ignore
    }
    writeJSON(SESSION_KEY, sessionObj);
  },
};
