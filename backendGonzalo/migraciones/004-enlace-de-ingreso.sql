-- ═══════════════════════════════════════════════════════════════════
--  004 · Ingreso con un enlace por correo
--
--  La segunda forma de entrar, además de Google: la persona escribe su
--  correo y le llega un enlace que la deja adentro. Sin contraseñas que
--  guardar ni recuperar. Sirve para quien no usa Gmail.
--
--  Decidido con Tomás el 09.10. Ver docs/12-ingreso-por-enlace.md.
-- ═══════════════════════════════════════════════════════════════════

create table enlaces_ingreso (
  id          uuid        primary key default gen_random_uuid(),
  perfil_id   uuid        not null references perfiles (id) on delete cascade,
  -- El sha256 del token, nunca el token: el token solo viaja en el correo.
  -- Con una copia de la base no se puede entrar como nadie.
  token_hash  text        not null unique,
  -- La ruta del front a la que volver, igual que en el login con Google.
  retorno     text        not null default '/' check (retorno like '/%'),
  vence_en    timestamptz not null,
  -- Un solo uso: al canjearlo se marca, y un segundo canje no encuentra nada.
  usado_en    timestamptz,
  pedido_ip   inet,
  creado_en   timestamptz not null default now()
);

-- Para contar cuántos pidió cada persona en la última ventana.
create index enlaces_ingreso_perfil_idx on enlaces_ingreso (perfil_id, creado_en);
