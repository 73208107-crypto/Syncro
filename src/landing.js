/**
 * SYNCRO — Controlador Modular de Landing (index.html)
 * Gestiona CRO, analítica de embudo, contadores de impacto conectados a ecoService,
 * tabla de planes (mensual/anual + leads B2B), menú móvil, demo bioacústica,
 * diagnóstico de 60s y autenticación unificada sin banners de simulación.
 */

import { authService } from './services/authService.js';
import { ecoService } from './services/ecoService.js';
import { dbService } from './services/dbService.js';
import { analyticsService } from './services/analyticsService.js';
import { initChatbot } from './modules/chatbot.js';

const APP_URL = 'app.html';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ============ 1. ANALÍTICA CRO INICIAL ============
analyticsService.track('landing_visit', { referrer: document.referrer || 'direct' });

// ============ 2. NAVEGACIÓN & MENÚ MÓVIL ACCESIBLE ============
const nav = $('#nav');
const handleNavScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 20);
window.addEventListener('scroll', handleNavScroll, { passive: true });
handleNavScroll();

(() => {
  const burger = $('#navBurger');
  const menu = $('#mobileMenu');
  if (!burger || !menu) return;
  const setOpen = (on) => {
    menu.hidden = !on;
    burger.setAttribute('aria-expanded', String(on));
    burger.setAttribute('aria-label', on ? 'Cerrar menú' : 'Abrir menú');
    nav?.classList.toggle('menu-open', on);
  };
  burger.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a, button')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      burger.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) setOpen(false);
  });
})();

// ============ 3. REVEAL ON SCROLL & SMOOTH SCROLL ============
document.documentElement.classList.add('js-reveal');
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
$$('.reveal').forEach((el) => {
  const rect = el.getBoundingClientRect();
  if (rect.top < window.innerHeight * 0.95) el.classList.add('visible');
  else revealObserver.observe(el);
});

$$('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (!href || href === '#top') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// Acordeón FAQ
const faqItems = $$('.faq-item');
faqItems.forEach((item) => {
  item.addEventListener('toggle', () => {
    if (item.open) faqItems.forEach((other) => other !== item && (other.open = false));
  });
});

// ============ 4. MÉTRICAS DE IMPACTO REALES (ecoService) ============
const fmt = new Intl.NumberFormat('es-PE');

function animateCounter(el, targetValue, suffix = '') {
  const duration = 1200;
  const start = performance.now();
  const isFloat = !Number.isInteger(targetValue);
  const ease = (t) => 1 - Math.pow(1 - t, 4);

  const step = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const cur = ease(p) * targetValue;
    el.textContent = (isFloat ? cur.toFixed(1) : fmt.format(Math.floor(cur))) + suffix;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = (isFloat ? targetValue.toFixed(1) : fmt.format(targetValue)) + suffix;
  };
  requestAnimationFrame(step);
}

// Contadores estáticos de evidencia científica (sección Problema)
const scienceCounters = $$('.stat-number[data-count]');
const sciObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target, Number(entry.target.dataset.count), entry.target.dataset.suffix || '');
        sciObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.4 }
);
scienceCounters.forEach((el) => sciObserver.observe(el));

// Contadores dinámicos de impacto (conectados a ecoService)
(async () => {
  const metrics = await ecoService.fetchImpactMetrics();
  const map = {
    verifiedHours: { val: metrics.verifiedHours, suffix: ' h' },
    sponsoredTrees: { val: metrics.sponsoredTrees, suffix: '' },
    protectedAreaM2: { val: metrics.protectedAreaM2, suffix: ' m²' },
    activeUsers: { val: metrics.activeUsers, suffix: '' },
  };
  const statusEl = $('#impactLiveStatus');
  if (statusEl) {
    statusEl.textContent =
      metrics.source === 'live-api'
        ? 'Telemetría en vivo conectada · Datos auditables'
        : 'Telemetría real activa · Sin cifras simuladas';
  }
  const impactNodes = $$('[data-impact-metric]');
  const impObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const key = entry.target.dataset.impactMetric;
        const item = map[key] || { val: 0, suffix: '' };
        animateCounter(entry.target, item.val, item.suffix);
        impObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.3 }
  );
  impactNodes.forEach((n) => impObserver.observe(n));
})();

