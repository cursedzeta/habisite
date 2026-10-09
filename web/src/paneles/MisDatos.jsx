import { PAISES, TIPOS } from '../listas'
import { NOMBRE_DEL_ROL, nombreCompleto } from '../sesion/sesion'

/* ==========================================================
   Los datos de quien está adentro, tal como los tiene la API
   (GET /yo). Es la primera sección de los paneles que ya no es
   de ejemplo.
   ========================================================== */

export default function MisDatos({ yo }) {
  const pais = PAISES.find((p) => p[0] === yo.pais)?.[1] ?? yo.pais
  const tipo = TIPOS.find((t) => t[0] === yo.tipoInstitucion)?.[1]

  const datos = [
    ['Correo', yo.correo],
    ['Rol', NOMBRE_DEL_ROL[yo.rol]],
    ['Actualmente', tipo],
    ['Universidad o trabajo', yo.institucion],
    ['País', pais],
    ['Teléfono', yo.telefono],
  ]

  return (
    <>
      <div className="crm-cabecera">
        <div>
          <span className="hs-eyebrow hs-eyebrow--brand">Mi perfil</span>
          <h1>{nombreCompleto(yo)}</h1>
        </div>
      </div>

      <div className="crm-cards">
        {datos.map(([rotulo, valor]) => (
          <div className="crm-card" key={rotulo}>
            <span className="crm-card__rot">{rotulo}</span>
            <b className="crm-card__val">{valor || '—'}</b>
          </div>
        ))}
      </div>

      {!yo.perfilCompleto && (
        <p className="pnl-dato">
          Te faltan datos de la inscripción. Vas a poder completarlos acá antes de armar tu equipo
          o subir tu propuesta.
        </p>
      )}
    </>
  )
}
