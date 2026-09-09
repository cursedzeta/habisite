-- ═══════════════════════════════════════════════════════════════════
--  002 · Semillas
--
--  Los datos mínimos para que la plataforma arranque. Todo con `on conflict
--  do nothing`, así correr las migraciones dos veces no rompe nada.
-- ═══════════════════════════════════════════════════════════════════

-- ── La edición ─────────────────────────────────────────────────────
-- Las fechas quedan en NULL a propósito: sin fecha de cierre cargada, el
-- CierreGuard deja pasar. Se completan cuando Sol las confirme.
insert into edicion (id, nombre, estado, max_integrantes)
values (1, 'Habisite Design Challenge 2026', 'inscripcion', 5)
on conflict (id) do nothing;

-- ── Los siete criterios ────────────────────────────────────────────
-- NO están confirmados: salieron de las bases del sitio viejo y el equipo
-- todavía no habló con la gente del jurado. Viven acá justamente para que
-- cambiarlos no implique tocar código. Los pesos suman 1.000.
insert into criterios (codigo, nombre, peso, orden) values
  ('creatividad',    'Creatividad y originalidad',              0.350, 1),
  ('narrativa',      'Narrativa arquitectónica y experiencia',  0.200, 2),
  ('integracion',    'Integración espacial con el entorno',     0.200, 3),
  ('sostenibilidad', 'Sostenibilidad',                          0.100, 4),
  ('viabilidad',     'Viabilidad técnica',                      0.050, 5),
  ('presentacion',   'Calidad de presentación',                 0.050, 6),
  ('entregables',    'Cumplimiento de entregables',             0.050, 7)
on conflict (codigo) do nothing;

-- ── Administradores ────────────────────────────────────────────────
-- Sin al menos uno, nadie puede entrar: la lista blanca rechaza cualquier
-- cuenta que no figure. Son los mismos correos cargados como usuarios de
-- prueba en la consola de Google.
insert into perfiles (correo, nombre, apellido, rol, estado) values
  ('gonzalomaurino@gmail.com', 'Gonzalo', 'Maurino', 'admin', 'habilitado'),
  ('zengatomi@gmail.com',      'Tomás',   'Zenga',   'admin', 'habilitado')
on conflict (correo) do nothing;

-- ── Comprobación ───────────────────────────────────────────────────
-- Si los pesos no suman 1, el puntaje final deja de estar en la escala 1..10
-- y el error es silencioso. Mejor que la migración falle acá.
do $$
declare
  suma numeric;
begin
  select coalesce(sum(peso), 0) into suma from criterios where activo;
  if suma <> 1.000 then
    raise exception 'Los pesos de los criterios suman %, tienen que sumar 1.000', suma;
  end if;
end $$;
