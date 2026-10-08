# 11 · El formulario de inscripción · para Tomás

Qué tiene que tener el formulario de la landing para que funcione con el
backend. **No es diseño:** cómo se ve lo decidís vos. Esto es qué campos van,
qué valida cada uno, qué se manda a la API y qué se muestra según lo que
responda.

El porqué de cada decisión está en el [doc 09](09-embudo-de-inscripcion.md).
Los correos que dispara, en el [doc 10](10-correos.md).

> **Estado:** el endpoint **todavía no está implementado**. Este documento es
> el contrato acordado; cuando esté hecho va a aparecer en
> `contrato/openapi.yaml` y te aviso. Mientras tanto se puede construir contra
> las respuestas de ejemplo de abajo.

---

## Lo esencial en cuatro líneas

1. **Es el único formulario del concurso.** Todos los canales (LinkedIn,
   Instagram…) traen gente a la landing.
2. **Ya no es un pre-registro, es la inscripción:** deja a la persona
   habilitada para entrar a la plataforma con Google.
3. **Solo dos cosas son obligatorias:** el correo y aceptar las bases. Todo lo
   demás es opcional.
4. **Todo termina en el grupo de WhatsApp.** El enlace al grupo lo da la API en
   la respuesta; el front nunca lo tiene escrito.

---

## 1 · Los campos

| Campo | Nombre en la API | Obligatorio | Tipo y validación |
|---|---|---|---|
| Correo de Google | `correo` | **Sí** | Correo válido, hasta 254 caracteres |
| Acepto las bases | `aceptaBases` | **Sí** | Tiene que ser `true` |
| Nombre | `nombre` | No | Texto, hasta 120 |
| Apellido | `apellido` | No | Texto, hasta 120 |
| Teléfono | `telefono` | No | Formato internacional E.164, ej. `+5491123456789` |
| Tipo | `tipoInstitucion` | No | `universidad` · `trabajo` · `independiente` |
| Universidad o trabajo | `institucion` | No | Texto, hasta 200 |
| País | `pais` | No | Código ISO de dos letras, ej. `AR` |
| *(oculto)* Turnstile | `turnstileToken` | **Sí** | Lo genera el widget |
| *(oculto)* Origen | `origen` | No | Lo lee el front de la URL |
| *(oculto)* Token de completar | `tokenCompletar` | No | Solo si llega desde el correo de alerta |

### Detalle de cada uno

**Correo de Google.** Es el punto que más consultas va a generar, así que el
texto tiene que dejarlo claro:

- Etiqueta: *«Correo de Google»* (no «Correo electrónico»).
- Ayuda debajo: *«Con este correo vas a entrar a la plataforma.»*
- Si después entra con otra cuenta de Google, la plataforma no lo deja pasar.

**Acepto las bases.** Obligatorio siempre, aunque deje solo el correo. Lo que
dice el texto y a dónde enlaza «las bases» todavía no está: las bases no se
escribieron. Dejá el enlace preparado; la URL la vas a recibir de la API (ver
§5).

**Teléfono.** Selector de país (con su prefijo) más el número. Se manda **ya
armado en E.164**: `+` código de país y número, sin espacios ni guiones. Si la
persona elige país en el campo *País*, conviene precargar ese prefijo en el
selector del teléfono.

**Tipo.** Lo pidió la organización: puede inscribirse gente que ya trabaja,
no solo estudiantes. Tres opciones:

| Valor | Texto sugerido |
|---|---|
| `universidad` | Estudio en una universidad |
| `trabajo` | Trabajo en un estudio o empresa |
| `independiente` | Trabajo por mi cuenta |

El placeholder de *Universidad o trabajo* puede cambiar según la opción.

**País.** Hoy el select manda el nombre (`'Argentina'`). Tiene que mandar el
**código ISO**:

| País | Código |
|---|---|
| Argentina | `AR` |
| Bolivia | `BO` |
| Brasil | `BR` |
| Chile | `CL` |
| Colombia | `CO` |
| Costa Rica | `CR` |
| Ecuador | `EC` |
| México | `MX` |
| Paraguay | `PY` |
| Perú | `PE` |
| Uruguay | `UY` |
| Otro | `ZZ` |

Si se suman países, cualquier código ISO 3166-1 de dos letras sirve.

---

## 2 · Los tres campos ocultos

### Turnstile

El captcha de Cloudflare. En la mayoría de los casos es invisible.

- **Clave de sitio:** `0x4AAAAAAFRVKhCUdvWNByhd` (es pública).
- Script: `https://challenges.cloudflare.com/turnstile/v0/api.js`
- Modo del widget: gestionado. Ya está creado y habilitado para
  `challenge.habisite.com` y `localhost`.
- El token que genera se manda como `turnstileToken`.
- **El token es de un solo uso y vence a los 5 minutos.** Si el envío falla por
  cualquier motivo, hay que **resetear el widget** (`turnstile.reset()`) antes
  de volver a intentar. Si no, el segundo intento siempre da `403`.

### Origen

De qué canal vino la persona. Cada publicación lleva su enlace:
`challenge.habisite.com/?origen=linkedin`.

- Al cargar la landing, leer `origen` de la URL. Si no viene, probar con
  `utm_source`. Si tampoco, no mandar nada.
- **Guardarlo en `sessionStorage`** apenas se lee: si la persona navega por la
  landing antes de inscribirse, el parámetro se pierde de la URL.
- Mandarlo tal cual. La API lo normaliza (minúsculas, hasta 40 caracteres).

### Token de completar

Quien deja solo el correo recibe una alerta con un botón **«Completar mi
inscripción»**. Ese botón lleva a:

```
https://challenge.habisite.com/?completar={token}#inscripcion
```

Cuando la landing abre con `?completar=`:

