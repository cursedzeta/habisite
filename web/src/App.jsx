import Landing from './Landing'
import PanelAdmin from './paneles/PanelAdmin'
import PanelConcursante from './paneles/PanelConcursante'
import PanelJurado from './paneles/PanelJurado'
import ConSesion from './sesion/ConSesion'
import PaginaIngreso from './sesion/Ingreso'

/* Enrutador minimo, sin libreria.

   Son pocas pantallas y ninguna navegacion anidada, asi que
   react-router seria peso de mas. Funciona porque en produccion corre
   `serve -s`, que manda cualquier ruta desconocida a index.html.

   Cada panel pasa por ConSesion: sin sesion muestra el ingreso, y con
   sesion le entrega al panel los datos reales de GET /yo. */
export default function App() {
  const ruta = window.location.pathname.replace(/\/+$/, '')

  if (ruta === '/ingresar') return <PaginaIngreso />
  if (ruta === '/panel') {
    return (
      <ConSesion roles={['participante']} titulo="Panel de concursantes">
        {(yo) => <PanelConcursante yo={yo} />}
      </ConSesion>
    )
  }
  if (ruta === '/jurado') {
    return (
      <ConSesion roles={['jurado']} titulo="Panel de jurado">
        {(yo) => <PanelJurado yo={yo} />}
      </ConSesion>
    )
  }
  if (ruta === '/admin') {
    return (
      <ConSesion roles={['admin']} titulo="Administración">
        {(yo) => <PanelAdmin yo={yo} />}
      </ConSesion>
    )
  }
  return <Landing />
}
