-- ═══════════════════════════════════════════════════════════════════
--  001 · Esquema completo
--
--  Doce tablas. Las reglas del concurso viven acá como restricciones,
--  no como validaciones en el código: una pantalla nueva que se olvide
--  de chequear algo no las puede violar.
--
--  Ver docs/03-modelo-de-datos.md para el porqué de cada decisión.
-- ═══════════════════════════════════════════════════════════════════

-- citext es "trusted" desde PG13: la crea el dueño de la base, sin superusuario.
-- gen_random_uuid() viene en el núcleo desde PG13, así que pgcrypto no hace falta.
create extension if not exists citext;

-- ── Tipos ──────────────────────────────────────────────────────────
create type rol_usuario      as enum ('participante', 'jurado', 'admin');
create type estado_perfil    as enum ('habilitado', 'activo', 'bloqueado');
create type estado_miembro   as enum ('invitado', 'aceptado', 'baja');
create type estado_propuesta as enum ('borrador', 'entregada', 'descalificada');
create type forma_entrega    as enum ('confirmada', 'automatica');
create type estado_edicion   as enum (
  'inscripcion', 'entregas', 'preseleccion', 'final', 'cerrada', 'publicada'
);
create type tipo_institucion as enum ('universidad', 'trabajo', 'independiente');

