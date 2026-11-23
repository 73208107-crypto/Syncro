/**
 * SYNCRO — Configuración Centralizada de Entorno
 * Conecta Supabase, Edge Functions de IA, endpoint de impacto ecológico
 * y analítica respetuosa con la privacidad (PostHog / Plausible / Mixpanel).
 *
 * Para activar servicios en producción, define `window.SYNCRO_ENV` antes de
 * cargar los módulos o completa estos valores en tu pipeline de despliegue (Vercel / Cloudflare Pages).
 */

const env = (typeof window !== 'undefined' && window.SYNCRO_ENV) || {};
const n8nEnv = (typeof window !== 'undefined' && window.SYNCRO_N8N) || {};
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

export const CONFIG = {
  appName: 'SYNCRO',
  version: '2.0.0-commercial',
  devMode: params.get('dev') === '1' || Boolean(env.DEV_MODE),

  // Backend BaaS (Supabase: PostgreSQL + Auth + Realtime + Edge Functions)
  supabase: {
    url: env.SUPABASE_URL || '',
    anonKey: env.SUPABASE_ANON_KEY || '',
    enabled: Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
  },

  // Endpoints de servidor (nunca exponer claves de API de IA en el cliente)
  endpoints: {
    aiEdgeFunction: env.AI_EDGE_URL || (env.SUPABASE_URL ? `${env.SUPABASE_URL}/functions/v1/syncro-ai` : ''),
    ecoMetrics: env.ECO_METRICS_URL || (env.SUPABASE_URL ? `${env.SUPABASE_URL}/functions/v1/eco-metrics` : ''),
    b2bLeads: env.B2B_LEADS_URL || (env.SUPABASE_URL ? `${env.SUPABASE_URL}/rest/v1/b2b_leads` : ''),
  },

  // Bot de n8n (chat de asistencia). Se configura en /n8n-config.js
  n8n: {
    enabled: n8nEnv.ENABLED !== false,
    webhookUrl: n8nEnv.WEBHOOK_URL || env.N8N_WEBHOOK_URL || '',
    authHeaderName: n8nEnv.AUTH_HEADER_NAME || '',
    authHeaderValue: n8nEnv.AUTH_HEADER_VALUE || '',
    showOnLanding: n8nEnv.SHOW_ON_LANDING !== false,
    showOnApp: n8nEnv.SHOW_ON_APP !== false,
    timeoutMs: Number(n8nEnv.TIMEOUT_MS) || 30000,
    sendContext: n8nEnv.SEND_CONTEXT !== false,
    sendEmail: n8nEnv.SEND_EMAIL === true,
    botName: n8nEnv.BOT_NAME || 'Asistente SYNCRO',
    botAvatar: n8nEnv.BOT_AVATAR || '🦙',
    welcome: n8nEnv.WELCOME || '¡Hola! ¿En qué te puedo ayudar?',
    placeholder: n8nEnv.PLACEHOLDER || 'Escribe tu mensaje…',
    quickReplies: Array.isArray(n8nEnv.QUICK_REPLIES) ? n8nEnv.QUICK_REPLIES.slice(0, 4) : [],
  },

  // Analítica CRO respetuosa con la privacidad
  analytics: {
    provider: env.ANALYTICS_PROVIDER || 'auto', // 'posthog' | 'plausible' | 'mixpanel' | 'auto'
    posthogKey: env.POSTHOG_KEY || '',
    plausibleDomain: env.PLAUSIBLE_DOMAIN || 'syncro.app',
  },

  // Cuotas de IA por plan (control de costos)
  quotas: {
    freeWeeklyBreakdowns: 3,
    proWeeklyBreakdowns: Infinity,
  },

  // Directorio dinámico de convenios B2B por dominio institucional
  institutions: {
    'continental.edu.pe': {
      name: 'Universidad Continental',
      wellbeingLabel: 'Bienestar Universitario UC',
      communityLabel: 'Comunidad Continental',
      plan: 'b2b',
    },
  },
};
