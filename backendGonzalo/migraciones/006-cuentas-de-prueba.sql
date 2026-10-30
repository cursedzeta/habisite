-- ═══════════════════════════════════════════════════════════════════
--  006 · Cuentas de prueba, una por rol
--
--  Para que el equipo (y quien la organización quiera mostrarle la
--  plataforma) pueda entrar como concursante, jurado o administración.
--  Pedido de Sol, 30/10.
--
--  Son alias de la cuenta del equipo: Gmail entrega en
--  growthimbar@gmail.com todo lo que llega a growthimbar+algo@gmail.com,
--  pero para la plataforma cada alias es un correo distinto con su rol.
--  Se entra con el ENLACE POR CORREO (docs/12): no hay contraseñas. Con
--  Google no sirven: Google devuelve growthimbar@gmail.com sin el alias, y
--  esa cuenta es otra (la participante que se inscribió el 9/10).
--
--  ⚠️ El jurado de prueba cuenta como jurado de verdad: entra en el reparto
--  de la evaluación (evaluacion.repository) y en el cálculo de resultados.
--  Hay que bloquearlo ANTES de abrir la evaluación:
--    update perfiles set estado = 'bloqueado'
--     where correo like 'growthimbar+%@gmail.com';
--  Lo mismo con el concursante, que figura entre los inscriptos y en la
--  planilla. Anotado en CLAUDE.md §8.
-- ═══════════════════════════════════════════════════════════════════

insert into perfiles (correo, nombre, apellido, rol, estado,
                      tipo_institucion, institucion, pais) values
  -- El concursante va con los datos completos: si no, el panel le pide
  -- completarlos antes de dejarlo armar equipo o subir algo.
  ('growthimbar+concursante@gmail.com', 'Prueba', 'Concursante', 'participante', 'habilitado',
   'universidad', 'Cuenta de prueba', 'ZZ'),
  ('growthimbar+jurado@gmail.com',      'Prueba', 'Jurado',      'jurado',       'habilitado',
   null, null, null),
  ('growthimbar+admin@gmail.com',       'Prueba', 'Admin',       'admin',        'habilitado',
   null, null, null)
on conflict (correo) do nothing;
