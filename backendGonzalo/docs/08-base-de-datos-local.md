# 08 · La base de datos local

Cómo quedó armado el entorno de desarrollo, y las trampas que aparecieron.

## Postgres nativo, no Docker

La máquina ya tenía **PostgreSQL 18 corriendo como servicio de Windows**
(`postgresql-x64-18`), escuchando en el 5432. Se usa ese: no hace falta
contenedor, ni demonio que levantar, ni volumen que mantener.

La versión 18 simplifica dos cosas del esquema:

- **`gen_random_uuid()` viene en el núcleo** desde PG13, así que no hace falta
  la extensión `pgcrypto`.
- **`citext` es extensión *trusted***, así que la crea el dueño de la base sin
  necesidad de superusuario.

| | |
|---|---|
| Servicio | `postgresql-x64-18` |
| Base | `habisite_challenge` |
| Rol de la app | `habisite` |
| Puerto | 5432 |

## El reseteo de la contraseña de `postgres`

La contraseña del superusuario se había perdido, y **toda la autenticación
estaba en `scram-sha-256`**: sin ella no se podía crear ni la base.

El procedimiento fue el clásico: pasar `pg_hba.conf` a `trust`, entrar sin
contraseña, poner una nueva, y restaurar el archivo.

**Lo que no salió como estaba previsto:** `pg_ctl reload` falló las dos veces
con *«Operation not permitted»*, porque la sesión no era de administrador y no
puede mandarle la señal al postmaster.

Pero **las operaciones SQL funcionaron igual**. O sea que el servidor tomó el
cambio de `pg_hba.conf` sin necesidad de la señal.

Eso obligó a un chequeo que si no habría quedado sin hacer: **verificar que la
restauración también se hubiera aplicado**. Si el servidor hubiera tomado el
`trust` pero no la vuelta atrás, habría quedado aceptando conexiones sin
contraseña sin que nada lo avisara. Se comprobó de las dos formas:

```
sin contraseña  ->  rechazado ("no password supplied")   ✓
con contraseña  ->  entra                                 ✓
```

**La lección para la próxima:** después de tocar `pg_hba.conf`, no alcanza con
que el comando de restauración no tire error. Hay que **probar que la
autenticación efectivamente volvió a pedir contraseña**, porque el modo de
fallar es silencioso.

## Las contraseñas

Son de desarrollo local, no salen de esta máquina.

| Rol | Dónde vive |
|---|---|
| `postgres` (superusuario) | Solo para tareas administrativas |
| `habisite` (la app) | En el `DATABASE_URL` del `.env`, ignorado por git |

## Migraciones

```bash
npm run migrar
```

Aplica los `.sql` de `migraciones/` en orden. Correrlo dos veces no hace nada:

```
  ·  001-esquema.sql
  ·  002-semillas.sql

La base ya estaba al día.
```

Guarda el `sha256` de cada archivo. **Si una migración ya aplicada cambió,
corta** en vez de seguir: editar una vieja deja la base y el repo diciendo cosas
distintas, y eso se descubre tarde y mal. Para cambiar algo, va una migración
nueva.

## Lo que quedó cargado

- **13 tablas**: las 12 del modelo más `migraciones`.
- **7 tipos enumerados**.
- **`propuesta_archivos.contenido` con `attstorage = 'e'`** — EXTERNAL,
  confirmado sobre la base real. Es lo que hace que el visor pueda leer por
  rangos sin descomprimir los 30 MB.
- **Los 7 criterios**, con los pesos sumando exactamente `1.000`. La migración
  de semillas termina con un `raise exception` si no suman: si no, el puntaje
  final se sale de la escala 1..10 sin que nada falle visiblemente.
- **Dos administradores**: `gonzalomaurino@gmail.com` y `zengatomi@gmail.com`.
  Sin al menos uno, la lista blanca no deja entrar a nadie.
- **La edición**, en `inscripcion`, con margen de gracia de 15 minutos y tope de
  5 integrantes. Las fechas en `NULL` hasta que Sol las confirme.

## Comprobado contra la base real

- `POST /inscripcion` da de alta, y el mismo correo dos veces responde `409`.
- Una cookie de sesión inválida responde `401`, no `500`.
- `GET /yo` devuelve el rol `admin` y el estado de la edición.
- `GET /criterios` devuelve los siete con los pesos sumando 1.
- Las rutas de admin, jurado y concursante responden `200`.
- Cero errores `500` en el log.
