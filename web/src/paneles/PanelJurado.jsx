import { useState } from 'react'
import { Button, Checkbox } from '../ds'
import { Acceso, CintaPrototipo, Encabezado, SinDefinir, VisorPdf } from './Piezas'
import { criteriosProvisorios, propuestasDemo } from './datos-demo'

export default function PanelJurado() {
  const [dentro, setDentro] = useState(false)
  const [abierta, setAbierta] = useState(null)

  /* La autoria vuelve a estar en duda (req-jurado.md §3.3). En vez de
     elegir por el equipo, el prototipo trae las dos versiones con un
     interruptor: se decide mirandolas, no discutiendolas. */
  const [verAutor, setVerAutor] = useState(true)

  /* El cierre lo hace el admin. Antes de eso ningun jurado ve lo que
     puntuaron los demas (req-jurado.md punto 5). */
  const [cerrada, setCerrada] = useState(false)

  if (!dentro) return <Acceso rol="jurado" onEntrar={() => setDentro(true)} />

  return (
    <>
      <CintaPrototipo />
      <Encabezado titulo="Panel de jurado" persona="Ana Restrepo" rol="Jurado" />

      <main className="pnl-cuerpo">
        <div className="pnl-interruptores">
          <label>
            <input type="checkbox" checked={verAutor} onChange={(e) => setVerAutor(e.target.checked)} />
            Mostrar la autoría <b>· en duda, probá las dos</b>
          </label>
          <label>
            <input type="checkbox" checked={cerrada} onChange={(e) => setCerrada(e.target.checked)} />
            Evaluación cerrada por el admin
          </label>
        </div>

        {abierta ? (
          <Evaluacion
            propuesta={abierta}
            verAutor={verAutor}
            cerrada={cerrada}
            onVolver={() => setAbierta(null)}
          />
        ) : (
          <Listado propuestas={propuestasDemo} verAutor={verAutor} onAbrir={setAbierta} />
        )}
      </main>
    </>
  )
}

function Listado({ propuestas, verAutor, onAbrir }) {
  return (
    <section className="pnl-bloque">
      <span className="hs-eyebrow hs-eyebrow--brand">Propuestas</span>
      <h2>{propuestas.length} para evaluar</h2>

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
    </section>
  )
}

function Evaluacion({ propuesta, verAutor, cerrada, onVolver }) {
  const [puntajes, setPuntajes] = useState({})
  const [devolucion, setDevolucion] = useState('')
  const [visible, setVisible] = useState(true)

  return (
    <>
      <button type="button" className="pnl-volver" onClick={onVolver}>
        ← Volver al listado
      </button>

      <div className="pnl-evaluacion">
        {/* ---------- la propuesta ---------- */}
        <section className="pnl-bloque">
          <span className="hs-eyebrow hs-eyebrow--brand">{propuesta.id}</span>
          <h2>{propuesta.titulo}</h2>

          {verAutor ? (
            <p className="pnl-dato">
              {propuesta.autor} · {propuesta.universidad} · {propuesta.pais}
            </p>
          ) : (
            <p className="pnl-dato pnl-nota">Autoría oculta durante la evaluación.</p>
          )}

          <VisorPdf nombre={`${propuesta.id}.pdf`} paginas={propuesta.paginas} />
          <p className="pnl-nota">Solo lectura: el jurado no puede modificar propuestas.</p>
        </section>

        {/* ---------- puntuación y devolución ---------- */}
        <section className="pnl-bloque">
          <span className="hs-eyebrow hs-eyebrow--brand">Tu evaluación</span>
          <h2>Puntuación</h2>

          <p className="pnl-nota">
            El puntaje es interno: ordena y define el podio, pero el concursante nunca lo ve. Solo
            recibe la devolución escrita.
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

          <SinDefinir>
            los criterios y sus pesos. Estos siete salieron de las bases del sitio viejo y el equipo
            todavía no habló con el jurado. La pantalla se genera desde la lista de datos, así que
            cambiarlos no obliga a tocar el componente. Tampoco está definida la escala: el
            prototipo usa 0 a 10.
          </SinDefinir>

          <h2 className="pnl-h2-sep">Devolución</h2>
          <textarea
            className="pnl-devolucion-campo"
            rows={6}
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
            <span className="pnl-nota">Podés corregirla las veces que quieras hasta el cierre.</span>
          </div>
        </section>

        {/* ---------- los otros jurados ---------- */}
        <section className="pnl-bloque">
          <span className="hs-eyebrow hs-eyebrow--brand">Los demás jurados</span>
          {cerrada ? (
            <>
              <h2>Ya podés verlos</h2>
              <div className="pnl-otros">
                <div><span>Ana Restrepo</span><b>{devolucion ? '—' : 'sin cargar'}</b></div>
                <div><span>Martín Elizalde</span><b>7,8</b></div>
                <div><span>Cecilia Nakamura</span><b>8,4</b></div>
              </div>
            </>
          ) : (
            <>
              <h2>Ocultos hasta el cierre</h2>
              <p className="pnl-nota">
                No es una restricción caprichosa: si ves el 9 que puso otro, tendés a acercarte a
                ese número. Se destapan cuando el admin cierra la evaluación — probá el
                interruptor de arriba.
              </p>
            </>
          )}
        </section>
      </div>
    </>
  )
}
