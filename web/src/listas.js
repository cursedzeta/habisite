/* ==========================================================
   Listas que comparten el formulario de inscripción y los paneles.
   Los valores son los que acepta la API (backendGonzalo/docs/11).
   ========================================================== */

/* El país viaja como código ISO. El prefijo sirve para armar el
   teléfono en E.164 y se precarga al elegir país. */
export const PAISES = [
  ['AR', 'Argentina', '+54'],
  ['BO', 'Bolivia', '+591'],
  ['BR', 'Brasil', '+55'],
  ['CL', 'Chile', '+56'],
  ['CO', 'Colombia', '+57'],
  ['CR', 'Costa Rica', '+506'],
  ['EC', 'Ecuador', '+593'],
  ['MX', 'México', '+52'],
  ['PY', 'Paraguay', '+595'],
  ['PE', 'Perú', '+51'],
  ['UY', 'Uruguay', '+598'],
  ['ZZ', 'Otro', ''],
]

export const TIPOS = [
  ['universidad', 'Estudio en una universidad', 'Facultad o escuela'],
  ['trabajo', 'Trabajo en un estudio o empresa', 'Estudio o empresa'],
  ['independiente', 'Trabajo por mi cuenta', 'Profesión o especialidad'],
]
