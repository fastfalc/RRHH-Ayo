// Configuracion del formulario de RRHH.
// Completar HR_EMAIL con el correo Microsoft (Outlook/Office 365) de la persona de RRHH.
const CONFIG = {
  HR_EMAIL: "RRHH@ayomkt.cl",
  // Cuando haya un backend (Microsoft Graph API o Power Automate), completar esta URL
  // y sendRequest() hara un POST en lugar de abrir el cliente de correo.
  SUBMIT_ENDPOINT: null,
};

const form = document.getElementById("rrhh-form");
const statusEl = document.getElementById("form-status");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "";
  statusEl.className = "status";

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = Object.fromEntries(new FormData(form).entries());
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    await sendRequest(data);
    statusEl.textContent = "Tu solicitud fue generada correctamente.";
    statusEl.classList.add("success");
    form.reset();
  } catch (err) {
    statusEl.textContent = "No se pudo enviar la solicitud. Intentá nuevamente.";
    statusEl.classList.add("error");
    console.error(err);
  } finally {
    submitButton.disabled = false;
  }
});

async function sendRequest(data) {
  if (CONFIG.SUBMIT_ENDPOINT) {
    const response = await fetch(CONFIG.SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formType: "general", data }),
    });
    if (!response.ok) {
      throw new Error(`Submit failed with status ${response.status}`);
    }
    return;
  }

  // Fallback sin backend: abre el cliente de correo del usuario con los
  // datos precargados, listo para que el usuario confirme el envio.
  const subject = encodeURIComponent(`Solicitud RRHH: ${data.motivo}`);
  const body = encodeURIComponent(
    `Nombre: ${data.nombre}\n` +
      `Email: ${data.email}\n` +
      `Area: ${data.area || "-"}\n` +
      `Motivo: ${data.motivo}\n\n` +
      `Detalle:\n${data.mensaje}`
  );
  window.location.href = `mailto:${CONFIG.HR_EMAIL}?subject=${subject}&body=${body}`;
}
