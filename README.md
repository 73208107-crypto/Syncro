# SYNCRO — Versión Comercial Modular

Plataforma web de productividad sin culpa basada en regulación emocional, enfoque protegido e impacto ecológico verificable.

## Estructura del Proyecto

```text
├── index.html                 # Landing comercial optimizada para CRO (B2C + B2B)
├── app.html                   # Aplicación principal (100% modo oscuro, sin controles DEMO)
├── privacidad.html            # Política de privacidad (LPDP / GDPR)
├── terminos.html              # Términos de uso comerciales
├── manifest.json              # Configuración PWA
├── sw.js                      # Service Worker offline-first
├── vercel.json                # Cabeceras HTTP de seguridad (CSP, X-Frame-Options)
├── supabase/
│   └── schema.sql             # Tablas relacionales + Row Level Security (RLS)
├── css/
│   ├── tokens.css             # Variables :root unificadas para todo el sitio
│   ├── base.css               # Resets, tipografía y animaciones base
│   ├── layout.css             # Shell, sidebar colapsable y navegación móvil
│   ├── components.css         # Tarjetas, botones, inputs y modales accesibles
│   ├── views.css              # Vistas de la app (Dashboard, Enfoque, Calendario, Santuario, Perfil)
│   └── landing.css            # Estilos de landing, planes B2C/B2B y modal institucional
└── src/
    ├── config.js              # Variables de entorno (Supabase, Edge Functions, Analítica, B2B)
    ├── main.js                # Punto de entrada de app.html
    ├── landing.js             # Punto de entrada de index.html
    ├── core/
    │   └── state.js           # Estado reactivo centralizado y resolución de convenios B2B
    ├── services/
    │   ├── analyticsService.js# Instrumentación CRO (PostHog / Plausible / Mixpanel)
    │   ├── authService.js     # Registro/login, Google OAuth real (Supabase) y respaldo local
    │   ├── dbService.js       # Sincronización PostgreSQL/RLS y captura de leads B2B
    │   ├── aiService.js       # Cliente Edge Functions IA + cuotas por plan (Free/Pro) + opt-in
    │   └── ecoService.js      # Consulta de métricas reales de impacto ecológico
    ├── modules/
    │   ├── timer.js           # Pomodoro Date.now(), WebAudio, pausas guiadas y Escudo de Pestaña
    │   ├── calendar.js        # Calendario semanal inteligente, franjas de energía y export .ics
    │   ├── biome.js           # Motor del Santuario Andino vivo y riego con gotas
    │   └── journal.js         # Diario emocional cifrado AES-GCM 256-bit (IndexedDB)
    └── ui/
        └── modals.js          # Gestor unificado de modales con focus trap y cierre con Escape
```

## Cómo ejecutar en local

Al utilizar módulos ES (`type="module"`), abre el proyecto con un servidor HTTP local (no con `file://`):

```bash
python3 -m http.server 8080
# o con Node.js:
npx serve .
```

Luego visita `http://localhost:8080/index.html` o `http://localhost:8080/app.html`.

> **Modo desarrollador:** añade `?dev=1` a `app.html` (`app.html?dev=1`) para mostrar herramientas internas de prueba (como el botón de prueba del Escudo de Pestaña).

## Conexión a Backend (Supabase + IA + Analítica)

1. Ejecuta `supabase/schema.sql` en el editor SQL de tu proyecto Supabase.
2. Configura `window.SYNCRO_ENV` (o edita `src/config.js`) con `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AI_EDGE_URL` y `ECO_METRICS_URL`.
3. Despliega directamente en **Vercel** o **Cloudflare Pages** (el archivo `vercel.json` ya aplica cabeceras `Content-Security-Policy` y `X-Frame-Options`).

## Conexión con el bot de n8n

El chat flotante (🦙) aparece en `index.html` y `app.html` y habla con un workflow de n8n por Webhook.

**Archivos:** `n8n-config.js` (aquí se pega el enlace), `src/services/n8nService.js` (cliente HTTP), `src/modules/chatbot.js` (interfaz), `css/chatbot.css`, `n8n/syncro-bot-workflow.json` (workflow de ejemplo para importar).

**Pasos:**
1. En n8n: *Workflows → Import from file* → `n8n/syncro-bot-workflow.json`. Asigna tu credencial de OpenAI (o cambia el modelo por Gemini/otro) en el nodo *OpenAI Chat Model*.
2. Abre el nodo **Webhook**, copia la **Production URL** y pégala en `n8n-config.js` → `WEBHOOK_URL`.
3. Activa el workflow (interruptor *Active*).
4. En el nodo Webhook → *Options → Allowed Origins (CORS)* reemplaza `*` por tu dominio real al publicar.
5. Si usas n8n propio (no `*.n8n.cloud`), agrega tu dominio a `connect-src` en `vercel.json`.

**Qué recibe n8n** (POST JSON): `chatInput`, `sessionId`, `source` (`app`/`landing`), `user {id,name,plan}`, `context {view,locale,page}`.
**Qué debe devolver:** `{ "output": "texto" }` (también se aceptan `reply`, `text`, `message`, `response`, `answer`, un arreglo o texto plano).

Tras editar archivos de `src/`, regenera los bundles para `file://`:
`npx esbuild src/main.js --bundle --format=iife --outfile=dist/app.bundle.js` y lo mismo con `src/landing.js` → `dist/landing.bundle.js`.