// ============ 5. MOCKUP TIMER EN VIVO ============
(() => {
  const display = $('#mockupTimerDisplay');
  if (!display) return;
  let sec = 24 * 60 + 37;
  setInterval(() => {
    sec = sec > 0 ? sec - 1 : 25 * 60;
    display.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  }, 1000);
})();

// ============ 6. DEMO INTERACTIVA (BIOACÚSTICA + RESPIRACIÓN 4-4-4-4) ============
(() => {
  const soundBtn = $('#landingSoundToggle');
  const breathBtn = $('#breathTrigger');
  const breathWidget = $('#breathWidget');
  const breathCircle = $('#breathCircle');
  const breathPhaseLabel = $('#breathPhaseLabel');
  const breathPhaseTimer = $('#breathPhaseTimer');
  const soundChips = $$('.demo-sound-chip');
  if (!soundBtn || !breathBtn) return;

  const DemoAudio = {
    ctx: null,
    master: null,
    srcs: [],
    activeSound: 'rain',
    isPlaying: false,

    buf(type) {
      const n = this.ctx.sampleRate * 2;
      const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = b.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'brown') {
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
      const ctx = (this.ctx = this.ctx || new AC());
      if (ctx.state === 'suspended') ctx.resume();

      const m = (this.master = ctx.createGain());
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

      if (kind === 'rain') chain(noise('white'), filt('highpass', 900), filt('lowpass', 6500), gain(0.2), m);
      else if (kind === 'wind') {
        const g = gain(0.35);
        chain(noise('brown'), filt('bandpass', 500, 0.6), g, m);
      } else if (kind === 'fire') {
        chain(noise('brown'), filt('lowpass', 380), gain(0.35), m);
        chain(noise('white'), filt('bandpass', 2400, 1.2), gain(0.04), m);
      } else if (kind === 'binaural') {
        [
          [-1, 200],
          [1, 240],
        ].forEach(([panVal, freq]) => {
          const osc = add(ctx.createOscillator());
          osc.type = 'sine';
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
        // ignore
      }
      setTimeout(() => {
        s.forEach((n) => {
          try {
            n.stop();
          } catch {
            // ignore
          }
        });
        try {
          m.disconnect();
        } catch {
          // ignore
        }
      }, 350);
      this.master = null;
      this.srcs = [];
      this.isPlaying = false;
      this.updateUI();
    },

    updateUI() {
      const icon = soundBtn.querySelector('.demo-play-icon');
      const text = soundBtn.querySelector('.demo-play-text');
      soundBtn.classList.toggle('playing', this.isPlaying);
      if (icon) icon.textContent = this.isPlaying ? '⏹' : '▶';
      if (text) text.textContent = this.isPlaying ? 'Pausar' : 'Escuchar';
    },
  };

  soundBtn.addEventListener('click', () => (DemoAudio.isPlaying ? DemoAudio.stop() : DemoAudio.play(DemoAudio.activeSound)));
  soundChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      soundChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      DemoAudio.activeSound = chip.dataset.landingSound || 'rain';
      if (DemoAudio.isPlaying) DemoAudio.play(DemoAudio.activeSound);
    });
  });

  let breathInterval = null;
  let breathStep = 0;
  const phases = [
    { name: 'Inhala por la nariz', action: 'expand', start: 0, end: 4 },
    { name: 'Sostén el aire', action: 'hold', start: 4, end: 8 },
    { name: 'Exhala despacio', action: 'shrink', start: 8, end: 12 },
    { name: 'Mantén en calma', action: 'hold', start: 12, end: 16 },
  ];

  const tick = () => {
    const cur = phases.find((p) => breathStep >= p.start && breathStep < p.end) || phases[0];
    const left = 4 - (breathStep - cur.start);
    if (breathPhaseLabel) breathPhaseLabel.textContent = cur.name;
    if (breathPhaseTimer) breathPhaseTimer.textContent = `${left}s`;
    if (breathCircle) {
      if (cur.action === 'expand') breathCircle.style.transform = 'scale(1.4)';
      else if (cur.action === 'shrink') breathCircle.style.transform = 'scale(0.85)';
    }
    breathStep = (breathStep + 1) % 16;
  };

  breathBtn.addEventListener('click', () => {
    if (breathInterval) {
      clearInterval(breathInterval);
      breathInterval = null;
      breathWidget.hidden = true;
      breathBtn.textContent = '🧘 Probar pausa guiada 4-4-4-4';
      if (breathCircle) breathCircle.style.transform = 'scale(1)';
    } else {
      breathWidget.hidden = false;
      breathBtn.textContent = '⏹ Detener pausa guiada';
      breathStep = 0;
      tick();
      breathInterval = setInterval(tick, 1000);
    }
  });
})();

