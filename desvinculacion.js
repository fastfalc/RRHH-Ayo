// Configuracion del formulario de Solicitud de Desvinculacion de Personal.
const CONFIG = {
  HR_EMAIL: "RRHH@ayomkt.cl",
  // Cuando haya un backend (Microsoft Graph API o Power Automate), completar esta URL
  // y sendRequest() hara un POST en lugar de usar mailto/portapapeles.
  SUBMIT_ENDPOINT: null,
};

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
const EVAL_OPTIONS = ["Bueno", "Regular", "Deficiente", "No aplica"];

function buildEvalTable() {
  const tbody = document.getElementById("eval-table-body");
  const rows = EVAL_ASPECTS.map(([field, label]) => {
    const fieldName = `eval_${field}`;
    const cells = EVAL_OPTIONS.map(
      (opt) =>
        `<td><input type="radio" name="${fieldName}" value="${opt}" aria-label="${label}: ${opt}" /></td>`
    ).join("");
    return `<tr><th scope="row">${label}</th>${cells}</tr>`;
  }).join("");
  tbody.innerHTML = rows;
}
buildEvalTable();

const form = document.getElementById("desvinculacion-form");
const statusEl = document.getElementById("form-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "";
  statusEl.className = "status";

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = collectFormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    await sendRequest(data);
    form.reset();
    buildEvalTable();
  } catch (err) {
    statusEl.textContent = "No se pudo enviar la solicitud. Intentá nuevamente.";
    statusEl.classList.add("error");
    console.error(err);
  } finally {
    submitButton.disabled = false;
  }
});

// A diferencia de un formulario simple, este tiene checkboxes de seleccion
// multiple: FormData.getAll() junta todos los valores marcados por nombre.
function collectFormData(formEl) {
  const formData = new FormData(formEl);
  const result = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key);
    result[key] = values.length > 1 ? values : values[0];
  }
  return result;
}

async function sendRequest(data) {
  const report = buildReport(data);

  if (CONFIG.SUBMIT_ENDPOINT) {
    const response = await fetch(CONFIG.SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`Submit failed with status ${response.status}`);
    }
    statusEl.textContent = "Tu solicitud fue enviada correctamente a RR.HH.";
    statusEl.classList.add("success");
    return;
  }

  // Fallback sin backend: no todos los clientes de correo soportan un
  // mailto tan largo, asi que copiamos el reporte completo al portapapeles
  // y abrimos el correo con la instruccion de pegarlo.
  let copied = false;
  try {
    await navigator.clipboard.writeText(report);
    copied = true;
  } catch (err) {
    console.warn("No se pudo copiar al portapapeles automaticamente", err);
  }

  const subject = encodeURIComponent(
    `Solicitud de desvinculación: ${data.nombre_trabajador || ""}`
  );
  const body = encodeURIComponent(
    copied
      ? "El detalle completo de la solicitud fue copiado a tu portapapeles. Pegalo aquí (Ctrl+V) antes de enviar este correo."
      : report
  );
  window.location.href = `mailto:${CONFIG.HR_EMAIL}?subject=${subject}&body=${body}`;

  statusEl.textContent = copied
    ? "Se abrió tu cliente de correo y copiamos el detalle al portapapeles: pegalo (Ctrl+V) en el cuerpo antes de enviarlo."
    : "Se abrió tu cliente de correo con el detalle de la solicitud.";
  statusEl.classList.add("success");
}

function buildReport(data) {
  const line = (label, value) => `${label}: ${formatValue(value)}`;
  const lines = [
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
    formatValue(data.comentarios),
    "",
    "RESPONSABLE DE LA SOLICITUD",
    line("Nombre de quien completa el formulario", data.responsable_nombre),
    line("Cargo", data.responsable_cargo),
    line("Fecha", data.responsable_fecha),
    line("Jefatura/Gerencia que toma conocimiento", data.jefatura_conocimiento),
    line("Fecha", data.fecha_conocimiento),
  ];
  return lines.join("\n");
}

function formatValue(value) {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "-";
  return value && String(value).trim() ? value : "-";
}
