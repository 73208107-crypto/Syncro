// Nav: fondo sólido al hacer scroll
const nav = document.getElementById('nav');
const handleNavScroll = () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
};
window.addEventListener('scroll', handleNavScroll, { passive: true });
handleNavScroll();

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

// Contadores animados
const counters = document.querySelectorAll('[data-count]');
const fmt = new Intl.NumberFormat('es-PE');

const animateCounter = (el) => {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const duration = 1600;
  const start = performance.now();

  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  const step = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const value = Math.floor(easeOutQuart(progress) * target);
    el.textContent = fmt.format(value) + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = fmt.format(target) + suffix;
  };
  requestAnimationFrame(step);
};

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateCounter(entry.target);
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.4 });

counters.forEach(el => counterObserver.observe(el));

// Smooth scroll para anchors (fallback para Safari)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href.length < 2) { e.preventDefault(); return; }
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// Cerrar otros <details> al abrir uno (acordeón)
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
  item.addEventListener('toggle', () => {
    if (item.open) {
      faqItems.forEach(other => {
        if (other !== item) other.open = false;
      });
    }
  });
});

// ============ CUENTAS (simulación local) ============
// Todo se guarda en localStorage del navegador. Cuando exista backend:
//  - Google: reemplazar startGoogle() por Google Identity Services.
//  - Correo/usuario: reemplazar signUp()/logIn() por llamadas a tu API.
(() => {
  const USERS_KEY = 'syncro_users';
  const SESSION_KEY = 'syncro_session';
  const STATE_KEY = 'syncro_state_v3'; // mismo que app.js
  const APP_URL = 'app.html';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const overlay = $('#authOverlay');
  const panels = ['signup', 'login', 'google', 'loading'];
  let lastFocus = null;
  let currentTab = 'signup';

  // ---------- almacenamiento ----------
  const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch (e) { return fb; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const getUsers = () => read(USERS_KEY, []);
  const getSession = () => read(SESSION_KEY, null);

  async function hash(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('syncro::' + text));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { return 'plain::' + btoa(unescape(encodeURIComponent(text))); }
  }

  function startSession(user, { fresh }) {
    // Cuenta nueva o distinta => app.js arranca con estado limpio (y muestra el onboarding)
    try {
      const st = read(STATE_KEY, null);
      if (fresh || (st && st.accountEmail && st.accountEmail !== user.email)) localStorage.removeItem(STATE_KEY);
    } catch (e) { }
    write(SESSION_KEY, { id: user.id, name: user.name, username: user.username, email: user.email, provider: user.provider, since: Date.now() });
  }

  // ---------- abrir / cerrar ----------
  function show(panel) {
    panels.forEach(p => { $('#panel-' + p).hidden = p !== panel; });
    $('#authTabs').hidden = !(panel === 'signup' || panel === 'login');
    if (panel === 'signup' || panel === 'login') {
      currentTab = panel;
      $$('.auth-tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === panel)));
    }
  }
  function open(tab = 'signup') {
    const session = getSession();
    if (session) { location.href = APP_URL; return; }   // ya tiene sesión: directo a la app
    lastFocus = document.activeElement;
    show(tab);
    overlay.hidden = false;
    document.body.classList.add('auth-open');
    setTimeout(() => $(tab === 'signup' ? '#suName' : '#liId').focus(), 30);
  }
  function close() {
    overlay.hidden = true;
    document.body.classList.remove('auth-open');
    lastFocus?.focus?.();
  }
  window.SyncroAuth = { open, close };

  $$('[data-auth]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    open(el.dataset.auth);
  }));
  $('#authClose').addEventListener('click', close);
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => {
    if (overlay.hidden) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {                       // atrapar el foco dentro del modal
      const f = $$('button, input, a[href]', overlay).filter(x => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  $$('[data-tab]').forEach(b => b.addEventListener('click', () => { show(b.dataset.tab); $(b.dataset.tab === 'signup' ? '#suName' : '#liId').focus(); }));
  $$('[data-toggle-pass]').forEach(b => b.addEventListener('click', () => {
    const inp = document.getElementById(b.dataset.togglePass);
    const showIt = inp.type === 'password';
    inp.type = showIt ? 'text' : 'password';
    b.textContent = showIt ? 'Ocultar' : 'Mostrar';
    b.setAttribute('aria-label', showIt ? 'Ocultar contraseña' : 'Mostrar contraseña');
  }));

  // ---------- helpers de formulario ----------
  function setErr(inputId, errId, msg) {
    const inp = document.getElementById(inputId), err = document.getElementById(errId);
    if (err) err.textContent = msg || '';
    if (inp) inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
    return !msg;
  }
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const loading = (title, text) => { $('#loadingTitle').textContent = title; $('#loadingText').textContent = text; show('loading'); };
  const goApp = () => setTimeout(() => { location.href = APP_URL; }, 900);

  // ---------- crear cuenta ----------
  $('#signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#suName').value.trim();
    const username = $('#suUser').value.trim();
    const email = $('#suEmail').value.trim().toLowerCase();
    const pass = $('#suPass').value;
    const terms = $('#suTerms').checked;
    $('#signupAlert').textContent = '';

    const users = getUsers();
    let ok = true;
    ok = setErr('suName', 'suNameErr', name.length < 2 ? 'Escribe tu nombre.' : '') && ok;
    ok = setErr('suUser', 'suUserErr',
      !/^[a-z0-9._]{3,20}$/i.test(username) ? 'Usa de 3 a 20 caracteres: letras, números, punto o guion bajo.'
        : users.some(u => u.username.toLowerCase() === username.toLowerCase()) ? 'Ese usuario ya existe. Prueba con otro.' : '') && ok;
    ok = setErr('suEmail', 'suEmailErr',
      !emailOk(email) ? 'Escribe un correo válido, por ejemplo tu@correo.com.'
        : users.some(u => u.email === email) ? 'Ese correo ya tiene cuenta. Inicia sesión.' : '') && ok;
    ok = setErr('suPass', 'suPassErr',
      pass.length < 8 || !/[a-z]/i.test(pass) || !/\d/.test(pass) ? 'La contraseña necesita 8 caracteres o más, con letras y números.' : '') && ok;
    if (!terms) { $('#suTermsErr').textContent = 'Acepta los términos para crear tu cuenta.'; ok = false; } else $('#suTermsErr').textContent = '';
    if (!ok) { $('#signupForm [aria-invalid="true"]')?.focus(); return; }

    $('#signupSubmit').disabled = true;
    const user = { id: 'u' + Date.now().toString(36), name, username, email, passHash: await hash(pass), provider: 'email', createdAt: Date.now() };
    users.push(user);
    if (!write(USERS_KEY, users)) {
      $('#signupAlert').textContent = 'No pudimos guardar tu cuenta: el navegador bloquea el almacenamiento (¿modo privado?).';
      $('#signupSubmit').disabled = false; return;
    }
    startSession(user, { fresh: true });
    loading(`¡Bienvenido, ${name.split(' ')[0]}!`, 'Tu cuenta está lista. Preparando tu espacio…');
    goApp();
  });

  // ---------- iniciar sesión ----------
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#liId').value.trim().toLowerCase();
    const pass = $('#liPass').value;
    const alertEl = $('#loginAlert');
    alertEl.textContent = '';
    if (!id || !pass) { alertEl.textContent = 'Escribe tu usuario o correo y tu contraseña.'; return; }
    $('#loginSubmit').disabled = true;
    const user = getUsers().find(u => (u.email === id || u.username.toLowerCase() === id) && u.passHash);
    const good = user && user.passHash === await hash(pass);
    $('#loginSubmit').disabled = false;
    if (!good) { alertEl.textContent = 'Usuario o contraseña incorrectos. Revisa los datos o crea una cuenta.'; return; }
    startSession(user, { fresh: false });
    loading(`Hola de nuevo, ${user.name.split(' ')[0]}`, 'Retomando donde lo dejaste…');
    goApp();
  });

  // ---------- Google (simulado) ----------
  $$('[data-google]').forEach(b => b.addEventListener('click', () => { show('google'); $('#gDemoAccount').focus(); }));
  $('#googleBack').addEventListener('click', () => show(currentTab));

  function startGoogle(email, displayName) {
    loading('Conectando con Google…', 'Simulación: no se envía ningún dato a Google.');
    setTimeout(() => {
      const users = getUsers();
      let user = users.find(u => u.email === email);
      const isNew = !user;
      if (isNew) {
        const base = email.split('@')[0].replace(/[^a-z0-9._]/gi, '').slice(0, 16) || 'usuario';
        let username = base, n = 1;
        while (users.some(u => u.username.toLowerCase() === username.toLowerCase())) username = base + (++n);
        user = { id: 'g' + Date.now().toString(36), name: displayName, username, email, passHash: null, provider: 'google', createdAt: Date.now() };
        users.push(user); write(USERS_KEY, users);
      }
      startSession(user, { fresh: isNew });
      $('#loadingTitle').textContent = isNew ? `¡Cuenta creada, ${user.name.split(' ')[0]}!` : `Hola de nuevo, ${user.name.split(' ')[0]}`;
      $('#loadingText').textContent = 'Preparando tu espacio…';
      goApp();
    }, 1100);
  }
  $('#gDemoAccount').addEventListener('click', () => startGoogle('estudiante.demo@gmail.com', 'Estudiante Demo'));
  $('#googleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#gEmail').value.trim().toLowerCase();
    if (!emailOk(email)) { setErr('gEmail', 'gEmailErr', 'Escribe un correo válido, por ejemplo tucorreo@gmail.com.'); return; }
    setErr('gEmail', 'gEmailErr', '');
    const nice = email.split('@')[0].replace(/[._\d]+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase()) || 'Usuario';
    startGoogle(email, nice);
  });

  // Si ya hay sesión, los CTA cambian de texto
  if (getSession()) {
    const s = getSession();
    $$('.nav-cta-primary').forEach(a => { a.textContent = 'Ir a mi espacio'; });
    $$('.nav-cta-ghost').forEach(a => { a.textContent = `Hola, ${s.name.split(' ')[0]}`; });
  }
})();