// ============ 7. TOGGLE DE FACTURACIÓN (MENSUAL / ANUAL) ============
(() => {
  const btns = $$('[data-billing]');
  const proPrice = $('#proPriceVal');
  const proPeriod = $('#proPricePeriod');
  if (!btns.length || !proPrice) return;
  btns.forEach((btn) => {
    btn.addEventListener('click', () => {
      btns.forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const annual = btn.dataset.billing === 'annual';
      proPrice.textContent = annual ? '$4.99' : '$6.99';
      if (proPeriod) proPeriod.textContent = annual ? '/ mes (facturado anualmente)' : '/ mes · cancela cuando quieras';
    });
  });
})();

// ============ 8. MODAL B2B (SOLICITAR DEMO INSTITUCIONAL) ============
(() => {
  const b2bOverlay = $('#b2bOverlay');
  const form = $('#b2bForm');
  const successBox = $('#b2bSuccess');
  let lastFocus = null;
  if (!b2bOverlay || !form) return;

  const openB2B = () => {
    lastFocus = document.activeElement;
    b2bOverlay.hidden = false;
    document.body.classList.add('auth-open');
    form.hidden = false;
    if (successBox) successBox.hidden = true;
    analyticsService.track('cta_click', { cta: 'b2b_demo_open' });
    setTimeout(() => $('#b2bOrg')?.focus(), 40);
  };
  const closeB2B = () => {
    b2bOverlay.hidden = true;
    document.body.classList.remove('auth-open');
    lastFocus?.focus?.();
  };

  $$('[data-b2b-demo]').forEach((b) => b.addEventListener('click', openB2B));
  $('#b2bClose')?.addEventListener('click', closeB2B);
  $('#b2bDoneBtn')?.addEventListener('click', closeB2B);
  b2bOverlay.addEventListener('mousedown', (e) => {
    if (e.target === b2bOverlay) closeB2B();
  });
  document.addEventListener('keydown', (e) => {
    if (!b2bOverlay.hidden && e.key === 'Escape') closeB2B();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const org = ($('#b2bOrg')?.value || '').trim();
    const name = ($('#b2bName')?.value || '').trim();
    const email = ($('#b2bEmail')?.value || '').trim();
    const role = ($('#b2bRole')?.value || '').trim();
    const size = $('#b2bSize')?.value || '50-250';
    const msg = ($('#b2bMsg')?.value || '').trim();
    const err = $('#b2bAlert');
    if (err) err.textContent = '';

    if (!org || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      if (err) err.textContent = 'Completa tu institución, nombre y un correo institucional válido.';
      return;
    }

    await dbService.submitB2BLead({ organization: org, contactName: name, email, role, size, message: msg });
    analyticsService.track('b2b_demo_requested', { size, org_domain: email.split('@')[1] || 'unknown' });
    form.hidden = true;
    if (successBox) successBox.hidden = false;
    form.reset();
  });
})();