1. Pide los datos que ya tiene: `GET /inscripcion/completar/{token}`.
2. Precarga el formulario con lo que devuelva.
3. **El correo va bloqueado** (solo lectura): se está completando esa
   inscripción, no creando otra.
4. Manda el token en el envío como `tokenCompletar`.

```json
// GET /inscripcion/completar/{token}  →  200
{
  "correo": "ana@gmail.com",
  "nombre": "",
  "apellido": "",
  "telefono": "+5491123456789",
  "tipoInstitucion": null,
  "institucion": null,
  "pais": null
}
```

Si responde `404`, el token no existe o ya se usó: mostrar el formulario vacío,
como si hubiera entrado normal.

---

## 3 · El envío

```
POST {API}/inscripcion
Content-Type: application/json
```

No hace falta `credentials: 'include'`: es una ruta pública, sin sesión.

```json
{
  "correo": "ana@gmail.com",
  "aceptaBases": true,
  "nombre": "Ana",
  "apellido": "Duarte",
  "telefono": "+5491123456789",
  "tipoInstitucion": "universidad",
  "institucion": "FADU-UBA",
  "pais": "AR",
  "turnstileToken": "0.xxxx…",
  "origen": "linkedin",
  "tokenCompletar": null
}
```

Los campos opcionales que la persona dejó vacíos se pueden **omitir o mandar
en `null`**. No mandar `""`.

---

## 4 · La respuesta y qué mostrar

### `200` · salió bien

```json
{
  "estado": "completa",
  "whatsapp": "https://api.challenge.habisite.com/r/Xk3f…"
}
```

`estado` decide la pantalla:

**`completa`** (dejó nombre, apellido, tipo, institución y país):

- Pantalla de gracias: *«¡Listo! Te llevamos al grupo oficial del
  concurso…»*
- **A los 3 segundos, redirige sola** a la URL de `whatsapp`.
- **Además, un botón** a esa misma URL, por si el navegador frena la
  redirección automática (pasa en algunos navegadores de celular).

**`incompleta`** (dejó solo el correo, o el correo y algo más):

- Pantalla de gracias con el **botón al grupo** (la misma URL de `whatsapp`).
- **Sin redirección automática.**
- Texto: *«Te mandamos un correo para que completes tus datos cuando
  puedas.»*

**Siempre usar la URL que devuelve la API.** No apunta directo a WhatsApp:
pasa primero por la API, que registra el clic. Así se frena el recordatorio y
se puede cambiar el grupo sin tocar el front.

> **Si el correo ya estaba inscripto, la respuesta es la misma** que para uno
> nuevo. Es a propósito: decir «ese correo ya está inscripto» le permitiría a
> cualquiera averiguar quién se anotó. No hay que mostrar ningún mensaje
> distinto.

### Los errores

Todos tienen la forma de siempre (ver [doc 07](07-api-para-el-front.md)):

```json
{
  "estado": 400,
  "mensaje": "Los datos enviados no son válidos",
  "detalles": ["El correo no tiene forma de correo"],
  "ruta": "/inscripcion",
  "hora": "2026-10-08T16:44:28.602Z"
}
```

| Código | Qué pasó | Qué mostrar |
|---|---|---|
| `400` | Algún campo no pasó la validación | Los textos de `detalles`. Conviene validar lo mismo en el navegador antes de enviar, así casi nunca llega a esto |
| `403` | Turnstile no aprobó | *«No pudimos verificar el envío. Probá de nuevo.»* **Resetear el widget** |
| `429` | Demasiados envíos desde la misma IP | *«Demasiados intentos. Esperá un minuto y probá de nuevo.»* |
| `500` | Falla nuestra | *«Algo falló de nuestro lado. Probá de nuevo en unos minutos.»* |

En cualquier error, **resetear Turnstile** antes de permitir reintentar.

---

## 5 · Textos que cambian

No es diseño, pero son textos que hoy dicen algo que ya no es cierto:

| Hoy | Tiene que decir |
|---|---|
| «Pre-registro 2026» | «Inscripción 2026» |
| «Deja tus datos y te enviamos las bases, el calendario y el enlace al grupo oficial del concurso.» | Algo como «Deja tus datos y súmate al grupo oficial, donde compartimos las bases, el calendario y el acceso a la plataforma.» |
| Paso 03: «…antes del 7 de junio» | **Sin fecha** |
| «Cierra el 24 de mayo 2026 · sin costo» | «Sin costo», **sin fecha** |
| Botón «Pre-registrarme» | «Inscribirme» |
| Éxito: «Te escribimos a … con las bases» | Las dos pantallas de §4 |

**Las fechas que muestra la landing hoy ya pasaron** y nunca estuvieron
confirmadas. Hasta que la organización confirme las reales, mejor no mostrar
ninguna.

**El enlace de «las bases»:** la URL va a venir de la API (`GET /edicion`
la va a incluir como `terminosUrl`). Hasta que exista el texto de las bases,
puede quedar en `null`: en ese caso, mostrar el texto sin enlace.

---

## 6 · Lo que viene después

Pantallas que también van a hacer falta, con su especificación aparte cuando
el back esté:

- **`/invitacion/{token}`:** «Ana te invitó a su equipo», con el botón para
  entrar con Google y aceptar.
- **Completar datos en el panel:** quien se inscribió solo con el correo y
  entra con Google ve primero un pedido de completar sus datos. `GET /yo` va a
  traer un campo que lo indica.

---

## Para probar en local

| | |
|---|---|
| API | `http://localhost:3000` |
| Turnstile | La clave de sitio real funciona en `localhost`. Para forzar casos, Cloudflare tiene claves de prueba: `1x00000000000000000000AA` (siempre aprueba) y `2x00000000000000000000AB` (siempre rechaza) |
