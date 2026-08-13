# RRHH-Ayo

Formulario de Solicitud General a RRHH.

## Uso

Abrir `index.html` en el navegador (o publicarlo en cualquier hosting est&aacute;tico: GitHub Pages, Netlify, etc.). El empleado completa el formulario y, al enviar, hoy se abre su cliente de correo con el mensaje precargado hacia `RRHH@ayomkt.cl` (configurable en `script.js`, constante `CONFIG.HR_EMAIL`).

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
