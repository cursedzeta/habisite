-- ═══════════════════════════════════════════════════════════════════
--  003 · Embudo de inscripción y correos
--
--  Lo que necesitan el formulario único de la landing (doc 09), los
--  correos de Resend (doc 10) y la aceptación de invitaciones por correo
--  (doc 05). De paso corrige una restricción que hacía imposible darse
--  de baja de un equipo.
-- ═══════════════════════════════════════════════════════════════════

-- ── perfiles: lo que deja el formulario ────────────────────────────
alter table perfiles
  -- E.164: + código de país y número, sin espacios. Ej. +5491123456789
  add column telefono         text check (telefono ~ '^\+[1-9][0-9]{6,14}$'),
  -- De qué canal vino. El primero es el que lo trajo; si vuelve a mandar el
  -- formulario desde otro, se suma al final sin repetir.
  add column origenes         text[] not null default '{}',
  -- La aceptación de las bases, POR PERSONA. Sin la versión, el día que
  -- cambien las bases no se sabe qué aceptó cada uno.
  add column terminos_en      timestamptz,
  add column terminos_version text,
  add column terminos_ip      inet,
  -- El enlace al grupo de WhatsApp de esta persona: /r/{token_grupo}. No es
  -- secreto (registra un clic y redirige), por eso es distinto del de abajo.
  add column token_grupo      text unique,
  -- El botón «Completar mi inscripción» del correo de alerta. Este SÍ es
  -- secreto: con él se leen los datos de la persona. Se borra al completar.
  add column token_completar  text unique,
  -- El recordatorio único (C3). Lo manda la tarea periódica de la API, no
  -- Resend: la clave de solo envío no puede cancelar un correo programado.
  add column recordatorio_para       timestamptz,
  add column recordatorio_enviado_en timestamptz,
  -- WhatsApp no avisa quién entró al grupo: el clic es lo más cercano.
  add column clic_grupo_en    timestamptz;

-- La tarea periódica busca por acá cada 30 minutos.
create index perfiles_recordatorio_idx on perfiles (recordatorio_para)
  where recordatorio_enviado_en is null and clic_grupo_en is null;

-- ── edicion: la versión vigente de las bases ───────────────────────
-- La pone el servidor al registrar una aceptación, nunca el cliente.
-- Cuando cambian las bases se actualiza esta fila, sin tocar código.
alter table edicion
  add column terminos_version text,
  add column terminos_url     text;

-- ── equipo_miembros: la baja era imposible ─────────────────────────
-- La restricción original exigía que solo un «aceptado» tuviera fecha de
-- aceptación. Pero al darse de baja la fecha se conserva a propósito (es el
-- rastro de que aceptó las bases), así que toda baja violaba la restricción
-- y respondía 500. Lo que importa es la otra dirección: un aceptado SIEMPRE
-- tiene fecha, y un invitado NUNCA.
alter table equipo_miembros drop constraint coherencia_aceptacion;
alter table equipo_miembros add constraint coherencia_aceptacion check (
  (estado = 'aceptado' and aceptado_en is not null)
  or (estado = 'invitado' and aceptado_en is null)
  or estado = 'baja'
);

-- ── envios: cada correo que sale ───────────────────────────────────
-- Se anota ANTES de mandarlo. Si Resend falla o el proceso se cae a mitad
-- de camino, la fila queda y la tarea periódica lo reintenta. Guarda los
-- datos con los que se arma la plantilla, no el HTML: así se puede volver a
-- generar idéntico.
create table envios (
  id           bigserial primary key,
  -- C1, C2, C3… (ver docs/10-correos.md)
  codigo       text        not null,
  destinatario citext      not null,
  perfil_id    uuid        references perfiles (id) on delete set null,
  -- Clave de idempotencia: el mismo correo nunca sale dos veces. También
  -- viaja a Resend como Idempotency-Key.
  clave        text        not null unique,
  datos        jsonb       not null default '{}',
  estado       text        not null default 'pendiente'
                           check (estado in ('pendiente', 'enviado', 'fallido', 'omitido')),
  intentos     smallint    not null default 0,
  resend_id    text,
  error        text,
  creado_en    timestamptz not null default now(),
  enviado_en   timestamptz
);

create index envios_pendientes_idx on envios (creado_en)
  where estado in ('pendiente', 'fallido');
