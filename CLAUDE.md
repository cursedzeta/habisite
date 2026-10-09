# Habisite Design Challenge — contexto del proyecto

Este archivo es la fuente de verdad para cualquiera que agarre el repo: personas
o sesiones de Claude Code. Si algo cambia y contradice lo de acá, **actualizá
este archivo en el mismo commit.**

Última actualización: 8 de octubre de 2026 (llegó el back de Gonzalo, el
documento de Jarod y el formulario conectado a la API).

---

## 1. Qué es esto

**Habisite** es un estudio latinoamericano de diseño de espacios. Organiza el
**Habisite Challenge 2026-II** (antes «Habisite Design Challenge 2026»), un
concurso internacional de arquitectura para estudiantes de últimos años y
egresados de Latinoamérica. **El nombre nuevo va en todo el sitio**: hay
partes de la landing y de los paneles que todavía dicen el viejo.

Son **cinco superficies** y son **una sola aplicación**, no proyectos separados:

| Superficie | Quién entra | Para qué | Estado |
|---|---|---|---|
| **Landing del concurso** | Público | Se inscribe y cae en el grupo de WhatsApp | En producción |
| **Jurados y ediciones** | Público | Memoria de la 1ª edición y jurado 2026-II. Sin puntajes | Sin construir · pedido de Jarod |
| **Panel de concursantes** | Inscriptos, login con Google | Su equipo sube un PDF | Prototipo con datos inventados |
| **Panel de jurado** | Jurados, invitados uno por uno | Califican | Prototipo con datos inventados |
| **Panel de admin** | Habisite | Admite propuestas, cierra la evaluación, publica | Sin construir |

Todo comparte una sola base: lo que carga el jurado y lo que publica el admin
le llega al concursante con una consulta, no con una integración entre sistemas.

**El puntaje del jurado nunca sale de adentro del sistema**: ordena y define el
podio, pero el concursante no ve ningún número. Si ve o no la devolución
escrita está **en disputa** (ver §6.2).

A futuro, el sitio institucional (`habisite.com`, hoy en WordPress) también se
migra a código y se aloja en este mismo proyecto de Railway.

---

## 2. Estado actual

**En producción:**

- **https://challenge.habisite.com** — la landing del concurso. Ver §5.
- **https://api.challenge.habisite.com** — la API del concurso, con su Postgres
  en la red privada. Desplegada por Gonzalo el 8/10.

**Hecho:**

- `web/` — React 19 + Vite 8. **Sin Tailwind** (ver §9). El sistema de diseño
  exportado desde Claude Design y portado a código.
- `backendGonzalo/` — NestJS + PostgreSQL. 42 endpoints: login con Google,
  inscripción, equipos e invitaciones, propuesta y PDF, evaluación en dos
  vueltas, resultados y diez correos por Resend.
- `contrato/openapi.yaml` — generado desde el back.
- **El formulario de la landing conectado a la API** (`POST /inscripcion`, con
  Turnstile). Hecho el 8/10.
- **El ingreso a los paneles**: Google o enlace por correo, con la sesión
  real de `GET /yo`. **Una sola URL, `/panel`**, que muestra la vista según el
  rol; el admin puede mirar las otras dos. Los datos de la persona ya son
  reales; lo de adentro de cada panel todavía es de ejemplo. El enlace por
  correo funciona en producción; Google todavía no (ver §11).

**No existe todavía:**

- El contenido de los paneles conectado a la API (propuesta, equipo,
  evaluación): hoy sale de `datos-demo.js`.
- La página pública de jurados y ediciones.
- Las acciones del panel de admin (existe la pantalla, no las acciones).
- El sitio institucional migrado.

**Reparto de trabajo:** Tomás hace el front (`web/`). Gonzalo hace el back
(`backendGonzalo/`).

---

## 3. Estructura del repo

`github.com/cursedzeta/habisite`, rama `main`.

