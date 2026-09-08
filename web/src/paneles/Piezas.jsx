import { useState } from 'react'
import { Button } from '../ds'

/* ==========================================================
   Piezas compartidas por los dos paneles del prototipo.
   ========================================================== */

/* Aviso fijo: que nadie confunda esto con la aplicacion real. */
export function CintaPrototipo() {
  return (
    <div className="pnl-cinta">
      Prototipo — datos inventados, sin backend. Nada de lo que hagas acá se guarda.
    </div>
  )
}

/* Acceso simulado. El login real lo resuelve el backend con Google
   (req-*.md punto 1); acá solo se representa la pantalla. */
export function Acceso({ rol, onEntrar }) {
  return (
    <div className="pnl-acceso">
      <div className="pnl-acceso__card">
        <span className="hs-eyebrow hs-eyebrow--brand">Habisite Design Challenge 2026</span>
        <h1>{rol === 'jurado' ? 'Panel de jurado' : 'Panel de concursantes'}</h1>
        <p>
          {rol === 'jurado'
            ? 'Acceso por invitación. Cada jurado se da de alta uno por uno.'
            : 'Ingresá con la cuenta con la que te pre-registraste.'}
        </p>
        <Button variant="ink" size="lg" onClick={onEntrar} className="pnl-google">
          Entrar con Google
        </Button>
        <span className="pnl-nota">Simulado: no valida nada todavía.</span>
      </div>
    </div>
  )
}

export function Encabezado({ titulo, persona, rol }) {
  return (
    <header className="pnl-top">
      <div className="pnl-top__in">
        <div>
          <span className="hs-eyebrow hs-eyebrow--brand">{titulo}</span>
          <b className="pnl-top__marca">Habisite</b>
        </div>
        <div className="pnl-top__quien">
          <span>{persona}</span>
          <span className="pnl-rol">{rol}</span>
        </div>
      </div>
    </header>
  )
}

/* Visor de PDF con zoom (req-concursantes.md, punto 6).

   El prototipo dibuja una lamina falsa en vez de renderizar un PDF real:
   alcanza para probar la interaccion del zoom sin traer pdf.js, que pesa
   mas que toda esta app junta. Cuando haya archivos de verdad, se cambia
   el contenido de .pnl-hoja y los controles quedan igual. */
export function VisorPdf({ nombre, paginas = 4 }) {
  const [zoom, setZoom] = useState(1)
  const [pagina, setPagina] = useState(1)

  const acercar = () => setZoom((z) => Math.min(2.5, +(z + 0.25).toFixed(2)))
  const alejar = () => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))

  return (
    <div className="pnl-visor">
      <div className="pnl-visor__barra">
        <span className="pnl-visor__nombre">{nombre}</span>
        <div className="pnl-visor__ctrl">
          <button type="button" onClick={alejar} aria-label="Alejar">−</button>
          <span className="pnl-visor__zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={acercar} aria-label="Acercar">+</button>
          <button type="button" onClick={() => setZoom(1)} className="pnl-visor__reset">
            Ajustar
          </button>
        </div>
      </div>

      <div className="pnl-visor__lienzo">
        <div className="pnl-hoja" style={{ transform: `scale(${zoom})` }}>
          <span className="pnl-hoja__rotulo">Lámina {pagina} de {paginas}</span>
          <div className="pnl-hoja__falso">
            <div className="pnl-hoja__bloque pnl-hoja__bloque--alto" />
            <div className="pnl-hoja__col">
              <div className="pnl-hoja__bloque" />
              <div className="pnl-hoja__bloque pnl-hoja__bloque--bajo" />
            </div>
          </div>
          <span className="pnl-hoja__pie">Contenido de ejemplo — el PDF real va acá</span>
        </div>
      </div>

      <div className="pnl-visor__paginas">
        {Array.from({ length: paginas }, (_, i) => (
          <button
            key={i}
            type="button"
            className={pagina === i + 1 ? 'es-actual' : ''}
            onClick={() => setPagina(i + 1)}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}

/* Card sobre el contenido, con el fondo desenfocado y oscurecido
   (req-concursantes.md, punto 9). */
export function Modal({ titulo, children, onCerrar }) {
  return (
    <div className="pnl-scrim" onClick={onCerrar}>
      <div className="pnl-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  )
}

/* Marca lo que todavia no esta definido, para que se vea en pantalla y
   no solo en un .md que nadie abre. */
export function SinDefinir({ children }) {
  return <p className="pnl-sindefinir">Sin definir · {children}</p>
}
