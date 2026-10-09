-- ═══════════════════════════════════════════════════════════════════
--  005 · El nombre nuevo de la edición
--
--  «Habisite Design Challenge 2026» pasó a llamarse «Habisite Challenge
--  2026-II» (CLAUDE.md §1). La 002 sembró el nombre viejo y ya está
--  aplicada en producción: no se edita, se corrige acá.
--
--  Solo pisa el nombre viejo: si administración ya lo cambió a mano desde
--  el panel, no se lo toca.
-- ═══════════════════════════════════════════════════════════════════

update edicion
   set nombre = 'Habisite Challenge 2026-II',
       actualizado_en = now()
 where id = 1
   and nombre = 'Habisite Design Challenge 2026';
