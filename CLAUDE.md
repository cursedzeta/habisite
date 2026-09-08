# Habisite Design Challenge — contexto del proyecto

Este archivo es la fuente de verdad para cualquiera que agarre el repo: personas
o sesiones de Claude Code. Si algo cambia y contradice lo de acá, **actualizá
este archivo en el mismo commit.**

Última actualización: 8 de septiembre de 2026.

---

## 1. Qué es esto

**Habisite** es un estudio latinoamericano de diseño de espacios. Organiza el
**Habisite Design Challenge 2026**, un concurso internacional de arquitectura
para estudiantes de últimos años y egresados de Latinoamérica.

Hay que construir **tres superficies**, y son **una sola aplicación**, no tres
proyectos:

| Superficie | Quién entra | Para qué |
|---|---|---|
| **Landing del concurso** | Público | Se pre-registra y cae en el grupo de WhatsApp |
| **Panel de concursantes** | Inscriptos, login con Google | Suben su propuesta |
| **Panel de jurado** | Jurados, invitados uno por uno | Ven propuestas, puntúan y dejan devolución |

El puntaje final del jurado tiene que impactar de vuelta en el concursante, que
recibe un aviso cuando se publica. **Ese es el motivo de que sea una sola app
con una sola base**: si fueran tres proyectos separados, pasar el puntaje del
jurado al participante sería trabajo real en vez de una consulta.

A futuro, el sitio institucional (`habisite.com`, hoy en WordPress) también se
migra a código y se aloja en este mismo proyecto de Railway.

---

## 2. Estado actual

**En producción:**

- **https://challenge.habisite.com** — la landing del concurso, desplegada y
  con certificado válido. Ver §5 para cómo está montada.

**Hecho:**

- `web/` — React 19 + Vite 8. **Sin Tailwind** (ver §9).
- El sistema de diseño, exportado desde Claude Design y portado a código.

**No existe todavía:**

- `api/` — el backend del concurso.
- `contrato/openapi.yaml` — la frontera entre front y back.
- Los paneles de concursantes y de jurado.
- El sitio institucional migrado.

**Reparto de trabajo:** Tomás hace el front (`web/`). Su compañero hace el back
(`api/`), incluido el login con Google.

---

## 3. Estructura del repo

`github.com/cursedzeta/habisite`, rama `main`.

```
habisite/
├─ web/            front — React + Vite. ESTO es lo que está desplegado.
│  ├─ src/
│  │  ├─ App.jsx           la landing entera
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
├─ api/            back — no existe todavía
├─ contrato/
│  └─ openapi.yaml la frontera entre los dos — no existe todavía
├─ reference/      identidad extraída del WordPress viejo
├─ prototipo/      prototipos HTML previos, superados por web/
└─ plan/           plan técnico inicial (ver §8, tiene partes vencidas)
```

**Un solo repo, un servicio de Railway por carpeta.** Railway soporta monorepos:
cada servicio apunta al mismo repo con su propio *Root Directory*. El front ya
está así (`web/`); el back va a ser igual con `api/`.

**`contrato/openapi.yaml` es la pieza clave del reparto.** Con el back en Java no
se pueden compartir tipos de TypeScript. El contrato lo escribe el back primero;
de ahí el front genera sus tipos y puede programar pantallas contra datos de
prueba sin esperar que la API exista. **Sin esa carpeta, uno de los dos vive
bloqueado esperando al otro.**

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

Espacio previsto para `api/`, la base y el sitio institucional migrado.

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

## 6. Lo que tiene que hacer el back

### 6.1 Primero de todo: el contrato de autenticación

Es lo que más bloquea al front. Antes que cualquier otra cosa, definir en
`contrato/openapi.yaml`:

- Qué endpoint inicia el login con Google
- A dónde vuelve el usuario después
- Cómo el front sabe **quién está logueado y con qué rol** (algo tipo `GET /yo`)
- Cómo se cierra sesión

Sin eso el front no puede construir ni la primera pantalla de los paneles.

### 6.2 Modelo de datos