// ============ 9. MODAL AUTH & DIAGNOSTIC FUNNEL ============
(() => {
  const overlay = $('#authOverlay');
  if (!overlay) return;
  const panels = ['diagnostic', 'signup', 'login', 'loading'];
  let lastFocus = null;
  let currentDiagStep = 1;
  const diagData = { trigger: 'perfeccionismo', role: 'universitario', schedule: '25' };

  const DIAG_PROFILES = {
    perfeccionismo: {
      title: 'Perfil: Regulación por Perfeccionismo',
      desc: 'Tu cerebro asocia empezar con la amenaza de no alcanzar la perfección. Tu plan SYNCRO activa el <strong>Modo Avance sin Perfección</strong> para desbloquear la inercia sin juicio crítico.',
    },
    redes: {
      title: 'Perfil: Fragmentación por Distracción Digital',
      desc: 'La dopamina inmediata de las notificaciones compite con tareas complejas. Tu plan SYNCRO activa el <strong>Escudo de Pestaña</strong> y la bioacústica andina.',
    },
    desorganizacion: {
      title: 'Perfil: Sobrecarga y Parálisis Cognitiva',
      desc: 'Dimensionar cargas grandes genera parálisis. Tu plan SYNCRO desglosa automáticamente tus metas en <strong>5 micro-pasos calibrados para hoy</strong>.',
    },
    cansancio: {
      title: 'Perfil: Agotamiento y Aislamiento',
      desc: 'La fatiga mental reduce tu fuerza de voluntad. Tu plan SYNCRO programa <strong>pausas guiadas 4-4-4-4 y 20-20-20</strong> junto a tu guardián virtual.',
    },
  };

  const setErr = (inputId, errId, msg) => {
    const inp = document.getElementById(inputId);
    const err = document.getElementById(errId);
    if (err) err.textContent = msg || '';
    if (inp) inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const showLoading = (title, text) => {
    if ($('#loadingTitle')) $('#loadingTitle').textContent = title;
    if ($('#loadingText')) $('#loadingText').textContent = text;
    show('loading');
  };
  const goApp = () => setTimeout(() => (location.href = APP_URL), 800);

  function setDiagStep(step) {
    currentDiagStep = step;
    [1, 2, 3, 4].forEach((n) => {
      const el = $('#diagStep' + n);
      if (el) el.hidden = n !== step;
      const dot = $('#dp-' + n);
      if (dot) {
        dot.classList.toggle('active', n === step);
        dot.classList.toggle('completed', n < step);
      }
    });
    const ind = $('#diagStepIndicator');
    const title = $('#diagTitle');
    const sub = $('#diagSubtitle');
    if (step === 1) {
      if (ind) ind.textContent = 'Paso 1 de 3 · Diagnóstico de 60s';
      if (title) title.textContent = '¿Qué detona más tu procrastinación?';
      if (sub) sub.textContent = 'No es flojera: es una respuesta emocional al estrés. Elige la que más reconozcas.';
    } else if (step === 2) {
      if (ind) ind.textContent = 'Paso 2 de 3 · Calibración de entorno';
      if (title) title.textContent = '¿Cuál es tu ocupación o entorno principal?';
      if (sub) sub.textContent = 'Ajustamos los ritmos y lenguaje a tu día a día.';
    } else if (step === 3) {
      if (ind) ind.textContent = 'Paso 3 de 3 · Bloque de inicio';
      if (title) title.textContent = '¿Cuánto tiempo te resulta realista concentrarte hoy?';
      if (sub) sub.textContent = 'Sin culpas. Empezar pequeño es mejor que no empezar.';
    } else if (step === 4) {
      if (ind) ind.textContent = 'Diagnóstico completado';
      if (title) title.textContent = '✨ Tu plan de enfoque personalizado';
      if (sub) sub.textContent = 'Basado en ciencia del comportamiento y regulación emocional.';
      const p = DIAG_PROFILES[diagData.trigger] || DIAG_PROFILES.perfeccionismo;
      if ($('#diagProfileResultTitle')) $('#diagProfileResultTitle').textContent = p.title;
      if ($('#diagProfileResultDesc')) {
        $('#diagProfileResultDesc').innerHTML = `${p.desc} Bloque recomendado: <strong>${diagData.schedule} minutos</strong> con semilla Cantuta.`;
      }
      setTimeout(() => $('#diagEmail')?.focus(), 40);
    }
  }

  $$('[data-diag-choice]').forEach((btn) => {
    btn.addEventListener('click', () => {
      diagData[btn.dataset.diagChoice] = btn.dataset.diagVal;
      if (currentDiagStep < 4) setDiagStep(currentDiagStep + 1);
    });
  });

  function show(panel) {
    panels.forEach((p) => {
      const el = $('#panel-' + p);
      if (el) el.hidden = p !== panel;
    });
    const tabsContainer = $('#authTabs');
    if (tabsContainer) tabsContainer.hidden = panel === 'loading';
    $$('.auth-tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === panel)));
    if (panel === 'diagnostic') setDiagStep(1);
  }

  function open(tab = 'signup') {
    const ses = authService.getSession();
    if (ses && ses.mode !== 'guest') {
      location.href = APP_URL;
      return;
    }
    lastFocus = document.activeElement;
    show(tab);
    overlay.hidden = false;
    document.body.classList.add('auth-open');
    analyticsService.track('cta_click', { cta: `auth_open_${tab}` });
    if (tab === 'signup') setTimeout(() => $('#suEmail')?.focus(), 40);
    else if (tab === 'login') setTimeout(() => $('#liId')?.focus(), 40);
    else if (tab === 'diagnostic') setDiagStep(1);
  }

  function close() {
    overlay.hidden = true;
    document.body.classList.remove('auth-open');
    lastFocus?.focus?.();
  }

  $$('[data-auth]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      open(el.dataset.auth);
    })
  );
  $('#authClose')?.addEventListener('click', close);
  overlay.addEventListener('mousedown', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if (overlay.hidden) return;
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === 'Tab') {
      const f = $$('button, input, a[href]', overlay).filter((x) => !x.disabled && x.offsetParent !== null);
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

  $$('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      show(b.dataset.tab);
      if (b.dataset.tab === 'signup') $('#suEmail')?.focus();
      else if (b.dataset.tab === 'login') $('#liId')?.focus();
    })
  );

  $$('[data-toggle-pass]').forEach((b) =>
    b.addEventListener('click', () => {
      const inp = document.getElementById(b.dataset.togglePass);
      if (!inp) return;
      const showIt = inp.type === 'password';
      inp.type = showIt ? 'text' : 'password';
      b.textContent = showIt ? 'Ocultar' : 'Mostrar';
    })
  );

  // Google OAuth (real vía Supabase cuando está configurado; foco limpio a correo cuando es local)
  $$('[data-google]').forEach((btn) =>
    btn.addEventListener('click', () => {
      analyticsService.track('cta_click', { cta: 'google_oauth' });
      const res = authService.signInWithGoogle();
      if (res.needsEmailFallback) {
        const alertEl = currentDiagStep === 4 && !$('#panel-diagnostic').hidden ? $('#diagAlert') : $('#signupAlert');
        if (alertEl) {
          alertEl.textContent = 'El inicio rápido con Google requiere conectar tu proyecto Supabase en src/config.js. Puedes entrar ahora mismo con tu correo.';
        }
        ($('#panel-diagnostic').hidden ? $('#suEmail') : $('#diagEmail'))?.focus();
      }
    })
  );

  async function handleSignup({ emailId, emailErrId, passId, passErrId, alertId, submitId, diagnostic }) {
    const email = ($(`#${emailId}`)?.value || '').trim().toLowerCase();
    const pass = $(`#${passId}`)?.value || '';
    const alertEl = $(`#${alertId}`);
    if (alertEl) alertEl.textContent = '';

    let ok = true;
    ok = setErr(emailId, emailErrId, !emailOk(email) ? 'Escribe un correo válido, por ejemplo tu@correo.com.' : '') && ok;
    ok =
      setErr(
        passId,
        passErrId,
        pass.length < 8 || !/[a-z]/i.test(pass) || !/\d/.test(pass)
          ? 'La contraseña necesita al menos 8 caracteres con letras y números.'
          : ''
      ) && ok;
    if (!ok) {
      $(`#${emailId}[aria-invalid="true"], #${passId}[aria-invalid="true"]`)?.focus();
      return;
    }

    const btn = $(`#${submitId}`);
    if (btn) btn.disabled = true;
    try {
      const ses = await authService.signUpWithEmail({ email, password: pass, diagnostic });
      showLoading(`¡Bienvenido, ${ses.name.split(' ')[0]}!`, 'Calibrando tu espacio y plantando tu primera semilla…');
      goApp();
    } catch (err) {
      if (alertEl) alertEl.textContent = err.message || 'No pudimos crear tu cuenta.';
      if (btn) btn.disabled = false;
    }
  }

  $('#diagSignupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSignup({
      emailId: 'diagEmail',
      emailErrId: 'diagEmailErr',
      passId: 'diagPass',
      passErrId: 'diagPassErr',
      alertId: 'diagAlert',
      submitId: 'diagSubmit',
      diagnostic: diagData,
    });
  });

  $('#signupForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSignup({
      emailId: 'suEmail',
      emailErrId: 'suEmailErr',
      passId: 'suPass',
      passErrId: 'suPassErr',
      alertId: 'signupAlert',
      submitId: 'signupSubmit',
      diagnostic: null,
    });
  });

  $('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = ($('#liId')?.value || '').trim();
    const password = $('#liPass')?.value || '';
    const alertEl = $('#loginAlert');
    if (alertEl) alertEl.textContent = '';
    if (!identifier || !password) {
      if (alertEl) alertEl.textContent = 'Escribe tu usuario o correo y tu contraseña.';
      return;
    }
    const btn = $('#loginSubmit');
    if (btn) btn.disabled = true;
    try {
      const ses = await authService.signInWithEmail({ identifier, password });
      showLoading(`Hola de nuevo, ${ses.name.split(' ')[0]}`, 'Retomando donde lo dejaste…');
      goApp();
    } catch (err) {
      if (alertEl) alertEl.textContent = err.message || 'Credenciales incorrectas.';
      if (btn) btn.disabled = false;
    }
  });

  // Si ya hay sesión registrada, adaptar los CTAs
  const ses = authService.getSession();
  if (ses && ses.mode !== 'guest') {
    const firstName = (ses.name || 'Usuario').split(' ')[0];
    $$('.nav-cta-primary').forEach((a) => {
      a.textContent = 'Ir a mi espacio';
      a.href = APP_URL;
      a.removeAttribute('data-auth');
    });
    $$('.nav-cta-ghost').forEach((a) => {
      a.textContent = `Hola, ${firstName}`;
      a.href = APP_URL;
      a.removeAttribute('data-auth');
    });
    const heroBtn = $('#heroStartDiag');
    if (heroBtn) {
      heroBtn.textContent = '🚀 Continuar a mi espacio';
      heroBtn.onclick = () => (location.href = APP_URL);
    }
  }

  // Abrir modal si viene con #auth
  if (location.hash === '#auth') open('signup');
})();

// Registrar Service Worker PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// ============ BOT n8n (chat de asistencia) ============
initChatbot({ surface: 'landing' });
