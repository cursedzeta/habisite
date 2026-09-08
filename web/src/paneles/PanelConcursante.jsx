import { useState } from 'react'
import { Button, Field, Input } from '../ds'
import { Acceso, CintaPrototipo, Encabezado, Modal, SinDefinir, VisorPdf } from './Piezas'
import { CIERRE, MAX_MIEMBROS, devolucionDemo, propuestaDemo, usuarioDemo } from './datos-demo'

export default function PanelConcursante() {
  const [dentro, setDentro] = useState(false)
  const [propuesta, setPropuesta] = useState(propuestaDemo)
  const [modalEquipo, setModalEquipo] = useState(false)

  if (!dentro) return <Acceso rol="participante" onEntrar={() => setDentro(true)} />

  const entregada = propuesta.estado === 'entregada'
  const libres = MAX_MIEMBROS - propuesta.miembros.length

  function invitar(correos) {
    setPropuesta((p) => ({
      ...p,
      miembros: [...p.miembros, ...correos.map((c) => ({ correo: c, estado: 'pendiente' }))],
    }))
    setModalEquipo(false)
  }

  return (
    <>
      <CintaPrototipo />
      <Encabezado
        titulo="Panel de concursantes"
        persona={`${usuarioDemo.nombre} ${usuarioDemo.apellido}`}
        rol="Participante"
      />

      <main className="pnl-cuerpo">
        {/* ---------- estado de la propuesta ---------- */}
        <section className="pnl-bloque">
          <div className="pnl-bloque__head">
            <div>
              <span className="hs-eyebrow hs-eyebrow--brand">Tu propuesta</span>
              <h2>{propuesta.titulo}</h2>
            </div>
            <span className={`pnl-estado ${entregada ? 'es-entregada' : 'es-borrador'}`}>
              {entregada ? 'Entregada' : 'Borrador'}
            </span>
          </div>

          <p className="pnl-dato">
            Cierre de entregas: <b>{CIERRE}</b>
            <br />
            <span className="pnl-nota">
              El cierre lo aplica el servidor, no este botón: después de esa hora no se puede
              editar aunque la pantalla siga abierta.
            </span>
          </p>

          <div className="pnl-acciones">
            <Button
              variant={entregada ? 'outline' : 'primary'}
              onClick={() =>
                setPropuesta((p) => ({
                  ...p,
                  estado: p.estado === 'entregada' ? 'borrador' : 'entregada',
                }))
              }
            >
              {entregada ? 'Volver a borrador' : 'Entregar propuesta'}
            </Button>
          </div>
        </section>

        {/* ---------- el PDF ---------- */}
        <section className="pnl-bloque">
          <div className="pnl-bloque__head">
            <div>
              <span className="hs-eyebrow hs-eyebrow--brand">Entrega</span>
              <h2>Un único PDF</h2>
            </div>
            {!entregada && (
              <Button variant="outline" size="sm">
                Reemplazar archivo
              </Button>
            )}
          </div>

          <p className="pnl-dato">
            {propuesta.archivo.nombre} · {propuesta.archivo.paginas} páginas ·{' '}
            {propuesta.archivo.peso}
          </p>

          <VisorPdf nombre={propuesta.archivo.nombre} paginas={propuesta.archivo.paginas} />

          <SinDefinir>
            peso máximo del archivo y tope de páginas. Hoy no hay límite y alguien puede subir
            400&nbsp;MB el último día.
          </SinDefinir>
        </section>

        {/* ---------- el equipo ---------- */}
        <section className="pnl-bloque">
          <div className="pnl-bloque__head">
            <div>
              <span className="hs-eyebrow hs-eyebrow--brand">Equipo</span>
              <h2>
                {propuesta.miembros.length} de {MAX_MIEMBROS} integrantes
              </h2>
            </div>
            {!entregada && libres > 0 && (
              <Button variant="outline" size="sm" onClick={() => setModalEquipo(true)}>
                Añadir miembro
              </Button>
            )}
          </div>

          <ul className="pnl-miembros">
            {propuesta.miembros.map((m) => (
              <li key={m.correo}>
                <span>{m.correo}</span>
                <span className={`pnl-chip es-${m.estado}`}>{m.estado}</span>
              </li>
            ))}
          </ul>

          <SinDefinir>
            si los {MAX_MIEMBROS} incluyen a quien creó la propuesta, si se puede quitar a alguien,
            y qué pasa con una invitación que nunca se confirma.
          </SinDefinir>
        </section>

        {/* ---------- devolución ---------- */}
        <section className="pnl-bloque">
          <span className="hs-eyebrow hs-eyebrow--brand">Resultado</span>
          <h2>Devolución del jurado</h2>

          {devolucionDemo.publicada ? (
            <>
              {devolucionDemo.podio && (
                <p className="pnl-podio">
                  Tu propuesta quedó en el puesto <b>{devolucionDemo.podio}</b>. Los detalles se
                  comunican por el grupo oficial del concurso.
                </p>
              )}
              <p className="pnl-devolucion">{devolucionDemo.texto}</p>
              <p className="pnl-nota">
                No hay puntaje: el concursante recibe la devolución escrita y, si entró al podio,
                el aviso. Los números del jurado no salen del sistema.
              </p>
            </>
          ) : (
            <p className="pnl-dato">
              Todavía no hay nada publicado. Cuando el jurado termine y el administrador publique,
              vas a ver acá la devolución.
            </p>
          )}
        </section>
      </main>

      {modalEquipo && (
        <ModalEquipo libres={libres} onCancelar={() => setModalEquipo(false)} onConfirmar={invitar} />
      )}
    </>
  )
}

/* Card de invitación: un correo por miembro, boton + para sumar otro,
   confirmar y cancelar (req-concursantes.md, puntos 8 a 16). */
function ModalEquipo({ libres, onCancelar, onConfirmar }) {
  const [correos, setCorreos] = useState([''])

  const cambiar = (i, v) => setCorreos((c) => c.map((x, j) => (j === i ? v : x)))
  const sumar = () => setCorreos((c) => [...c, ''])
  const validos = correos.map((c) => c.trim()).filter((c) => /.+@.+\..+/.test(c))

  return (
    <Modal titulo="Añadir miembros al equipo" onCerrar={onCancelar}>
      <p className="pnl-nota">
        A cada dirección le llega una invitación para sumarse a tu propuesta, con un botón de
        confirmación y el enlace a los términos y condiciones del concurso.
      </p>

      <div className="pnl-correos">
        {correos.map((c, i) => (
          <Field key={i} label={`Correo ${i + 1}`} htmlFor={`correo-${i}`}>
            <Input
              id={`correo-${i}`}
              type="email"
              value={c}
              placeholder="nombre@universidad.edu"
              onChange={(e) => cambiar(i, e.target.value)}
            />
          </Field>
        ))}
      </div>

      {correos.length < libres && (
        <button type="button" className="pnl-mas" onClick={sumar}>
          + Añadir otro
        </button>
      )}

      <p className="pnl-nota">
        Quedan {libres} lugares libres.{' '}
        <a href="#terminos">Términos y condiciones</a> — todavía sin redactar.
      </p>

      <div className="pnl-modal__pie">
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button variant="primary" disabled={validos.length === 0} onClick={() => onConfirmar(validos)}>
          Confirmar
        </Button>
      </div>
    </Modal>
  )
}
