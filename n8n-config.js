/**
 * SYNCRO — Configuración del bot de n8n
 * ------------------------------------------------------------------
 * ÚNICO archivo que debes editar para conectar el bot.
 *
 *  1) En n8n crea un nodo "Webhook" (método POST) o un "Chat Trigger".
 *  2) Copia la "Production URL" (no la "Test URL") y pégala abajo en WEBHOOK_URL.
 *  3) Activa el workflow (interruptor "Active") en n8n.
 *  4) En el nodo Webhook → Options → "Allowed Origins (CORS)" agrega el
 *     dominio donde publicarás la página (ej. https://tu-sitio.vercel.app).
 *
 * Mientras WEBHOOK_URL tenga el texto de ejemplo, el chat se muestra pero
 * responde que aún no está conectado (no se envía nada a ningún servidor).
 *
 * IMPORTANTE: todo lo que pongas aquí es PÚBLICO (lo ve cualquiera que abra
 * la página). Nunca pegues claves de OpenAI/Gemini aquí; esas van dentro de
 * n8n, en sus Credentials.
 */
window.SYNCRO_N8N = {
  // ▼▼▼ PEGA AQUÍ EL ENLACE DE CONEXIÓN DE n8n ▼▼▼
  WEBHOOK_URL: 'PEGA_AQUI_TU_ENLACE_DE_N8N',
  // ▲▲▲ Ejemplo: 'https://tu-instancia.app.n8n.cloud/webhook/syncro-bot' ▲▲▲

  // Opcional: si tu Webhook usa "Header Auth", completa nombre y valor.
  // (Es un secreto débil porque queda visible en el navegador; úsalo solo
  //  para filtrar tráfico accidental, no como seguridad real.)
  AUTH_HEADER_NAME: '',   // ej. 'X-SYNCRO-KEY'
  AUTH_HEADER_VALUE: '',  // ej. 'una-clave-larga-y-aleatoria'

  ENABLED: true,          // false = oculta el chat en todo el sitio
  SHOW_ON_LANDING: true,  // botón de chat en index.html
  SHOW_ON_APP: true,      // botón de chat en app.html
  TIMEOUT_MS: 30000,      // tiempo máximo de espera de respuesta
  SEND_CONTEXT: true,     // envía nombre, plan y vista actual (sin diario ni datos sensibles)
  SEND_EMAIL: false,      // true = incluye el correo del usuario en cada mensaje

  BOT_NAME: 'Guardián SYNCRO',
  BOT_AVATAR: '🦙',
  WELCOME: '¡Hola! Soy tu guardián SYNCRO. Cuéntame qué te cuesta empezar hoy y lo vemos en pasos pequeños.',
  PLACEHOLDER: 'Escribe tu mensaje…',
  QUICK_REPLIES: [
    'Me cuesta empezar una tarea',
    'Estoy agotado/a hoy',
    '¿Cómo funciona SYNCRO?',
  ],
};
