import { useEffect, useState } from 'react'
import { Button } from '../ds'
import { pedir } from '../api'
import { Ingreso } from './Ingreso'
import { NOMBRE_DEL_ROL, PANEL_DEL_ROL, nombreCompleto, salir } from './sesion'

/* ==========================================================
   La puerta de cada panel.

   Pregunta GET /yo y decide:
   - sin sesión        → la pantalla de ingreso, que vuelve acá
   - rol que no toca   → aviso y enlace a su panel
   - todo bien         → el panel, con los datos reales de la persona

   Es solo comodidad: quien decide qué puede ver cada uno es la API,
   que valida la cookie y el rol en cada pedido.
   ========================================================== */

export default function ConSesion({ roles, titulo, children }) {
  const [estado, setEstado] = useState({ cargando: true })

  useEffect(() => {
    pedir('/yo')
      .then((yo) => setEstado({ yo }))
      .catch((error) => setEstado({ error }))
  }, [])

  if (estado.cargando) {
    return (
      <div className="pnl-acceso">
        <div className="pnl-acceso__card">
          <p className="pnl-nota">Un momento…</p>
        </div>
      </div>
    )
  }

  if (estado.error) {
    if (estado.error.estado === 401) {
      return <Ingreso retorno={window.location.pathname} titulo={titulo} />
    }
    return (
      <Aviso titulo="No pudimos cargar tu sesión">
        <p>Algo falló de nuestro lado. Vuelve a intentarlo en unos minutos.</p>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reintentar
        </Button>
      </Aviso>
    )
  }

  const { yo } = estado
  if (yo.rol !== 'admin' && !roles.includes(yo.rol)) {
    const suyo = PANEL_DEL_ROL[yo.rol]
    return (
      <Aviso titulo="Este panel no es para tu cuenta">
        <p>
          Entraste como <b>{nombreCompleto(yo)}</b> ({NOMBRE_DEL_ROL[yo.rol]?.toLowerCase()}).
        </p>
        {suyo && (
          <Button variant="primary" href={suyo}>
            Ir a mi panel
          </Button>
        )}
        <Button variant="ghost" onClick={salir}>
          Entrar con otra cuenta
        </Button>
      </Aviso>
    )
  }

  return children(yo)
}

function Aviso({ titulo, children }) {
  return (
    <div className="pnl-acceso">
      <div className="pnl-acceso__card">
        <span className="hs-eyebrow hs-eyebrow--brand">Habisite Challenge 2026-II</span>
        <h1>{titulo}</h1>
        {children}
      </div>
    </div>
  )
}
