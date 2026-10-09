import { useState } from 'react'
import Landing from './Landing'
import PanelAdmin from './paneles/PanelAdmin'
import PanelConcursante from './paneles/PanelConcursante'
import PanelJurado from './paneles/PanelJurado'
import ConSesion from './sesion/ConSesion'
import PaginaIngreso from './sesion/Ingreso'
import { RUTA_PANEL } from './sesion/sesion'

/* Enrutador minimo, sin libreria.

   Son pocas pantallas y ninguna navegacion anidada, asi que
   react-router seria peso de mas. Funciona porque en produccion corre
   `serve -s`, que manda cualquier ruta desconocida a index.html.

   Una sola URL para los paneles: /panel muestra la vista del rol de
   quien entro (decidido el 09.10). /jurado y /admin quedan como
   redirecciones para que no se rompan los enlaces que ya circularon. */
export default function App() {
  const ruta = window.location.pathname.replace(/\/+$/, '')

  if (ruta === '/jurado' || ruta === '/admin') {
    window.location.replace(RUTA_PANEL)
    return null
  }
  if (ruta === '/ingresar') return <PaginaIngreso />
  if (ruta === RUTA_PANEL) return <ConSesion>{(yo) => <PanelSegunRol yo={yo} />}</ConSesion>
  return <Landing />
}

/* El admin entra a su vista y desde ahí puede mirar las de los otros
   dos roles, con un botón para volver. */
function PanelSegunRol({ yo }) {
  const [vista, setVista] = useState(yo.rol)
  const volver = yo.rol === 'admin' && vista !== 'admin' ? () => setVista('admin') : null

  if (vista === 'admin') return <PanelAdmin yo={yo} onVer={setVista} />
  if (vista === 'jurado') return <PanelJurado yo={yo} onVolver={volver} />
  return <PanelConcursante yo={yo} onVolver={volver} />
}
