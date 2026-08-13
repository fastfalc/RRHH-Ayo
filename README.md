# RRHH-Ayo

Formularios de RRHH.

- `index.html` &mdash; Solicitud General a RRHH.
- `desvinculacion.html` &mdash; Solicitud de Desvinculaci&oacute;n de Personal (para que la jefatura directa la complete al pedir la salida de un trabajador), calcado del formulario Word que envi&oacute; RRHH: datos del trabajador, modalidad, motivo principal, factores asociados, antecedentes/gestiones previas, evaluaci&oacute;n general, an&aacute;lisis de la jefatura y comentarios.

## Uso

Abrir cualquiera de los `.html` en el navegador (o publicarlos en un hosting est&aacute;tico: GitHub Pages, Netlify, etc.). Al enviar, hoy se abre el cliente de correo del usuario con el mensaje precargado hacia `RRHH@ayomkt.cl` (configurable en `script.js` / `desvinculacion.js`, constante `CONFIG.HR_EMAIL`).

El formulario de desvinculaci&oacute;n tiene muchos campos (~35), as&iacute; que adem&aacute;s de abrir el correo copia autom&aacute;ticamente el detalle completo al portapapeles (el `mailto` por s&iacute; solo puede truncarse en algunos clientes por longitud) &mdash; el usuario solo tiene que pegarlo (Ctrl+V) si el cuerpo no vino completo.

### Sobre la trazabilidad de las desvinculaciones

El objetivo declarado de este formulario es poder **comparar salidas entre s&iacute;** (motivos frecuentes, &aacute;reas con m&aacute;s rotaci&oacute;n, etc.). Una bandeja de correos con estas solicitudes sirve para el registro individual, pero analizar patrones a partir de emails sueltos es tedioso. Para eso conviene que, adem&aacute;s de notificar a RRHH por correo, cada env&iacute;o quede tambi&eacute;n guardado como una fila en una planilla/base de datos (por ejemplo un Excel en SharePoint alimentado autom&aacute;ticamente por Power Automate, o una tabla si se arma un backend propio). Esa parte se puede sumar cuando se defina la opci&oacute;n de conexi&oacute;n de correo (ver abajo).

## C&oacute;mo conectarlo al correo Microsoft (Outlook / Office 365) de RRHH

Estado actual: cuando `CONFIG.SUBMIT_ENDPOINT` est&aacute; vac&iacute;o (`null`), los formularios usan `mailto` como respaldo (funciona sin backend, pero requiere que el usuario confirme el env&iacute;o). Cuando se completa esa URL con la del backend de Azure Functions (carpeta `api/`), el env&iacute;o pasa a ser autom&aacute;tico v&iacute;a Microsoft Graph API.

### Backend (`api/`)

Ya est&aacute; en el repo: una Azure Function HTTP (`api/src/functions/submit.js`) que recibe `{ formType, data }` desde cualquiera de los dos formularios, arma el cuerpo del correo y lo env&iacute;a con el endpoint `sendMail` de Microsoft Graph usando credenciales de aplicaci&oacute;n (client credentials).

**1. Registrar la app en Entra ID** (lo hace quien tenga rol de Administrador global / Administrador de aplicaciones):

1. [entra.microsoft.com](https://entra.microsoft.com) &rarr; Identity &rarr; Applications &rarr; App registrations &rarr; **New registration**.
2. Nombre: `RRHH-Ayo Form Backend`. Tipo de cuenta: solo este tenant. Sin Redirect URI (no hace falta, es server-to-server).
3. Copiar de la pantalla de la app: **Application (client) ID** y **Directory (tenant) ID**.
4. **Certificates & secrets** &rarr; New client secret &rarr; copiar el **value** apenas se genera (no se puede ver despu&eacute;s).
5. **API permissions** &rarr; Add a permission &rarr; **Microsoft Graph** &rarr; **Application permissions** &rarr; buscar y tildar **`Mail.Send`** &rarr; Add permissions.
6. En la misma pantalla, bot&oacute;n **"Grant admin consent for &lt;tenant&gt;"** (solo lo ve/puede un admin global o de aplicaciones) &mdash; sin este paso el permiso queda pedido pero no autorizado.

**2. (Recomendado) Restringir a qu&eacute; buz&oacute;n puede enviar.** El permiso `Mail.Send` de aplicaci&oacute;n, tal cual, deja que esta app env&iacute;e correo *en nombre de cualquier usuario del tenant*. Para limitarlo solo al buz&oacute;n de RRHH, un admin corre esto una vez en [Exchange Online PowerShell](https://learn.microsoft.com/powershell/exchange/connect-to-exchange-online-powershell):

   ```powershell
   New-ApplicationAccessPolicy -AppId "<CLIENT_ID de la app>" `
     -PolicyScopeGroupId "RRHH@ayomkt.cl" `
     -AccessRight RestrictAccess `
     -Description "Solo puede enviar como RRHH@ayomkt.cl"
   ```

**3. Desplegar la Azure Function:**

   ```bash
   # Una sola vez: crear los recursos (elegir un nombre único para <FUNCTION_APP_NAME>)
   az group create --name rrhh-ayo-rg --location eastus
   az storage account create --name rrhhayostorage --resource-group rrhh-ayo-rg --sku Standard_LRS
   az functionapp create --resource-group rrhh-ayo-rg --consumption-plan-location eastus \
     --runtime node --runtime-version 20 --functions-version 4 \
     --name <FUNCTION_APP_NAME> --storage-account rrhhayostorage

   # Variables de entorno (usar los valores reales del paso 1)
   az functionapp config appsettings set --name <FUNCTION_APP_NAME> --resource-group rrhh-ayo-rg --settings \
     TENANT_ID="<tenant id>" CLIENT_ID="<client id>" CLIENT_SECRET="<client secret>" \
     SENDER_UPN="RRHH@ayomkt.cl" HR_EMAIL="RRHH@ayomkt.cl" \
     ALLOWED_ORIGIN="https://fastfalc.github.io"

   # Deploy del código (desde la carpeta api/, con Azure Functions Core Tools instalado)
   cd api && func azure functionapp publish <FUNCTION_APP_NAME>
   ```

   Para probar localmente antes de desplegar: copiar `api/local.settings.json.example` a `api/local.settings.json`, completar los valores reales (ese archivo está en `.gitignore`, nunca se sube) y correr `func start` dentro de `api/`.

**4. Conectar el frontend.** Una vez desplegada, la URL queda algo como `https://<FUNCTION_APP_NAME>.azurewebsites.net/api/submit`. Completar esa URL en `CONFIG.SUBMIT_ENDPOINT` de **ambos** `script.js` y `desvinculacion.js`, y ajustar `ALLOWED_ORIGIN` en la Function App para que coincida con el dominio real donde quede publicado el formulario (GitHub Pages, etc.).

### Alternativas

- **Power Automate** (sin backend propio): flujo con disparador "Cuando se recibe una solicitud HTTP" + conector "Office 365 Outlook &rarr; Enviar un correo". M&aacute;s r&aacute;pido de armar si no se quiere mantener c&oacute;digo, pero el disparador HTTP es un conector *premium* (requiere licencia Power Automate por usuario).
- **`mailto`** (estado por defecto si no se configura `SUBMIT_ENDPOINT`): cero configuraci&oacute;n, pero el env&iacute;o final depende de que el usuario confirme en su cliente de correo.
