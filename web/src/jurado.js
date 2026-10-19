/* ==========================================================
   El jurado, de todas las ediciones.

   Una persona aparece una sola vez acá y `ediciones` dice en cuáles
   participó: la landing muestra el de la 2026-II y la página de
   concursos anteriores el de la 2025-I. Así quien repite no se carga
   dos veces.

   Sin distintivo de «jurado de la 1ª edición» en la landing (decidido
   el 13/10): daba a entender que había sido jurado antes y ya no.

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
    foto: '/jurado/joaquin-retrato.webp',
    fotoChica: '/jurado/joaquin-retrato-400.webp',
    // PENDIENTE: confirmar las dos. Se pasó como «de este año y también del anterior».
    ediciones: ['2025-I', '2026-II'],
    // PENDIENTE: enlace opcional a portafolio o LinkedIn.
    portafolio: null,
  },
  {
    id: 'jarod',
    nombre: 'Jarod Daza Fraile',
    titulo: 'Arq.',
    profesion: 'Arquitecto',
    pais: 'Colombia',
    enfoque: 'Viabilidad normativa y urbana',
    // Acortada del texto que mandó Jarod (19/10) para emparejar con la de
    // Joaquín. Ganó la 1ª edición con Tres Horizontes (edicion-2025-i.js):
    // en la 2025-I fue concursante, no jurado.
    bio: 'Trabajó en licenciamiento urbanístico, planeación territorial y control urbano en entidades públicas, y en diseño, supervisión y dirección de obra. Se centra en la revisión técnica y la viabilidad normativa de proyectos. Ganó el primer puesto en la primera edición de Habisite.',
    // Recortada a 4:5 de un retrato circular: las esquinas de arriba, que
    // caían fuera del círculo, se rellenaron con el gris del fondo.
    foto: '/jurado/jarod-retrato.webp',
    fotoChica: '/jurado/jarod-retrato-400.webp',
    ediciones: ['2026-II'],
    portafolio: null,
  },
]

/* Cuántos lugares muestra la landing: el jurado 2026-II es chico. Los
   que faltan van como «próximamente», sin datos inventados. */
export const LUGARES_JURADO_2026_II = 3

export const juradoDe = (edicion) => JURADO.filter((j) => j.ediciones.includes(edicion))

export const nombreJurado = (j) => [j.titulo, j.nombre].filter(Boolean).join(' ')