```
habisite/
├─ web/            front — React + Vite. ESTO es lo que está desplegado.
│  ├─ src/
│  │  ├─ App.jsx           enrutador mínimo: /, /ingresar y /panel (vista según el rol)
│  │  ├─ Landing.jsx       la landing
│  │  ├─ Inscripcion.jsx   el formulario, contra la API
│  │  ├─ api.js            dirección de la API y pedir()
│  │  ├─ listas.js         países y tipos, compartidos por formulario y paneles
│  │  ├─ sesion/           ingreso (Google o enlace) y la puerta de los paneles
│  │  ├─ paneles/          prototipo de los paneles (datos inventados)
│  │  ├─ index.css         importa los 4 CSS en orden
│  │  ├─ ds/               el sistema de diseño (13 componentes)
│  │  │  ├─ base.jsx       Icon · Button · IconButton · Badge · Eyebrow · Card · SectionHeader
│  │  │  ├─ formulario.jsx Field · Input · Select · Checkbox
│  │  │  └─ navegacion.jsx Navbar · Footer
│  │  └─ estilos/
│  │     ├─ tokens.css        colores, tipografía, espaciado, radios
│  │     ├─ componentes.css   los estilos hs-* del sistema
│  │     ├─ pagina.css        estilos de la landing
│  │     └─ interacciones.css NUESTRAS modificaciones (ver §9)
│  └─ package.json
├─ backendGonzalo/ back — NestJS. Su documentación está en docs/ adentro
├─ contrato/
│  └─ openapi.yaml la frontera entre los dos, generada desde el back
├─ docs/           los documentos que manda la organización, con la fecha
│                  en que llegaron: AAAA-MM-DD - Quién - Qué.pdf
├─ reference/      identidad extraída del WordPress viejo
├─ prototipo/      prototipos HTML previos, superados por web/
├─ plan/           plan técnico inicial (tiene partes vencidas)
├─ req-concursantes.md
└─ req-jurado.md
```

**Dónde está la definición de cada cosa.** Hay tres fuentes y hoy **no
coinciden del todo**:

1. **`backendGonzalo/docs/`** — lo que está implementado. Sale de lo que
   definió **Sol** el 7 y 8/9 (`docs/2026-09-08 - Sol - …`). Para el front, los
   que importan son el **07** (qué endpoint usa cada pantalla) y el **11** (el
   formulario).
2. **`docs/2026-10-08 - Jarod - Ajustes a la plataforma 2026-II.pdf`** — lo que
   pide Jarod, más nuevo, y que contradice varias cosas de Sol. Ver §6.2.
3. **`req-concursantes.md` y `req-jurado.md`** — lo que se habló con Tomás el
   8/9, actualizado el 8/10 con el estado de cada punto.

**Cuando choquen, no se implementa ninguna de las dos versiones** hasta que la
organización decida. La tabla de §6.2 dice cuáles están en esa situación.

**Un solo repo, un servicio de Railway por carpeta.** Railway soporta monorepos:
cada servicio apunta al mismo repo con su propio *Root Directory*: `web/` y
`backendGonzalo/`.

**`contrato/openapi.yaml` es la frontera.** Lo genera el back; de ahí el front
saca sus tipos (`npx openapi-typescript ../contrato/openapi.yaml -o
src/api/tipos.ts`) y puede programar pantallas sin esperar a la API.

---

## 4. Infraestructura

- **Cloudflare es el DNS autoritativo** de `habisite.com`
  (`leonard.ns.cloudflare.com`, `annalise.ns.cloudflare.com`).
- **`habisite.com` sigue en WordPress**, hosteado fuera de Railway. Cloudflare
  tapa el origen. Falta averiguar dónde se paga ese hosting.

### Railway

Proyecto **`habisite-plataforma`** (`2ddeacf4-f570-4ea9-afc7-8428393fbaf4`),
workspace *GrowthIMBAR's Projects*, único entorno `production`.

| Servicio | Root | Dominio |
|---|---|---|
| `challenge-web` | `web/` | challenge.habisite.com |
| `challenge-api` | `backendGonzalo/` | api.challenge.habisite.com |
| `Postgres` | — | solo red privada (`postgres.railway.internal`) |

