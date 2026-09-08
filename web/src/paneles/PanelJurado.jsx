import { useState } from 'react'
import { Button, Checkbox } from '../ds'
import Shell from './Shell'
import { Acceso, SinDefinir, VisorPdf } from './Piezas'
import { criteriosProvisorios, propuestasDemo } from './datos-demo'

export default function PanelJurado() {
  const [dentro, setDentro] = useState(false)
  const [seccion, setSeccion] = useState('pendientes')
  const [abierta, setAbierta] = useState(null)

  /* La autoria vuelve a estar en duda (req-jurado.md §3.3). En vez de
     elegir por el equipo, el prototipo trae las dos versiones con un
     interruptor: se decide mirandolas, no discutiendolas. */
  const [verAutor, setVerAutor] = useState(true)

  /* El cierre lo hace el admin. Antes de eso ningun jurado ve lo que
     puntuaron los demas (req-jurado.md punto 5). */
  const [cerrada, setCerrada] = useState(false)

  if (!dentro) return <Acceso rol="jurado" onEntrar={() => setDentro(true)} />

  const pendientes = propuestasDemo.filter((p) => !p.evaluada)
  const evaluadas = propuestasDemo.filter((p) => p.evaluada)
  const lista = seccion === 'evaluadas' ? evaluadas : seccion === 'todas' ? propuestasDemo : pendientes

  return (
    <Shell
      rol="Jurado"
      persona="Ana Restrepo"
      pestanas={[
        { id: 'evaluar', texto: 'Evaluar' },
        { id: 'criterios', texto: 'Criterios' },
      ]}
      pestanaActiva="evaluar"
      onPestana={() => {}}
      secciones={[
        { id: 'nav', texto: 'Propuestas', separador: true },
        { id: 'pendientes', texto: 'Pendientes', contador: pendientes.length },
        { id: 'evaluadas', texto: 'Evaluadas', contador: evaluadas.length },
        { id: 'todas', texto: 'Todas', contador: propuestasDemo.length },
        { id: 'nav2', texto: 'Concurso', separador: true },
        { id: 'avance', texto: 'Avance del jurado' },
      ]}
      seccionActiva={seccion}
      onSeccion={(s) => {
        setSeccion(s)
        setAbierta(null)
      }}
    >
      <div className="crm-interruptores">
        <label>
          <input type="checkbox" checked={verAutor} onChange={(e) => setVerAutor(e.target.checked)} />
          Mostrar la autoría <b>· en duda, probá las dos</b>
        </label>
        <label>
          <input type="checkbox" checked={cerrada} onChange={(e) => setCerrada(e.target.checked)} />
          Evaluación cerrada por el admin
        </label>
      </div>

      {seccion === 'avance' ? (
        <Avance cerrada={cerrada} />
      ) : abierta ? (
        <Evaluacion
          propuesta={abierta}
          verAutor={verAutor}
          cerrada={cerrada}
          onVolver={() => setAbierta(null)}
        />
      ) : (
        <Listado propuestas={lista} verAutor={verAutor} onAbrir={setAbierta} />
      )}
    </Shell>
  )
}

