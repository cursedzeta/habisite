# Backend del Design Challenge — bitácora

Registro de lo que se va configurando, con los valores reales que quedaron.
La idea es que cualquiera pueda rehacer el entorno sin adivinar nada.

**Regla:** acá no va ningún secreto. Ni el client secret de Google, ni el
`JWT_SECRET`, ni cadenas de conexión con contraseña. Los secretos viven en el
`.env` local y en las variables de Railway. Este documento anota *qué existe y
dónde*, no *cuál es la clave*.

| Documento | Qué cubre | Estado |
|---|---|---|
| [01 · Google OAuth](01-google-oauth.md) | Proyecto de Google Cloud, pantalla de consentimiento, cliente y URIs | Hecho |
| [02 · Arquitectura](02-arquitectura.md) | Despliegue, dominios, módulos, estructura y cómo está armado el código | **Fase A implementada** |
| [03 · Modelo de datos](03-modelo-de-datos.md) | DER, restricciones y cálculo del puntaje | Diseñado |
| [04 · Máquinas de estado](04-maquinas-de-estado.md) | Edición, propuesta, resultado, perfil y evaluación | Diseñado |
| [05 · Inscripción por grupo](05-inscripcion-por-grupo.md) | Equipos, invitación por correo, términos y bajas | Diseñado |
| [06 · Evaluación en dos vueltas](06-evaluacion-en-dos-vueltas.md) | Reparto por tercios, preselección y final | Implementado |
| [07 · La API para el front](07-api-para-el-front.md) | **Para Tomás**: los 34 endpoints, qué pantalla usa cada uno y qué puede cambiar | Al día |

## Estado del código

- **08.09 · Fase A · andamiaje.** NestJS 12: validación del `.env`, Pool de
  Postgres, guards, filtro de errores, `GET /salud`.
- **09.09 · Fase B · esquema.** Las 12 tablas con sus restricciones, las
  semillas y el corredor de migraciones. **Escritas, no aplicadas**: falta crear
  la base local.
- **09.09 · Fase C · los siete módulos.** `auth`, `perfiles`, `edicion`,
  `equipos`, `propuestas`, `evaluacion` y `resultados`. **34 endpoints**, con el
  contrato generado en `contrato/openapi.yaml`.
- **Pendiente.** Correr las migraciones —bloqueado por la contraseña de
  `postgres`— y el envío de correos, que necesita verificar el dominio
  remitente.

## Decisiones ya cerradas

Salen de `CLAUDE.md` y de las reuniones del 07 y 08 de septiembre.

- **Stack:** NestJS + PostgreSQL.
- **Login:** solo con Google, para los tres roles. Sin contraseñas.
- **El jurado ve al autor.** La evaluación no es a ciegas.
- **Entrega:** un único PDF por concursante, tope de 30 MB.
- **Los PDF se guardan dentro de Postgres**, no en disco ni en S3.
- **Los siete criterios son obligatorios**: una evaluación con criterios sin
  completar no cuenta como terminada.

## Cambios de la reunión con Sol · 08.09

Reemplazan decisiones anteriores. El PDF con sus anotaciones está en
`docs/Habisite Design Challenge 2026 - Plataforma correciones.pdf`.

- **Participación por equipos**, no individual. Una persona anota al resto con
  sus correos y cada invitado acepta por su cuenta. Reemplaza el modelo
  individual. → [05](05-inscripcion-por-grupo.md)
- **El concursante no ve ningún número.** Textual de Sol: «no deben ver puntaje
  ni nota o tipo de valor». Solo se publica quiénes ganaron.
- **La devolución escrita del jurado es opcional** y pasa a ser una nota
  interna: «puede hacerse pesado, total no hay devolución a ellos».
- **Evaluación en dos vueltas.** Cada jurado revisa un tercio y preselecciona;
  después los tres puntúan a los finalistas. → [06](06-evaluacion-en-dos-vueltas.md)
- **15 minutos de gracia** después del cierre de entregas: «siempre piden que se
  lo suban porque pasó algo».
- **El campo de universidad admite también trabajo o profesión**, porque puede
  haber profesionales jóvenes.
- **El PDF se sube a la plataforma**, no a un Drive ni al grupo de WhatsApp. Es
  una sola lámina con todo el proyecto adentro.

## Cambios tras el git pull del 08.09

Tomás desplegó el front y escribió `req-concursantes.md` y `req-jurado.md`, que
según `CLAUDE.md` **mandan sobre su §6**. Casi todo coincide con lo de acá. Lo
que se resolvió al cruzarlos:

- **Los nombres de tabla van en español**, no en inglés como decía `CLAUDE.md`
  §5.2: `perfiles`, `propuestas`, `propuesta_archivos`, `criterios`, `puntajes`,
  `devoluciones`, `resultados`, `auditoria`.
- **La devolución no la ve el concursante.** Manda lo que anotó Sol. Contradice
  `req-concursantes.md` §4.18: hay que avisarle a Tomás.
- **Lista blanca con alta automática.** Nadie entra sin inscribirse, pero el
  formulario habilita solo. Contradice `req-concursantes.md` §1.2.
- **Se suman integrantes por los dos caminos**: la card de correos que Tomás ya
  construyó y el enlace del equipo.
- **Tope de 5 integrantes**, como valor de configuración.
- **Si el jurado ve al autor quedó reabierto** por `req-jurado.md` §3.3 y lo
  decide Sol. Hasta entonces no se escribe la pantalla del jurado.
- **Los siete criterios y la escala de puntuación no están confirmados.** Viven
  en tabla, así que no bloquean el esquema.
- **La infraestructura cambió entera:** se borró el proyecto viejo de Railway
  con la API Java, WhatsApp y el Postgres de 1.1 GB. Hay uno nuevo,
  `habisite-plataforma`, y `challenge.habisite.com` ya está desplegado.

Y algo que Tomás todavía no sabe: **el reparto entre jurados está decidido**
—dos vueltas, tercios, preselección—. `req-jurado.md` §3.1 lo da por abierto y
por eso tiene frenada la pantalla del listado.

### Sigue sin respuesta

Sol anotó las primeras tres páginas del documento, pero **no contestó las 13
preguntas** de la sección final. Siguen abiertas, y las que bloquean son las
fechas reales, qué tiene que contener el PDF, el monto del premio, los permisos
para la exposición virtual y quiénes son los tres jurados con sus correos.

## Pendientes que arrastramos

- El proyecto de Google hay que pasarlo a *En producción* antes de que abra la
  inscripción. En modo *Testing* hay tope de 100 usuarios y las sesiones se
  caen a los 7 días. El estado de publicación es **del proyecto**, no del
  cliente: si se quiere separar desarrollo de producción de verdad, hacen falta
  dos proyectos de Google.
- Falta definir el dominio de la API. La propuesta es
  `api.challenge.habisite.com`, para que la cookie de sesión sea *same-site*
  con el front y no la descarten Safari ni los bloqueadores.
- Railway tiene **solo el entorno `production`**. Hay que clonarlo antes de
  correr cualquier migración.
- Falta confirmar si la Postgres que ya existe en Railway es la que usa la API
  Java de `api.habisite.com`. Si lo es, conviene levantar una aparte para el
  concurso en vez de compartir disco y ventana de backup con un sistema en
  producción.
