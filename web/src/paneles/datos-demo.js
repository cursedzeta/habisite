/* ==========================================================
   Datos inventados para el prototipo.

   NADA de esto es real. Cuando exista el backend, todo sale de la API
   y este archivo se borra.
   ========================================================== */

/* Provisorio: el numero puede cambiar, por eso vive acá y no incrustado
   en el componente (req-concursantes.md, punto 12). */
export const MAX_MIEMBROS = 5

export const CIERRE = '24 de mayo de 2026, 23:59 (GMT-3)'

export const usuarioDemo = {
  nombre: 'Juan Carlos',
  apellido: 'Pérez García',
  correo: 'juanca.perez@frc.utn.edu.ar',
  universidad: 'UTN — Facultad Regional Córdoba',
  pais: 'Argentina',
}

export const propuestaDemo = {
  titulo: 'Umbral',
  estado: 'borrador', // borrador | entregada
  archivo: { nombre: 'umbral-propuesta.pdf', paginas: 4, peso: '8,2 MB' },
  miembros: [
    { correo: 'juanca.perez@frc.utn.edu.ar', estado: 'creador' },
    { correo: 'lucia.mendez@fadu.uba.ar', estado: 'confirmado' },
    { correo: 'tomas.ferrer@ort.edu.uy', estado: 'pendiente' },
  ],
}

/* La devolucion que ve el concursante. Sin numeros: solo texto.
   (req-concursantes.md, puntos 17 y 18) */
export const devolucionDemo = {
  publicada: true,
  podio: 2,
  texto:
    'La propuesta resuelve con claridad el pasaje entre lo público y lo doméstico, y la sección constructiva está bien fundamentada. El tratamiento del patio como articulador es lo más sólido del conjunto. Queda pendiente profundizar la estrategia de asoleamiento en las unidades orientadas al sur.',
}

/* Los criterios TODAVIA NO ESTAN CONFIRMADOS (req-jurado.md §3.2).
   Van como lista de datos justamente por eso: la pantalla se genera
   desde acá, asi cambiarlos no obliga a tocar el componente. */
export const criteriosProvisorios = [
  { id: 'creatividad', nombre: 'Creatividad y originalidad', peso: 35 },
  { id: 'narrativa', nombre: 'Narrativa arquitectónica y experiencia', peso: 20 },
  { id: 'integracion', nombre: 'Integración espacial con el entorno', peso: 20 },
  { id: 'sostenibilidad', nombre: 'Sostenibilidad', peso: 10 },
  { id: 'viabilidad', nombre: 'Viabilidad técnica', peso: 5 },
  { id: 'presentacion', nombre: 'Calidad de presentación', peso: 5 },
  { id: 'entregables', nombre: 'Cumplimiento de entregables', peso: 5 },
]

export const propuestasDemo = [
  {
    id: 'P-014',
    titulo: 'Umbral',
    autor: 'Juan Carlos Pérez García',
    universidad: 'UTN — Facultad Regional Córdoba',
    pais: 'Argentina',
    equipo: 3,
    paginas: 4,
    evaluada: false,
  },
  {
    id: 'P-027',
    titulo: 'Tierra en suspensión',
    autor: 'Mariana Quispe',
    universidad: 'Universidad Nacional de San Agustín',
    pais: 'Perú',
    equipo: 1,
    paginas: 6,
    evaluada: true,
  },
  {
    id: 'P-031',
    titulo: 'Cauce',
    autor: 'Felipe Ossa',
    universidad: 'Universidad de los Andes',
    pais: 'Colombia',
    equipo: 2,
    paginas: 5,
    evaluada: false,
  },
  {
    id: 'P-045',
    titulo: 'Patio de las sombras largas',
    autor: 'Renata Vieira',
    universidad: 'FAU-USP',
    pais: 'Brasil',
    equipo: 4,
    paginas: 3,
    evaluada: false,
  },
]
