import { useState } from 'react'
import { Button } from '../ds'
import Shell from './Shell'
import MisDatos from './MisDatos'

/* ==========================================================
   Panel de administración.

   Por ahora: entrar con la sesión real, ver los otros dos paneles
   y la lista de lo que va a vivir acá. Las acciones ya existen en
   la API (backendGonzalo/docs/07, «Panel de administración»); falta
   la pantalla de cada una.
   ========================================================== */

const PROXIMAMENTE = [
  ['Invitar jurados', 'Uno por uno, con su correo de Google. POST /admin/jurados.'],
  ['Etapas del concurso', 'Abrir y cerrar entregas, pasar a evaluación. PUT /admin/edicion/estado.'],
  ['Admisión de propuestas', 'Revisar que cada propuesta cumpla las bases antes del jurado. En disputa: ver CLAUDE.md §6.2.'],
  ['Resultados', 'Calcular el ranking, cerrar la evaluación y publicar. /admin/resultados.'],
]

export default function PanelAdmin({ yo, onVer }) {
  const [seccion, setSeccion] = useState('inicio')

  return (
    <Shell
      yo={yo}
      pestanas={[
        { id: 'inicio', texto: 'Administración' },
        { id: 'perfil', texto: 'Mi perfil' },
      ]}
      pestanaActiva={seccion}
      onPestana={setSeccion}
      secciones={[
        { id: 'nav', texto: 'Concurso', separador: true },
        { id: 'inicio', texto: 'Inicio' },
      ]}
      seccionActiva={seccion}
      onSeccion={setSeccion}
    >
      {seccion === 'perfil' ? (
        <MisDatos yo={yo} />
      ) : (
        <>
          <div className="crm-cabecera">
            <div>
              <span className="hs-eyebrow hs-eyebrow--brand">Administración</span>
              <h1>Habisite Challenge 2026-II</h1>
            </div>
          </div>

          <p className="pnl-dato">
            Como administrador puedes abrir los otros paneles para ver lo que ve cada rol.
          </p>
          <div className="pnl-acciones">
            <Button variant="primary" onClick={() => onVer('participante')}>
              Ver como concursante
            </Button>
            <Button variant="outline" onClick={() => onVer('jurado')}>
              Ver como jurado
            </Button>
          </div>

          <div className="crm-cabecera adm-proximo">
            <div>
              <span className="hs-eyebrow hs-eyebrow--brand">Próximamente</span>
              <h1>Lo que va a vivir acá</h1>
            </div>
          </div>
          <div className="crm-cards">
            {PROXIMAMENTE.map(([titulo, detalle]) => (
              <div className="crm-card" key={titulo}>
                <b className="crm-card__val">{titulo}</b>
                <p className="pnl-nota">{detalle}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </Shell>
  )
}
