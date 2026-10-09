/* ==========================================================
   La API del concurso (backendGonzalo/).

   En desarrollo apunta a la API local: la de producción solo
   acepta pedidos desde challenge.habisite.com (CORS), y así
   tampoco se cargan inscripciones de prueba en la base real.
   VITE_API_URL pisa cualquiera de las dos.

   El contrato está en contrato/openapi.yaml y el mapa de qué
   usa cada pantalla, en backendGonzalo/docs/07-api-para-el-front.md.
   ========================================================== */

export const API =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.challenge.habisite.com')

/* Clave de sitio de Cloudflare Turnstile. Es pública: la secreta
   vive solo en la API. */
export const TURNSTILE_SITIO = '0x4AAAAAAFRVKhCUdvWNByhd'

/* Todos los errores de la API tienen la misma forma:
   { estado, mensaje, detalles, ruta, hora }. */
export class ErrorApi extends Error {
  constructor(estado, cuerpo) {
    super(cuerpo?.mensaje ?? `Error ${estado}`)
    this.estado = estado
    this.detalles = cuerpo?.detalles ?? []
  }
}

/* Sin sesión: las rutas de la landing son públicas. Las de los
   paneles van a necesitar credentials: 'include'. */
export async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  let r
  try {
    r = await fetch(`${API}${ruta}`, {
      method: metodo,
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    })
  } catch {
    // Sin red, o la API caída: se trata como una falla nuestra.
    throw new ErrorApi(0, null)
  }

  const datos = await r.json().catch(() => null)
  if (!r.ok) throw new ErrorApi(r.status, datos)
  return datos
}