El corazón del sistema es la separación entre **propuesta**, **puntaje** y
**resultado publicado**. Los jurados cargan puntajes cuando quieren; el
participante no ve nada hasta que un administrador publica.

| Tabla | Qué guarda |
|---|---|
| `profiles` | Nombre, apellido, correo, universidad, país y **rol** (`participante` · `jurado` · `admin`). Se crea sola en el primer login. |
| `submissions` | Una propuesta por participante: título, memoria, estado (`borrador` / `entregada`), fecha de entrega. |
| `submission_files` | Archivos de cada propuesta: láminas, memoria, renders. Tipo, peso y orden. |
| `criteria` | Los siete criterios con su peso (ver abajo). |
| `scores` | Un puntaje por criterio, por jurado, por propuesta. **Clave única sobre los tres.** |
| `feedback` | Devolución escrita del jurado, con interruptor de visibilidad hacia el participante. |
| `results` | Puntaje final calculado y fecha de publicación. **Mientras no tenga fecha, no existe para el participante.** |

**Criterios de evaluación y pesos:**

| Criterio | Peso |
|---|---|
| Creatividad y originalidad | 35% |
| Narrativa arquitectónica y experiencia | 20% |
| Integración espacial con el entorno | 20% |
| Sostenibilidad | 10% |
| Viabilidad técnica | 5% |
| Calidad de presentación | 5% |
| Cumplimiento de entregables | 5% |

Puntaje final = suma ponderada de los criterios, promediada entre jurados.

### 6.3 Permisos

| Rol | Puede | No puede |
|---|---|---|
| `participante` | Ver y editar **solo su** propuesta, hasta el cierre. Ver su puntaje una vez publicado. | Ver otras propuestas. Ver puntajes sin publicar. Editar después del cierre. |
| `jurado` | Ver todas las propuestas entregadas. Cargar y corregir **sus propios** puntajes y devoluciones. | Modificar propuestas. Ver puntajes de otros jurados antes del cierre. |
| `admin` | Todo, más las dos acciones que nadie más tiene: **cerrar evaluación** y **publicar resultados**. | — |

Dos reglas que no son capricho técnico:

- **El cierre de entregas se aplica en el servidor**, no en el botón. Con zona
  horaria explícita.
- **Un jurado no ve los puntajes de los otros hasta el cierre.** Si el segundo
  jurado ve el 9 que puso el primero, tiende a acercarse a ese número.

### 6.4 Avisos

Cuando el admin publica resultados: el sistema promedia, aplica los pesos, y
cada participante recibe un correo y ve su puntaje y su devolución en el panel.

---

## 7. Decisiones tomadas — no volver a discutirlas

- **El jurado VE quién es el autor** de cada propuesta. Se planteó evaluar a
  ciegas y **se decidió que no**.
- **El backend del concurso es nuevo**, no reutiliza el repo Java viejo.
- **El login es con Google** y lo resuelve el back.
- **Un solo repo** con `web/` y `api/`, un servicio de Railway por carpeta.
- **Subdominio, no ruta**: `challenge.habisite.com`.
- **El formulario de la landing redirige al grupo de WhatsApp**, que es donde se
  comparte el resto de la información y los enlaces a los paneles.
- **El proyecto viejo de Railway se borró**, con su base de datos.

---

## 8. Pendientes que bloquean

1. **Las fechas reales del concurso.** Las que muestra la landing (24 mayo –
   13 junio 2026) vienen del diseño y **no están confirmadas**.
2. **El enlace del grupo de WhatsApp.**
3. **Los montos de los premios.** La landing dice USD 5.000 / 2.000 / 1.000,
   pero salieron del diseño generado, no de una fuente oficial.
4. **Los entregables y sus pesos máximos**, validados en el navegador y otra vez
   en el servidor. Sin un tope, alguien sube un render de 400 MB el último día.
5. **El texto de las bases**: qué se hace con los datos personales y qué derechos
   tiene Habisite sobre las propuestas.
6. **El link del menú de WordPress** apuntando a `challenge.habisite.com`, más
   una Redirect Rule 301 desde `habisite.com/habisite-design-challenge-2026/`.

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
`<option>` del select, y el `backdrop-filter` sin prefijo).

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
