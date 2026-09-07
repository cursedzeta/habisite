# Habisite Design Challenge — contexto del proyecto

Este archivo es la fuente de verdad para cualquiera que agarre el repo: personas
o sesiones de Claude Code. Si algo cambia y contradice lo de acá, **actualizá
este archivo en el mismo commit.**

---

## 1. Qué es esto

**Habisite** es un estudio latinoamericano de diseño de espacios. Organiza el
**Habisite Design Challenge 2026**, un concurso internacional de arquitectura
para estudiantes de últimos años y egresados de Latinoamérica.

Hay que construir **tres superficies**, y son **una sola aplicación**, no tres
proyectos:

| Superficie | Quién entra | Para qué |
|---|---|---|
| **Landing de inscripción** | Público | Se pre-registra y cae en el grupo de WhatsApp del concurso |
| **Panel de concursantes** | Inscriptos, login con Google | Suben su propuesta |
| **Panel de jurado** | Jurados, invitados uno por uno | Ven propuestas, puntúan y dejan devolución |

El puntaje final del jurado tiene que impactar de vuelta en el concursante, que
recibe un aviso cuando se publica. **Ese es el motivo de que sea una sola app
con una sola base**: si fueran tres proyectos separados, pasar el puntaje del
jurado al participante sería trabajo real en vez de una consulta.

El sitio institucional (`habisite.com`) sigue en WordPress y se migrará a código
más adelante. No es parte de este trabajo.

---

## 2. Estado actual

**Hecho:**

- `web/` — la landing de inscripción funciona. React 19 + Vite 8 + Tailwind 4.
- El sistema de diseño: 42 tokens y 6 primitivas reutilizables. Ver `web/DESIGN.md`.

**No existe todavía:**

- `api/` — el backend del concurso.
- `contrato/openapi.yaml` — la frontera entre front y back.
- Los paneles de concursantes y de jurado.

**Reparto de trabajo:** Tomás hace el front (`web/`). Su compañero hace el back
(`api/`), incluido el login con Google.

---

## 3. Infraestructura (verificado, no supuesto)

- **Cloudflare es el DNS autoritativo** de `habisite.com`
  (`leonard.ns.cloudflare.com`, `annalise.ns.cloudflare.com`).
- **El WordPress NO está en Railway.** Está hosteado en otro lado y Cloudflare
  tapa el origen. Falta averiguar dónde se paga ese hosting.
- **Railway**, proyecto `Habisite` (`9245f5aa-8566-48a7-b4f3-8b01d560498c`),
  workspace *GrowthIMBAR's Projects*:

  | Servicio | Qué es |
  |---|---|
  | `Habisite` | API Java sobre Tomcat, en `api.habisite.com`. **No la tocamos.** |
  | `attractive-playfulness` | Integración con WhatsApp. **No la tocamos.** |
  | `Postgres` | Base existente |

**Dos cosas que alguien debería atender:**

- **Solo existe el entorno `production`.** No hay staging: hoy cualquier deploy
  va directo a lo que está en vivo. Conviene clonar el entorno antes de meter
  servicios nuevos.
- **Hay un volumen huérfano** (`postgres-volume`, 1.1 GB, *detached*). No está
  conectado a nada y genera costo. No borrarlo sin preguntar: puede ser la única
  copia de datos viejos.

### Dominios

La app va a vivir en **`challenge.habisite.com`** — un CNAME en Cloudflare
apuntando a Railway. **El patrón ya está probado**: `api.habisite.com` es
exactamente eso.

La URL vieja, `habisite.com/habisite-design-challenge-2026/`, redirige con un
**301 desde Cloudflare** para que ningún link difundido se rompa.

---

## 4. Estructura del repo

`github.com/cursedzeta/habisite`, rama `main`.

```
habisite/
├─ web/            front (Tomás) — React + Vite + Tailwind
├─ api/            back (compañero) — no existe todavía
├─ contrato/
│  └─ openapi.yaml la frontera entre los dos — no existe todavía
├─ reference/      identidad extraída del WordPress viejo
├─ prototipo/      prototipos HTML previos, superados por web/
└─ plan/           plan técnico inicial (ver §8, tiene partes vencidas)
```

**Un solo repo, dos servicios de Railway.** Railway soporta monorepos: cada
servicio apunta al mismo repo de GitHub con su propio *Root Directory*
(`web/` y `api/`). Con *watch paths*, tocar el front no redespliega el back.

**`contrato/openapi.yaml` es la pieza clave del reparto.** Con el back en Java
no se pueden compartir tipos de TypeScript. El contrato lo escribe el back
primero; de ahí el front genera sus tipos y puede programar pantallas contra
datos de prueba sin esperar que la API exista. **Sin esa carpeta, uno de los dos
vive bloqueado esperando al otro.**

---

## 5. Lo que tiene que hacer el back

### 5.1 Primero de todo: el contrato de autenticación

Es lo que más bloquea al front. Antes que cualquier otra cosa, definir en
`contrato/openapi.yaml`:

