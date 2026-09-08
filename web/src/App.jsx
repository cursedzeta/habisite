import Landing from './Landing'
import PanelConcursante from './paneles/PanelConcursante'
import PanelJurado from './paneles/PanelJurado'

/* Enrutador minimo, sin libreria.

   Son tres pantallas y ninguna navegacion anidada, asi que react-router
   seria peso de mas. Funciona porque en produccion corre `serve -s`, que
   manda cualquier ruta desconocida a index.html.

   Cuando los paneles sean de verdad y tengan subrutas (una propuesta, un
   detalle de evaluacion), ahi si conviene una libreria. */
export default function App() {
  const ruta = window.location.pathname.replace(/\/+$/, '')

  if (ruta === '/jurado') return <PanelJurado />
  if (ruta === '/panel') return <PanelConcursante />
  return <Landing />
}
