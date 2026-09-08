import { useState } from 'react'
import { Button, Field, Input } from '../ds'
import Shell from './Shell'
import { Acceso, Modal, SinDefinir, VisorPdf } from './Piezas'
import { CIERRE, MAX_MIEMBROS, devolucionDemo, propuestaDemo, usuarioDemo } from './datos-demo'

export default function PanelConcursante() {
  const [dentro, setDentro] = useState(false)
  const [seccion, setSeccion] = useState('propuesta')
  const [propuesta, setPropuesta] = useState(propuestaDemo)
  const [modalEquipo, setModalEquipo] = useState(false)

  if (!dentro) return <Acceso rol="participante" onEntrar={() => setDentro(true)} />

  const entregada = propuesta.estado === 'entregada'
  const libres = MAX_MIEMBROS - propuesta.miembros.length

  const secciones = [
    { id: 'nav', texto: 'Mi participación', separador: true },
    { id: 'propuesta', texto: 'Propuesta' },
    { id: 'entrega', texto: 'Entrega' },
    { id: 'equipo', texto: 'Equipo', contador: propuesta.miembros.length },
    { id: 'nav2', texto: 'Concurso', separador: true },
    { id: 'resultado', texto: 'Resultado' },
    { id: 'bases', texto: 'Bases y términos' },
  ]

  return (
    <Shell
      rol="Participante"
      persona={`${usuarioDemo.nombre} ${usuarioDemo.apellido}`}
      pestanas={[
        { id: 'concurso', texto: 'Design Challenge 2026' },
        { id: 'perfil', texto: 'Mi perfil' },
      ]}
      pestanaActiva="concurso"
      onPestana={() => {}}
      secciones={secciones}
      seccionActiva={seccion}
      onSeccion={setSeccion}
    >
      {seccion === 'propuesta' && (
        <>
          <CabeceraSeccion
            rotulo="Tu propuesta"
            titulo={propuesta.titulo}
            derecha={
              <span className={`crm-estado ${entregada ? 'es-entregada' : 'es-borrador'}`}>
                {entregada ? 'Entregada' : 'Borrador'}
              </span>
            }
          />

          <div className="crm-cards">
            <div className="crm-card">
              <span className="crm-card__rot">Cierre de entregas</span>
              <b className="crm-card__val">{CIERRE}</b>
              <p className="pnl-nota">
                Lo aplica el servidor, no este botón: después de esa hora no se puede editar
                aunque la pantalla siga abierta.
              </p>
            </div>
            <div className="crm-card">
              <span className="crm-card__rot">Integrantes</span>
              <b className="crm-card__val">
                {propuesta.miembros.length} de {MAX_MIEMBROS}
              </b>
              <p className="pnl-nota">{libres} lugares libres.</p>
            </div>
            <div className="crm-card">
              <span className="crm-card__rot">Archivo</span>
              <b className="crm-card__val">{propuesta.archivo.paginas} láminas</b>
              <p className="pnl-nota">{propuesta.archivo.peso}</p>
            </div>
          </div>

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
        </>
      )}

      {seccion === 'entrega' && (
        <>
          <CabeceraSeccion
            rotulo="Entrega"
            titulo="Un único PDF"
            derecha={
              !entregada && (
                <Button variant="outline" size="sm">
                  Reemplazar archivo
                </Button>
              )
            }
          />
          <p className="pnl-dato">
            {propuesta.archivo.nombre} · {propuesta.archivo.paginas} páginas ·{' '}
            {propuesta.archivo.peso}
          </p>
          <VisorPdf nombre={propuesta.archivo.nombre} paginas={propuesta.archivo.paginas} grande />
          <SinDefinir>
            peso máximo del archivo y tope de páginas. Hoy no hay límite y alguien puede subir
            400&nbsp;MB el último día.
          </SinDefinir>
        </>
      )}

      {seccion === 'equipo' && (
        <>
          <CabeceraSeccion
            rotulo="Equipo"
            titulo={`${propuesta.miembros.length} de ${MAX_MIEMBROS} integrantes`}
            derecha={
              !entregada &&
              libres > 0 && (
                <Button variant="primary" size="sm" onClick={() => setModalEquipo(true)}>
                  Añadir miembro
                </Button>
              )
            }
          />
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
        </>
      )}

      {seccion === 'resultado' && (
        <>
          <CabeceraSeccion rotulo="Resultado" titulo="Devolución del jurado" />
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
            <p className="pnl-dato">Todavía no hay nada publicado.</p>
          )}
        </>
      )}

      {seccion === 'bases' && (
        <>
          <CabeceraSeccion rotulo="Concurso" titulo="Bases y términos" />
          <SinDefinir>
            el texto de las bases no existe todavía. Bloquea el correo de invitación al equipo,
            que tiene que enlazarlas.
          </SinDefinir>
        </>
      )}

      {modalEquipo && (
        <ModalEquipo
          libres={libres}
          onCancelar={() => setModalEquipo(false)}
          onConfirmar={(correos) => {
            setPropuesta((p) => ({
              ...p,
              miembros: [...p.miembros, ...correos.map((c) => ({ correo: c, estado: 'pendiente' }))],
            }))
            setModalEquipo(false)
          }}
        />
      )}
    </Shell>
  )
}

function CabeceraSeccion({ rotulo, titulo, derecha }) {
  return (
    <div className="crm-cabecera">
      <div>
        <span className="hs-eyebrow hs-eyebrow--brand">{rotulo}</span>
        <h1>{titulo}</h1>
      </div>
      {derecha}
    </div>
  )
}

/* Card de invitación: un correo por miembro, botón + para sumar otro,
   confirmar y cancelar (req-concursantes.md, puntos 8 a 16). */
function ModalEquipo({ libres, onCancelar, onConfirmar }) {
  const [correos, setCorreos] = useState([''])

  const cambiar = (i, v) => setCorreos((c) => c.map((x, j) => (j === i ? v : x)))
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
        <button type="button" className="pnl-mas" onClick={() => setCorreos((c) => [...c, ''])}>
          + Añadir otro
        </button>
      )}

      <p className="pnl-nota">
        Quedan {libres} lugares libres. <a href="#terminos">Términos y condiciones</a> — todavía
        sin redactar.
      </p>

      <div className="pnl-modal__pie">
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          disabled={validos.length === 0}
          onClick={() => onConfirmar(validos)}
        >
          Confirmar
        </Button>
      </div>
    </Modal>
  )
}
