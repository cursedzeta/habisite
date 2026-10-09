import { API, pedir } from '../api'

/* ==========================================================
   La sesión, del lado del front.

   El front no guarda nada: la sesión es una cookie HttpOnly que
   pone la API, y quién está adentro se pregunta siempre con
   GET /yo (backendGonzalo/docs/07).
   ========================================================== */

/* Una sola URL para todos: /panel muestra la vista del rol de quien
   entró. El admin además puede ver las de los otros dos. */
export const RUTA_PANEL = '/panel'

export const NOMBRE_DEL_ROL = {
  participante: 'Participante',
  jurado: 'Jurado',
  admin: 'Administración',
}

/* Navegación y no fetch: el navegador va a Google, vuelve a la API
   y de ahí al front, a `retorno`. */
export function urlGoogle(retorno) {
  return `${API}/auth/google?retorno=${encodeURIComponent(retorno)}`
}

/* A dónde ir después de entrar. La landing ('/') o /ingresar no tienen
   sentido: va al panel. Algo fuera de este sitio, tampoco: el navegador
   lee `/\otro.com` como `//otro.com`, y el retorno del enlace por correo
   lo elige quien lo pide, no quien lo abre. La API ya rechaza esos
   retornos; esto es la segunda barrera. */
export function destinoTrasEntrar(retorno, origen = window.location.origin) {
  let url
  try {
    url = new URL(retorno || RUTA_PANEL, origen)
  } catch {
    return RUTA_PANEL
  }
  if (url.origin !== origen) return RUTA_PANEL
  if (url.pathname === '/' || url.pathname === '/ingresar') return RUTA_PANEL
  return url.pathname + url.search + url.hash
}

export function nombreCompleto(yo) {
  return [yo.nombre, yo.apellido].filter(Boolean).join(' ') || yo.correo
}

export async function salir() {
  try {
    await pedir('/auth/salir', { metodo: 'POST' })
  } finally {
    window.location.assign('/ingresar')
  }
}
