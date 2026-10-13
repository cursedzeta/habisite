/* ==========================================================
   El jurado, de todas las ediciones.

   Una persona aparece una sola vez acá y `ediciones` dice en cuáles
   participó: la landing muestra el de la 2026-II y la página de
   concursos anteriores el de la 2025-I. Así quien repite no se carga
   dos veces, y el distintivo «también fue jurado en la 1ª edición»
   (pedido de Jarod, docs/2026-10-08) sale solo.

   Lo que falta va en `null` y no se muestra. Nada de acá se inventa.
   Fotos: en blanco y negro, recorte 4:5, en public/jurado/.
   ========================================================== */

export const JURADO = [
  {
    id: 'joaquin',
    // PENDIENTE: apellido. Llegó solo el nombre (13/10).
    nombre: 'Joaquín',
    titulo: 'Arq.',
    profesion: 'Arquitecto',
    // PENDIENTE: país.
    pais: null,
    enfoque: 'Desarrollo integral inmobiliario',
    bio: 'Ocupó posiciones estratégicas en empresas comerciales e inmobiliarias líderes a nivel internacional y es experto en la creación de equipos de alto rendimiento. Tiene dos maestrías: en Administración de Empresas y en Gerencia de Proyectos.',
    foto: '/jurado/joaquin.webp',
    fotoChica: '/jurado/joaquin-400.webp',
    // PENDIENTE: confirmar las dos. Se pasó como «de este año y también del anterior».
    ediciones: ['2025-I', '2026-II'],
    // PENDIENTE: enlace opcional a portafolio o LinkedIn.
    portafolio: null,
  },
]

/* Cuántos lugares mostrar en la landing mientras se confirma el resto:
   los que faltan van como «por confirmar», sin datos inventados. */
export const LUGARES_JURADO_2026_II = 6

export const juradoDe = (edicion) => JURADO.filter((j) => j.ediciones.includes(edicion))

export const nombreJurado = (j) => [j.titulo, j.nombre].filter(Boolean).join(' ')
