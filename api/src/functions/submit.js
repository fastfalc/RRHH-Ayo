const { app } = require("@azure/functions");

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const EVAL_ASPECTS = [
  ["desempeno_general", "Desempeño general"],
  ["calidad_trabajo", "Calidad del trabajo"],
  ["cumplimiento_funciones", "Cumplimiento de funciones"],
  ["responsabilidad", "Responsabilidad"],
  ["puntualidad", "Puntualidad"],
  ["asistencia", "Asistencia"],
  ["trabajo_equipo", "Trabajo en equipo"],
  ["actitud", "Actitud"],
  ["cumplimiento_instrucciones", "Cumplimiento de instrucciones"],
  ["adaptacion_cargo", "Adaptación al cargo"],
];

app.http("submit", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "submit",
  handler: async (request, context) => {
    const corsHeaders = buildCorsHeaders(request);

    if (request.method === "OPTIONS") {
      return { status: 204, headers: corsHeaders };
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(400, { error: "JSON inválido" }, corsHeaders);
    }

    const { formType, data } = payload || {};
    if (!data || typeof data !== "object") {
      return jsonResponse(400, { error: 'Falta el campo "data"' }, corsHeaders);
    }

    let subject, body, replyTo;
    if (formType === "desvinculacion") {
      if (!data.nombre_trabajador || !data.comentarios) {
        return jsonResponse(400, { error: "Faltan campos obligatorios" }, corsHeaders);
      }
      subject = `Solicitud de desvinculación: ${data.nombre_trabajador}`;
      body = buildDesvinculacionReport(data);
    } else {
      if (!data.nombre || !data.email || !data.mensaje) {
        return jsonResponse(400, { error: "Faltan campos obligatorios" }, corsHeaders);
      }
      subject = `Solicitud RRHH: ${data.motivo || "Consulta general"}`;
      body = buildGeneralReport(data);
      replyTo = data.email;
    }

    try {
      const token = await getGraphToken();
      await sendMail({ token, subject, body, replyTo });
      return jsonResponse(200, { ok: true }, corsHeaders);
    } catch (err) {
      context.error("Fallo al enviar correo vía Graph API", err);
      return jsonResponse(502, { error: "No se pudo enviar el correo" }, corsHeaders);
    }
  },
});

async function getGraphToken() {
  const { TENANT_ID, CLIENT_ID, CLIENT_SECRET } = process.env;
  if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Faltan variables de entorno TENANT_ID / CLIENT_ID / CLIENT_SECRET");
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`No se pudo obtener token de Graph (${response.status})`);
  }
  const json = await response.json();
  return json.access_token;
}

async function sendMail({ token, subject, body, replyTo }) {
  const { SENDER_UPN, HR_EMAIL } = process.env;
  if (!SENDER_UPN || !HR_EMAIL) {
    throw new Error("Faltan variables de entorno SENDER_UPN / HR_EMAIL");
  }

  const message = {
    subject,
    body: { contentType: "Text", content: body },
    toRecipients: [{ emailAddress: { address: HR_EMAIL } }],
  };
  if (replyTo) {
    message.replyTo = [{ emailAddress: { address: replyTo } }];
  }

  const response = await fetch(
    `${GRAPH_BASE}/users/${encodeURIComponent(SENDER_UPN)}/sendMail`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph sendMail falló (${response.status}): ${text}`);
  }
}

function buildGeneralReport(data) {
  return [
    `Nombre: ${fmt(data.nombre)}`,
    `Email: ${fmt(data.email)}`,
    `Área: ${fmt(data.area)}`,
    `Motivo: ${fmt(data.motivo)}`,
    "",
    "Detalle:",
    fmt(data.mensaje),
  ].join("\n");
}

function buildDesvinculacionReport(data) {
  const line = (label, value) => `${label}: ${fmt(value)}`;
  return [
    "FORMULARIO DE SOLICITUD DE DESVINCULACIÓN DE PERSONAL",
    "",
    "1. DATOS DEL TRABAJADOR",
    line("Nombre completo", data.nombre_trabajador),
    line("Cargo", data.cargo_trabajador),
    line("Área", data.area_trabajador),
    line("Jefatura directa", data.jefatura_directa),
    line("Fecha de solicitud", data.fecha_solicitud),
    "",
    "2. MODALIDAD DE DESVINCULACIÓN SOLICITADA",
    line("Modalidad", data.modalidad),
    "",
    "3. MOTIVO PRINCIPAL DE LA SOLICITUD",
    line("Motivo principal", data.motivo_principal),
    line("Detalle (otro)", data.motivo_otro_detalle),
    "",
    "4. FACTORES ASOCIADOS",
    line("Factores", data.factores),
    line("Detalle adicional", data.factores_detalle),
    "",
    "5. ANTECEDENTES Y GESTIONES PREVIAS",
    line("¿Conversado previamente?", data.conversado_previamente),
    line("¿Recibió retroalimentación?", data.retroalimentacion),
    line("¿Hubo acciones previas?", data.acciones_previas),
    line("Acciones realizadas", data.acciones_realizadas),
    line("¿Existen respaldos?", data.respaldos_existen),
    line("Respaldos disponibles", data.respaldos_disponibles),
    "",
    "6. EVALUACIÓN GENERAL DEL TRABAJADOR",
    ...EVAL_ASPECTS.map(([field, label]) => line(label, data[`eval_${field}`])),
    "",
    "7. ANÁLISIS DE LA JEFATURA",
    line("¿Era evitable?", data.evitable),
    line("Acciones que podrían haber ayudado", data.acciones_mejora),
    line("¿Recontrataría?", data.recontrataria),
    line("¿Requiere reemplazo?", data.requiere_reemplazo),
    "",
    "8. COMENTARIOS Y FUNDAMENTO",
    fmt(data.comentarios),
    "",
    "RESPONSABLE DE LA SOLICITUD",
    line("Nombre de quien completa el formulario", data.responsable_nombre),
    line("Cargo", data.responsable_cargo),
    line("Fecha", data.responsable_fecha),
    line("Jefatura/Gerencia que toma conocimiento", data.jefatura_conocimiento),
    line("Fecha", data.fecha_conocimiento),
  ].join("\n");
}

function fmt(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return value && String(value).trim() ? value : "-";
}

function buildCorsHeaders(request) {
  const allowed = (process.env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((o) => o.trim());
  const origin = request.headers.get("origin");
  const allowOrigin = allowed.includes("*")
    ? "*"
    : allowed.includes(origin)
    ? origin
    : allowed[0];

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(status, body, corsHeaders) {
  return {
    status,
    jsonBody: body,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  };
}