- Qué endpoint inicia el login con Google
- A dónde vuelve el usuario después
- Cómo el front sabe **quién está logueado y con qué rol** (algo tipo `GET /yo`)
- Cómo se cierra sesión

Sin eso el front no puede construir ni la primera pantalla de los paneles.

### 5.2 Modelo de datos

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

**Criterios de evaluación y pesos** (salen de las bases publicadas):

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

### 5.3 Permisos

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

### 5.4 Avisos

Cuando el admin publica resultados: el sistema promedia, aplica los pesos, y
cada participante recibe un correo y ve su puntaje y su devolución en el panel.

---

## 6. Decisiones tomadas — no volver a discutirlas

- **El jurado VE quién es el autor** de cada propuesta. Se planteó evaluar a
  ciegas y **se decidió que no**. La pantalla del jurado muestra nombre,
  universidad y nacionalidad junto a cada propuesta.
- **El backend del concurso es nuevo**, no va dentro del repo Java que ya corre
  en `api.habisite.com`.
- **El login es con Google** y lo resuelve el back.
- **Un solo repo** con `web/` y `api/`, dos servicios de Railway.
- **Subdominio, no ruta**: `challenge.habisite.com`, con 301 desde la URL vieja.
- **El formulario de la landing redirige al grupo de WhatsApp**, que es donde se
  comparte el resto de la información del concurso y los enlaces a los paneles.

---

## 7. Pendientes que bloquean

1. **Las fechas reales del concurso.** Las publicadas (29 abril – 13 junio 2026)
   están vencidas. Sin esto no se puede cerrar el cronograma.
2. **El enlace del grupo de WhatsApp.** Está como `REEMPLAZAR_CON_EL_LINK_REAL`
   en `web/src/datos.js`. Mientras diga eso, el formulario avisa en pantalla en
   vez de abrir una URL rota.
3. **Los entregables y sus pesos máximos.** Hay que escribirlos en las bases y
   validarlos en el navegador y otra vez en el servidor. Sin un tope, alguien
   sube un render de 400 MB el último día.
4. **El texto de las bases**: qué se hace con los datos personales y qué derechos
   tiene Habisite sobre las propuestas, sobre todo si se publican en la
   exposición virtual que promete el premio.
5. **El monto del primer premio.** El WordPress dice "1 USD" (claramente un
   marcador de posición) y el Figma dice "$100.000 ARS". Hay que definir cuál es.

---

## 8. Trampas conocidas

- **`plan/arquitectura.html` tiene partes vencidas.** Fue escrito antes de
  algunas decisiones: propone Supabase (superado por el back Java propio) y
  lista lo del jurado anónimo como pregunta abierta (ya cerrada, ver §6). El
  resto sigue vigente.
- **"31 DE SEPTIEMBRE" no existe.** Septiembre tiene 30 días. Está así en el
  Figma y se reprodujo tal cual en `web/src/datos.js`. Corregir antes de publicar.
- **Las imágenes del WordPress viejo son en su mayoría stock** de la plantilla
  `architectonics` (`project01-05`, `team01-03`, `blog01-04`, `about01-03`...).
  No son material real de Habisite. En `reference/assets/images/` quedaron solo
  las que parecen propias.
- **Los cuatro valores del degradé del hero están estimados a ojo** desde un
  screenshot de Figma (`--color-hero-1` a `-4` en `web/src/index.css`). Pendiente
  confirmarlos contra los hex reales.

---

## 9. Convenciones del código

### Idioma

**El código está en español**: nombres de componentes, props, variables,
comentarios y commits. `Boton`, `Campo`, `Placa`, `variante`, `tamano`,
`datos.js`. Mantenerlo — mezclar idiomas es peor que cualquiera de los dos.

### Front (`web/`)

- **Ningún componente escribe un valor suelto.** Si hace falta un número nuevo,
  primero se le pone nombre en el bloque `@theme` de `src/index.css`. Los tokens
  se nombran **por rol, no por tamaño**: `text-cuerpo`, no `text-17`.
- **`src/ui/` es vocabulario reutilizable; `src/components/` son secciones de
  esta página.** Las pantallas nuevas consumen `ui/` y traen sus propias
  secciones. Importar siempre desde `../ui`, nunca del archivo suelto.
- **El contenido vive en `src/datos.js`**, no en el marcado. Cambiar una fecha no
  debe obligar a editar un componente.
- **Montserrat, solo tres pesos**: Regular 400, Semibold 600, Bold 700.
- **Nunca un botón naranja sobre superficie naranja** — desaparece. Sobre naranja
  van las variantes `claro` o `contorno`. Es el error más fácil de cometer con
  esta paleta.
- Todo movimiento respeta `prefers-reduced-motion`.

El sistema completo está documentado en **`web/DESIGN.md`**: paleta con su papel,
escala tipográfica, primitivas con sus variantes y las reglas de contraste.

### Comandos

```bash
cd web
npm install
npm run dev      # http://localhost:5173  (strictPort: falla si está ocupado)
npm run build
npm run lint
```
