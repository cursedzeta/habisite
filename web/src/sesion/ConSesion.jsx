import { useEffect, useState } from 'react'
import { Button } from '../ds'
import { pedir } from '../api'
import { Ingreso } from './Ingreso'
import { RUTA_PANEL } from './sesion'

/* ==========================================================
   La puerta del panel.

   Pregunta GET /yo y decide:
   - sin sesión  → la pantalla de ingreso, que vuelve al panel
   - con sesión  → el panel, con los datos reales de la persona

   Qué vista ve cada rol lo decide quien la usa (App.jsx). Es solo
   comodidad: lo que puede hacer cada uno lo controla la API, que
   valida la cookie y el rol en cada pedido.
   ========================================================== */

export default function ConSesion({ children }) {
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
    if (estado.error.estado === 401) return <Ingreso retorno={RUTA_PANEL} />
    return (
      <div className="pnl-acceso">
        <div className="pnl-acceso__card">
          <span className="hs-eyebrow hs-eyebrow--brand">Habisite Challenge 2026-II</span>
          <h1>No pudimos cargar tu sesión</h1>
          <p>Algo falló de nuestro lado. Vuelve a intentarlo en unos minutos.</p>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return children(estado.yo)
}
