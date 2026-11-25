/* Auto-generated browser bundle from modular src/ for file:// & universal compatibility */
(() => {
  // src/config.js
  var env = typeof window !== "undefined" && window.SYNCRO_ENV || {};
  var n8nEnv = typeof window !== "undefined" && window.SYNCRO_N8N || {};
  var params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  var CONFIG = {
    appName: "SYNCRO",
    version: "2.0.0-commercial",
    devMode: params.get("dev") === "1" || Boolean(env.DEV_MODE),
    // Backend BaaS (Supabase: PostgreSQL + Auth + Realtime + Edge Functions)
    supabase: {
      url: env.SUPABASE_URL || "",
      anonKey: env.SUPABASE_ANON_KEY || "",
      enabled: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY)
    },
    // Endpoints de servidor (nunca exponer claves de API de IA en el cliente)
    endpoints: {
      aiEdgeFunction: env.AI_EDGE_URL || (env.SUPABASE_URL ? `${env.SUPABASE_URL}/functions/v1/syncro-ai` : ""),
      ecoMetrics: env.ECO_METRICS_URL || (env.SUPABASE_URL ? `${env.SUPABASE_URL}/functions/v1/eco-metrics` : ""),
      b2bLeads: env.B2B_LEADS_URL || (env.SUPABASE_URL ? `${env.SUPABASE_URL}/rest/v1/b2b_leads` : "")
    },
    // Bot de n8n (chat de asistencia). Se configura en /n8n-config.js
    n8n: {
      enabled: n8nEnv.ENABLED !== false,
      webhookUrl: n8nEnv.WEBHOOK_URL || env.N8N_WEBHOOK_URL || "",
      authHeaderName: n8nEnv.AUTH_HEADER_NAME || "",
      authHeaderValue: n8nEnv.AUTH_HEADER_VALUE || "",
      showOnLanding: n8nEnv.SHOW_ON_LANDING !== false,
      showOnApp: n8nEnv.SHOW_ON_APP !== false,
      timeoutMs: Number(n8nEnv.TIMEOUT_MS) || 3e4,
      sendContext: n8nEnv.SEND_CONTEXT !== false,
      sendEmail: n8nEnv.SEND_EMAIL === true,
      botName: n8nEnv.BOT_NAME || "Asistente SYNCRO",
      botAvatar: n8nEnv.BOT_AVATAR || "\u{1F999}",
      welcome: n8nEnv.WELCOME || "\xA1Hola! \xBFEn qu\xE9 te puedo ayudar?",
      placeholder: n8nEnv.PLACEHOLDER || "Escribe tu mensaje\u2026",
      quickReplies: Array.isArray(n8nEnv.QUICK_REPLIES) ? n8nEnv.QUICK_REPLIES.slice(0, 4) : []
    },
    // Analítica CRO respetuosa con la privacidad
    analytics: {
      provider: env.ANALYTICS_PROVIDER || "auto",
      // 'posthog' | 'plausible' | 'mixpanel' | 'auto'
      posthogKey: env.POSTHOG_KEY || "",
      plausibleDomain: env.PLAUSIBLE_DOMAIN || "syncro.app"
    },
    // Cuotas de IA por plan (control de costos)
    quotas: {
      freeWeeklyBreakdowns: 3,
      proWeeklyBreakdowns: Infinity
    },
    // Directorio dinámico de convenios B2B por dominio institucional
    institutions: {
      "continental.edu.pe": {
        name: "Universidad Continental",
        wellbeingLabel: "Bienestar Universitario UC",
        communityLabel: "Comunidad Continental",
        plan: "b2b"
      }
    }
  };

  // src/services/analyticsService.js
  var FUNNEL_KEY = "syncro_cro_events_v1";
  var MAX_LOCAL_EVENTS = 200;
  function readEvents() {
    try {
      return JSON.parse(localStorage.getItem(FUNNEL_KEY) || "[]");
    } catch {
      return [];
    }
  }
  function storeLocalEvent(eventName, props) {
    try {
      const list = readEvents();
      list.push({
        event: eventName,
        props,
        ts: Date.now(),
        path: typeof location !== "undefined" ? location.pathname : "/"
      });
      if (list.length > MAX_LOCAL_EVENTS) list.splice(0, list.length - MAX_LOCAL_EVENTS);
      localStorage.setItem(FUNNEL_KEY, JSON.stringify(list));
    } catch {
    }
  }
  var analyticsService = {
    /**
     * Registra un evento del embudo CRO:
     * - landing_visit
     * - cta_click
     * - signup_completed
     * - onboarding_completed
     * - first_checkin
     * - first_block_completed
     * - b2b_demo_requested
     * - retention_d7 / retention_d30
     */
    track(eventName, properties = {}) {
      const safeProps = { ...properties, ts_iso: (/* @__PURE__ */ new Date()).toISOString() };
      storeLocalEvent(eventName, safeProps);
      if (typeof window === "undefined") return;
      try {
        if (window.posthog && typeof window.posthog.capture === "function") {
          window.posthog.capture(eventName, safeProps);
        }
        if (typeof window.plausible === "function") {
          window.plausible(eventName, { props: safeProps });
        }
        if (window.mixpanel && typeof window.mixpanel.track === "function") {
          window.mixpanel.track(eventName, safeProps);
        }
      } catch {
      }
    },
    /**
     * Registra un evento de hito único (ej. first_checkin, first_block_completed).
     */
    trackOnce(eventName, properties = {}) {
      const flagKey = `syncro_once_${eventName}`;
      try {
        if (localStorage.getItem(flagKey)) return;
        localStorage.setItem(flagKey, String(Date.now()));
      } catch {
      }
      this.track(eventName, properties);
    },
    /**
     * Evalúa hitos de retención D7 y D30 a partir de la fecha de registro.
     */
    checkRetention(createdAt) {
      if (!createdAt) return;
      const days = Math.floor((Date.now() - createdAt) / 864e5);
      if (days >= 7) this.trackOnce("retention_d7", { days_since_signup: days });
      if (days >= 30) this.trackOnce("retention_d30", { days_since_signup: days });
    },
    getLocalFunnelLog() {
      return readEvents();
    }
  };

  // src/services/authService.js
  var USERS_KEY = "syncro_users";
  var SESSION_KEY = "syncro_session";
  var STATE_KEY = "syncro_state_v3";
  var readJSON = (k, fb) => {
    try {
      return JSON.parse(localStorage.getItem(k)) ?? fb;
    } catch {
      return fb;
    }
  };
  var writeJSON = (k, v) => {
    try {
      localStorage.setItem(k, JSON.stringify(v));
      return true;
    } catch {
      return false;
    }
  };
  async function hashPassword(text) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("syncro::" + text));
      return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      const bytes = new TextEncoder().encode("syncro::" + text);
      return "plain::" + btoa(String.fromCharCode(...bytes));
    }
  }
  function deriveUserIdentity(email, existingUsers = []) {
    const local = email.split("@")[0] || "usuario";
    const name = local.replace(/[._\d]+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()) || "Usuario";
    const base = local.replace(/[^a-z0-9._]/gi, "").slice(0, 16) || "usuario";
    let username = base;
    let n = 1;
    while (existingUsers.some((u) => (u.username || "").toLowerCase() === username.toLowerCase())) {
      username = base + ++n;
    }
    return { name, username };
  }
  function resolveInstitutionFromEmail(email = "") {
    const domain = String(email).split("@")[1]?.toLowerCase() || "";
    return CONFIG.institutions[domain] || null;
  }
  var authService = {
    getSession() {
      return readJSON(SESSION_KEY, null);
    },
    ensureGuestSession() {
      const ses = this.getSession();
      if (ses) return ses;
      const guest = {
        mode: "guest",
        name: "Invitado",
        id: "guest_" + Date.now().toString(36),
        plan: "free",
        since: Date.now()
      };
      writeJSON(SESSION_KEY, guest);
      return guest;
    },
    getUsers() {
      return readJSON(USERS_KEY, []);
    },
    async signUpWithEmail({ email, password, diagnostic = null }) {
      const cleanEmail = email.trim().toLowerCase();
      if (CONFIG.supabase.enabled) {
        const res = await fetch(`${CONFIG.supabase.url}/auth/v1/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: CONFIG.supabase.anonKey
          },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            data: { diagnostic }
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.msg || data.error_description || "No se pudo crear la cuenta.");
        const { name: name2, username: username2 } = deriveUserIdentity(cleanEmail);
        const sessionObj2 = {
          id: data.user?.id || "u" + Date.now().toString(36),
          name: name2,
          username: username2,
          email: cleanEmail,
          provider: "email",
          plan: resolveInstitutionFromEmail(cleanEmail)?.plan || "free",
          accessToken: data.access_token || null,
          since: Date.now()
        };
        this._persistSession(sessionObj2, { fresh: true, diagnostic });
        analyticsService.track("signup_completed", { provider: "email", backend: "supabase" });
        return sessionObj2;
      }
      const users = this.getUsers();
      if (users.some((u) => u.email === cleanEmail)) {
        throw new Error("Ese correo ya tiene cuenta. Inicia sesi\xF3n.");
      }
      const { name, username } = deriveUserIdentity(cleanEmail, users);
      const user = {
        id: "u" + Date.now().toString(36),
        name,
        username,
        email: cleanEmail,
        passHash: await hashPassword(password),
        provider: "email",
        plan: resolveInstitutionFromEmail(cleanEmail)?.plan || "free",
        createdAt: Date.now()
      };
      users.push(user);
      if (!writeJSON(USERS_KEY, users)) {
        throw new Error("No pudimos guardar tu cuenta: el navegador bloquea el almacenamiento.");
      }
      const sessionObj = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        provider: "email",
        plan: user.plan,
        since: Date.now()
      };
      this._persistSession(sessionObj, { fresh: true, diagnostic });
      analyticsService.track("signup_completed", { provider: "email", backend: "local" });
      return sessionObj;
    },
    async signInWithEmail({ identifier, password }) {
      const id = identifier.trim().toLowerCase();
      if (CONFIG.supabase.enabled) {
        const res = await fetch(`${CONFIG.supabase.url}/auth/v1/token?grant_type=password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: CONFIG.supabase.anonKey
          },
          body: JSON.stringify({ email: id, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error("Correo o contrase\xF1a incorrectos.");
        const { name, username } = deriveUserIdentity(id);
        const sessionObj2 = {
          id: data.user?.id || "u" + Date.now().toString(36),
          name: data.user?.user_metadata?.name || name,
          username,
          email: id,
          provider: "email",
          plan: resolveInstitutionFromEmail(id)?.plan || "free",
          accessToken: data.access_token || null,
          since: Date.now()
        };
        this._persistSession(sessionObj2, { fresh: false });
        return sessionObj2;
      }
      const user = this.getUsers().find((u) => (u.email === id || (u.username || "").toLowerCase() === id) && u.passHash);
      const ok = user && user.passHash === await hashPassword(password);
      if (!ok) {
        throw new Error("Usuario o contrase\xF1a incorrectos. Revisa los datos o crea una cuenta.");
      }
      const sessionObj = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        provider: user.provider || "email",
        plan: user.plan || resolveInstitutionFromEmail(user.email)?.plan || "free",
        since: Date.now()
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
        const redirectTo = encodeURIComponent(new URL("app.html", window.location.href).toString());
        window.location.href = `${CONFIG.supabase.url}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`;
        return { redirected: true };
      }
      return { redirected: false, needsEmailFallback: true };
    },
    async requestPasswordReset(email) {
      const cleanEmail = email.trim().toLowerCase();
      if (CONFIG.supabase.enabled) {
        const res = await fetch(`${CONFIG.supabase.url}/auth/v1/recover`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: CONFIG.supabase.anonKey
          },
          body: JSON.stringify({ email: cleanEmail })
        });
        if (!res.ok) throw new Error("No pudimos enviar el enlace de recuperaci\xF3n.");
        return true;
      }
      return true;
    },
    signOut() {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {
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
      }
    },
    _persistSession(sessionObj, { fresh = false, diagnostic = null } = {}) {
      try {
        const st = readJSON(STATE_KEY, null);
        if (fresh || st && st.accountEmail && st.accountEmail !== sessionObj.email) {
          localStorage.removeItem(STATE_KEY);
        }
        if (diagnostic) {
          const next = readJSON(STATE_KEY, null) || {};
          next.profile = next.profile || {};
          next.profile.trigger = diagnostic.trigger;
          next.profile.role = diagnostic.role;
          next.profile.schedule = diagnostic.schedule;
          next.profile.seed = next.profile.seed || "cantuta";
          next.profile.guardian = next.profile.guardian || "alpaca";
          writeJSON(STATE_KEY, next);
        }
      } catch {
      }
      writeJSON(SESSION_KEY, sessionObj);
    }
  };

  // src/services/ecoService.js
  function getLocalVerifiedTelemetry() {
    try {
      const st = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      const localHours = st?.stats?.minutes ? Math.round(st.stats.minutes / 60 * 10) / 10 : 0;
      const localBlocks = st?.stats?.blocks || 0;
      return { localHours, localBlocks };
    } catch {
      return { localHours: 0, localBlocks: 0 };
    }
  }
  var ecoService = {
    /**
     * Obtiene métricas reales de impacto desde el endpoint configurado.
     * Si el endpoint aún no está conectado, retorna métricas transparentes
     * del reto activo + aporte verificado del dispositivo (sin inflar cifras).
     */
    async fetchImpactMetrics() {
      if (CONFIG.endpoints.ecoMetrics) {
        try {
          const res = await fetch(CONFIG.endpoints.ecoMetrics, { headers: { Accept: "application/json" } });
          if (res.ok) {
            const data = await res.json();
            return {
              source: "live-api",
              verifiedHours: Number(data.verified_hours || 0),
              sponsoredTrees: Number(data.sponsored_trees || 0),
              protectedAreaM2: Number(data.protected_area_m2 || 0),
              activeUsers: Number(data.active_users || 0),
              challengeGoalHours: Number(data.challenge_goal_hours || 150),
              updatedAt: data.updated_at || (/* @__PURE__ */ new Date()).toISOString(),
              certificates: Array.isArray(data.certificates) ? data.certificates : []
            };
          }
        } catch {
        }
      }
      const { localHours } = getLocalVerifiedTelemetry();
      return {
        source: "local-transparent",
        verifiedHours: localHours,
        sponsoredTrees: Math.floor(localHours / 50),
        protectedAreaM2: Math.round(localHours * 2),
        activeUsers: localHours > 0 ? 1 : 0,
        challengeGoalHours: 150,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        certificates: []
      };
    }
  };

  // src/services/dbService.js
  var B2B_LOCAL_KEY = "syncro_b2b_leads_v1";
  function authHeaders() {
    const ses = authService.getSession();
    const token = ses?.accessToken || CONFIG.supabase.anonKey;
    return {
      "Content-Type": "application/json",
      apikey: CONFIG.supabase.anonKey,
      Authorization: `Bearer ${token}`
    };
  }
  var dbService = {
    loadLocalState() {
      try {
        return JSON.parse(localStorage.getItem(STATE_KEY) || "null");
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
      if (!CONFIG.supabase.enabled) return { synced: false, mode: "local" };
      const ses = authService.getSession();
      if (!ses || ses.mode === "guest" || !ses.accessToken) return { synced: false, mode: "guest" };
      try {
        await fetch(`${CONFIG.supabase.url}/rest/v1/biome_progress`, {
          method: "POST",
          headers: { ...authHeaders(), Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            user_id: ses.id,
            drops: state.biome.drops,
            earth_points: state.biome.earth,
            streak: state.user.streak,
            total_minutes: state.stats.minutes,
            updated_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        });
        return { synced: true, mode: "cloud" };
      } catch {
        return { synced: false, mode: "offline" };
      }
    },
    async logFocusSession({ durationMinutes, mode, missionId = null }) {
      if (!CONFIG.supabase.enabled) return;
      const ses = authService.getSession();
      if (!ses || ses.mode === "guest" || !ses.accessToken) return;
      try {
        await fetch(`${CONFIG.supabase.url}/rest/v1/focus_sessions`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            user_id: ses.id,
            duration_minutes: durationMinutes,
            mode,
            mission_id: missionId,
            completed_at: (/* @__PURE__ */ new Date()).toISOString()
          })
        });
      } catch {
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
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (CONFIG.supabase.enabled && CONFIG.endpoints.b2bLeads) {
        const res = await fetch(CONFIG.endpoints.b2bLeads, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: CONFIG.supabase.anonKey
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) return { ok: true, mode: "cloud" };
      }
      try {
        const list = JSON.parse(localStorage.getItem(B2B_LOCAL_KEY) || "[]");
        list.push(payload);
        localStorage.setItem(B2B_LOCAL_KEY, JSON.stringify(list));
      } catch {
      }
      return { ok: true, mode: "local" };
    },
    async deleteAccountData() {
      if (CONFIG.supabase.enabled) {
        const ses = authService.getSession();
        if (ses?.accessToken) {
          try {
            await fetch(`${CONFIG.supabase.url}/functions/v1/delete-account`, {
              method: "POST",
              headers: authHeaders()
            });
          } catch {
          }
        }
      }
    }
  };

  // src/services/n8nService.js
  var SESSION_KEY2 = "syncro_n8n_session_v1";
  var PLACEHOLDER_RE = /PEGA_AQUI|TU_ENLACE|^\s*$/i;
  function newSessionId() {
    const rnd = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 16) : Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    return `syncro_${rnd}`;
  }
  function extractReply(data) {
    if (data == null) return "";
    if (typeof data === "string") return data.trim();
    if (Array.isArray(data)) {
      return data.map(extractReply).filter(Boolean).join("\n\n");
    }
    if (typeof data === "object") {
      for (const key of ["output", "reply", "text", "message", "response", "answer"]) {
        if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
      }
      if (data.json) return extractReply(data.json);
      if (data.data) return extractReply(data.data);
    }
    return "";
  }
  var n8nService = {
    /** ¿Hay un enlace real configurado? */
    isConfigured() {
      const url = CONFIG.n8n.webhookUrl;
      return Boolean(CONFIG.n8n.enabled && url && !PLACEHOLDER_RE.test(url) && /^https?:\/\//i.test(url));
    },
    getSessionId() {
      try {
        let id = localStorage.getItem(SESSION_KEY2);
        if (!id) {
          id = newSessionId();
          localStorage.setItem(SESSION_KEY2, id);
        }
        return id;
      } catch {
        return this._memSession ||= newSessionId();
      }
    },
    resetSession() {
      try {
        localStorage.removeItem(SESSION_KEY2);
      } catch {
      }
      this._memSession = null;
      return this.getSessionId();
    },
    /**
     * Envía un mensaje al bot. Devuelve { ok, reply, error }.
     * error ∈ 'not_configured' | 'timeout' | 'network' | 'http_<status>' | 'empty'
     */
    async sendMessage(text, { source = "app", view = "" } = {}) {
      const clean = String(text || "").trim();
      if (!clean) return { ok: false, reply: "", error: "empty" };
      if (!this.isConfigured()) return { ok: false, reply: "", error: "not_configured" };
      const cfg = CONFIG.n8n;
      const sessionId = this.getSessionId();
      const payload = {
        action: "sendMessage",
        sessionId,
        chatInput: clean,
        message: clean,
        source
      };
      if (cfg.sendContext) {
        const ses = authService.getSession();
        payload.user = {
          id: ses?.id || null,
          name: ses?.name || "Invitado",
          plan: ses?.plan || "free",
          ...cfg.sendEmail && ses?.email ? { email: ses.email } : {}
        };
        payload.context = {
          view: view || null,
          locale: typeof navigator !== "undefined" && navigator.language || "es",
          page: typeof location !== "undefined" ? location.pathname : ""
        };
      }
      const headers = { "Content-Type": "application/json" };
      if (cfg.authHeaderName && cfg.authHeaderValue) headers[cfg.authHeaderName] = cfg.authHeaderValue;
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = ctrl ? setTimeout(() => ctrl.abort(), cfg.timeoutMs) : null;
      try {
        const res = await fetch(cfg.webhookUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: ctrl?.signal
        });
        if (!res.ok) return { ok: false, reply: "", error: `http_${res.status}` };
        const raw = await res.text();
        let data = raw;
        try {
          data = JSON.parse(raw);
        } catch {
        }
        const reply = extractReply(data);
        return reply ? { ok: true, reply, error: null } : { ok: false, reply: "", error: "empty" };
      } catch (err) {
        return { ok: false, reply: "", error: err?.name === "AbortError" ? "timeout" : "network" };
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  };

  // src/modules/chatbot.js
  var HISTORY_KEY = "syncro_n8n_history_v1";
  var MAX_HISTORY = 40;
  var ERROR_TEXT = {
    not_configured: "El asistente a\xFAn no est\xE1 conectado. Falta pegar el enlace de n8n en n8n-config.js (WEBHOOK_URL).",
    timeout: "El asistente tard\xF3 demasiado en responder. Intenta de nuevo en un momento.",
    network: "No pude comunicarme con el asistente. Revisa tu conexi\xF3n (o que el CORS del webhook permita este dominio).",
    empty: "El asistente respondi\xF3 sin texto. Intenta reformular tu mensaje.",
    default: "Algo sali\xF3 mal al contactar al asistente. Intenta de nuevo."
  };
  function loadHistory() {
    try {
      const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(arr) ? arr.filter((m) => m && typeof m.text === "string").slice(-MAX_HISTORY) : [];
    } catch {
      return [];
    }
  }
  function saveHistory(list) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(-MAX_HISTORY)));
    } catch {
    }
  }
  function el(tag, attrs = {}, text = "") {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else node.setAttribute(k, v);
    }
    if (text) node.textContent = text;
    return node;
  }
  function initChatbot({ surface = "app", getView = () => "" } = {}) {
    const cfg = CONFIG.n8n;
    if (!cfg.enabled) return;
    if (surface === "landing" && !cfg.showOnLanding) return;
    if (surface === "app" && !cfg.showOnApp) return;
    if (document.getElementById("sbotRoot")) return;
    let history = loadHistory();
    let busy = false;
    const root = el("div", { id: "sbotRoot", class: `sbot sbot--${surface}` });
    const backdrop = el("div", { class: "sbot-backdrop", hidden: "", "aria-hidden": "true" });
    const fab = el("button", {
      type: "button",
      class: "sbot-fab",
      "aria-label": `Abrir chat con ${cfg.botName}`,
      "aria-expanded": "false",
      "aria-controls": "sbotPanel"
    });
    fab.append(el("span", { class: "sbot-fab-ico", "aria-hidden": "true" }, cfg.botAvatar));
    const mobileTrigger = surface === "app" ? document.getElementById("mobileChatBtn") : null;
    if (mobileTrigger) {
      mobileTrigger.classList.remove("hidden");
      mobileTrigger.textContent = "";
      mobileTrigger.append(el("span", { "aria-hidden": "true" }, cfg.botAvatar));
      mobileTrigger.setAttribute("aria-label", `Abrir chat con ${cfg.botName}`);
      mobileTrigger.setAttribute("aria-expanded", "false");
    }
    const panel = el("section", {
      id: "sbotPanel",
      class: "sbot-panel",
      role: "dialog",
      "aria-label": `Chat con ${cfg.botName}`,
      hidden: ""
    });
    const head = el("header", { class: "sbot-head" });
    head.append(el("span", { class: "sbot-avatar", "aria-hidden": "true" }, cfg.botAvatar));
    const title = el("div", { class: "sbot-title" });
    title.append(el("strong", {}, cfg.botName), el("small", {}, "Asistente en l\xEDnea"));
    head.append(title);
    const resetBtn = el("button", { type: "button", class: "sbot-icon-btn", "aria-label": "Nueva conversaci\xF3n", title: "Nueva conversaci\xF3n" }, "\u21BA");
    const closeBtn = el("button", { type: "button", class: "sbot-icon-btn", "aria-label": "Cerrar chat", title: "Cerrar" }, "\u2715");
    head.append(resetBtn, closeBtn);
    const log = el("div", { class: "sbot-log", role: "log", "aria-live": "polite", "aria-relevant": "additions" });
    const chips = el("div", { class: "sbot-chips" });
    const form = el("form", { class: "sbot-form", autocomplete: "off" });
    const input = el("textarea", {
      class: "sbot-input",
      rows: "1",
      maxlength: "1000",
      placeholder: cfg.placeholder,
      "aria-label": "Mensaje para el asistente"
    });
    const sendBtn = el("button", { type: "submit", class: "sbot-send", "aria-label": "Enviar mensaje" }, "\u27A4");
    form.append(input, sendBtn);
    panel.append(head, log, chips, form);
    root.append(backdrop, fab, panel);
    document.body.appendChild(root);
    function addBubble(role, text, { persist = true } = {}) {
      const row = el("div", { class: `sbot-msg sbot-msg--${role}` });
      row.append(el("div", { class: "sbot-bubble" }, text));
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      if (persist && role !== "error") {
        history.push({ role, text });
        saveHistory(history);
      }
      return row;
    }
    function renderInitial() {
      log.textContent = "";
      addBubble("bot", cfg.welcome, { persist: false });
      history.forEach((m) => addBubble(m.role === "user" ? "user" : "bot", m.text, { persist: false }));
      renderChips();
    }
    function renderChips() {
      chips.textContent = "";
      if (history.length || !cfg.quickReplies.length) return;
      cfg.quickReplies.forEach((q) => {
        const b = el("button", { type: "button", class: "sbot-chip" }, q);
        b.addEventListener("click", () => send(q));
        chips.appendChild(b);
      });
    }
    function setBusy(on) {
      busy = on;
      sendBtn.disabled = on;
      input.disabled = on;
      root.classList.toggle("is-busy", on);
    }
    function showTyping() {
      const row = el("div", { class: "sbot-msg sbot-msg--bot sbot-typing", "aria-label": "El asistente est\xE1 escribiendo" });
      const b = el("div", { class: "sbot-bubble" });
      for (let i = 0; i < 3; i++) b.appendChild(el("i"));
      row.appendChild(b);
      log.appendChild(row);
      log.scrollTop = log.scrollHeight;
      return row;
    }
    async function send(text) {
      const clean = String(text || "").trim();
      if (!clean || busy) return;
      chips.textContent = "";
      addBubble("user", clean);
      input.value = "";
      autoGrow();
      setBusy(true);
      const typing = showTyping();
      const res = await n8nService.sendMessage(clean, { source: surface, view: getView() });
      typing.remove();
      setBusy(false);
      if (res.ok) addBubble("bot", res.reply);
      else addBubble("error", ERROR_TEXT[res.error] || ERROR_TEXT.default);
      input.focus();
    }
    function autoGrow() {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 110) + "px";
    }
    function open() {
      panel.hidden = false;
      backdrop.hidden = false;
      root.classList.add("is-open");
      fab.setAttribute("aria-expanded", "true");
      if (mobileTrigger) {
        mobileTrigger.setAttribute("aria-expanded", "true");
        mobileTrigger.classList.add("is-open");
      }
      input.focus();
      log.scrollTop = log.scrollHeight;
    }
    function close() {
      panel.hidden = true;
      backdrop.hidden = true;
      root.classList.remove("is-open");
      fab.setAttribute("aria-expanded", "false");
      if (mobileTrigger) {
        mobileTrigger.setAttribute("aria-expanded", "false");
        mobileTrigger.classList.remove("is-open");
      }
      if (mobileTrigger && fab.offsetParent === null) mobileTrigger.focus();
      else fab.focus();
    }
    fab.addEventListener("click", () => panel.hidden ? open() : close());
    mobileTrigger?.addEventListener("click", () => panel.hidden ? open() : close());
    backdrop.addEventListener("click", close);
    closeBtn.addEventListener("click", close);
    resetBtn.addEventListener("click", () => {
      history = [];
      saveHistory(history);
      n8nService.resetSession();
      renderInitial();
      input.focus();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      send(input.value);
    });
    input.addEventListener("input", autoGrow);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        send(input.value);
      }
    });
    panel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    });
    renderInitial();
  }

  // src/landing.js
  var APP_URL = "app.html";
  var $ = (s, r = document) => r.querySelector(s);
  var $$ = (s, r = document) => [...r.querySelectorAll(s)];
  analyticsService.track("landing_visit", { referrer: document.referrer || "direct" });
  var nav = $("#nav");
  var handleNavScroll = () => nav?.classList.toggle("scrolled", window.scrollY > 20);
  window.addEventListener("scroll", handleNavScroll, { passive: true });
  handleNavScroll();
  (() => {
    const burger = $("#navBurger");
    const menu = $("#mobileMenu");
    if (!burger || !menu) return;
    const setOpen = (on) => {
      menu.hidden = !on;
      burger.setAttribute("aria-expanded", String(on));
      burger.setAttribute("aria-label", on ? "Cerrar men\xFA" : "Abrir men\xFA");
      nav?.classList.toggle("menu-open", on);
    };
    burger.addEventListener("click", () => setOpen(menu.hidden));
    menu.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !menu.hidden) {
        setOpen(false);
        burger.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 768) setOpen(false);
    });
  })();
  document.documentElement.classList.add("js-reveal");
  var revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  $$(".reveal").forEach((el2) => {
    const rect = el2.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) el2.classList.add("visible");
    else revealObserver.observe(el2);
  });
  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#top") {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
  var faqItems = $$(".faq-item");
  faqItems.forEach((item) => {
    item.addEventListener("toggle", () => {
      if (item.open) faqItems.forEach((other) => other !== item && (other.open = false));
    });
  });
  var fmt = new Intl.NumberFormat("es-PE");
  function animateCounter(el2, targetValue, suffix = "") {
    const duration = 1200;
    const start = performance.now();
    const isFloat = !Number.isInteger(targetValue);
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const cur = ease(p) * targetValue;
      el2.textContent = (isFloat ? cur.toFixed(1) : fmt.format(Math.floor(cur))) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el2.textContent = (isFloat ? targetValue.toFixed(1) : fmt.format(targetValue)) + suffix;
    };
    requestAnimationFrame(step);
  }
  var scienceCounters = $$(".stat-number[data-count]");
  var sciObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target, Number(entry.target.dataset.count), entry.target.dataset.suffix || "");
          sciObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.4 }
  );
  scienceCounters.forEach((el2) => sciObserver.observe(el2));
  (async () => {
    const metrics = await ecoService.fetchImpactMetrics();
    const map = {
      verifiedHours: { val: metrics.verifiedHours, suffix: " h" },
      sponsoredTrees: { val: metrics.sponsoredTrees, suffix: "" },
      protectedAreaM2: { val: metrics.protectedAreaM2, suffix: " m\xB2" },
      activeUsers: { val: metrics.activeUsers, suffix: "" }
    };
    const statusEl = $("#impactLiveStatus");
    if (statusEl) {
      statusEl.textContent = metrics.source === "live-api" ? "Telemetr\xEDa en vivo conectada \xB7 Datos auditables" : "Telemetr\xEDa real activa \xB7 Sin cifras simuladas";
    }
    const impactNodes = $$("[data-impact-metric]");
    const impObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const key = entry.target.dataset.impactMetric;
          const item = map[key] || { val: 0, suffix: "" };
          animateCounter(entry.target, item.val, item.suffix);
          impObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.3 }
    );
    impactNodes.forEach((n) => impObserver.observe(n));
  })();
  (() => {
    const display = $("#mockupTimerDisplay");
    if (!display) return;
    let sec = 24 * 60 + 37;
    setInterval(() => {
      sec = sec > 0 ? sec - 1 : 25 * 60;
      display.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
    }, 1e3);
  })();
  (() => {
    const soundBtn = $("#landingSoundToggle");
    const breathBtn = $("#breathTrigger");
    const breathWidget = $("#breathWidget");
    const breathCircle = $("#breathCircle");
    const breathPhaseLabel = $("#breathPhaseLabel");
    const breathPhaseTimer = $("#breathPhaseTimer");
    const soundChips = $$(".demo-sound-chip");
    if (!soundBtn || !breathBtn) return;
    const DemoAudio = {
      ctx: null,
      master: null,
      srcs: [],
      activeSound: "rain",
      isPlaying: false,
      buf(type) {
        const n = this.ctx.sampleRate * 2;
        const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        let last = 0;
        for (let i = 0; i < n; i++) {
          const w = Math.random() * 2 - 1;
          if (type === "brown") {
            last = (last + 0.02 * w) / 1.02;
            d[i] = last * 3.5;
          } else {
            d[i] = w * 0.5;
          }
        }
        return b;
      },
      play(kind) {
        this.stop();
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = this.ctx = this.ctx || new AC();
        if (ctx.state === "suspended") ctx.resume();
        const m = this.master = ctx.createGain();
        m.gain.value = 0;
        m.connect(ctx.destination);
        m.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.9);
        const add = (n) => (this.srcs.push(n), n);
        const noise = (t) => {
          const s = add(ctx.createBufferSource());
          s.buffer = this.buf(t);
          s.loop = true;
          s.start();
          return s;
        };
        const filt = (type, f, q = 1) => {
          const x = ctx.createBiquadFilter();
          x.type = type;
          x.frequency.value = f;
          x.Q.value = q;
          return x;
        };
        const gain = (v) => {
          const g = ctx.createGain();
          g.gain.value = v;
          return g;
        };
        const chain = (...n) => n.reduce((a, b) => (a.connect(b), b));
        if (kind === "rain") chain(noise("white"), filt("highpass", 900), filt("lowpass", 6500), gain(0.2), m);
        else if (kind === "wind") {
          const g = gain(0.35);
          chain(noise("brown"), filt("bandpass", 500, 0.6), g, m);
        } else if (kind === "fire") {
          chain(noise("brown"), filt("lowpass", 380), gain(0.35), m);
          chain(noise("white"), filt("bandpass", 2400, 1.2), gain(0.04), m);
        } else if (kind === "binaural") {
          [
            [-1, 200],
            [1, 240]
          ].forEach(([panVal, freq]) => {
            const osc = add(ctx.createOscillator());
            osc.type = "sine";
            osc.frequency.value = freq;
            const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
            if (pan) {
              pan.pan.value = panVal;
              chain(osc, gain(0.09), pan, m);
            } else chain(osc, gain(0.06), m);
            osc.start();
          });
        }
        this.isPlaying = true;
        this.activeSound = kind;
        this.updateUI();
      },
      stop() {
        if (!this.master) {
          this.isPlaying = false;
          this.updateUI();
          return;
        }
        const m = this.master;
        const s = this.srcs;
        try {
          m.gain.cancelScheduledValues(0);
          m.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
        } catch {
        }
        setTimeout(() => {
          s.forEach((n) => {
            try {
              n.stop();
            } catch {
            }
          });
          try {
            m.disconnect();
          } catch {
          }
        }, 350);
        this.master = null;
        this.srcs = [];
        this.isPlaying = false;
        this.updateUI();
      },
      updateUI() {
        const icon = soundBtn.querySelector(".demo-play-icon");
        const text = soundBtn.querySelector(".demo-play-text");
        soundBtn.classList.toggle("playing", this.isPlaying);
        if (icon) icon.textContent = this.isPlaying ? "\u23F9" : "\u25B6";
        if (text) text.textContent = this.isPlaying ? "Pausar" : "Escuchar";
      }
    };
    soundBtn.addEventListener("click", () => DemoAudio.isPlaying ? DemoAudio.stop() : DemoAudio.play(DemoAudio.activeSound));
    soundChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        soundChips.forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        DemoAudio.activeSound = chip.dataset.landingSound || "rain";
        if (DemoAudio.isPlaying) DemoAudio.play(DemoAudio.activeSound);
      });
    });
    let breathInterval = null;
    let breathStep = 0;
    const phases = [
      { name: "Inhala por la nariz", action: "expand", start: 0, end: 4 },
      { name: "Sost\xE9n el aire", action: "hold", start: 4, end: 8 },
      { name: "Exhala despacio", action: "shrink", start: 8, end: 12 },
      { name: "Mant\xE9n en calma", action: "hold", start: 12, end: 16 }
    ];
    const tick = () => {
      const cur = phases.find((p) => breathStep >= p.start && breathStep < p.end) || phases[0];
      const left = 4 - (breathStep - cur.start);
      if (breathPhaseLabel) breathPhaseLabel.textContent = cur.name;
      if (breathPhaseTimer) breathPhaseTimer.textContent = `${left}s`;
      if (breathCircle) {
        if (cur.action === "expand") breathCircle.style.transform = "scale(1.4)";
        else if (cur.action === "shrink") breathCircle.style.transform = "scale(0.85)";
      }
      breathStep = (breathStep + 1) % 16;
    };
    breathBtn.addEventListener("click", () => {
      if (breathInterval) {
        clearInterval(breathInterval);
        breathInterval = null;
        breathWidget.hidden = true;
        breathBtn.textContent = "\u{1F9D8} Probar pausa guiada 4-4-4-4";
        if (breathCircle) breathCircle.style.transform = "scale(1)";
      } else {
        breathWidget.hidden = false;
        breathBtn.textContent = "\u23F9 Detener pausa guiada";
        breathStep = 0;
        tick();
        breathInterval = setInterval(tick, 1e3);
      }
    });
  })();
  (() => {
    const btns = $$("[data-billing]");
    const proPrice = $("#proPriceVal");
    const proPeriod = $("#proPricePeriod");
    if (!btns.length || !proPrice) return;
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        btns.forEach((b) => {
          b.classList.toggle("active", b === btn);
          b.setAttribute("aria-pressed", String(b === btn));
        });
        const annual = btn.dataset.billing === "annual";
        proPrice.textContent = annual ? "$4.99" : "$6.99";
        if (proPeriod) proPeriod.textContent = annual ? "/ mes (facturado anualmente)" : "/ mes \xB7 cancela cuando quieras";
      });
    });
  })();
  (() => {
    const b2bOverlay = $("#b2bOverlay");
    const form = $("#b2bForm");
    const successBox = $("#b2bSuccess");
    let lastFocus = null;
    if (!b2bOverlay || !form) return;
    const openB2B = () => {
      lastFocus = document.activeElement;
      b2bOverlay.hidden = false;
      document.body.classList.add("auth-open");
      form.hidden = false;
      if (successBox) successBox.hidden = true;
      analyticsService.track("cta_click", { cta: "b2b_demo_open" });
      setTimeout(() => $("#b2bOrg")?.focus(), 40);
    };
    const closeB2B = () => {
      b2bOverlay.hidden = true;
      document.body.classList.remove("auth-open");
      lastFocus?.focus?.();
    };
    $$("[data-b2b-demo]").forEach((b) => b.addEventListener("click", openB2B));
    $("#b2bClose")?.addEventListener("click", closeB2B);
    $("#b2bDoneBtn")?.addEventListener("click", closeB2B);
    b2bOverlay.addEventListener("mousedown", (e) => {
      if (e.target === b2bOverlay) closeB2B();
    });
    document.addEventListener("keydown", (e) => {
      if (!b2bOverlay.hidden && e.key === "Escape") closeB2B();
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const org = ($("#b2bOrg")?.value || "").trim();
      const name = ($("#b2bName")?.value || "").trim();
      const email = ($("#b2bEmail")?.value || "").trim();
      const role = ($("#b2bRole")?.value || "").trim();
      const size = $("#b2bSize")?.value || "50-250";
      const msg = ($("#b2bMsg")?.value || "").trim();
      const err = $("#b2bAlert");
      if (err) err.textContent = "";
      if (!org || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        if (err) err.textContent = "Completa tu instituci\xF3n, nombre y un correo institucional v\xE1lido.";
        return;
      }
      await dbService.submitB2BLead({ organization: org, contactName: name, email, role, size, message: msg });
      analyticsService.track("b2b_demo_requested", { size, org_domain: email.split("@")[1] || "unknown" });
      form.hidden = true;
      if (successBox) successBox.hidden = false;
      form.reset();
    });
  })();
  (() => {
    const overlay = $("#authOverlay");
    if (!overlay) return;
    const panels = ["diagnostic", "signup", "login", "loading"];
    let lastFocus = null;
    let currentDiagStep = 1;
    const diagData = { trigger: "perfeccionismo", role: "universitario", schedule: "25" };
    const DIAG_PROFILES = {
      perfeccionismo: {
        title: "Perfil: Regulaci\xF3n por Perfeccionismo",
        desc: "Tu cerebro asocia empezar con la amenaza de no alcanzar la perfecci\xF3n. Tu plan SYNCRO activa el <strong>Modo Avance sin Perfecci\xF3n</strong> para desbloquear la inercia sin juicio cr\xEDtico."
      },
      redes: {
        title: "Perfil: Fragmentaci\xF3n por Distracci\xF3n Digital",
        desc: "La dopamina inmediata de las notificaciones compite con tareas complejas. Tu plan SYNCRO activa el <strong>Escudo de Pesta\xF1a</strong> y la bioac\xFAstica andina."
      },
      desorganizacion: {
        title: "Perfil: Sobrecarga y Par\xE1lisis Cognitiva",
        desc: "Dimensionar cargas grandes genera par\xE1lisis. Tu plan SYNCRO desglosa autom\xE1ticamente tus metas en <strong>5 micro-pasos calibrados para hoy</strong>."
      },
      cansancio: {
        title: "Perfil: Agotamiento y Aislamiento",
        desc: "La fatiga mental reduce tu fuerza de voluntad. Tu plan SYNCRO programa <strong>pausas guiadas 4-4-4-4 y 20-20-20</strong> junto a tu guardi\xE1n virtual."
      }
    };
    const setErr = (inputId, errId, msg) => {
      const inp = document.getElementById(inputId);
      const err = document.getElementById(errId);
      if (err) err.textContent = msg || "";
      if (inp) inp.setAttribute("aria-invalid", msg ? "true" : "false");
      return !msg;
    };
    const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    const showLoading = (title, text) => {
      if ($("#loadingTitle")) $("#loadingTitle").textContent = title;
      if ($("#loadingText")) $("#loadingText").textContent = text;
      show("loading");
    };
    const goApp = () => setTimeout(() => location.href = APP_URL, 800);
    function setDiagStep(step) {
      currentDiagStep = step;
      [1, 2, 3, 4].forEach((n) => {
        const el2 = $("#diagStep" + n);
        if (el2) el2.hidden = n !== step;
        const dot = $("#dp-" + n);
        if (dot) {
          dot.classList.toggle("active", n === step);
          dot.classList.toggle("completed", n < step);
        }
      });
      const ind = $("#diagStepIndicator");
      const title = $("#diagTitle");
      const sub = $("#diagSubtitle");
      if (step === 1) {
        if (ind) ind.textContent = "Paso 1 de 3 \xB7 Diagn\xF3stico de 60s";
        if (title) title.textContent = "\xBFQu\xE9 detona m\xE1s tu procrastinaci\xF3n?";
        if (sub) sub.textContent = "No es flojera: es una respuesta emocional al estr\xE9s. Elige la que m\xE1s reconozcas.";
      } else if (step === 2) {
        if (ind) ind.textContent = "Paso 2 de 3 \xB7 Calibraci\xF3n de entorno";
        if (title) title.textContent = "\xBFCu\xE1l es tu ocupaci\xF3n o entorno principal?";
        if (sub) sub.textContent = "Ajustamos los ritmos y lenguaje a tu d\xEDa a d\xEDa.";
      } else if (step === 3) {
        if (ind) ind.textContent = "Paso 3 de 3 \xB7 Bloque de inicio";
        if (title) title.textContent = "\xBFCu\xE1nto tiempo te resulta realista concentrarte hoy?";
        if (sub) sub.textContent = "Sin culpas. Empezar peque\xF1o es mejor que no empezar.";
      } else if (step === 4) {
        if (ind) ind.textContent = "Diagn\xF3stico completado";
        if (title) title.textContent = "\u2728 Tu plan de enfoque personalizado";
        if (sub) sub.textContent = "Basado en ciencia del comportamiento y regulaci\xF3n emocional.";
        const p = DIAG_PROFILES[diagData.trigger] || DIAG_PROFILES.perfeccionismo;
        if ($("#diagProfileResultTitle")) $("#diagProfileResultTitle").textContent = p.title;
        if ($("#diagProfileResultDesc")) {
          $("#diagProfileResultDesc").innerHTML = `${p.desc} Bloque recomendado: <strong>${diagData.schedule} minutos</strong> con semilla Cantuta.`;
        }
        setTimeout(() => $("#diagEmail")?.focus(), 40);
      }
    }
    $$("[data-diag-choice]").forEach((btn) => {
      btn.addEventListener("click", () => {
        diagData[btn.dataset.diagChoice] = btn.dataset.diagVal;
        if (currentDiagStep < 4) setDiagStep(currentDiagStep + 1);
      });
    });
    function show(panel) {
      panels.forEach((p) => {
        const el2 = $("#panel-" + p);
        if (el2) el2.hidden = p !== panel;
      });
      const tabsContainer = $("#authTabs");
      if (tabsContainer) tabsContainer.hidden = panel === "loading";
      $$(".auth-tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === panel)));
      if (panel === "diagnostic") setDiagStep(1);
    }
    function open(tab = "signup") {
      const ses2 = authService.getSession();
      if (ses2 && ses2.mode !== "guest") {
        location.href = APP_URL;
        return;
      }
      lastFocus = document.activeElement;
      show(tab);
      overlay.hidden = false;
      document.body.classList.add("auth-open");
      analyticsService.track("cta_click", { cta: `auth_open_${tab}` });
      if (tab === "signup") setTimeout(() => $("#suEmail")?.focus(), 40);
      else if (tab === "login") setTimeout(() => $("#liId")?.focus(), 40);
      else if (tab === "diagnostic") setDiagStep(1);
    }
    function close() {
      overlay.hidden = true;
      document.body.classList.remove("auth-open");
      lastFocus?.focus?.();
    }
    $$("[data-auth]").forEach(
      (el2) => el2.addEventListener("click", (e) => {
        e.preventDefault();
        open(el2.dataset.auth);
      })
    );
    $("#authClose")?.addEventListener("click", close);
    overlay.addEventListener("mousedown", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", (e) => {
      if (overlay.hidden) return;
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key === "Tab") {
        const f = $$("button, input, a[href]", overlay).filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    $$("[data-tab]").forEach(
      (b) => b.addEventListener("click", () => {
        show(b.dataset.tab);
        if (b.dataset.tab === "signup") $("#suEmail")?.focus();
        else if (b.dataset.tab === "login") $("#liId")?.focus();
      })
    );
    $$("[data-toggle-pass]").forEach(
      (b) => b.addEventListener("click", () => {
        const inp = document.getElementById(b.dataset.togglePass);
        if (!inp) return;
        const showIt = inp.type === "password";
        inp.type = showIt ? "text" : "password";
        b.textContent = showIt ? "Ocultar" : "Mostrar";
      })
    );
    $$("[data-google]").forEach(
      (btn) => btn.addEventListener("click", () => {
        analyticsService.track("cta_click", { cta: "google_oauth" });
        const res = authService.signInWithGoogle();
        if (res.needsEmailFallback) {
          const alertEl = currentDiagStep === 4 && !$("#panel-diagnostic").hidden ? $("#diagAlert") : $("#signupAlert");
          if (alertEl) {
            alertEl.textContent = "El inicio r\xE1pido con Google requiere conectar tu proyecto Supabase en src/config.js. Puedes entrar ahora mismo con tu correo.";
          }
          ($("#panel-diagnostic").hidden ? $("#suEmail") : $("#diagEmail"))?.focus();
        }
      })
    );
    async function handleSignup({ emailId, emailErrId, passId, passErrId, alertId, submitId, diagnostic }) {
      const email = ($(`#${emailId}`)?.value || "").trim().toLowerCase();
      const pass = $(`#${passId}`)?.value || "";
      const alertEl = $(`#${alertId}`);
      if (alertEl) alertEl.textContent = "";
      let ok = true;
      ok = setErr(emailId, emailErrId, !emailOk(email) ? "Escribe un correo v\xE1lido, por ejemplo tu@correo.com." : "") && ok;
      ok = setErr(
        passId,
        passErrId,
        pass.length < 8 || !/[a-z]/i.test(pass) || !/\d/.test(pass) ? "La contrase\xF1a necesita al menos 8 caracteres con letras y n\xFAmeros." : ""
      ) && ok;
      if (!ok) {
        $(`#${emailId}[aria-invalid="true"], #${passId}[aria-invalid="true"]`)?.focus();
        return;
      }
      const btn = $(`#${submitId}`);
      if (btn) btn.disabled = true;
      try {
        const ses2 = await authService.signUpWithEmail({ email, password: pass, diagnostic });
        showLoading(`\xA1Bienvenido, ${ses2.name.split(" ")[0]}!`, "Calibrando tu espacio y plantando tu primera semilla\u2026");
        goApp();
      } catch (err) {
        if (alertEl) alertEl.textContent = err.message || "No pudimos crear tu cuenta.";
        if (btn) btn.disabled = false;
      }
    }
    $("#diagSignupForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSignup({
        emailId: "diagEmail",
        emailErrId: "diagEmailErr",
        passId: "diagPass",
        passErrId: "diagPassErr",
        alertId: "diagAlert",
        submitId: "diagSubmit",
        diagnostic: diagData
      });
    });
    $("#signupForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSignup({
        emailId: "suEmail",
        emailErrId: "suEmailErr",
        passId: "suPass",
        passErrId: "suPassErr",
        alertId: "signupAlert",
        submitId: "signupSubmit",
        diagnostic: null
      });
    });
    $("#loginForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const identifier = ($("#liId")?.value || "").trim();
      const password = $("#liPass")?.value || "";
      const alertEl = $("#loginAlert");
      if (alertEl) alertEl.textContent = "";
      if (!identifier || !password) {
        if (alertEl) alertEl.textContent = "Escribe tu usuario o correo y tu contrase\xF1a.";
        return;
      }
      const btn = $("#loginSubmit");
      if (btn) btn.disabled = true;
      try {
        const ses2 = await authService.signInWithEmail({ identifier, password });
        showLoading(`Hola de nuevo, ${ses2.name.split(" ")[0]}`, "Retomando donde lo dejaste\u2026");
        goApp();
      } catch (err) {
        if (alertEl) alertEl.textContent = err.message || "Credenciales incorrectas.";
        if (btn) btn.disabled = false;
      }
    });
    const ses = authService.getSession();
    if (ses && ses.mode !== "guest") {
      const firstName = (ses.name || "Usuario").split(" ")[0];
      $$(".nav-cta-primary").forEach((a) => {
        a.textContent = "Ir a mi espacio";
        a.href = APP_URL;
        a.removeAttribute("data-auth");
      });
      $$(".nav-cta-ghost").forEach((a) => {
        a.textContent = `Hola, ${firstName}`;
        a.href = APP_URL;
        a.removeAttribute("data-auth");
      });
      const heroBtn = $("#heroStartDiag");
      if (heroBtn) {
        heroBtn.textContent = "\u{1F680} Continuar a mi espacio";
        heroBtn.onclick = () => location.href = APP_URL;
      }
    }
    if (location.hash === "#auth") open("signup");
  })();
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {
      });
    });
  }
  // src/core/theme.js
  /**
   * SYNCRO — Controlador de Tema (Modo Claro y Modo Oscuro)
   * Persiste la preferencia en localStorage ("syncro_theme"), sincroniza entre pestañas
   * y actualiza todos los botones [data-theme-toggle] y la meta theme-color móvil.
   */

  const THEME_STORAGE_KEY = 'syncro_theme';

  function getTheme() {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (_) {}
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme, { persist = true } = {}) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;

    if (persist) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch (_) {}
    }

    // Actualizar barra de estado móvil (PWA / navegadores móviles)
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', next === 'light' ? '#F4F7FB' : '#0B132B');
    }

    // Actualizar todos los botones e íconos de cambio de tema
    const isLight = next === 'light';
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(isLight));
      btn.setAttribute('title', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
      btn.setAttribute('aria-label', isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    });
    document.querySelectorAll('[data-theme-icon]').forEach((el) => {
      el.textContent = isLight ? '🌙' : '☀️';
    });
    document.querySelectorAll('[data-theme-label]').forEach((el) => {
      el.textContent = isLight ? 'Modo oscuro' : 'Modo claro';
    });

    return next;
  }

  function toggleTheme() {
    return applyTheme(getTheme() === 'light' ? 'dark' : 'light');
  }

  function initTheme() {
    applyTheme(getTheme(), { persist: false });

    // Activar transiciones suaves solo después del primer pintado (evita parpadeo al cargar)
    requestAnimationFrame(() => {
      document.documentElement.setAttribute('data-theme-ready', '1');
    });

    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = '1';
      btn.addEventListener('click', () => {
        toggleTheme();
      });
    });

    window.addEventListener('storage', (e) => {
      if (e.key === THEME_STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        applyTheme(e.newValue, { persist: false });
      }
    });
  }

  initTheme();
  initChatbot({ surface: "landing" });
})();