La API y su base se desplegaron el 08.10; el detalle está en
`backendGonzalo/docs/02-arquitectura.md`. Queda espacio para el sitio
institucional migrado.

⚠️ **`api.challenge` va con la nube GRIS (DNS only), no naranja.** El
certificado gratis de Cloudflare cubre un solo nivel (`*.habisite.com`) y
`api.challenge.habisite.com` tiene dos: con proxy, el navegador da error de
certificado. En gris, el certificado lo emite Railway.

### El proyecto viejo (borrado)

Existía un proyecto `Habisite` con una API Java en `api.habisite.com`, una
integración con WhatsApp y un Postgres de 1.1 GB. **Se borró el 8/9/2026 con
autorización explícita**: la base tenía contactos viejos que se descartaron.

- El código de esos servicios está en **`Valebongi/Habisite`** (no en este repo).
- Las variables de entorno (credenciales SMTP, `DATABASE_URL`, `ADMIN_SEED_PASS`)
  quedaron respaldadas **fuera del repo**, en `C:\Users\zenga\IMB\respaldo-railway\`.
  No están en git y no deben commitearse.

---

## 5. Despliegue

El servicio se redespliega solo con cada push a `main` que toque `web/`
(*watch path* `web/**`, así los commits del back no redespliegan el front).

**Cómo está montado.** `web/` es una SPA estática: `vite build` produce `dist/`,
pero Railway necesita un proceso escuchando en un puerto. Por eso existe:

```json
"start": "serve -s dist -l tcp://0.0.0.0:${PORT:-3000}"
```

El `-s` hace que cualquier ruta desconocida caiga en `index.html`, que hoy no
hace falta pero sí cuando los paneles tengan rutas.

**Si creás un servicio nuevo, fijá el Root Directory ANTES del primer deploy.**
Railway lanza un build automático al crear el servicio, y sin root configurado
construye desde la raíz del repo —donde no hay `package.json`— y falla.

### Dominios en Cloudflare

Para agregar un dominio a un servicio de Railway hacen falta **dos** registros
(el CNAME solo no alcanza: sin el TXT, Railway devuelve 404 en vez de enrutar):

| Tipo | Nombre | Valor | Proxy |
|---|---|---|---|
| CNAME | `challenge` | el que da Railway | **Proxied (naranja)** |
| TXT | `_railway-verify.challenge` | el que da Railway | — |

Y **SSL/TLS en modo `Full`** (*SSL/TLS → Overview*). Ni `Flexible` (bucle
infinito de redirecciones) ni `Full (Strict)` (error 526 en cada renovación
de certificado).

Dos cosas normales que parecen errores:

- Railway muestra el CNAME como `REQUIRES_UPDATE` para siempre. Es porque la
  nube naranja se lo tapa. Lo que vale es `Verified: yes`.
- El certificado tarda entre minutos y una hora.

⚠️ **Si el certificado se traba, NO borres y vuelvas a agregar el dominio.**
Let's Encrypt permite 5 certificados por dominio por semana; pasarse deja el
dominio bloqueado 7 días. El truco correcto es poner el CNAME en gris (*DNS
only*), esperar a que Railway emita, y volver a naranja.

---

## 6. Reglas del concurso

El detalle de cómo está hecho el back está en `backendGonzalo/docs/`: modelo
de datos (03), máquinas de estado (04), equipos (05), evaluación (06), API
(07), correos (10). Esta sección resume las reglas, no las repite.

### 6.1 En lo que todos coinciden

- **El concursante nunca ve un número.** Solo se publica el podio.
- **El jurado puntúa por criterio, de 1 a 10.** Clave única sobre (propuesta,
  jurado, criterio). Los criterios y sus pesos viven **en la tabla
  `criterios`**: la pantalla de puntuación se genera desde `GET /criterios`,
  nunca contra campos fijos.
- **Un jurado no ve los puntajes de los otros hasta el cierre.** Si el segundo
  jurado ve el 9 que puso el primero, tiende a acercarse a ese número.
- **El cierre de entregas se aplica en el servidor**, no en el botón, con zona
  horaria explícita. Hay 15 minutos de gracia después del cierre (pedido de Sol).
- **Una propuesta es de un equipo**, de hasta 5 integrantes (valor en
  `edicion.max_integrantes`). Una persona no puede estar en dos equipos.
- **Nadie entra sin inscribirse.** El perfil nace del formulario de la landing
  o de una invitación, no del primer login.
- **Un empate en el podio lo decide el jurado en reunión.**
- **Solo `admin` cierra la evaluación y publica los resultados.**

### 6.2 En disputa entre Sol y Jarod — no implementar todavía

| Tema | Sol (8/9) · **implementado** | Jarod (8/10) |
|---|---|---|
| ¿El jurado ve al autor? | Sí | No: anónimo hasta el cierre. Una propuesta identificable queda descalificada |
| Reparto | Dos vueltas: cada jurado preselecciona un tercio, después los tres puntúan a los finalistas | Menos de ~100 propuestas: todos ven todas. Más: dos rondas |
| Devolución escrita | Opcional e interna: el concursante no la ve | El concursante la recibe |
| Corregir la calificación | Puede dejarla a medias y seguir otro día | Una sola vez: al enviar queda bloqueada |
| Criterios | 7: 35/20/20/10/5/5/5, con «cumplimiento de entregables» | 6: Creatividad y concepto 30, Potencial de mercado y aprovechamiento 20, Narrativa 15, Entorno 15, Viabilidad 10, Sostenibilidad 10. «Cumplimiento» pasa a ser un filtro de admisión previo |
| El PDF | Una sola lámina, 30 MB | Hasta 2 paneles (páginas), 40 MB |
| Cuadro de áreas | — | Obligatorio: área construida, útil y de ocupación |
| Aviso de resultados | Por el grupo de WhatsApp y redes | Por correo |
| Hora del cierre | API en `America/Argentina/Buenos_Aires` | Hora de Colombia (GMT-5) |

Las preguntas para cerrar esto se le mandaron a Jarod el 8/10.

---

## 7. Decisiones tomadas — no volver a discutirlas

- **El backend del concurso es nuevo**, no reutiliza el repo Java viejo.
  NestJS + PostgreSQL.
- **Se entra con Google o con un enlace por correo**, para los tres roles.
  **Sin contraseñas** (decidido el 9/10; `backendGonzalo/docs/12`). El
  enlace vence a los 15 minutos y sirve una vez.
- **Un solo repo** con `web/` y `backendGonzalo/`, un servicio de Railway por
  carpeta.
- **Subdominio, no ruta**: `challenge.habisite.com` y
  `api.challenge.habisite.com` (este último para que la cookie de sesión sea
  *same-site* con el front).
- **El formulario de la landing es la inscripción**, no un pre-registro, y
  termina en el **grupo de WhatsApp**: ahí se comparte el resto de la
  información y los enlaces a los paneles. Es el único formulario del
  concurso; todos los canales (LinkedIn, Instagram…) llevan a él.
- **El enlace al grupo lo da la API** (`/r/{token}`, que registra el clic). El
  front nunca lo tiene escrito.
- **Los correos salen por Resend desde `noreply@habisite.com`.**
- **El proyecto viejo de Railway se borró**, con su base de datos.
- **Una propuesta es de un equipo** y **se entrega un único PDF**, con visor y
  zoom en el panel.
- **El concursante nunca ve un puntaje.**

---

## 8. Pendientes que bloquean

1. **Quién decide entre Sol y Jarod** en los temas de §6.2. Es lo que más
   frena los paneles.
2. **Las fechas reales de la edición 2026-II.** Las que muestra la landing
   (24 mayo – 13 junio 2026) ya pasaron y nunca estuvieron confirmadas.
3. **El texto de las bases y términos.** El tilde del formulario es
   obligatorio y el correo de invitación al equipo los enlaza; mientras no
   existan, `GET /edicion/publica` devuelve `terminosUrl: null`.
4. **El enlace del grupo de WhatsApp.** Vive en una variable de entorno de la
   API, así que se cambia sin tocar código.
5. **Cuántas propuestas llegaron en la 1ª edición.** Según Jarod, define si se
   evalúa en una vuelta o en dos.
6. **La lista y las fotos de los jurados 2026-II**, y el material de la 1ª
   edición, para la página de jurados y ediciones.
7. **Los montos de los premios.** La landing dice USD 5.000 / 2.000 / 1.000,
   pero salieron del diseño generado, no de una fuente oficial.
8. **El link del menú de WordPress** apuntando a `challenge.habisite.com`, más
   una Redirect Rule 301 desde `habisite.com/habisite-design-challenge-2026/`.
9. **Pasar el proyecto de Google a «En producción»** antes de abrir la
   inscripción: en modo *Testing* hay tope de 100 usuarios y las sesiones se
   caen a los 7 días.

---

## 9. El sistema de diseño

**No usamos Tailwind.** Se usó al principio y se sacó: el diseño definitivo se
generó en Claude Design y trae su propio CSS con clases `hs-*` y custom
properties. Mezclarlo con el preflight de Tailwind alteraba la reproducción.

### La identidad

Tres colores y una tipografía:

| Token | Valor | Papel |
|---|---|---|
| `--ink` | `#0A0B0D` | Texto y trazos. Fondo del pie. |
| `--orange` | `#E43301` | La superficie de marca: hero e inscripción. |
| `--cream` | `#FFFAE6` | Detalle, nunca el papel. |

**Montserrat, solo tres pesos**: Regular 400, Semibold 600, Bold 700.

El naranja tiene luminancia media: blanco y tinta dan ambos ≈4.4:1 sobre él.
Por eso, sobre naranja, **nunca un botón naranja** — se usa `variant="ink"` o
la inversión blanca. El token `--control-fill-inverse` existe justamente para
que esa regla no dependa de que alguien la recuerde.

### Los cuatro CSS y su orden

`index.css` los importa en este orden, y el orden importa:

1. `tokens.css` — los valores
2. `componentes.css` — los estilos `hs-*`
3. `pagina.css` — la landing
4. `interacciones.css` — **lo nuestro**

**Los tres primeros son copia literal de lo que exportó Claude Design.
Todo lo que modificamos va en `interacciones.css`**, que carga último y por eso
puede pisar al resto. Esa separación es deliberada: permite comparar contra el
diseño original sin adivinar qué tocamos nosotros. Mantenerla.

Hoy `interacciones.css` contiene: la escala al 90%, el degradé del hero sin el
negro original, la deriva ambiental, la barra transparente sobre el hero, y tres
arreglos de omisiones del sistema (fondo del `<button>` del pie, color de las
`<option>` del select, y el `backdrop-filter` sin prefijo), y lo que sumó el
formulario de inscripción (ayudas y errores legibles sobre naranja, la fila
del teléfono).

### Idioma

**El código va en español**: props, variables, comentarios y commits.

**Excepción deliberada:** los 13 componentes de `src/ds/` conservan sus nombres
en inglés (`Button`, `Card`, `Field`) porque son los del sistema exportado, y
así el port se puede verificar contra el original. No renombrarlos sin motivo.

### Reglas

- **Ningún componente escribe un valor suelto.** Si hace falta un número nuevo,
  se le pone nombre en `tokens.css` primero.
- **El radio de todos los controles** —botones, campos, badges— sale de
  `--radius-pill` en `tokens.css`. Es un solo valor a propósito: el sistema
  quiere una sola forma para todo lo interactivo.
- Todo movimiento respeta `prefers-reduced-motion`.

### Una trampa del compilador

Lightning CSS **descarta la propiedad estándar cuando el fuente declara la
prefijada y la estándar juntas**, y se queda solo con `-webkit-`. Eso dejó a
Firefox sin `backdrop-filter` dos veces. Declarar siempre **solo la estándar**:
el compilador agrega el prefijo por su cuenta.

---

## 10. Comandos

```bash
cd web
npm install
npm run dev      # http://localhost:5173  (strictPort: falla si está ocupado)
npm run build
npm run lint
npm start        # sirve dist/ como en producción
```

**A qué API habla el front.** En `npm run dev`, a `http://localhost:3000`; en
el build, a `https://api.challenge.habisite.com`. `VITE_API_URL` pisa
cualquiera de las dos. Está en `web/src/api.js`.

En desarrollo hay que levantar la API local (`backendGonzalo/README.md` y
`backendGonzalo/docs/08`): la de producción solo acepta pedidos desde
`challenge.habisite.com`, y así tampoco se cargan inscripciones de prueba en
la base real. Para el captcha en local, Cloudflare tiene claves de prueba
(ver `backendGonzalo/docs/11`).

---

## 11. Para Gonzalo — lo que quedó de su lado

Escrito por Tomás el 9/10 para que Gonzalo retome desde acá. Tachar lo que se
vaya haciendo y borrar la sección cuando esté todo.

**Contexto:** el 9/10 Tomás le sumó al back el **ingreso con un enlace por
correo** (sin contraseñas) y unificó los paneles en **una sola URL, `/panel`**,
que muestra la vista según el rol. Todo está en producción y probado con un
participante y con un admin. El detalle está en
`backendGonzalo/docs/12-ingreso-por-enlace.md`.

1. **Habilitar Google en producción** — hoy da `Error 400:
   redirect_uri_mismatch`. En la consola de Google, proyecto
   `habisite-challenge`, cliente OAuth `259278501857-mo1b…`:
   - [ ] Agregar en *URIs de redireccionamiento autorizados*:
         `https://api.challenge.habisite.com/auth/google/callback`
   - [ ] Agregar en *Orígenes de JavaScript autorizados*:
         `https://challenge.habisite.com`
   - [ ] Mientras siga en *Testing*, cargar como usuarios de prueba las
         cuentas que vayan a probar (hoy solo están `gonzalomaurino@gmail.com`
         y `zengatomi@gmail.com`).
   - [ ] Cambiar el nombre de la app a «Habisite Challenge» y **pasar el
         proyecto a *En producción*** antes de abrir la inscripción. Ver el
         checklist de `backendGonzalo/docs/01-google-oauth.md`, «Producción».
2. **Revisar lo que se sumó a su back** (`docs/12`): la migración
   `004-enlace-de-ingreso.sql` (ya aplicada en producción), `POST /auth/enlace`,
   `POST /auth/enlace/canjear`, `src/auth/enlace-ingreso.*` y el correo `c14`.
3. **Los enlaces de `src/correo/enlaces.ts` apuntan a la landing y no al panel:**
   - [ ] `ingreso()` (el botón del correo de invitación al jurado, C7) manda a
         `/auth/google?retorno=/`. Mejor `{FRONTEND_URL}/panel`: ahí el jurado
         elige Google o enlace por correo, y no queda trabado si Google falla.
   - [ ] `panel()` devuelve `{FRONTEND_URL}/`. Lo usan C8, C9 y C13 como «ir al
         panel», así que tendría que ser `/panel`. **Ojo:** `destinoGrupo()`
         también usa `panel()` como respaldo cuando no hay grupo, y ahí sí
         corresponde la landing: separarlos.
4. **Nombre de la edición en los correos:** el encabezado de todas las
   plantillas dice «DESIGN CHALLENGE 2026» y los textos «Habisite Design
   Challenge 2026». Pasarlos a «Habisite Challenge 2026-II» (CLAUDE.md §1), y
   también `CORREO_REMITENTE` en Railway.
5. **`WHATSAPP_URL` en Railway** cuando exista el grupo. Hasta entonces, el
   enlace al grupo de los correos y de la pantalla de gracias vuelve a la
   landing.