function Listado({ propuestas, verAutor, onAbrir }) {
  return (
    <>
      <div className="crm-cabecera">
        <div>
          <span className="hs-eyebrow hs-eyebrow--brand">Propuestas</span>
          <h1>{propuestas.length} en esta vista</h1>
        </div>
      </div>

      <SinDefinir>
        si cada jurado ve <b>todas</b> las propuestas o solo las que le asignen. Si es lo segundo
        aparece una tabla de asignación, una pantalla de admin para repartir y un promedio que se
        calcula entre los asignados. Es la decisión que más código mueve.
      </SinDefinir>

      <div className="pnl-tabla">
        {propuestas.map((p) => (
          <button key={p.id} type="button" className="pnl-fila" onClick={() => onAbrir(p)}>
            <span className="pnl-fila__id">{p.id}</span>
            <span className="pnl-fila__titulo">
              {p.titulo}
              {verAutor && (
                <span className="pnl-fila__autor">
                  {p.autor} · {p.universidad} · {p.pais}
                </span>
              )}
            </span>
            <span className="pnl-fila__meta">
              {p.equipo === 1 ? 'individual' : `equipo de ${p.equipo}`} · {p.paginas} láminas
            </span>
            <span className={`pnl-chip ${p.evaluada ? 'es-confirmado' : 'es-pendiente'}`}>
              {p.evaluada ? 'evaluada' : 'pendiente'}
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

/* Visor grande a la izquierda, evaluación pegada a la derecha.
   Es la pantalla donde el jurado pasa el 90% del tiempo: mira la lámina
   y puntúa sin cambiar de pantalla ni perder el contexto. */
function Evaluacion({ propuesta, verAutor, cerrada, onVolver }) {
  const [puntajes, setPuntajes] = useState({})
  const [devolucion, setDevolucion] = useState('')
  const [visible, setVisible] = useState(true)

  const cargados = criteriosProvisorios.filter((c) => puntajes[c.id] !== undefined && puntajes[c.id] !== '')

  return (
    <>
      <div className="crm-cabecera">
        <div>
          <button type="button" className="pnl-volver" onClick={onVolver}>
            ← Volver al listado
          </button>
          <span className="hs-eyebrow hs-eyebrow--brand">{propuesta.id}</span>
          <h1>{propuesta.titulo}</h1>
          {verAutor ? (
            <p className="pnl-dato">
              {propuesta.autor} · {propuesta.universidad} · {propuesta.pais}
            </p>
          ) : (
            <p className="pnl-dato pnl-nota">Autoría oculta durante la evaluación.</p>
          )}
        </div>
        <span className="crm-estado es-borrador">
          {cargados.length} de {criteriosProvisorios.length} criterios
        </span>
      </div>

      <div className="jur-split">
        <div className="jur-split__visor">
          <VisorPdf nombre={`${propuesta.id}.pdf`} paginas={propuesta.paginas} grande />
          <p className="pnl-nota">Solo lectura: el jurado no puede modificar propuestas.</p>
        </div>

        <aside className="jur-split__eval">
          <section className="crm-panel">
            <h2>Puntuación</h2>
            <p className="pnl-nota">
              Interno: ordena y define el podio, pero el concursante nunca lo ve.
            </p>

            <div className="pnl-criterios">
              {criteriosProvisorios.map((c) => (
                <div key={c.id} className="pnl-criterio">
                  <label htmlFor={`c-${c.id}`}>
                    {c.nombre} <span className="pnl-peso">{c.peso}%</span>
                  </label>
                  <input
                    id={`c-${c.id}`}
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={puntajes[c.id] ?? ''}
                    placeholder="—"
                    onChange={(e) => setPuntajes((p) => ({ ...p, [c.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="crm-panel">
            <h2>Devolución</h2>
            <textarea
              className="pnl-devolucion-campo"
              rows={7}
              value={devolucion}
              placeholder="Lo que va a leer el equipo autor…"
              onChange={(e) => setDevolucion(e.target.value)}
            />
            <div className="pnl-visibilidad">
              <Checkbox
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
                label="El concursante puede ver esta devolución"
              />
            </div>
            <div className="pnl-acciones">
              <Button variant="primary">Guardar</Button>
              <span className="pnl-nota">Corregible hasta el cierre.</span>
            </div>
          </section>

          <section className="crm-panel">
            <h2>Los demás jurados</h2>
            {cerrada ? (
              <div className="pnl-otros">
                <div><span>Martín Elizalde</span><b>7,8</b></div>
                <div><span>Cecilia Nakamura</span><b>8,4</b></div>
              </div>
            ) : (
              <p className="pnl-nota">
                Ocultos hasta el cierre. Si ves el 9 que puso otro, tendés a acercarte a ese
                número — probá el interruptor de arriba.
              </p>
            )}
          </section>

          <SinDefinir>
            los criterios, sus pesos y la escala. Estos siete salieron de las bases del sitio
            viejo. La pantalla se genera desde la lista de datos, así que cambiarlos no obliga a
            tocar el componente.
          </SinDefinir>
        </aside>
      </div>
    </>
  )
}

function Avance({ cerrada }) {
  return (
    <>
      <div className="crm-cabecera">
        <div>
          <span className="hs-eyebrow hs-eyebrow--brand">Concurso</span>
          <h1>Avance del jurado</h1>
        </div>
      </div>
      <div className="crm-cards">
        {['Ana Restrepo', 'Martín Elizalde', 'Cecilia Nakamura'].map((j, i) => (
          <div className="crm-card" key={j}>
            <span className="crm-card__rot">{j}</span>
            <b className="crm-card__val">{[1, 4, 2][i]} de 4</b>
            <p className="pnl-nota">propuestas evaluadas</p>
          </div>
        ))}
      </div>
      {!cerrada && (
        <p className="pnl-nota" style={{ marginTop: 'var(--space-5)' }}>
          El avance sí se ve siempre; lo que está oculto hasta el cierre son los puntajes.
        </p>
      )}
    </>
  )
}
