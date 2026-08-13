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

El estado actual (`mailto`) funciona sin backend, pero requiere que el empleado confirme el env&iacute;o manualmente. Para que llegue autom&aacute;ticamente a la bandeja de RRHH hay tres caminos, de m&aacute;s a menos robusto:

1. **Microsoft Graph API (recomendado)**
   Un backend peque&ntilde;o (Azure Function, Node/Express, etc.) recibe el POST del formulario y usa el endpoint `sendMail` de Microsoft Graph para enviar el correo desde/hacia la cuenta de RRHH. Requiere:
   - Registrar una app en Azure AD (Entra ID) del tenant de Microsoft 365.
   - Permiso de aplicaci&oacute;n `Mail.Send` (con consentimiento de un admin).
   - Tenant ID, Client ID y Client Secret (o certificado).
   Una vez armado el backend, solo hay que completar `CONFIG.SUBMIT_ENDPOINT` en `script.js` con su URL y el formulario deja de usar `mailto`.

2. **Power Automate (sin c&oacute;digo, nativo de Microsoft 365)**
   Se crea un flujo con disparador "Cuando se recibe una solicitud HTTP", que recibe los datos del formulario y usa el conector "Office 365 Outlook &rarr; Enviar un correo" para mandarlo a la casilla de RRHH. Se configura desde el portal de Power Automate, sin tocar c&oacute;digo del lado del backend.

3. **`mailto` (actual)**
   Cero configuraci&oacute;n, pero el env&iacute;o final depende de que el usuario confirme en su cliente de correo.

Para avanzar con la opci&oacute;n 1 o 2 hace falta el correo real de la persona de RRHH y, si se elige Graph API, acceso para registrar la app en Azure AD (o que alguien con permisos de administrador lo haga).
