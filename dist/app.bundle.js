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
    saveLocalState(state2) {
      try {
        localStorage.setItem(STATE_KEY, JSON.stringify(state2));
        return true;
      } catch {
        return false;
      }
    },
    /**
     * Sincroniza el progreso de bioma y sesiones con Supabase (no bloqueante).
     */
    async syncStateToCloud(state2) {
      if (!CONFIG.supabase.enabled) return { synced: false, mode: "local" };
      const ses = authService.getSession();
      if (!ses || ses.mode === "guest" || !ses.accessToken) return { synced: false, mode: "guest" };
      try {
        await fetch(`${CONFIG.supabase.url}/rest/v1/biome_progress`, {
          method: "POST",
          headers: { ...authHeaders(), Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify({
            user_id: ses.id,
            drops: state2.biome.drops,
            earth_points: state2.biome.earth,
            streak: state2.user.streak,
            total_minutes: state2.stats.minutes,
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

  // src/core/state.js
  var SEEDS = {
    cantuta: { name: "Cantuta", stages: ["\u{1F331}", "\u{1F33F}", "\u{1F337}", "\u{1F33A}"] },
    "que\xF1ual": { name: "Que\xF1ual", stages: ["\u{1F331}", "\u{1F33F}", "\u{1F332}", "\u{1F333}"] },
    chachacoma: { name: "Chachacoma", stages: ["\u{1F331}", "\u{1F33F}", "\u{1F340}", "\u{1FAB4}"] }
  };
  var GUARDIANS = { alpaca: "\u{1F999}", vicuna: "\u{1F98C}", condor: "\u{1F985}", oso: "\u{1F43B}" };
  var GUARDIAN_NAMES = {
    alpaca: "Alpaca",
    vicuna: "Vicu\xF1a",
    condor: "C\xF3ndor andino",
    oso: "Oso de anteojos"
  };
  var GUARDIAN_LOCK = { vicuna: "blocks_3", condor: "streak_7", oso: "species_4" };
  var ACHIEVEMENTS = [
    { id: "first_block", icon: "\u{1F331}", name: "Primera semilla", desc: "Completaste tu primer bloque de enfoque." },
    { id: "first_checkin", icon: "\u{1F324}", name: "Te escuchaste", desc: "Hiciste tu primer check-in emocional." },
    { id: "no_perf", icon: "\u2728", name: "Avance sin perfecci\xF3n", desc: "Empezaste con 5 minutos sin exigirte el 100%." },
    { id: "blocks_3", icon: "\u{1F98C}", name: "Vicu\xF1a curiosa", desc: "Completaste 3 bloques. Desbloqueas al guardi\xE1n Vicu\xF1a." },
    { id: "journal_1", icon: "\u{1F512}", name: "Soltaste la mente", desc: "Escribiste tu primera nota en el diario cifrado." },
    { id: "streak_3", icon: "\u{1F308}", name: "Arco\xEDris andino", desc: "Mantuviste tu constancia 3 d\xEDas seguidos." },
    { id: "streak_7", icon: "\u{1F985}", name: "Vuelo del c\xF3ndor", desc: "7 d\xEDas de constancia. Desbloqueas al guardi\xE1n C\xF3ndor." },
    { id: "species_4", icon: "\u{1F43B}", name: "Santuario diverso", desc: "Desbloqueaste 4 especies nativas y al Oso de Anteojos." },
    { id: "water_3", icon: "\u{1F4A7}", name: "Manos que riegan", desc: "Regaste tu santuario 3 veces con tus gotas." }
  ];
  var BASE_MISSIONS = [
    { id: "m1", base: true, title: "Hacer tu check-in emocional del d\xEDa", xp: 20, drops: 5, target: 1, progress: 0, done: false },
    { id: "m2", base: true, title: "Completar 1 bloque de enfoque sin culpa", xp: 35, drops: 10, target: 1, progress: 0, done: false },
    { id: "m3", base: true, title: "Regar tu santuario o planificar 1 bloque", xp: 25, drops: 5, target: 1, progress: 0, done: false }
  ];
  function defaultState() {
    return {
      accountEmail: null,
      user: { name: "", xp: 0, level: 1, streak: 0, shields: 2, onboarded: false, toured: false, lastActive: null },
      profile: {
        role: null,
        ageRange: "",
        institution: "",
        goal: "",
        trigger: null,
        schedule: null,
        blockPref: "classic",
        seed: "cantuta",
        guardian: "alpaca",
        bienestarConsent: false,
        journalAiOptIn: false,
        reminder: true,
        notifications: false,
        mouseleaveSensitivity: "normal"
        // 'off' | 'normal' | 'strict'
      },
      checkIn: { energy: 5, mood: null, lowEnergy: false, date: null },
      missions: BASE_MISSIONS.map((m) => ({ ...m })),
      plan: { est: 10, real: 6, task: "", days: 10, steps: [] },
      focus: {
        mode: "classic",
        shield: true,
        autoFs: false,
        soundOn: false,
        sound: "rain",
        soundVolume: 70,
        alarmTone: "chime",
        alarmVolume: 80,
        alarmMuted: false,
        activeMission: null
      },
      biome: { drops: 0, earth: 0, collectiveHours: 0, waters: 0 },
      calendar: { slots: [], weekOffset: 0 },
      daily: { date: null, distractions: 0, blocks: 0 },
      stats: { blocks: 0, minutes: 0, totalMinutes: 0, dropsEarned: 0, noPerfBlocks: 0, checkIns: 0 },
      history: {},
      weekly: [0, 0, 0, 0, 0, 0, 0],
      moodLogs: [],
      achievements: {},
      ui: { sidebarCollapsed: false }
    };
  }
  function keyOf(d = /* @__PURE__ */ new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  function dayIdx(d = /* @__PURE__ */ new Date()) {
    return (d.getDay() + 6) % 7;
  }
  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  function deepMerge(base, patch) {
    if (!patch || typeof patch !== "object") return base;
    const out = Array.isArray(base) ? [...base] : { ...base };
    for (const [k, v] of Object.entries(patch)) {
      if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object" && !Array.isArray(base[k])) {
        out[k] = deepMerge(base[k], v);
      } else if (v !== void 0) {
        out[k] = v;
      }
    }
    return out;
  }
  var listeners = /* @__PURE__ */ new Set();
  var state = loadInitialState();
  function loadInitialState() {
    const saved = dbService.loadLocalState();
    const merged = deepMerge(defaultState(), saved || {});
    const ses = authService.ensureGuestSession();
    if (ses?.email && !merged.accountEmail) {
      merged.accountEmail = ses.email;
    }
    if (ses?.name && ses.mode !== "guest" && !merged.user.name) {
      merged.user.name = ses.name;
    }
    const today = keyOf();
    if (merged.daily.date !== today) {
      merged.daily = { date: today, distractions: 0, blocks: 0 };
    }
    return merged;
  }
  function replaceState(next) {
    state = deepMerge(defaultState(), next);
    saveState();
    return state;
  }
  var cloudSyncTimer = null;
  function saveState() {
    dbService.saveLocalState(state);
    listeners.forEach((fn) => {
      try {
        fn(state);
      } catch {
      }
    });
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
      dbService.syncStateToCloud(state);
    }, 1500);
  }
  function seed() {
    return SEEDS[state.profile.seed] || SEEDS.cantuta;
  }
  function guardian() {
    return GUARDIANS[state.profile.guardian] || "\u{1F999}";
  }
  function achUnlocked(id) {
    return Boolean(state.achievements[id]);
  }
  function guardianLocked(key) {
    const req = GUARDIAN_LOCK[key];
    return req ? !achUnlocked(req) : false;
  }
  function levelTitle(lvl) {
    if (lvl < 3) return "Iniciando";
    if (lvl < 6) return "Constante";
    if (lvl < 10) return "Guardi\xE1n del Enfoque";
    return "Protector Andino";
  }
  function addXP(amount) {
    let ups = 0;
    state.user.xp += amount;
    while (state.user.xp >= 300) {
      state.user.xp -= 300;
      state.user.level += 1;
      ups += 1;
    }
    return ups;
  }
  function addDrops(amount) {
    state.biome.drops += amount;
    state.stats.dropsEarned += amount;
  }
  function markActive() {
    const today = keyOf();
    state.history[today] = (state.history[today] || 0) + 1;
    if (state.user.lastActive === today) return;
    const yesterday = keyOf(new Date(Date.now() - 864e5));
    if (state.user.lastActive === yesterday) {
      state.user.streak += 1;
    } else if (!state.user.lastActive) {
      state.user.streak = 1;
    } else if (state.user.shields > 0) {
      state.user.shields -= 1;
      state.user.streak += 1;
    } else {
      state.user.streak = 1;
    }
    state.user.lastActive = today;
  }
  function bestStreak() {
    const dates = Object.keys(state.history || {}).sort();
    if (!dates.length) return state.user.streak || 0;
    let best = 1;
    let cur = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = /* @__PURE__ */ new Date(dates[i - 1] + "T12:00:00");
      const curr = /* @__PURE__ */ new Date(dates[i] + "T12:00:00");
      const diff = Math.round((curr - prev) / 864e5);
      if (diff === 1) {
        cur += 1;
        if (cur > best) best = cur;
      } else if (diff > 1) {
        cur = 1;
      }
    }
    return Math.max(best, state.user.streak || 0);
  }
  function resolveActiveInstitution() {
    const ses = authService.getSession();
    const byEmail = resolveInstitutionFromEmail(ses?.email || "");
    if (byEmail) return byEmail;
    const customInst = (state.profile.institution || "").trim();
    if (customInst) {
      return {
        name: customInst,
        wellbeingLabel: `Red de Bienestar \xB7 ${customInst}`,
        communityLabel: `Comunidad \xB7 ${customInst}`,
        plan: ses?.plan || "free"
      };
    }
    return {
      name: null,
      wellbeingLabel: "Red de Bienestar",
      communityLabel: "Comunidad",
      plan: ses?.plan || "free"
    };
  }
  function isDevMode() {
    return CONFIG.devMode;
  }

  // src/services/aiService.js
  var QUOTA_KEY = "syncro_ai_quota_v1";
  var FALLBACK_NOPERF_REPLIES = [
    [/código|program|bug|error|fallar|funcionar/i, "El c\xF3digo nunca sale limpio a la primera. Escribe una versi\xF3n que apenas compile; despu\xE9s la mejoras."],
    [/tesis|informe|ensayo|redact|escribir|página/i, "La p\xE1gina en blanco intimida porque quieres escribir el borrador final. Escribe 5 l\xEDneas malas solo para romper el hielo."],
    [/examen|parcial|nota|aprobar|jalar|estudiar/i, "No tienes que dominar todo hoy. Elige un solo tema y rep\xE1salo durante 15 minutos."],
    [/cansad|agotad|sueño|no puedo|abrum|ansie|estrés/i, "Cuando el cerebro est\xE1 saturado, exigirle el 100% empeora el bloqueo. Hoy cuenta avanzar un 10% y descansar."],
    [/tiempo|tarde|mañana|plazo|entrega/i, "La culpa por no haber empezado antes consume la energ\xEDa de hoy. Arranca con un bloque de 5 minutos ahora."]
  ];
  var FALLBACK_THEMES = [
    { name: "ex\xE1menes y entregas", re: /examen|parcial|entrega|plazo|tarea|trabajo|tesis|nota|proyecto/i },
    { name: "perfeccionismo", re: /perfect|mal|fallar|no me sale|suficiente|miedo|duda|error/i },
    { name: "cansancio o sue\xF1o", re: /cansad|agotad|sueño|dorm|fatiga|sin energía|no puedo/i },
    { name: "distracciones", re: /celular|tiktok|redes|distra|notific|youtube|instagram/i },
    { name: "calma y avance", re: /bien|tranquil|logr|avanc|content|orgull|enfoc/i }
  ];
  function currentWeekKey() {
    const d = /* @__PURE__ */ new Date();
    const jan1 = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - jan1) / 864e5 + jan1.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${week}`;
  }
  function getQuotaRecord() {
    try {
      const rec = JSON.parse(localStorage.getItem(QUOTA_KEY) || "{}");
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
    }
    return rec;
  }
  var aiService = {
    getQuotaStatus() {
      const ses = authService.getSession();
      const isPro = ses?.plan === "pro" || ses?.plan === "b2b";
      const rec = getQuotaRecord();
      const limit = isPro ? CONFIG.quotas.proWeeklyBreakdowns : CONFIG.quotas.freeWeeklyBreakdowns;
      return {
        plan: ses?.plan || "free",
        used: rec.count,
        limit,
        remaining: isPro ? Infinity : Math.max(0, limit - rec.count),
        allowed: isPro || rec.count < limit
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
          message: `Alcanzaste el l\xEDmite de ${quota.limit} desgloses con IA esta semana en el plan Gratis. Actualiza a SYNCRO Pro para desgloses ilimitados.`,
          steps: []
        };
      }
      if (CONFIG.endpoints.aiEdgeFunction) {
        try {
          const ses = authService.getSession();
          const res = await fetch(CONFIG.endpoints.aiEdgeFunction, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...ses?.accessToken ? { Authorization: `Bearer ${ses.accessToken}` } : {}
            },
            body: JSON.stringify({ action: "breakdown", task, days, lowEnergy })
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.steps) && data.steps.length) {
              incrementQuota();
              return { quotaExceeded: false, source: "edge-ai", steps: data.steps };
            }
          }
        } catch {
        }
      }
      const clean = task.trim();
      const dayStep = Math.max(1, Math.floor(days / 5));
      const blockMin = lowEnergy ? 15 : 25;
      const steps = [
        { title: `Definir alcance m\xEDnimo de "${clean}" (${blockMin} min)`, day: 1, done: false },
        { title: `Reunir fuentes, insumos y esquema base para "${clean}"`, day: Math.min(days, 1 + dayStep), done: false },
        { title: `Crear primer borrador imperfecto (sin editar) de "${clean}"`, day: Math.min(days, 1 + dayStep * 2), done: false },
        { title: `Revisar, pulir puntos cr\xEDticos y validar "${clean}"`, day: Math.min(days, 1 + dayStep * 3), done: false },
        { title: `Cierre final y entrega de "${clean}"`, day: days, done: false }
      ];
      incrementQuota();
      return { quotaExceeded: false, source: "local", steps };
    },
    /**
     * Valida una descarga mental con tono empático y micro-acción sin culpa.
     */
    async validateMentalDump(text) {
      const clean = (text || "").trim();
      if (!clean) return "T\xF3mate un respiro. Empezar con 5 minutos imperfectos ya rompe la par\xE1lisis.";
      if (CONFIG.endpoints.aiEdgeFunction) {
        try {
          const ses = authService.getSession();
          const res = await fetch(CONFIG.endpoints.aiEdgeFunction, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...ses?.accessToken ? { Authorization: `Bearer ${ses.accessToken}` } : {}
            },
            body: JSON.stringify({ action: "validate_emotion", text: clean })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.reply) return data.reply;
          }
        } catch {
        }
      }
      const hit = FALLBACK_NOPERF_REPLIES.find(([re]) => re.test(clean));
      return hit ? hit[1] : "Es completamente v\xE1lido sentir resistencia ante una tarea exigente. Activa un bloque de 5 minutos sin buscar perfecci\xF3n: el \xFAnico objetivo es empezar.";
    },
    /**
     * Analiza patrones del diario SOLO si el usuario activó opt-in explícito.
     */
    analyzeJournalPatterns(entries, { optIn = false } = {}) {
      if (!optIn) {
        return {
          optInRequired: true,
          summary: "Tus notas permanecen 100% cifradas solo en tu dispositivo. Activa el an\xE1lisis por IA en Perfil si deseas ver patrones.",
          themes: []
        };
      }
      if (!entries.length) {
        return { optInRequired: false, summary: "A\xFAn no hay suficientes notas para detectar patrones.", themes: [] };
      }
      const counts = FALLBACK_THEMES.map((t) => ({
        name: t.name,
        count: entries.filter((e) => t.re.test(e.text || "")).length
      })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count);
      return {
        optInRequired: false,
        themes: counts.slice(0, 3),
        summary: counts.length ? `Temas recurrentes detectados localmente: ${counts.slice(0, 3).map((c) => `${c.name} (${c.count})`).join(", ")}.` : "Tus notas reflejan variedad de temas sin un patr\xF3n dominante a\xFAn."
      };
    }
  };

  // src/ui/modals.js
  var FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var toastTimer = null;
  var infoAction = null;
  var initialized = false;
  var $ = (sel, root = document) => root.querySelector(sel);
  var $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  function toast(msg) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3400);
  }
  function getOpenModals() {
    return $$(".overlay:not(.hidden), .emergency-overlay:not(.hidden), .auth-overlay:not([hidden])");
  }
  function openOverlay(el2) {
    if (!el2) return;
    el2._returnFocus = document.activeElement;
    el2.classList.remove("hidden");
    if (el2.hasAttribute("hidden")) el2.hidden = false;
    const firstFocusable = el2.querySelector('input:not([type="radio"]):not([type="checkbox"]):not([disabled]), button:not([disabled])') || el2;
    requestAnimationFrame(() => firstFocusable.focus?.());
  }
  function closeOverlay(el2) {
    if (!el2) return;
    el2.classList.add("hidden");
    const back = el2._returnFocus;
    el2._returnFocus = null;
    if (back && document.contains(back)) {
      requestAnimationFrame(() => back.focus?.());
    }
  }
  function openInfo(title, html, ok = "Entendido", onOk = null) {
    const titleEl = $("#infoTitle");
    const bodyEl = $("#infoBody");
    const okBtn = $("#closeInfo");
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = html;
    if (okBtn) okBtn.textContent = ok;
    infoAction = onOk;
    openOverlay($("#infoModal"));
  }
  function celebrate(title, text, emoji = "\u{1F389}") {
    const titleEl = $("#missionModalTitle");
    const textEl = $("#missionModalText");
    const emojiEl = $("#celebEmoji");
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    if (emojiEl) emojiEl.textContent = emoji;
    openOverlay($("#missionModal"));
  }
  function initModals({ isTourActive = () => false } = {}) {
    if (initialized) return;
    initialized = true;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        if (isTourActive()) return;
        const top = getOpenModals().pop();
        if (!top) return;
        const focusables = $$(FOCUSABLE, top).filter((x) => x.offsetParent !== null);
        if (!focusables.length) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!top.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      if (e.key === "Escape") {
        const top = $$(".overlay:not(.hidden), .emergency-overlay:not(.hidden)").pop();
        if (!top) return;
        if (top.id === "onboarding" || top.id === "blockModal") return;
        closeOverlay(top);
      }
    });
    $$(".overlay").forEach((overlay) => {
      overlay.addEventListener("mousedown", (e) => {
        if (e.target === overlay && overlay.id !== "onboarding") {
          closeOverlay(overlay);
        }
      });
    });
    $("#closeInfo")?.addEventListener("click", () => {
      if (infoAction && infoAction() === false) return;
      infoAction = null;
      closeOverlay($("#infoModal"));
    });
    $("#closeMissionModal")?.addEventListener("click", () => closeOverlay($("#missionModal")));
  }

  // src/modules/timer.js
  var BASE_TITLE = document.title;
  var MODES = {
    classic: { label: "Enfoque cl\xE1sico \xB7 25 / 5", focus: 25 * 60, brk: 5 * 60 },
    deep: { label: "Enfoque profundo \xB7 50 / 10", focus: 50 * 60, brk: 10 * 60 },
    noPerfection: { label: "Avance sin perfecci\xF3n \xB7 5 min (reloj oculto)", focus: 5 * 60, brk: 2 * 60, hideClock: true }
  };
  var BREAK_GUIDES = {
    breath: [
      "Inhala suavemente por la nariz (4s)\u2026",
      "Sost\xE9n el aire sin tensi\xF3n (4s)\u2026",
      "Exhala despacio por la boca (4s)\u2026",
      "Descansa en calma antes del siguiente ciclo (4s)\u2026"
    ],
    twenty: [
      "Mira un punto lejano a m\xE1s de 6 metros durante 20 segundos.",
      "Parpadea despacio para lubricar los ojos y relaja la mand\xEDbula.",
      "Suelta los hombros y aleja la mirada de la pantalla.",
      "Respira profundo antes de retomar."
    ],
    stretch: [
      "Estira los brazos hacia arriba y alarga la espalda.",
      "Gira suavemente el cuello de izquierda a derecha.",
      "Rota los hombros hacia atr\xE1s 5 veces.",
      "Sacude las manos y relaja las mu\xF1ecas."
    ]
  };
  var Sound = {
    ctx: null,
    master: null,
    srcs: [],
    _ensureCtx() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!this.ctx) this.ctx = new AC();
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {
      });
      return this.ctx;
    },
    _noiseBuffer(type) {
      const ctx = this.ctx;
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        if (type === "brown") {
          last = (last + 0.02 * w) / 1.02;
          data[i] = last * 3.5;
        } else {
          data[i] = w * 0.45;
        }
      }
      return buf;
    },
    play(kind = state.focus.sound) {
      this.stop();
      const ctx = this._ensureCtx();
      if (!ctx) return;
      const vol = Math.max(0, Math.min(1, (state.focus.soundVolume ?? 70) / 100));
      const master = this.master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      master.gain.linearRampToValueAtTime(vol * 0.7, ctx.currentTime + 0.8);
      const add = (node) => (this.srcs.push(node), node);
      const noise = (type) => {
        const s = add(ctx.createBufferSource());
        s.buffer = this._noiseBuffer(type);
        s.loop = true;
        s.start();
        return s;
      };
      const filt = (type, freq, q = 1) => {
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = q;
        return f;
      };
      const gain = (v) => {
        const g = ctx.createGain();
        g.gain.value = v;
        return g;
      };
      const chain = (...nodes) => nodes.reduce((a, b) => (a.connect(b), b));
      if (kind === "rain") {
        chain(noise("white"), filt("highpass", 900), filt("lowpass", 6500), gain(0.22), master);
      } else if (kind === "wind") {
        const g = gain(0.35);
        chain(noise("brown"), filt("bandpass", 500, 0.6), g, master);
        const lfo = add(ctx.createOscillator());
        lfo.frequency.value = 0.12;
        const d = gain(0.15);
        lfo.connect(d);
        d.connect(g.gain);
        lfo.start();
      } else if (kind === "fire") {
        chain(noise("brown"), filt("lowpass", 380), gain(0.35), master);
        chain(noise("white"), filt("bandpass", 2400, 1.2), gain(0.05), master);
      } else if (kind === "river") {
        chain(noise("brown"), filt("bandpass", 720, 0.5), gain(0.3), master);
        chain(noise("white"), filt("lowpass", 1800), gain(0.08), master);
      } else if (kind === "night") {
        chain(noise("brown"), filt("lowpass", 280), gain(0.18), master);
        const osc = add(ctx.createOscillator());
        osc.type = "sine";
        osc.frequency.value = 4100;
        const g = gain(0.015);
        chain(osc, g, master);
        osc.start();
      } else if (kind === "lofi") {
        [220, 277.18, 329.63].forEach((freq) => {
          const osc = add(ctx.createOscillator());
          osc.type = "triangle";
          osc.frequency.value = freq;
          chain(osc, filt("lowpass", 600), gain(0.05), master);
          osc.start();
        });
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
            chain(osc, gain(0.08), pan, master);
          } else {
            chain(osc, gain(0.06), master);
          }
          osc.start();
        });
      }
    },
    setVolume(val) {
      if (this.master && this.ctx) {
        this.master.gain.setTargetAtTime(Math.max(0, Math.min(1, val / 100)) * 0.7, this.ctx.currentTime, 0.1);
      }
    },
    stop() {
      if (!this.master) return;
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
    },
    alarm(tone = state.focus.alarmTone) {
      if (state.focus.alarmMuted) return;
      const ctx = this._ensureCtx();
      if (!ctx) return;
      const vol = Math.max(0.05, (state.focus.alarmVolume ?? 80) / 100 * 0.25);
      const freqs = tone === "bowl" ? [256, 384] : tone === "alert" ? [660, 880, 660] : [523.25, 659.25, 783.99];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = tone === "bowl" ? "sine" : "triangle";
        osc.frequency.value = f;
        const t0 = ctx.currentTime + idx * 0.18;
        g.gain.setValueAtTime(1e-4, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
        g.gain.exponentialRampToValueAtTime(1e-4, t0 + (tone === "bowl" ? 1.1 : 0.45));
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 1.2);
      });
    }
  };
  var Notify = {
    supported() {
      return typeof Notification !== "undefined";
    },
    async request() {
      if (!this.supported()) return "unsupported";
      if (Notification.permission === "granted") return "granted";
      return Notification.requestPermission();
    },
    send(title, body, tag = "syncro") {
      if (!state.profile.notifications || !this.supported() || Notification.permission !== "granted") return;
      try {
        new Notification(title, { body, tag, icon: "./icons/icon-192.png" });
      } catch {
      }
    }
  };
  var T = {
    running: false,
    duration: 25 * 60,
    remaining: 25 * 60,
    endAt: null,
    interval: null,
    breakInterval: null,
    breakEndAt: null,
    breakKind: "breath",
    breakPhase: 0
  };
  var callbacks = {
    onComplete: () => {
    },
    onSwitchView: () => {
    }
  };
  var pendingView = null;
  var lastExitAlert = 0;
  function formatTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  function fsEl() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function exitFullscreen() {
    if (fsEl()) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)?.catch?.(() => {
      });
    }
  }
  function enterFullscreen() {
    const el2 = document.documentElement;
    (el2.requestFullscreen || el2.webkitRequestFullscreen)?.call(el2)?.catch?.(() => {
    });
  }
  function updateTimerDuration() {
    const m = MODES[state.focus.mode] || MODES.classic;
    const adapted = state.checkIn.lowEnergy && state.focus.mode === "classic" ? 15 * 60 : m.focus;
    T.duration = adapted;
    T.remaining = adapted;
    renderTimer();
  }
  function renderTimer() {
    const m = MODES[state.focus.mode] || MODES.classic;
    const display = $("#timerDisplay");
    const fill = $("#timerFill");
    const modeLabel = $("#timerModeLabel");
    const seedVis = $("#seedVisual");
    const startBtn = $("#startPauseBtn");
    const ribbon = $("#focusTopRibbon");
    const ribbonTimer = $("#ribbonTimer");
    const ribbonGuardian = $("#ribbonGuardian");
    const pct = T.duration > 0 ? Math.min(100, Math.max(0, (T.duration - T.remaining) / T.duration * 100)) : 0;
    if (display) {
      display.textContent = m.hideClock && T.running ? "En curso \u2728" : formatTime(T.remaining);
    }
    if (fill) fill.style.width = `${pct}%`;
    if (modeLabel) {
      modeLabel.textContent = state.checkIn.lowEnergy && state.focus.mode === "classic" ? "Modo ligero autom\xE1tico \xB7 15 / 5" : m.label;
    }
    if (seedVis) {
      const stages = seed().stages;
      const idx = Math.min(stages.length - 1, Math.floor(pct / 100 * stages.length));
      seedVis.textContent = stages[idx];
    }
    if (startBtn) startBtn.textContent = T.running ? "Pausar" : T.remaining < T.duration ? "Continuar" : "Iniciar";
    if (ribbon) ribbon.classList.toggle("hidden", !T.running);
    if (ribbonTimer) ribbonTimer.textContent = formatTime(T.remaining);
    if (ribbonGuardian) ribbonGuardian.textContent = `${guardian()} Tu guardi\xE1n protege tu semilla`;
    document.body.classList.toggle("focus-locked", T.running && state.focus.shield);
  }
  function startTimer() {
    if (T.running) return;
    T.running = true;
    T.endAt = Date.now() + T.remaining * 1e3;
    if (state.focus.autoFs && !fsEl()) enterFullscreen();
    if (state.focus.soundOn) Sound.play(state.focus.sound);
    clearInterval(T.interval);
    T.interval = setInterval(() => {
      T.remaining = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1e3));
      renderTimer();
      if (T.remaining <= 0) {
        completeFocusBlock();
      }
    }, 500);
    renderTimer();
  }
  function pauseTimer() {
    if (!T.running) return;
    T.running = false;
    clearInterval(T.interval);
    T.interval = null;
    if (T.endAt) T.remaining = Math.max(0, Math.ceil((T.endAt - Date.now()) / 1e3));
    T.endAt = null;
    Sound.stop();
    renderTimer();
  }
  function resetTimer() {
    pauseTimer();
    exitFullscreen();
    updateTimerDuration();
  }
  function completeFocusBlock() {
    pauseTimer();
    exitFullscreen();
    Sound.alarm();
    const mins = Math.max(5, Math.round(T.duration / 60));
    const xp = Math.max(20, mins * 2);
    const drops = Math.max(4, Math.round(mins / 3));
    markActive();
    const ups = addXP(xp);
    addDrops(drops);
    state.stats.blocks += 1;
    state.stats.minutes += mins;
    state.stats.totalMinutes = (state.stats.totalMinutes || 0) + mins;
    if (state.focus.mode === "noPerfection") state.stats.noPerfBlocks += 1;
    state.daily.blocks += 1;
    state.weekly[dayIdx()] = Math.round(((state.weekly[dayIdx()] || 0) + mins / 60) * 10) / 10;
    state.biome.collectiveHours = Math.round(((state.biome.collectiveHours || 0) + mins / 60) * 10) / 10;
    if (state.focus.activeMission) {
      const m = state.missions.find((x) => x.id === state.focus.activeMission && !x.done);
      if (m) {
        m.progress = Math.min(m.target, (m.progress || 0) + 1);
        if (m.progress >= m.target) m.done = true;
      }
    }
    saveState();
    dbService.logFocusSession({ durationMinutes: mins, mode: state.focus.mode, missionId: state.focus.activeMission });
    analyticsService.trackOnce("first_block_completed", { duration_min: mins, mode: state.focus.mode });
    analyticsService.track("block_completed", { duration_min: mins, mode: state.focus.mode });
    Notify.send("\u{1F389} \xA1Bloque completado!", `+${xp} XP y +${drops} gotas para tu santuario.`, "syncro-block-done");
    T.remaining = T.duration;
    renderTimer();
    callbacks.onComplete({ mins, xp, drops, ups });
    const ses = authService.getSession();
    if (ses?.mode === "guest" && state.stats.blocks === 1) {
      openOverlay($("#guestSignupModal"));
    } else {
      celebrate(
        "\xA1Bloque completado!",
        `+${xp} XP \xB7 +${drops} Gotas de riego${ups ? ` \xB7 \xA1Subiste al Nivel ${state.user.level}!` : ""}`,
        seed().stages[3]
      );
    }
    startGuidedBreak();
  }
  function startGuidedBreak() {
    const box = $("#guidedBreak");
    if (!box) return;
    const m = MODES[state.focus.mode] || MODES.classic;
    box.classList.remove("hidden");
    T.breakEndAt = Date.now() + m.brk * 1e3;
    T.breakPhase = 0;
    clearInterval(T.breakInterval);
    const tick = () => {
      const left = Math.max(0, Math.ceil((T.breakEndAt - Date.now()) / 1e3));
      const clock = $("#breakClock");
      if (clock) clock.textContent = formatTime(left);
      const lines = BREAK_GUIDES[T.breakKind] || BREAK_GUIDES.breath;
      const textEl = $("#guidedText");
      const circle = $("#breathCircle");
      const phaseIdx = Math.floor((m.brk - left) / 4 % lines.length);
      if (textEl) textEl.textContent = lines[phaseIdx];
      if (circle) circle.dataset.phase = String(phaseIdx);
      if (left <= 0) endGuidedBreak();
    };
    tick();
    T.breakInterval = setInterval(tick, 1e3);
  }
  function endGuidedBreak() {
    clearInterval(T.breakInterval);
    T.breakInterval = null;
    $("#guidedBreak")?.classList.add("hidden");
  }
  function renderShield() {
    const on = state.focus.shield;
    const s = $("#shieldStatus");
    if (s) {
      s.textContent = on ? "ACTIVO" : "INACTIVO";
      s.classList.toggle("emerald", on);
    }
    const toggleBtn = $("#toggleShield");
    if (toggleBtn) toggleBtn.textContent = on ? "Pausar" : "Activar";
    const simBtn = $("#simulateDistraction");
    if (simBtn) {
      simBtn.disabled = !on;
      if (isDevMode()) simBtn.classList.add("dev-visible");
    }
    const muteBtn = $("#muteAlertSoundBtn");
    if (muteBtn) muteBtn.textContent = state.focus.alarmMuted ? "\u{1F507} Silenciado" : "\u{1F514} Sonido activo";
  }
  function triggerExitAlert(reason = "Cambio de pesta\xF1a o ventana") {
    const modal = $("#blockModal");
    if (!modal || !modal.classList.contains("hidden")) return;
    lastExitAlert = Date.now();
    if (T.running) pauseTimer();
    const u = state.user;
    const mins = Math.round(T.duration / 60);
    if ($("#alertReasonBadge")) $("#alertReasonBadge").textContent = "PAUSA CONSCIENTE";
    if ($("#alertUserName")) $("#alertUserName").textContent = (u.name || "estudiante").split(" ")[0];
    if ($("#alertSeedTitleInline")) $("#alertSeedTitleInline").textContent = seed().name;
    if ($("#alertGuardianEmoji")) $("#alertGuardianEmoji").textContent = guardian();
    if ($("#alertHealthySeed")) $("#alertHealthySeed").textContent = seed().stages[2] || "\u{1F331}";
    if ($("#blockMinutesLeft")) $("#blockMinutesLeft").textContent = `${formatTime(T.remaining)} restantes`;
    if ($("#alertReward")) $("#alertReward").textContent = `+${Math.max(10, mins)} XP`;
    if ($("#alertDropsReward")) $("#alertDropsReward").textContent = `+${Math.max(2, Math.round(mins / 5))} \u{1F4A7}`;
    if ($("#alertStreakRisk")) $("#alertStreakRisk").textContent = `\u{1F525} ${u.streak} d\xEDas`;
    if ($("#alertReasonText")) $("#alertReasonText").textContent = reason;
    state.daily.distractions += 1;
    saveState();
    openOverlay(modal);
    Sound.alarm();
    document.title = "\u23F8 En pausa \xB7 SYNCRO";
    if (document.hidden) {
      Notify.send("\u23F8 Pausa consciente \xB7 SYNCRO", "Tu bloque est\xE1 en pausa protegida. Vuelve cuando quieras continuar.", "syncro-shield");
    }
  }
  function requestViewLeave(viewName) {
    pendingView = viewName;
    triggerExitAlert(`Intento de ir a "${viewName.toUpperCase()}" durante el enfoque`);
  }
  function initTimerModule({ onComplete, onSwitchView }) {
    callbacks = { onComplete, onSwitchView };
    $("#startPauseBtn")?.addEventListener("click", () => T.running ? pauseTimer() : startTimer());
    $("#resetBtn")?.addEventListener("click", resetTimer);
    $("#addFiveBtn")?.addEventListener("click", () => {
      T.duration += 5 * 60;
      T.remaining += 5 * 60;
      if (T.running && T.endAt) T.endAt += 5 * 60 * 1e3;
      renderTimer();
      toast("+5 minutos a\xF1adidos al bloque.");
    });
    $("#fsToggle")?.addEventListener("click", () => {
      if (fsEl()) exitFullscreen();
      else enterFullscreen();
    });
    document.addEventListener("fullscreenchange", () => {
      const active = Boolean(fsEl());
      const btn = $("#fsToggle");
      if (btn) btn.setAttribute("aria-pressed", String(active));
      if (!active && T.running && state.focus.shield && state.focus.autoFs) {
        triggerExitAlert("Saliste de pantalla completa durante el enfoque");
      }
    });
    $$('input[name="mode"]').forEach((radio) => {
      radio.checked = radio.value === state.focus.mode;
      radio.addEventListener("change", () => {
        if (T.running) {
          toast("Pausa el bloque actual para cambiar de modo.");
          radio.checked = false;
          const cur = $(`input[name="mode"][value="${state.focus.mode}"]`);
          if (cur) cur.checked = true;
          return;
        }
        state.focus.mode = radio.value;
        saveState();
        updateTimerDuration();
      });
    });
    const autoFs = $("#autoFs");
    if (autoFs) {
      autoFs.checked = Boolean(state.focus.autoFs);
      autoFs.addEventListener("change", () => {
        state.focus.autoFs = autoFs.checked;
        saveState();
      });
    }
    const syncSoundUI = () => {
      const btn = $("#soundToggle");
      if (btn) {
        btn.setAttribute("aria-pressed", String(state.focus.soundOn));
        btn.textContent = state.focus.soundOn ? "\u{1F50A} Sonido activo" : "\u{1F507} Sonido apagado";
      }
      $$("#soundList .sound-item").forEach((b) => b.classList.toggle("active", b.dataset.sound === state.focus.sound));
      const vol = $("#soundVolume");
      const lbl = $("#soundVolLabel");
      if (vol) vol.value = String(state.focus.soundVolume ?? 70);
      if (lbl) lbl.textContent = `${state.focus.soundVolume ?? 70}%`;
      const toneSel = $("#alarmToneSelect");
      const aVol = $("#alarmVolume");
      const aLbl = $("#alarmVolLabel");
      if (toneSel) toneSel.value = state.focus.alarmTone || "chime";
      if (aVol) aVol.value = String(state.focus.alarmVolume ?? 80);
      if (aLbl) aLbl.textContent = `${state.focus.alarmVolume ?? 80}%`;
    };
    $("#soundToggle")?.addEventListener("click", () => {
      state.focus.soundOn = !state.focus.soundOn;
      saveState();
      if (state.focus.soundOn) Sound.play(state.focus.sound);
      else Sound.stop();
      syncSoundUI();
    });
    $$("#soundList .sound-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.focus.sound = btn.dataset.sound;
        saveState();
        if (state.focus.soundOn) Sound.play(state.focus.sound);
        syncSoundUI();
      });
    });
    $("#soundVolume")?.addEventListener("input", (e) => {
      state.focus.soundVolume = Number(e.target.value);
      Sound.setVolume(state.focus.soundVolume);
      saveState();
      syncSoundUI();
    });
    $("#alarmToneSelect")?.addEventListener("change", (e) => {
      state.focus.alarmTone = e.target.value;
      saveState();
    });
    $("#alarmVolume")?.addEventListener("input", (e) => {
      state.focus.alarmVolume = Number(e.target.value);
      saveState();
      syncSoundUI();
    });
    $("#testAlarmBtn")?.addEventListener("click", () => Sound.alarm(state.focus.alarmTone));
    $$("#guidedBreak [data-break]").forEach((chip) => {
      chip.addEventListener("click", () => {
        T.breakKind = chip.dataset.break;
        $$("#guidedBreak [data-break]").forEach((c) => c.classList.toggle("active", c === chip));
      });
    });
    $("#endBreak")?.addEventListener("click", endGuidedBreak);
    $("#toggleShield")?.addEventListener("click", () => {
      state.focus.shield = !state.focus.shield;
      saveState();
      renderShield();
    });
    $("#simulateDistraction")?.addEventListener("click", () => triggerExitAlert("Prueba de pausa consciente (modo desarrollador)"));
    $("#muteAlertSoundBtn")?.addEventListener("click", () => {
      state.focus.alarmMuted = !state.focus.alarmMuted;
      saveState();
      renderShield();
    });
    $("#stayFocused")?.addEventListener("click", () => {
      closeOverlay($("#blockModal"));
      document.title = BASE_TITLE;
      pendingView = null;
      callbacks.onSwitchView("focus", true);
      startTimer();
      toast(`\xA1Seguimos! Tu ${seed().name} contin\xFAa creciendo.`);
    });
    $("#leaveAnyway")?.addEventListener("click", () => {
      closeOverlay($("#blockModal"));
      document.title = BASE_TITLE;
      pauseTimer();
      exitFullscreen();
      const elapsedSec = T.duration - T.remaining;
      const elapsedMin = Math.floor(elapsedSec / 60);
      if (elapsedMin >= 2) {
        const xpGained = Math.round(elapsedMin * 1.5);
        const dropsGained = Math.max(1, Math.round(elapsedMin / 5));
        addXP(xpGained);
        addDrops(dropsGained);
        state.stats.totalMinutes = (state.stats.totalMinutes || 0) + elapsedMin;
        state.stats.minutes = (state.stats.minutes || 0) + elapsedMin;
        state.weekly[dayIdx()] = Math.round(((state.weekly[dayIdx()] || 0) + elapsedMin / 60) * 10) / 10;
        saveState();
        callbacks.onComplete({ mins: elapsedMin, xp: xpGained, drops: dropsGained, ups: 0 });
        toast(`Bloque finalizado sin culpa. Guardamos tus ${elapsedMin} min (+${xpGained} XP, +${dropsGained} \u{1F4A7}).`);
      } else {
        toast("Bloque pausado sin culpa. Respira y vuelve cuando est\xE9s listo.");
      }
      T.remaining = T.duration;
      renderTimer();
      if (pendingView) {
        const dest = pendingView;
        pendingView = null;
        callbacks.onSwitchView(dest, true);
      }
    });
    document.addEventListener("mouseleave", (e) => {
      const sens = state.profile.mouseleaveSensitivity || "normal";
      if (sens === "off") return;
      const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (isTouch || !T.running || !state.focus.shield || fsEl()) return;
      const thresholdY = sens === "strict" ? 40 : 12;
      const triggerByEdge = sens === "strict" ? true : e.clientY <= thresholdY;
      if (triggerByEdge && Date.now() - lastExitAlert > 4e3) {
        triggerExitAlert("Cursor saliendo hacia la barra del navegador");
      }
    });
    document.addEventListener("visibilitychange", () => {
      const isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
      if (isTouch) return;
      if (document.hidden && T.running && state.focus.shield) {
        triggerExitAlert("Cambio de pesta\xF1a o ventana durante el enfoque");
      }
    });
    $("#closeGuestSignupModal")?.addEventListener("click", () => closeOverlay($("#guestSignupModal")));
    syncSoundUI();
    renderShield();
    updateTimerDuration();
  }

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

  // src/modules/biome.js
  var FLORA_FICHAS = [
    { icon: "\u{1F33A}", name: "Cantuta (Cantua buxifolia)", desc: "Flor sagrada de los Andes, s\xEDmbolo de constancia y resiliencia en altura." },
    { icon: "\u{1F332}", name: "Que\xF1ual (Polylepis)", desc: "\xC1rbol nativo altoandino que captura agua de neblina y protege suelos." },
    { icon: "\u{1F33F}", name: "Chachacoma (Escallonia)", desc: "Arbusto arom\xE1tico andino resistente al fr\xEDo extremo." }
  ];
  var FAUNA_FICHAS = [
    { icon: "\u{1F999}", name: "Alpaca", desc: "Tu compa\xF1era inicial de calma y ritmo sostenido." },
    { icon: "\u{1F98C}", name: "Vicu\xF1a", desc: "Se desbloquea al completar 3 bloques de enfoque." },
    { icon: "\u{1F985}", name: "C\xF3ndor andino", desc: "Sobrevuela tu santuario al alcanzar 7 d\xEDas de racha." },
    { icon: "\u{1F43B}", name: "Oso de anteojos", desc: "Guardi\xE1n del bosque nublado; se desbloquea con 4 especies activas." }
  ];
  var STAGES = [
    { at: 0, label: "Semilla", icon: "\u{1F331}" },
    { at: 60, label: "Brote", icon: "\u{1F33F}" },
    { at: 140, label: "Floraci\xF3n", icon: "\u{1F337}" },
    { at: 240, label: "Santuario vivo", icon: "\u{1F33A}" }
  ];
  var growthAnim = null;
  function currentSeason() {
    const m = (/* @__PURE__ */ new Date()).getMonth();
    if (m >= 8 && m <= 10) return { id: "primavera", label: "\u{1F338} Primavera andina" };
    if (m >= 11 || m <= 1) return { id: "verano", label: "\u2600\uFE0F Temporada de lluvias" };
    if (m >= 2 && m <= 4) return { id: "otono", label: "\u{1F342} Oto\xF1o andino" };
    return { id: "invierno", label: "\u2744\uFE0F Temporada seca" };
  }
  function currentWeather() {
    const allDone = state.missions.length > 0 && state.missions.every((m) => m.done);
    const workedToday = state.daily.blocks > 0 || state.missions.some((m) => m.done);
    if (state.user.streak >= 3 && workedToday) return { id: "rainbow", chip: "\u{1F308} Arco\xEDris", caption: "Tu constancia de 3+ d\xEDas ilumina el santuario." };
    if (allDone) return { id: "sunny", chip: "\u2600\uFE0F Soleado", caption: "Completaste tus misiones de hoy. Tu santuario brilla." };
    if (workedToday) return { id: "clear", chip: "\u26C5 Despejando", caption: "Ya avanzaste hoy. Cada bloque nutre el ecosistema." };
    return { id: "cloudy", chip: "\u{1F32B}\uFE0F Niebla suave", caption: "Hoy a\xFAn no avanzas. Un bloque de 5 minutos disipa la niebla sin culpa." };
  }
  function unlockedSpeciesCount() {
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
  function renderBiomeScene(overrideEarth = null) {
    const earth = overrideEarth !== null ? overrideEarth : state.biome.earth || 0;
    const scene = $("#blScene");
    const plantsEl = $("#blPlants");
    const faunaEl = $("#blFauna");
    const weather = currentWeather();
    const season = currentSeason();
    if (scene) {
      scene.dataset.weather = weather.id;
      scene.dataset.season = season.id;
    }
    if ($("#blWeatherChip")) $("#blWeatherChip").textContent = weather.chip;
    if ($("#blSeasonChip")) $("#blSeasonChip").textContent = season.label;
    if ($("#blCaption")) $("#blCaption").textContent = weather.caption;
    if ($("#previewWeather")) $("#previewWeather").textContent = weather.chip;
    if ($("#blCondor")) $("#blCondor").style.opacity = state.user.streak >= 7 ? "1" : "0.12";
    if ($("#condorHint")) {
      $("#condorHint").textContent = state.user.streak >= 7 ? "\xA1Desbloqueado!" : `Te faltan ${Math.max(0, 7 - state.user.streak)} d\xEDas.`;
    }
    if (plantsEl) {
      const s = seed().stages;
      const items = [s[0]];
      if (earth >= 40) items.push(s[1]);
      if (earth >= 100) items.push(s[2]);
      if (earth >= 180) items.push(s[3]);
      if (earth >= 240) items.push("\u{1F333}");
      plantsEl.innerHTML = items.map((ic) => `<span class="bl-plant">${ic}</span>`).join("");
    }
    if (faunaEl) {
      const animals = [guardian()];
      if (state.stats.blocks >= 3 && state.profile.guardian !== "vicuna") animals.push("\u{1F98C}");
      if (unlockedSpeciesCount() >= 4 && state.profile.guardian !== "oso") animals.push("\u{1F43B}");
      faunaEl.innerHTML = animals.map((ic) => `<span class="bl-animal">${ic}</span>`).join("");
    }
    const range = $("#growthRange");
    if (range && overrideEarth === null) range.value = String(Math.min(320, earth));
    if ($("#growthLabel")) $("#growthLabel").textContent = `${earth} puntos Tierra`;
    const stagesEl = $("#blStages");
    if (stagesEl) {
      stagesEl.innerHTML = STAGES.map(
        (st) => `<span class="pill ${earth >= st.at ? "emerald" : ""}">${st.icon} ${st.label}</span>`
      ).join("");
    }
  }
  async function renderBiome({ onAfterWater = () => {
  } } = {}) {
    renderBiomeScene();
    if ($("#biomeDrops")) $("#biomeDrops").textContent = state.biome.drops;
    if ($("#biomeEarth")) $("#biomeEarth").textContent = state.biome.earth;
    if ($("#biomeSpecies")) $("#biomeSpecies").textContent = `${unlockedSpeciesCount()} / 7`;
    if ($("#biomeStreak")) $("#biomeStreak").textContent = state.user.streak;
    const pct = Math.min(100, Math.round((state.biome.earth || 0) / 320 * 100));
    if ($("#biomeFill")) $("#biomeFill").style.width = `${pct}%`;
    const waterBtn = $("#waterBiomeBtn");
    if (waterBtn) waterBtn.disabled = (state.biome.drops || 0) < 20;
    const metrics = await ecoService.fetchImpactMetrics();
    const hours = Math.max(metrics.verifiedHours, state.biome.collectiveHours || 0);
    const goal = metrics.challengeGoalHours || 150;
    if ($("#collectiveText")) $("#collectiveText").textContent = `${hours.toFixed(1)} / ${goal} h`;
    if ($("#collectiveFill")) $("#collectiveFill").style.width = `${Math.min(100, Math.round(hours / goal * 100))}%`;
  }
  function initBiomeModule({ onWatered = () => {
  } } = {}) {
    $("#waterBiomeBtn")?.addEventListener("click", () => {
      if ((state.biome.drops || 0) < 20) {
        toast("Necesitas 20 gotas de riego. Completa bloques o misiones para ganar m\xE1s.");
        return;
      }
      state.biome.drops -= 20;
      state.biome.earth = (state.biome.earth || 0) + 25;
      state.biome.waters = (state.biome.waters || 0) + 1;
      saveState();
      const scene = $("#blScene");
      if (scene) {
        scene.classList.add("watering");
        setTimeout(() => scene.classList.remove("watering"), 1400);
      }
      toast("\u{1F4A7} \xA1Santuario regado! +25 Puntos Tierra.");
      renderBiome();
      onWatered();
    });
    $("#growthRange")?.addEventListener("input", (e) => {
      renderBiomeScene(Number(e.target.value));
    });
    $("#growthPlay")?.addEventListener("click", () => {
      const btn = $("#growthPlay");
      if (growthAnim) {
        clearInterval(growthAnim);
        growthAnim = null;
        if (btn) btn.textContent = "\u25B6 Ver crecimiento";
        renderBiomeScene();
        return;
      }
      let val = 0;
      if (btn) btn.textContent = "\u23F9 Detener";
      growthAnim = setInterval(() => {
        val += 20;
        if (val > 320) {
          clearInterval(growthAnim);
          growthAnim = null;
          if (btn) btn.textContent = "\u25B6 Ver crecimiento";
          renderBiomeScene();
          return;
        }
        renderBiomeScene(val);
      }, 260);
    });
    $("#subtabSantuario")?.addEventListener("click", () => {
      $("#subtabSantuario").classList.add("active");
      $("#subtabSantuario").setAttribute("aria-selected", "true");
      $("#subtabProgreso").classList.remove("active");
      $("#subtabProgreso").setAttribute("aria-selected", "false");
      $("#santuarioSubView")?.classList.remove("hidden");
      $("#progresoSubView")?.classList.add("hidden");
    });
    $("#subtabProgreso")?.addEventListener("click", () => {
      $("#subtabProgreso").classList.add("active");
      $("#subtabProgreso").setAttribute("aria-selected", "true");
      $("#subtabSantuario").classList.remove("active");
      $("#subtabSantuario").setAttribute("aria-selected", "false");
      $("#progresoSubView")?.classList.remove("hidden");
      $("#santuarioSubView")?.classList.add("hidden");
    });
    $$("[data-fichas]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.fichas;
        if (kind === "flora") {
          openInfo(
            "Zona bot\xE1nica andina",
            FLORA_FICHAS.map((f) => `<p><strong>${f.icon} ${f.name}:</strong> ${f.desc}</p>`).join("")
          );
        } else if (kind === "fauna") {
          openInfo(
            "Refugio de fauna local",
            FAUNA_FICHAS.map((f) => `<p><strong>${f.icon} ${f.name}:</strong> ${f.desc}</p>`).join("")
          );
        } else {
          openInfo(
            "Conservaci\xF3n responsable",
            "<p>Cada meta colectiva de horas verificadas se traduce en conservaci\xF3n financiada junto a aliados ambientales como ARBIO Per\xFA. Los comprobantes auditables se publican en el panel de transparencia.</p>"
          );
        }
      });
    });
    $$("[data-transp]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.transp;
        if (k === "arbio") {
          openInfo("Comprobante del Reto", "<p>Al completar las 150 horas colectivas verificadas, publicaremos aqu\xED el certificado auditable emitido por ARBIO Per\xFA.</p>");
        } else if (k === "geo") {
          openInfo("Santuario Virtual", "<p>Tu progreso personal en el Santuario Andino refleja tus h\xE1bitos reales de enfoque y descanso saludable.</p>");
        } else {
          openInfo("Fondo ESG Comercial", "<p>El 10% de las suscripciones SYNCRO Pro y licencias institucionales B2B se destina directamente a proyectos de reforestaci\xF3n verificable.</p>");
        }
      });
    });
  }

  // src/modules/calendar.js
  var DAYS = ["Lun", "Mar", "Mi\xE9", "Jue", "Vie", "S\xE1b", "Dom"];
  var HOURS = [8, 10, 12, 14, 16, 18, 20];
  var selectedMissionId = null;
  var selectedDayIdx = dayIdx();
  var fullWeekMode = false;
  function getLowEnergyHours() {
    const pref = state.profile.schedule;
    if (pref === "manana") return [18, 20];
    if (pref === "tarde") return [8, 20];
    if (pref === "noche") return [8, 10];
    return [14];
  }
  function getPeakHours() {
    const pref = state.profile.schedule;
    if (pref === "manana") return [8, 10];
    if (pref === "tarde") return [14, 16];
    if (pref === "noche") return [18, 20];
    return [10, 16];
  }
  function renderCalTray() {
    const tray = $("#calTray");
    if (!tray) return;
    const openMissions = state.missions.filter((m) => !m.done);
    tray.innerHTML = openMissions.length ? openMissions.map(
      (m) => `
        <button type="button" class="cal-chip ${selectedMissionId === m.id ? "selected" : ""}" draggable="true" data-mid="${m.id}">
          \u{1F3AF} ${esc(m.title)}
        </button>`
    ).join("") : '<span class="muted small">Todas tus misiones de hoy est\xE1n completadas.</span>';
  }
  function renderCalendar() {
    const grid = $("#calGrid");
    const scrollWrap = grid?.closest(".cal-scroll");
    const dayChips = $("#calDayChips");
    if (!grid) return;
    renderCalTray();
    const now = /* @__PURE__ */ new Date();
    const todayIdx = dayIdx();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIdx);
    if (dayChips) {
      dayChips.innerHTML = DAYS.map((d, idx) => {
        const dateNum = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx).getDate();
        const cls = ["cal-day-pill", todayIdx === idx ? "today" : "", selectedDayIdx === idx ? "active" : ""].filter(Boolean).join(" ");
        return `<button type="button" class="${cls}" data-day-idx="${idx}" role="tab" aria-selected="${selectedDayIdx === idx}"><span>${d}</span><strong>${dateNum}</strong></button>`;
      }).join("");
    }
    const lowHours = getLowEnergyHours();
    const peakHours = getPeakHours();
    const isMobileDay = window.innerWidth <= 768 && !fullWeekMode;
    const visibleDays = isMobileDay ? [selectedDayIdx] : [0, 1, 2, 3, 4, 5, 6];
    grid.classList.toggle("mode-day", isMobileDay);
    if (scrollWrap) scrollWrap.classList.toggle("mode-day-active", isMobileDay);
    let html = `<div class="cal-head"></div>${visibleDays.map((d) => {
      const dateNum = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + d).getDate();
      return `<div class="cal-head ${todayIdx === d ? "today" : ""}">${DAYS[d]}<small>${dateNum}</small></div>`;
    }).join("")}`;
    HOURS.forEach((h) => {
      html += `<div class="cal-hour">${String(h).padStart(2, "0")}:00</div>`;
      visibleDays.forEach((d) => {
        const slot = (state.calendar.slots || []).find((s) => s.day === d && s.hour === h);
        const isLow = lowHours.includes(h);
        const isPeak = peakHours.includes(h);
        const cls = ["cal-cell", isLow ? "low" : "", isPeak ? "peak" : "", todayIdx === d ? "today-col" : "", selectedMissionId ? "armed" : "", slot?.done ? "done" : ""].filter(Boolean).join(" ");
        html += `
        <div class="${cls}" data-day="${d}" data-hour="${h}" tabindex="0" role="gridcell">
          ${slot ? `<div class="cal-block ${slot.done ? "done" : ""}"><span class="cb-title">${esc(slot.title)}</span><button type="button" class="cal-rm" data-rm-slot="${d}-${h}" aria-label="Quitar">\xD7</button></div>` : ""}
        </div>`;
      });
    });
    grid.style.gridTemplateColumns = isMobileDay ? "50px 1fr" : `54px repeat(${visibleDays.length}, minmax(84px, 1fr))`;
    grid.innerHTML = html;
    renderHeatmap();
  }
  function renderHeatmap() {
    const grid = $("#heatGrid");
    const totalEl = $("#heatTotal");
    if (!grid) return;
    const cells = [];
    const today = /* @__PURE__ */ new Date();
    let activeDays = 0;
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 864e5);
      const k = keyOf(d);
      const count = state.history[k] || 0;
      if (count > 0) activeDays += 1;
      const icon = count === 0 ? "\xB7" : count === 1 ? "\u{1F331}" : count === 2 ? "\u{1F33F}" : count === 3 ? "\u{1F337}" : "\u{1F33A}";
      cells.push(`<span class="heat-cell lvl-${Math.min(4, count)}" title="${k}: ${count} actividad(es)">${icon}</span>`);
    }
    grid.innerHTML = cells.join("");
    if (totalEl) totalEl.textContent = `${activeDays} d\xEDas activos en las \xFAltimas 12 semanas`;
  }
  function markSlotsDone(missionId) {
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
    toast(`Programado: "${m.title}" el ${DAYS[day]} a las ${String(hour).padStart(2, "0")}:00.`);
  }
  function exportICS() {
    const slots = state.calendar.slots || [];
    if (!slots.length) {
      toast("Programa al menos un bloque en el calendario antes de exportar.");
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const mondayOffset = (now.getDay() + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
    const fmtICS = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const events = slots.map((s, idx) => {
      const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + s.day, s.hour, 0, 0);
      const end = new Date(start.getTime() + 50 * 6e4);
      return [
        "BEGIN:VEVENT",
        `UID:syncro-${idx}-${Date.now()}@syncro.app`,
        `DTSTAMP:${fmtICS(/* @__PURE__ */ new Date())}`,
        `DTSTART:${fmtICS(start)}`,
        `DTEND:${fmtICS(end)}`,
        `SUMMARY:SYNCRO \xB7 ${s.title}`,
        "DESCRIPTION:Bloque de enfoque programado con SYNCRO.",
        "END:VEVENT"
      ].join("\r\n");
    });
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//SYNCRO//Study Calendar//ES", ...events, "END:VCALENDAR"].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `syncro-calendario-${keyOf()}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
    toast("Calendario exportado (.ics).");
  }
  function initCalendarModule() {
    $("#calTray")?.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-mid]");
      if (!chip) return;
      selectedMissionId = selectedMissionId === chip.dataset.mid ? null : chip.dataset.mid;
      renderCalendar();
    });
    $("#calTray")?.addEventListener("dragstart", (e) => {
      const chip = e.target.closest("[data-mid]");
      if (!chip) return;
      e.dataTransfer?.setData("text/plain", chip.dataset.mid);
      selectedMissionId = chip.dataset.mid;
    });
    $("#calGrid")?.addEventListener("dragover", (e) => {
      if (e.target.closest(".cal-cell")) e.preventDefault();
    });
    $("#calGrid")?.addEventListener("drop", (e) => {
      const cell = e.target.closest(".cal-cell");
      if (!cell) return;
      e.preventDefault();
      const mid = e.dataTransfer?.getData("text/plain") || selectedMissionId;
      if (mid) assignSlot(Number(cell.dataset.day), Number(cell.dataset.hour), mid);
    });
    $("#calGrid")?.addEventListener("click", (e) => {
      const rm = e.target.closest("[data-rm-slot]");
      if (rm) {
        const [d, h] = rm.dataset.rmSlot.split("-").map(Number);
        state.calendar.slots = (state.calendar.slots || []).filter((s) => !(s.day === d && s.hour === h));
        saveState();
        renderCalendar();
        return;
      }
      const cell = e.target.closest(".cal-cell");
      if (cell && selectedMissionId) {
        assignSlot(Number(cell.dataset.day), Number(cell.dataset.hour), selectedMissionId);
      }
    });
    $("#calDayChips")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-day-idx]");
      if (!btn) return;
      selectedDayIdx = Number(btn.dataset.dayIdx);
      renderCalendar();
    });
    $("#calPrevDay")?.addEventListener("click", () => {
      selectedDayIdx = (selectedDayIdx + 6) % 7;
      renderCalendar();
    });
    $("#calNextDay")?.addEventListener("click", () => {
      selectedDayIdx = (selectedDayIdx + 1) % 7;
      renderCalendar();
    });
    $("#calToggleMode")?.addEventListener("click", () => {
      fullWeekMode = !fullWeekMode;
      const btn = $("#calToggleMode");
      if (btn) btn.textContent = fullWeekMode ? "\u{1F4C5} Ver d\xEDa" : "\u{1F4C6} Ver semana completa";
      renderCalendar();
    });
    $("#calAutoPlan")?.addEventListener("click", () => {
      const openMissions = state.missions.filter((m) => !m.done);
      if (!openMissions.length) {
        toast("A\xF1ade primero alguna misi\xF3n para planificar tu semana.");
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
      toast("\u2728 Semana planificada en tus horarios de mejor energ\xEDa.");
    });
    let calResizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(calResizeTimer);
      calResizeTimer = setTimeout(() => {
        if ($("#view-calendar")?.classList.contains("active")) renderCalendar();
      }, 120);
    });
    $("#calExportIcs")?.addEventListener("click", exportICS);
    $("#calExportGoogle")?.addEventListener("click", () => {
      const first = (state.calendar.slots || [])[0];
      const title = encodeURIComponent(first ? `SYNCRO \xB7 ${first.title}` : "Bloque de enfoque SYNCRO");
      window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}`, "_blank", "noopener");
    });
  }

  // src/modules/journal.js
  var DB_NAME = "syncro_journal_db";
  var DB_VER = 1;
  var STORE_KEYS = "keys";
  var STORE_NOTES = "notes";
  var dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_KEYS)) db.createObjectStore(STORE_KEYS);
        if (!db.objectStoreNames.contains(STORE_NOTES)) db.createObjectStore(STORE_NOTES, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  async function getCryptoKey() {
    const db = await openDB();
    const existing = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYS, "readonly");
      const req = tx.objectStore(STORE_KEYS).get("master");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_KEYS, "readwrite");
      tx.objectStore(STORE_KEYS).put(key, "master");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return key;
  }
  var Journal = {
    ok() {
      return typeof indexedDB !== "undefined" && Boolean(crypto?.subtle);
    },
    async add({ text, energy, mood }) {
      if (!this.ok() || !text?.trim()) return null;
      const key = await getCryptoKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text.trim()));
      const record = {
        id: "j_" + Date.now().toString(36),
        ts: Date.now(),
        date: keyOf(),
        energy: Number(energy || 5),
        mood: mood || "tranquilo",
        iv: Array.from(iv),
        ct: Array.from(new Uint8Array(ct))
      };
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTES, "readwrite");
        tx.objectStore(STORE_NOTES).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      return record;
    },
    async all() {
      if (!this.ok()) return [];
      const db = await openDB();
      const key = await getCryptoKey();
      const raw = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTES, "readonly");
        const req = tx.objectStore(STORE_NOTES).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      const out = [];
      for (const r of raw.sort((a, b) => b.ts - a.ts)) {
        try {
          const pt = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(r.iv) },
            key,
            new Uint8Array(r.ct)
          );
          out.push({ ...r, text: new TextDecoder().decode(pt) });
        } catch {
        }
      }
      return out;
    },
    async clear() {
      if (!this.ok()) return;
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NOTES, "readwrite");
        tx.objectStore(STORE_NOTES).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  };
  async function renderJournalTimeline() {
    const spark = $("#moodSpark");
    const insightsEl = $("#journalInsights");
    const listEl = $("#journalList");
    if (!spark || !listEl) return;
    const logs = (state.moodLogs || []).slice(-14);
    spark.innerHTML = logs.length ? logs.map(
      (l) => `<span class="spark-bar" style="height:${Math.max(14, l.energy * 10)}%" title="${esc(l.date)} \xB7 Energ\xEDa ${l.energy}/10 (${esc(l.mood || "")})"></span>`
    ).join("") : '<p class="muted small">Completa tu primer check-in para ver tu curva emocional aqu\xED.</p>';
    let entries = [];
    if (Journal.ok()) {
      try {
        entries = await Journal.all();
      } catch {
        entries = [];
      }
    }
    if (insightsEl) {
      const analysis = aiService.analyzeJournalPatterns(entries, {
        optIn: Boolean(state.profile.journalAiOptIn)
      });
      insightsEl.innerHTML = `<p class="muted small" style="margin:8px 0;">${analysis.optInRequired ? "\u{1F512} " : "\u2728 "}${esc(analysis.summary)}</p>`;
    }
    listEl.innerHTML = entries.length ? entries.slice(0, 12).map(
      (e) => `
          <li class="mood-item">
            <div class="mood-item-head">
              <strong>${esc(e.date)}</strong>
              <span class="pill">${esc(e.mood || "check-in")} \xB7 ${e.energy}/10</span>
            </div>
            <p>${esc(e.text)}</p>
          </li>`
    ).join("") : '<li class="muted small">A\xFAn no hay notas guardadas en tu diario cifrado.</li>';
  }

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
    const fab = el("button", {
      type: "button",
      class: "sbot-fab",
      "aria-label": `Abrir chat con ${cfg.botName}`,
      "aria-expanded": "false",
      "aria-controls": "sbotPanel"
    });
    fab.append(el("span", { class: "sbot-fab-ico", "aria-hidden": "true" }, cfg.botAvatar));
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
    root.append(fab, panel);
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
      root.classList.add("is-open");
      fab.setAttribute("aria-expanded", "true");
      input.focus();
      log.scrollTop = log.scrollHeight;
    }
    function close() {
      panel.hidden = true;
      root.classList.remove("is-open");
      fab.setAttribute("aria-expanded", "false");
      fab.focus();
    }
    fab.addEventListener("click", () => panel.hidden ? open() : close());
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

  // src/main.js
  var ROLE_LABEL = {
    universitario: "Estudiante universitario",
    remoto: "Trabajador remoto",
    emprendedor: "Emprendedor/a",
    opositor: "Preparando un examen",
    mayor: "Aprendiendo a mi ritmo",
    otro: "Otro"
  };
  var BREAKDOWN_TEMPLATES = {
    estudio: ["Revisar temario y subrayar conceptos clave", "Resumir ideas principales en 1 p\xE1gina", "Resolver 5 ejercicios pr\xE1cticos sin apuntes", "Repasar errores con t\xE9cnica activa"],
    tesis: ["Definir esquema de subt\xEDtulos (sin redactar a\xFAn)", "Reunir 3 fuentes acad\xE9micas verificadas", "Escribir primer borrador imperfecto de 200 palabras", "Revisar citas y coherencia final"],
    tecnico: ["Definir requisitos m\xEDnimos y casos borde", "Crear estructura base del m\xF3dulo", "Implementar versi\xF3n funcional m\xEDnima", "Probar y refactorizar detalles"],
    remoto: ["Listar entregables cr\xEDticos de hoy", "Bloquear 25 min sin Slack ni correo para avance central", "Enviar avance parcial para feedback temprano", "Cerrar pendientes menores y documentar"]
  };
  function switchView(view, force = false) {
    if (T.running && state.focus.shield && view !== "focus" && !force) {
      requestViewLeave(view);
      return;
    }
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${view}`));
    $$(".nav-item, .bn-item").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    if (view === "biome") {
      renderBiome();
      renderProgress();
    }
    if (view === "calendar") renderCalendar();
    if (view === "profile") renderProfile();
  }
  function renderDashboard() {
    const u = state.user;
    const h = (/* @__PURE__ */ new Date()).getHours();
    const sal = h < 12 ? "\xA1Buenos d\xEDas" : h < 19 ? "\xA1Buenas tardes" : "\xA1Buenas noches";
    const first = (u.name || "").split(" ")[0];
    if ($("#greeting")) $("#greeting").textContent = first ? `${sal}, ${first}!` : `${sal}!`;
    if ($("#sidebarName")) $("#sidebarName").textContent = u.name || "Invitado";
    if ($("#sidebarLevel")) $("#sidebarLevel").textContent = `Nivel ${u.level}`;
    if ($("#sidebarAvatar")) $("#sidebarAvatar").textContent = (u.name || "\u{1F331}").charAt(0).toUpperCase();
    if ($("#sidebarGuardianMini")) $("#sidebarGuardianMini").textContent = guardian();
    if ($("#dashDrops")) $("#dashDrops").textContent = state.biome.drops;
    if ($("#dropsCount")) $("#dropsCount").textContent = state.biome.drops;
    if ($("#earthCount")) $("#earthCount").textContent = state.biome.earth;
    if ($("#streakDays")) $("#streakDays").textContent = u.streak;
    if ($("#shieldsCount")) $("#shieldsCount").textContent = u.shields;
    if ($("#levelTag")) $("#levelTag").textContent = `Nivel ${u.level} \xB7 ${levelTitle(u.level)}`;
    if ($("#xpText")) $("#xpText").textContent = `${u.xp} / 300 XP`;
    if ($("#xpFill")) $("#xpFill").style.width = `${Math.min(100, Math.round(u.xp / 300 * 100))}%`;
    const schedTip = $("#scheduleTip");
    if (schedTip) {
      const map = {
        manana: "\u{1F305} Tu mejor energ\xEDa suele estar en la ma\xF1ana. Protege tu primer bloque.",
        tarde: "\u2600\uFE0F Tu pico cognitivo est\xE1 en la tarde. Reserva ah\xED tu misi\xF3n principal.",
        noche: "\u{1F319} Te concentras mejor de noche. Usa pausas 20-20-20 para cuidar tu vista."
      };
      schedTip.textContent = map[state.profile.schedule] || "";
    }
    if ($("#previewFlower")) $("#previewFlower").textContent = seed().stages[3];
    if ($("#previewGuardian")) $("#previewGuardian").textContent = guardian();
    const inst = resolveActiveInstitution();
    const wbHeading = $("#wellbeingHeading");
    if (wbHeading) wbHeading.textContent = inst.wellbeingLabel;
    const wbBadge = $("#institutionBadge");
    if (wbBadge) {
      if (inst.name) {
        wbBadge.textContent = `\u{1F3DB}\uFE0F Convenio: ${inst.name}`;
        wbBadge.classList.remove("hidden");
      } else {
        wbBadge.classList.add("hidden");
      }
    }
  }
  function renderActiveMission() {
    const m = state.missions.find((x) => x.id === state.focus.activeMission && !x.done);
    const lbl = $("#activeMissionLabel");
    if (lbl) {
      lbl.textContent = m ? `\u{1F3AF} Misi\xF3n activa: ${m.title}` : "Sin misi\xF3n vinculada: el bloque suma XP igual.";
    }
  }
  function renderMissions() {
    const list = $("#missionsList");
    if (!list) return;
    const dur = state.checkIn.lowEnergy ? "15 min (adaptado)" : "25 min";
    list.innerHTML = state.missions.map(
      (m) => `
      <div class="mission ${m.done ? "done" : ""}" data-id="${m.id}">
        <button type="button" class="mission-check" aria-label="Completar: ${esc(m.title)}" aria-pressed="${m.done}">\u2713</button>
        <div class="mission-info">
          <div class="mission-title">${esc(m.title)}</div>
          <div class="mission-meta">
            <span class="pill violet">+${m.xp} XP</span>
            <span class="pill emerald">+${m.drops} Gotas</span>
            <span class="pill">${m.target > 1 ? `${m.progress}/${m.target} bloques` : dur}</span>
          </div>
        </div>
        <div class="mission-actions">
          <button type="button" class="btn ghost sm" data-start="${m.id}" ${m.done ? "disabled" : ""}>${state.focus.activeMission === m.id ? "Activa" : "Iniciar"}</button>
          <button type="button" class="icon-btn mission-edit" data-edit="${m.id}" title="Editar misi\xF3n" aria-label="Editar: ${esc(m.title)}">\u270E</button>
          <button type="button" class="icon-btn mission-del" data-del="${m.id}" title="Eliminar misi\xF3n" aria-label="Eliminar: ${esc(m.title)}">\u2715</button>
        </div>
      </div>`
    ).join("") || '<p class="muted small" style="margin:4px 2px">No tienes misiones hoy. A\xF1ade una abajo o usa el desglosador guiado.</p>';
    const count = $("#missionsCount");
    if (count) count.textContent = `${state.missions.filter((m) => m.done).length} / ${state.missions.length}`;
    renderActiveMission();
  }
  function editMission(id) {
    const m = state.missions.find((x) => x.id === id);
    if (!m) return;
    openInfo(
      "Editar misi\xF3n",
      `<label class="field-label" for="missionEditInput">Nombre de la misi\xF3n</label>
     <input class="input" id="missionEditInput" maxlength="80" value="${esc(m.title)}" />`,
      "Guardar",
      () => {
        const title = $("#missionEditInput")?.value.trim();
        if (!title) {
          toast("La misi\xF3n necesita un nombre.");
          return false;
        }
        m.title = title;
        (state.calendar.slots || []).forEach((s) => {
          if (s.missionId === id) s.title = title;
        });
        saveState();
        renderMissions();
        renderCalTray();
        if ($("#view-calendar")?.classList.contains("active")) renderCalendar();
        toast("Misi\xF3n actualizada.");
      }
    );
    requestAnimationFrame(() => {
      const inp = $("#missionEditInput");
      if (inp) {
        inp.focus();
        inp.select();
        inp.addEventListener("keydown", (ev) => {
          if (ev.key === "Enter") {
            ev.preventDefault();
            $("#closeInfo")?.click();
          }
        });
      }
    });
  }
  function deleteMission(id) {
    const m = state.missions.find((x) => x.id === id);
    if (!m) return;
    if (T.running && state.focus.activeMission === id) {
      toast("Esta misi\xF3n est\xE1 vinculada a un bloque en curso. Pausa el bloque para eliminarla.");
      return;
    }
    state.missions = state.missions.filter((x) => x.id !== id);
    state.calendar.slots = (state.calendar.slots || []).filter((s) => s.missionId !== id);
    if (state.focus.activeMission === id) state.focus.activeMission = null;
    saveState();
    renderMissions();
    renderCalTray();
    renderDashboard();
    if ($("#view-calendar")?.classList.contains("active")) renderCalendar();
    toast("Misi\xF3n eliminada.");
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
      "\xA1Misi\xF3n completada!",
      `+${m.xp} XP \xB7 +${m.drops} Gotas de riego${ups ? ` \xB7 \xA1Nivel ${state.user.level}!` : ""}`
    );
  }
  function initCheckIn() {
    const range = $("#energyRange");
    const valEl = $("#energyValue");
    if (range) {
      range.value = String(state.checkIn.energy || 5);
      if (valEl) valEl.textContent = String(state.checkIn.energy || 5);
      range.addEventListener("input", (e) => {
        state.checkIn.energy = Number(e.target.value);
        if (valEl) valEl.textContent = String(state.checkIn.energy);
      });
    }
    $$("#moodChips .chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.mood === state.checkIn.mood);
      chip.addEventListener("click", () => {
        state.checkIn.mood = chip.dataset.mood;
        $$("#moodChips .chip").forEach((c) => c.classList.toggle("active", c === chip));
      });
    });
    $("#saveCheckIn")?.addEventListener("click", async () => {
      const energy = Number($("#energyRange")?.value || 5);
      const mood = state.checkIn.mood || "tranquilo";
      const note = ($("#journalText")?.value || "").trim();
      const lowEnergy = energy <= 4 || mood === "agobiado" || mood === "cansado";
      state.checkIn = { energy, mood, lowEnergy, date: keyOf() };
      state.stats.checkIns = (state.stats.checkIns || 0) + 1;
      state.moodLogs = (state.moodLogs || []).concat({ date: keyOf(), energy, mood }).slice(-30);
      if (note && Journal.ok()) {
        try {
          await Journal.add({ text: note, energy, mood });
          if ($("#journalText")) $("#journalText").value = "";
          state.achievements.journal_1 = state.achievements.journal_1 || Date.now();
        } catch {
        }
      }
      const m1 = state.missions.find((m) => m.id === "m1" && !m.done);
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
      analyticsService.trackOnce("first_checkin", { energy, mood, low_energy: lowEnergy });
      analyticsService.track("checkin_saved", { energy, mood, low_energy: lowEnergy });
      const banner = $("#checkInBanner");
      if (banner) {
        banner.classList.remove("hidden");
        banner.textContent = lowEnergy ? "\u{1F33F} Modo ligero activado: ajustamos tus bloques a 15 min y priorizamos micro-pasos sin culpa." : "\u2728 Check-in guardado. Tu espacio est\xE1 calibrado para tu nivel de energ\xEDa actual.";
      }
      toast("Check-in guardado \u2713");
    });
  }
  function initBreakdownAndPlan() {
    const updateIllusion = () => {
      const est = Math.max(1, Number($("#estHours")?.value || 10));
      const real = Math.max(0, Number($("#realHours")?.value || 6));
      const pct = Math.min(100, Math.round(real / est * 100));
      if ($("#illusionFill")) $("#illusionFill").style.width = `${pct}%`;
      if ($("#illusionPill")) {
        $("#illusionPill").textContent = pct < 60 ? "Ilusi\xF3n de tiempo alta" : pct < 85 ? "Estimaci\xF3n moderada" : "Estimaci\xF3n realista";
      }
      if ($("#illusionText")) {
        $("#illusionText").textContent = `Crees tener ${est} h, pero realmente tienes ${real} h (${pct}%). Planifica con ${real} h.`;
      }
    };
    $("#estHours")?.addEventListener("input", updateIllusion);
    $("#realHours")?.addEventListener("input", updateIllusion);
    updateIllusion();
    $("#openBreakdownBtn")?.addEventListener("click", () => openOverlay($("#breakdownModal")));
    $("#closeBreakdownModal")?.addEventListener("click", () => closeOverlay($("#breakdownModal")));
    $("#cancelBreakdownModal")?.addEventListener("click", () => closeOverlay($("#breakdownModal")));
    $("#applyBreakdownBtn")?.addEventListener("click", async () => {
      const title = ($("#bdTaskTitle")?.value || "").trim();
      if (!title) {
        toast("Escribe el nombre de la tarea grande.");
        $("#bdTaskTitle")?.focus();
        return;
      }
      const tplKey = $('input[name="bdTemplate"]:checked')?.value || "estudio";
      const res = await aiService.breakdownTask({ task: title, days: 7, lowEnergy: state.checkIn.lowEnergy });
      if (res.quotaExceeded) {
        toast(res.message);
        return;
      }
      const steps = res.source === "edge-ai" ? res.steps.map((s) => s.title) : (BREAKDOWN_TEMPLATES[tplKey] || BREAKDOWN_TEMPLATES.estudio).map((s) => `${s} \xB7 ${title}`);
      steps.slice(0, 3).forEach((stTitle, idx) => {
        state.missions.push({
          id: "bd_" + Date.now().toString(36) + idx,
          title: stTitle.slice(0, 80),
          xp: 25,
          drops: 6,
          target: 1,
          progress: 0,
          done: false
        });
      });
      if ($("#bdTaskTitle")) $("#bdTaskTitle").value = "";
      saveState();
      renderMissions();
      renderCalTray();
      closeOverlay($("#breakdownModal"));
      toast(`\u2728 A\xF1adimos ${Math.min(3, steps.length)} micro-pasos a tus misiones de hoy.`);
    });
    $("#breakdownBtn")?.addEventListener("click", async () => {
      const task = ($("#taskInput")?.value || "").trim();
      const days = Math.max(1, Number($("#dateInput")?.value || 10));
      if (!task) {
        toast("Describe la tarea que deseas desglosar.");
        return;
      }
      const res = await aiService.breakdownTask({ task, days, lowEnergy: state.checkIn.lowEnergy });
      if (res.quotaExceeded) {
        toast(res.message);
        return;
      }
      state.plan.steps = res.steps;
      saveState();
      const list = $("#subtasksList");
      if (list) {
        list.innerHTML = res.steps.map((s, i) => `<div class="subtask-row"><span>D\xEDa ${s.day}: ${esc(s.title)}</span><button type="button" class="btn ghost sm" data-add-step="${i}">+ Hoy</button></div>`).join("");
      }
    });
    $("#subtasksList")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-add-step]");
      if (!btn) return;
      const step = state.plan.steps[Number(btn.dataset.addStep)];
      if (!step) return;
      state.missions.push({ id: "sp_" + Date.now().toString(36), title: step.title.slice(0, 80), xp: 25, drops: 6, target: 1, progress: 0, done: false });
      saveState();
      renderMissions();
      toast("Paso a\xF1adido a Misiones de hoy.");
    });
    $("#mentalDumpBtn")?.addEventListener("click", async () => {
      const txt = ($("#mentalDump")?.value || "").trim();
      const reply = await aiService.validateMentalDump(txt);
      const box = $("#mentalDumpReply");
      if (box) {
        box.classList.remove("hidden");
        box.textContent = reply;
      }
    });
  }
  function checkAchievements() {
    const unlock = (id) => {
      if (!state.achievements[id]) state.achievements[id] = Date.now();
    };
    if (state.stats.blocks >= 1) unlock("first_block");
    if (state.stats.checkIns >= 1) unlock("first_checkin");
    if (state.stats.noPerfBlocks >= 1) unlock("no_perf");
    if (state.stats.blocks >= 3) unlock("blocks_3");
    if (state.user.streak >= 3) unlock("streak_3");
    if (state.user.streak >= 7) unlock("streak_7");
    if (unlockedSpeciesCount() >= 4) unlock("species_4");
    if ((state.biome.waters || 0) >= 3) unlock("water_3");
    saveState();
  }
  function renderProgress() {
    const chart = $("#weeklyChart");
    const totalEl = $("#weeklyTotal");
    if (chart) {
      const max = Math.max(1, ...state.weekly || [0]);
      chart.innerHTML = (state.weekly || [0, 0, 0, 0, 0, 0, 0]).map((h) => `<div class="chart-bar-wrap"><div class="chart-bar" style="height:${Math.max(8, Math.round(h / max * 100))}%" title="${h} h"></div></div>`).join("");
      const total = (state.weekly || []).reduce((a, b) => a + b, 0);
      if (totalEl) totalEl.textContent = `${total.toFixed(1)} h esta semana`;
    }
    const achList = $("#achList");
    const achCount = $("#achCount");
    if (achList) {
      const unlocked = ACHIEVEMENTS.filter((a) => achUnlocked(a.id)).length;
      if (achCount) achCount.textContent = `${unlocked} / ${ACHIEVEMENTS.length}`;
      achList.innerHTML = ACHIEVEMENTS.map(
        (a) => `
      <div class="ach-item ${achUnlocked(a.id) ? "unlocked" : "locked"}">
        <span class="ach-ico">${a.icon}</span>
        <div>
          <strong>${esc(a.name)}</strong>
          <p class="muted small">${esc(a.desc)}</p>
        </div>
      </div>`
      ).join("");
    }
    renderJournalTimeline();
  }
  function syncNotifUI() {
    const granted = Notify.supported() && Notification.permission === "granted" && state.profile.notifications;
    const t1 = $("#notifToggle");
    const t2 = $("#pfNotif");
    if (t1) t1.checked = granted;
    if (t2) t2.checked = granted;
  }
  function renderProfile() {
    const u = state.user;
    const p = state.profile;
    const ses = authService.getSession() || {};
    if ($("#pfAvatar")) $("#pfAvatar").textContent = (u.name || "\u{1F331}").charAt(0).toUpperCase();
    if ($("#pfGuardian")) $("#pfGuardian").textContent = guardian();
    if ($("#pfName")) $("#pfName").textContent = u.name || "Estudiante";
    if ($("#pfHandle")) $("#pfHandle").textContent = ses.username ? `@${ses.username} \xB7 ${ses.email}` : ses.email || "Modo prueba local";
    if ($("#pfMeta")) {
      $("#pfMeta").textContent = [ROLE_LABEL[p.role], p.ageRange && `${p.ageRange} a\xF1os`, p.institution].filter(Boolean).join(" \xB7 ") || "Completa tu perfil para personalizar SYNCRO.";
    }
    if ($("#pfLevel")) $("#pfLevel").textContent = `Nivel ${u.level} \xB7 ${levelTitle(u.level)}`;
    if ($("#pfStreak")) $("#pfStreak").textContent = `\u{1F525} ${u.streak} d\xEDas`;
    if ($("#pfAch")) $("#pfAch").textContent = `\u{1F3C5} ${ACHIEVEMENTS.filter((a) => achUnlocked(a.id)).length}/${ACHIEVEMENTS.length} logros`;
    if ($("#pfBlocks")) $("#pfBlocks").textContent = state.stats.blocks;
    if ($("#pfHours")) $("#pfHours").textContent = (state.stats.minutes / 60).toFixed(1);
    if ($("#pfBest")) $("#pfBest").textContent = bestStreak();
    if ($("#pfDrops")) $("#pfDrops").textContent = (state.stats.dropsEarned || 0).toLocaleString("es-PE");
    if ($("#pfNameInput")) $("#pfNameInput").value = u.name || "";
    if ($("#pfUserInput")) $("#pfUserInput").value = ses.username || "";
    if ($("#pfEmailInput")) $("#pfEmailInput").value = ses.email || "";
    if ($("#pfRole")) $("#pfRole").value = p.role || "";
    if ($("#pfAge")) $("#pfAge").value = p.ageRange || "";
    if ($("#pfInstitution")) $("#pfInstitution").value = p.institution || "";
    if ($("#pfGoal")) $("#pfGoal").value = p.goal || "";
    if ($("#pfTrigger")) $("#pfTrigger").value = p.trigger || "";
    if ($("#pfSchedule")) $("#pfSchedule").value = p.schedule || "";
    if ($("#pfBlock")) $("#pfBlock").value = p.blockPref || "classic";
    if ($("#pfSeed")) $("#pfSeed").value = p.seed || "cantuta";
    if ($("#pfMouseLeave")) $("#pfMouseLeave").value = p.mouseleaveSensitivity || "normal";
    if ($("#pfBienestar")) $("#pfBienestar").checked = Boolean(p.bienestarConsent);
    if ($("#pfJournalAiOptIn")) $("#pfJournalAiOptIn").checked = Boolean(p.journalAiOptIn);
    if ($("#pfReminder")) $("#pfReminder").checked = p.reminder !== false;
    const gSel = $("#pfGuardianSel");
    if (gSel) {
      gSel.innerHTML = Object.keys(GUARDIANS).map((k) => {
        const lock = guardianLocked(k);
        const need = lock ? ACHIEVEMENTS.find((a) => a.id === GUARDIAN_LOCK[k])?.name || "" : "";
        return `<option value="${k}" ${lock ? "disabled" : ""}>${GUARDIANS[k]} ${GUARDIAN_NAMES[k]}${lock ? ` \xB7 \u{1F512} logro \u201C${need}\u201D` : ""}</option>`;
      }).join("");
      gSel.value = p.guardian || "alpaca";
    }
    const accInfo = $("#accountInfo");
    if (accInfo) {
      const planLbl = ses.plan === "pro" ? "SYNCRO Pro" : ses.plan === "b2b" ? "Licencia Institucional" : "Plan Gratis (Esencial)";
      accInfo.textContent = ses.mode === "guest" ? "Sesi\xF3n en modo prueba (almacenamiento local)" : `${ses.email || "Cuenta activa"} \xB7 ${planLbl}`;
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
      state.profile.notifications = perm === "granted";
      saveState();
      syncNotifUI();
      toast(perm === "granted" ? "\u{1F514} Notificaciones activadas." : "Tu navegador bloque\xF3 las notificaciones.");
    };
    $("#notifToggle")?.addEventListener("change", (e) => toggleNotif(e.target.checked));
    $("#pfNotif")?.addEventListener("change", (e) => toggleNotif(e.target.checked));
    $("#profileForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const p = state.profile;
      const name = ($("#pfNameInput")?.value || "").trim();
      if (!name) {
        $("#pfNameInput")?.focus();
        toast("Escribe tu nombre.");
        return;
      }
      const oldBlock = p.blockPref;
      const goal = ($("#pfGoal")?.value || "").trim();
      state.user.name = name;
      Object.assign(p, {
        role: $("#pfRole")?.value || null,
        ageRange: $("#pfAge")?.value || "",
        institution: ($("#pfInstitution")?.value || "").trim(),
        goal,
        trigger: $("#pfTrigger")?.value || null,
        schedule: $("#pfSchedule")?.value || null,
        blockPref: $("#pfBlock")?.value || "classic",
        seed: $("#pfSeed")?.value || "cantuta",
        guardian: guardianLocked($("#pfGuardianSel")?.value) ? p.guardian : $("#pfGuardianSel")?.value || "alpaca",
        mouseleaveSensitivity: $("#pfMouseLeave")?.value || "normal",
        bienestarConsent: Boolean($("#pfBienestar")?.checked),
        journalAiOptIn: Boolean($("#pfJournalAiOptIn")?.checked),
        reminder: Boolean($("#pfReminder")?.checked)
      });
      if (p.blockPref !== oldBlock && !T.running) {
        state.focus.mode = p.blockPref;
        $$('input[name="mode"]').forEach((r) => r.checked = r.value === p.blockPref);
        updateTimerDuration();
      }
      const gm = state.missions.find((m) => m.id === "goal");
      if (goal && gm) gm.title = `Dar el primer paso en: ${goal}`;
      else if (goal) {
        state.missions.unshift({
          id: "goal",
          base: true,
          title: `Dar el primer paso en: ${goal}`,
          xp: 40,
          drops: 10,
          target: 1,
          progress: 0,
          done: false
        });
      } else if (gm && !gm.done) {
        state.missions = state.missions.filter((m) => m.id !== "goal");
      }
      saveState();
      renderDashboard();
      renderMissions();
      renderProfile();
      renderCalTray();
      renderJournalTimeline();
      const savedMsg = $("#pfSaved");
      if (savedMsg) {
        savedMsg.textContent = "Cambios guardados \u2713";
        setTimeout(() => savedMsg.textContent = "", 2500);
      }
    });
    $("#pfExport")?.addEventListener("click", async () => {
      const ses = authService.getSession() || {};
      let journal = [];
      if (Journal.ok()) {
        try {
          journal = (await Journal.all()).map(({ iv, ct, ...rest }) => rest);
        } catch {
        }
      }
      const payload = JSON.stringify(
        {
          exportadoEl: (/* @__PURE__ */ new Date()).toISOString(),
          cuenta: { nombre: ses.name, usuario: ses.username, correo: ses.email, proveedor: ses.provider },
          estado: state,
          diario: journal
        },
        null,
        2
      );
      const blob = new Blob([payload], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `syncro-mis-datos-${keyOf()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1e3);
      toast("Tus datos se descargaron como JSON.");
    });
    let pendingRestore = null;
    $("#pfImportBtn")?.addEventListener("click", () => $("#pfImportInput")?.click());
    $("#pfImportInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(String(ev.target?.result || "{}"));
          const candidate = parsed.estado || parsed.state || (parsed.user && parsed.focus ? parsed : null);
          if (!candidate) {
            toast("El archivo no parece ser un respaldo v\xE1lido de SYNCRO.");
            return;
          }
          pendingRestore = candidate;
          if ($("#rstUserName")) $("#rstUserName").textContent = candidate.user?.name || "Usuario";
          if ($("#rstUserLevel")) $("#rstUserLevel").textContent = `Nivel ${candidate.user?.level || 1} \xB7 \u{1F525} ${candidate.user?.streak || 0} d\xEDas`;
          if ($("#rstBlocks")) $("#rstBlocks").textContent = String(candidate.stats?.blocks || 0);
          if ($("#rstDate")) $("#rstDate").textContent = parsed.exportadoEl ? new Date(parsed.exportadoEl).toLocaleDateString("es-PE") : "Reciente";
          openOverlay($("#restoreConfirmModal"));
        } catch {
          toast("Error al leer el archivo JSON.");
        } finally {
          e.target.value = "";
        }
      };
      reader.readAsText(file);
    });
    $("#cancelRestoreBtn")?.addEventListener("click", () => {
      pendingRestore = null;
      closeOverlay($("#restoreConfirmModal"));
    });
    $("#confirmRestoreBtn")?.addEventListener("click", () => {
      if (!pendingRestore) return;
      replaceState(pendingRestore);
      pendingRestore = null;
      closeOverlay($("#restoreConfirmModal"));
      renderDashboard();
      renderMissions();
      renderProfile();
      renderBiome();
      toast("Copia de seguridad restaurada \u2713");
    });
    $("#pfClearJournal")?.addEventListener("click", () => {
      openInfo(
        "Borrar diario emocional",
        "<p>Esta acci\xF3n eliminar\xE1 permanentemente todas las notas cifradas de tu diario en este dispositivo.</p>",
        "S\xED, borrar diario",
        async () => {
          await Journal.clear();
          renderJournalTimeline();
          toast("Tu diario emocional fue borrado.");
        }
      );
    });
    $("#pfDeleteAccount")?.addEventListener("click", () => {
      openInfo(
        "Eliminar cuenta y todos tus datos",
        "<p>Se eliminar\xE1n permanentemente tu progreso, misiones, diario cifrado y cuenta local/remota (derecho al olvido). Esta acci\xF3n no se puede deshacer.</p>",
        "Eliminar todo",
        async () => {
          await Journal.clear();
          await dbService.deleteAccountData();
          authService.deleteLocalAccount();
          location.href = "index.html";
        }
      );
    });
    $("#bienestarBtn")?.addEventListener("click", () => {
      const inst = resolveActiveInstitution();
      openInfo(
        inst.wellbeingLabel,
        `<p>Si atraviesas d\xEDas de sobrecarga sostenida, pedir apoyo es un acto de cuidado. Puedes contactar a un profesional de salud mental o a la l\xEDnea de orientaci\xF3n gratuita de tu pa\xEDs.</p>
       <p class="muted small">SYNCRO es una herramienta de productividad y regulaci\xF3n cotidiana; no reemplaza atenci\xF3n psicol\xF3gica profesional.</p>`
      );
    });
  }
  function initOnboarding() {
    const modal = $("#onboarding");
    if (!modal) return;
    const completeOnboarding = (directFive = false) => {
      const name = ($("#nameInput")?.value || "").trim();
      const sched = $('input[name="schedule"]:checked')?.value || "manana";
      const blockPref = directFive ? "noPerfection" : $('input[name="blockPref"]:checked')?.value || "classic";
      if (name) state.user.name = name;
      state.profile.schedule = sched;
      state.profile.blockPref = blockPref;
      state.focus.mode = blockPref;
      state.user.onboarded = true;
      saveState();
      $$('input[name="mode"]').forEach((r) => r.checked = r.value === blockPref);
      updateTimerDuration();
      closeOverlay(modal);
      renderDashboard();
      analyticsService.trackOnce("onboarding_completed", { direct_five: directFive, block_pref: blockPref });
      if (directFive) {
        switchView("focus", true);
        startTimer();
        toast("\u2728 Modo Avance sin Perfecci\xF3n iniciado (5 min).");
      }
    };
    $("#finishOnboarding")?.addEventListener("click", () => completeOnboarding(false));
    $("#onbDirectStartBtn")?.addEventListener("click", () => completeOnboarding(true));
    if (!state.user.onboarded) {
      if ($("#nameInput") && state.user.name) $("#nameInput").value = state.user.name;
      openOverlay(modal);
    }
  }
  function checkRescueModal() {
    if (!state.user.lastActive) return;
    const last = /* @__PURE__ */ new Date(state.user.lastActive + "T12:00:00");
    const diffDays = Math.floor((Date.now() - last.getTime()) / 864e5);
    if (diffDays >= 3) {
      if ($("#rescueGuardian")) $("#rescueGuardian").textContent = guardian();
      if ($("#rescueSub")) $("#rescueSub").textContent = `Han pasado ${diffDays} d\xEDas. Sin culpa: tu progreso sigue intacto.`;
      openOverlay($("#rescueModal"));
    }
    $("#rescueGo")?.addEventListener("click", () => {
      closeOverlay($("#rescueModal"));
      state.focus.mode = "noPerfection";
      updateTimerDuration();
      switchView("focus", true);
      startTimer();
    });
    $("#rescueLook")?.addEventListener("click", () => {
      closeOverlay($("#rescueModal"));
      switchView("biome", true);
    });
  }
  function bootstrap() {
    initModals();
    const splash = $("#appSplash");
    if (splash) {
      setTimeout(() => {
        splash.classList.add("done");
        splash.style.display = "none";
      }, 220);
    }
    const ses = authService.ensureGuestSession();
    if (ses.mode === "guest") {
      $("#guestModeBanner")?.classList.remove("hidden");
    } else {
      analyticsService.checkRetention(ses.since);
    }
    $$(".nav-item, .bn-item").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });
    $$("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.goto));
    });
    const applySidebar = () => {
      document.body.classList.toggle("sidebar-collapsed", Boolean(state.ui.sidebarCollapsed));
      $("#sidebarToggle")?.setAttribute("aria-expanded", String(!state.ui.sidebarCollapsed));
    };
    applySidebar();
    $("#sidebarToggle")?.addEventListener("click", () => {
      state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
      saveState();
      applySidebar();
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
        saveState();
        applySidebar();
      }
    });
    const updateOnline = () => {
      $("#sidebarOfflineBadge")?.classList.toggle("hidden", navigator.onLine);
    };
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    updateOnline();
    $("#missionsList")?.addEventListener("click", (e) => {
      const row = e.target.closest(".mission");
      if (!row) return;
      const id = row.dataset.id;
      if (e.target.closest(".mission-check")) return completeMission(id);
      if (e.target.closest("[data-edit]")) return editMission(id);
      if (e.target.closest("[data-del]")) return deleteMission(id);
      if (e.target.closest("[data-start]")) {
        state.focus.activeMission = id;
        saveState();
        renderMissions();
        switchView("focus");
        toast("Misi\xF3n vinculada al temporizador \u{1F3AF}");
      }
    });
    $("#missionForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = $("#missionNew");
      const title = (inp?.value || "").trim();
      if (!title) {
        toast("Escribe qu\xE9 quieres lograr hoy.");
        inp?.focus();
        return;
      }
      state.missions.push({
        id: "c" + Date.now().toString(36),
        title,
        xp: 20,
        drops: 5,
        target: 1,
        progress: 0,
        done: false
      });
      inp.value = "";
      saveState();
      renderMissions();
      renderCalTray();
      renderDashboard();
      toast("Misi\xF3n a\xF1adida.");
      inp.focus();
    });
    $("#antiParalysisBtn")?.addEventListener("click", () => {
      state.focus.mode = "noPerfection";
      $$('input[name="mode"]').forEach((r) => r.checked = r.value === "noPerfection");
      updateTimerDuration();
      switchView("focus", true);
      startTimer();
      toast("\u2728 \xA15 minutos sin perfecci\xF3n! El reloj est\xE1 oculto para quitar presi\xF3n.");
    });
    $$("[data-replay-tour]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openInfo(
          "Gu\xEDa r\xE1pida de SYNCRO",
          `<ol style="padding-left:18px;margin:0;display:flex;flex-direction:column;gap:8px;">
          <li><strong>Check-in diario:</strong> indica tu energ\xEDa y estado de \xE1nimo para calibrar la duraci\xF3n de tus bloques.</li>
          <li><strong>Misiones de hoy:</strong> crea, edita o desglosa tareas grandes en micro-pasos manejables.</li>
          <li><strong>Enfoque protegido:</strong> inicia un bloque de 5, 25 o 50 minutos con bioac\xFAstica andina y pausas guiadas.</li>
          <li><strong>Santuario Andino:</strong> riega tu ecosistema con tus gotas y sigue tu l\xEDnea de tiempo emocional cifrada.</li>
        </ol>`
        );
      });
    });
    $$("[data-logout]").forEach((btn) => {
      btn.addEventListener("click", () => {
        authService.signOut();
        location.href = "index.html";
      });
    });
    initTimerModule({
      onComplete: () => {
        renderDashboard();
        renderMissions();
        renderBiome();
        renderProgress();
        checkAchievements();
      },
      onSwitchView: switchView
    });
    initBiomeModule({
      onWatered: () => {
        renderDashboard();
        checkAchievements();
      }
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
      surface: "app",
      getView: () => document.querySelector(".view.active")?.id?.replace("view-", "") || ""
    });
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {
        });
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bootstrap);
  else bootstrap();
})();