-- ── perfiles ───────────────────────────────────────────────────────
-- Los perfiles NO nacen del login: nacen del formulario de inscripción o de
-- una invitación. Si alguien entra con una cuenta de Google que no figura acá,
-- la API responde 403. Es una lista blanca.
create table perfiles (
  id               uuid primary key default gen_random_uuid(),
  correo           citext      not null unique,
  -- El identificador estable de Google. NULL hasta el primer ingreso: el
  -- correo de una cuenta puede cambiar, el sub no.
  google_sub       text        unique,
  nombre           text        not null default '',
  apellido         text        not null default '',
  -- Universidad O lugar de trabajo: puede haber profesionales jóvenes.
  institucion      text,
  tipo_institucion tipo_institucion,
  pais             text,
  rol              rol_usuario   not null default 'participante',
  estado           estado_perfil not null default 'habilitado',
  -- Subirlo invalida las sesiones abiertas de esa persona sin tabla de sesiones.
  sesion_v         integer     not null default 1,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

create index perfiles_rol_idx on perfiles (rol) where estado <> 'bloqueado';

-- ── edicion ────────────────────────────────────────────────────────
-- Tabla de una sola fila: la configuración del concurso. El check sobre el id
-- hace imposible que aparezca una segunda.
create table edicion (
  id                     smallint primary key default 1 check (id = 1),
  nombre                 text           not null,
  estado                 estado_edicion not null default 'inscripcion',
  zona_horaria           text           not null default 'America/Argentina/Buenos_Aires',
  cierre_entregas        timestamptz,
  cierre_evaluacion      timestamptz,
  -- «Siempre piden que se lo suban porque pasó algo».
  margen_gracia_minutos  smallint       not null default 15 check (margen_gracia_minutos >= 0),
  -- Cuántas elige cada jurado en la vuelta 1. Sin definir todavía.
  cupo_preseleccion      smallint       check (cupo_preseleccion > 0),
  max_integrantes        smallint       check (max_integrantes > 0),
  max_bytes              integer        not null default 31457280,  -- 30 MB
  max_paginas            smallint       check (max_paginas > 0),
  -- Hace el sorteo del reparto reproducible: si alguien lo cuestiona, se
  -- vuelve a correr con la misma semilla y da idéntico.
  semilla_reparto        text,
  creado_en              timestamptz    not null default now(),
  actualizado_en         timestamptz    not null default now()
);

-- ── equipos ────────────────────────────────────────────────────────
create table equipos (
  id                uuid primary key default gen_random_uuid(),
  nombre            text,
  creado_por        uuid    not null references perfiles (id),
  -- El enlace que el líder comparte. Quien lo abre queda inscripto Y adentro
  -- del equipo, sin que el correo tenga que coincidir con nada.
  token_invitacion  text    not null unique,
  invitacion_activa boolean not null default true,
  creado_en         timestamptz not null default now()
);

-- ── equipo_miembros ────────────────────────────────────────────────
create table equipo_miembros (
  id               uuid primary key default gen_random_uuid(),
  equipo_id        uuid           not null references equipos (id) on delete cascade,
  perfil_id        uuid           not null references perfiles (id),
  estado           estado_miembro not null default 'invitado',
  es_lider         boolean        not null default false,
  -- Token propio de la invitación individual por correo. Hace que el enlace
  -- funcione aunque la cuenta de Google tenga otra dirección.
  token            text           unique,
  invitado_en      timestamptz    not null default now(),
  aceptado_en      timestamptz,
  baja_en          timestamptz,
  -- Lo que cubre legalmente a Habisite. Se guarda POR PERSONA al aceptar.
  -- Sin la versión, el día que cambien las bases no se sabe qué aceptó cada uno.
  terminos_en      timestamptz,
  terminos_version text,
  terminos_ip      inet,
  unique (equipo_id, perfil_id),
  constraint coherencia_aceptacion check (
    (estado = 'aceptado') = (aceptado_en is not null)
  ),
  constraint coherencia_baja check (
    (estado = 'baja') = (baja_en is not null)
  )
);

-- Nadie compite en dos equipos a la vez. Índice parcial: las bajas y las
-- invitaciones sin responder no cuentan.
create unique index un_equipo_por_persona
  on equipo_miembros (perfil_id)
  where estado = 'aceptado';

create index equipo_miembros_equipo_idx on equipo_miembros (equipo_id);

-- Un solo líder por equipo.
create unique index un_lider_por_equipo
  on equipo_miembros (equipo_id)
  where es_lider and estado <> 'baja';

-- ── propuestas ─────────────────────────────────────────────────────
create table propuestas (
  id             uuid primary key default gen_random_uuid(),
  -- UNIQUE: una propuesta por equipo.
  equipo_id      uuid             not null unique references equipos (id) on delete cascade,
  titulo         text             not null default '',
  memoria        text,
  estado         estado_propuesta not null default 'borrador',
  -- Por cuál de los dos caminos llegó a entregada: el equipo confirmó, o
  -- venció el plazo y el sistema la pasó sola.
  forma_entrega  forma_entrega,
  -- Pasó a la vuelta 2.
  finalista      boolean          not null default false,
  entregada_en   timestamptz,
  motivo_descalificacion text,
  creado_en      timestamptz      not null default now(),
  actualizado_en timestamptz      not null default now(),
  -- El estado y la fecha no pueden contradecirse.
  constraint coherencia_entrega check (
    (estado = 'borrador' and entregada_en is null and forma_entrega is null)
    or (estado <> 'borrador' and entregada_en is not null and forma_entrega is not null)
  )
);

create index propuestas_estado_idx on propuestas (estado);
create index propuestas_finalista_idx on propuestas (finalista) where finalista;

-- ── propuesta_archivos ─────────────────────────────────────────────
-- Tabla aparte aunque haya un solo archivo: si el bytea viviera en
-- `propuestas`, cualquier listado del jurado arrastraría 30 MB por fila.
create table propuesta_archivos (
  id              uuid    primary key default gen_random_uuid(),
  -- UNIQUE: un solo PDF. El día que las bases pidan láminas y memoria por
  -- separado se borra esta restricción y se agrega una columna `orden`.
  propuesta_id    uuid    not null unique references propuestas (id) on delete cascade,
  nombre_original text    not null,
  tipo_mime       text    not null default 'application/pdf'
                          check (tipo_mime = 'application/pdf'),
  bytes           integer not null check (bytes > 0),
  paginas         smallint check (paginas > 0),
  sha256          bytea   not null,
  contenido       bytea   not null,
  subido_en       timestamptz not null default now()
);

-- Sin esto, Postgres intenta comprimir un PDF (que ya viene comprimido) y,
-- peor, tiene que descomprimir los 30 MB enteros para devolver los primeros
-- 64 KB. Con EXTERNAL, substring() lee solo los trozos del rango pedido y el
-- visor del jurado abre al instante.
alter table propuesta_archivos alter column contenido set storage external;

-- ── criterios ──────────────────────────────────────────────────────
-- Los criterios y sus pesos NO están confirmados: viven en tabla y la pantalla
-- de puntuación se genera desde acá. Si se programa contra siete criterios
-- fijos, hay que rehacerla cuando el jurado defina los suyos.
create table criterios (
  id          uuid    primary key default gen_random_uuid(),
  codigo      text    not null unique,
  nombre      text    not null,
  descripcion text,
  peso        numeric(4, 3) not null check (peso > 0 and peso <= 1),
  orden       smallint not null,
  activo      boolean not null default true
);

-- ── asignaciones ───────────────────────────────────────────────────
-- Vuelta 1: qué jurado revisa qué propuesta, y qué eligió.
create table asignaciones (
  id              uuid    primary key default gen_random_uuid(),
  -- UNIQUE: en la vuelta 1 cada propuesta tiene un solo revisor. Es lo que
  -- impide que el reparto se solape o se corra dos veces.
  propuesta_id    uuid    not null unique references propuestas (id) on delete cascade,
  jurado_id       uuid    not null references perfiles (id),
  preseleccionada boolean not null default false,
  revisada_en     timestamptz,
  asignada_en     timestamptz not null default now()
);

create index asignaciones_jurado_idx on asignaciones (jurado_id);

-- ── puntajes ───────────────────────────────────────────────────────
-- Vuelta 2: los tres jurados puntúan a los finalistas.
create table puntajes (
  id             uuid     primary key default gen_random_uuid(),
  propuesta_id   uuid     not null references propuestas (id) on delete cascade,
  jurado_id      uuid     not null references perfiles (id),
  criterio_id    uuid     not null references criterios (id),
  -- La escala no está cerrada (ver docs). 1..10 es lo más probable; si cambia,
  -- es un alter column mientras no haya datos reales.
  valor          smallint not null check (valor between 1 and 10),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  -- Nadie puntúa dos veces el mismo criterio de la misma propuesta.
  unique (propuesta_id, jurado_id, criterio_id)
);

create index puntajes_jurado_idx on puntajes (jurado_id);
create index puntajes_propuesta_idx on puntajes (propuesta_id);

-- ── devoluciones ───────────────────────────────────────────────────
-- Nota INTERNA del jurado, opcional. El concursante nunca la ve: «no es
-- obligatoria la devolución porque puede hacerse pesado, total no hay
-- devolución a ellos». Por eso no hay interruptor de visibilidad.
create table devoluciones (
  id             uuid primary key default gen_random_uuid(),
  propuesta_id   uuid not null references propuestas (id) on delete cascade,
  jurado_id      uuid not null references perfiles (id),
  texto          text not null default '',
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (propuesta_id, jurado_id)
);

-- ── resultados ─────────────────────────────────────────────────────
-- Tabla interna. El concursante no ve puntaje, ni nota, ni posición: solo se
-- publica quiénes ganaron.
create table resultados (
  id            uuid          primary key default gen_random_uuid(),
  propuesta_id  uuid          not null unique references propuestas (id) on delete cascade,
  puntaje_final numeric(5, 3) not null,
  posicion      integer,
  -- El desglose por criterio y por jurado, congelado al calcular.
  desglose      jsonb         not null default '{}',
  calculado_en  timestamptz   not null default now(),
  -- NULL = no existe para nadie de afuera. Publicar escribe esta fecha y
  -- nada más: no recalcula ni mueve puntajes.
  publicado_en  timestamptz
);

create index resultados_publicados_idx on resultados (publicado_en)
  where publicado_en is not null;

-- ── auditoria ──────────────────────────────────────────────────────
create table auditoria (
  id         bigserial primary key,
  actor_id   uuid references perfiles (id),
  accion     text not null,
  entidad    text,
  entidad_id uuid,
  metadata   jsonb not null default '{}',
  ip         inet,
  creado_en  timestamptz not null default now()
);

create index auditoria_actor_idx on auditoria (actor_id, creado_en desc);
