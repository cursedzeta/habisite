/* ==========================================================
   El entorno de prueba: ver los paneles como cada rol, sin cuenta.

   Pedido de Sol (30/10): mostrar la plataforma sin depender de una
   casilla de correo. Es SOLO del front, a propósito: no hay sesión ni
   cookie, y nada llega a la API. Un «entrar como admin» real sin
   verificar dejaría a cualquiera ver los datos de los inscriptos y
   tocar las etapas del concurso.

   Hoy alcanza porque los paneles muestran datos de ejemplo
   (paneles/datos-demo.js). Cuando una sección pase a leer de la API,
   en el modo prueba tiene que seguir mostrando datos de ejemplo:
   `yo.prueba` es la marca para saberlo.
   ========================================================== */

export const ROLES_DE_PRUEBA = [
  { rol: 'participante', texto: 'Concursante' },
  { rol: 'jurado', texto: 'Jurado' },
  { rol: 'admin', texto: 'Administración' },
]

/* /panel?prueba=jurado. En la URL y no en el almacenamiento: así el
   enlace se puede pasar tal cual. */
export function rolDePrueba() {
  const rol = new URLSearchParams(window.location.search).get('prueba')
  return ROLES_DE_PRUEBA.some((r) => r.rol === rol) ? rol : null
}

export const urlDePrueba = (rol) => `/panel?prueba=${rol}`

/* Con la misma forma que GET /yo, para que los paneles no distingan. */
export function yoDePrueba(rol) {
  const texto = ROLES_DE_PRUEBA.find((r) => r.rol === rol)?.texto ?? 'Prueba'
  return {
    id: `prueba-${rol}`,
    correo: `prueba.${rol}@habisite.com`,
    nombre: 'Prueba',
    apellido: texto,
    telefono: null,
    tipoInstitucion: rol === 'participante' ? 'universidad' : null,
    institucion: rol === 'participante' ? 'Entorno de prueba' : null,
    pais: null,
    rol,
    perfilCompleto: true,
    prueba: true,
  }
}
