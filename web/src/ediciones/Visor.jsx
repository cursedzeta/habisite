import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Button, IconButton } from '../ds'

/* Visor a pantalla completa para la galería y la lámina A1.

   Va en un portal sobre <body>, fuera de .escala: dentro de un
   ancestro con zoom, position:fixed se resuelve escalado (el mismo
   problema que tiene la barra, ver interacciones.css).

   El zoom no usa transform: la imagen cambia de tamaño de verdad y
   el lienzo scrollea. Así el desplazamiento es el nativo (rueda,
   trackpad, dedo) y no hay que reinventarlo; con el mouse además se
   puede arrastrar.

   Teclado: Esc cierra, ← → cambian de imagen, + − 0 acercan, alejan
   y ajustan. El foco queda atrapado adentro y vuelve al cerrar. */

const ZOOM_MIN = 1
const ZOOM_MAX = 4
const PASO = 1.5

function limitar(z) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 100) / 100))
}

export default function Visor({ titulo, imagenes, inicial = 0, onCerrar }) {
  const [indice, setIndice] = useState(inicial)
  const [zoom, setZoom] = useState(ZOOM_MIN)
  const [caja, setCaja] = useState(null)

  const refDialogo = useRef(null)
  const refEscenario = useRef(null)
  const refLienzo = useRef(null)
  const refCerrar = useRef(null)
  // Punto que estaba en el centro antes de cambiar el zoom, en fracciones.
  const centro = useRef(null)
  const arrastre = useRef(null)
  const idTitulo = useId()

  const total = imagenes.length
  const imagen = imagenes[indice]

  function guardarCentro() {
    const el = refLienzo.current
    if (!el) return
    centro.current = {
      x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
      y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
    }
  }

  function zoomPor(factor) {
    guardarCentro()
    setZoom((z) => limitar(z * factor))
  }

  function zoomA(valor) {
    guardarCentro()
    setZoom(limitar(valor))
  }

  function ir(i) {
    centro.current = null
    setIndice(((i % total) + total) % total)
    setZoom(ZOOM_MIN)
  }

  function mover(paso) {
    centro.current = null
    setIndice((i) => (i + paso + total) % total)
    setZoom(ZOOM_MIN)
  }

  /* Bloquea el scroll de la página, enfoca "Cerrar" y, al salir,
     devuelve el foco a lo que abrió el visor. */
  useEffect(() => {
    const previo = document.activeElement
    const desborde = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    refCerrar.current?.focus()
    return () => {
      document.body.style.overflow = desborde
      if (previo && previo.focus) previo.focus()
    }
  }, [])

  /* El tamaño disponible para la imagen. ResizeObserver avisa una vez
     al empezar a observar, así que no hace falta medir a mano. */
  useEffect(() => {
    const el = refEscenario.current
    const observador = new ResizeObserver(([entrada]) => {
      setCaja({ ancho: entrada.contentRect.width, alto: entrada.contentRect.height })
    })
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  // Después de cambiar el zoom, el mismo punto vuelve al centro.
  useLayoutEffect(() => {
    const el = refLienzo.current
    const c = centro.current
    centro.current = null
    if (!el || !c) return
    el.scrollLeft = c.x * el.scrollWidth - el.clientWidth / 2
    el.scrollTop = c.y * el.scrollHeight - el.clientHeight / 2
  }, [zoom])

  /* Evento de efecto: lee siempre las funciones y props del último
     render sin tener que volver a suscribirse al teclado. */
  const alTeclear = useEffectEvent((e) => {
    const lienzoEnfocado = document.activeElement === refLienzo.current

    if (e.key === 'Escape') {
      e.preventDefault()
      onCerrar()
    } else if (e.key === 'ArrowRight' && total > 1 && !lienzoEnfocado) {
      e.preventDefault()
      mover(1)
    } else if (e.key === 'ArrowLeft' && total > 1 && !lienzoEnfocado) {
      e.preventDefault()
      mover(-1)
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault()
      zoomPor(PASO)
    } else if (e.key === '-') {
      e.preventDefault()
      zoomPor(1 / PASO)
    } else if (e.key === '0') {
      e.preventDefault()
      zoomA(ZOOM_MIN)
    } else if (e.key === 'Tab') {
      const dialogo = refDialogo.current
      const focos = dialogo.querySelectorAll('button:not([disabled]), [tabindex="0"]')
      if (!focos.length) return
      const primero = focos[0]
      const ultimo = focos[focos.length - 1]
      if (!dialogo.contains(document.activeElement)) {
        e.preventDefault()
        primero.focus()
      } else if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }
  })

  useEffect(() => {
    function escuchar(e) {
      alTeclear(e)
    }
    document.addEventListener('keydown', escuchar)
    return () => document.removeEventListener('keydown', escuchar)
  }, [])

  // Arrastrar con el mouse cuando la imagen está ampliada.
  function alPresionar(e) {
    if (zoom === ZOOM_MIN || e.pointerType !== 'mouse' || e.button !== 0) return
    const el = refLienzo.current
    arrastre.current = { x: e.clientX, y: e.clientY, izquierda: el.scrollLeft, arriba: el.scrollTop }
    el.setPointerCapture(e.pointerId)
  }

  function alArrastrar(e) {
    const a = arrastre.current
    if (!a) return
    const el = refLienzo.current
    el.scrollLeft = a.izquierda - (e.clientX - a.x)
    el.scrollTop = a.arriba - (e.clientY - a.y)
  }

  function alSoltar() {
    arrastre.current = null
  }

  /* Al 100% la imagen entra entera en el escenario; el zoom multiplica
     ese tamaño. Hasta medir el escenario, el CSS la contiene solo. */
  let medidas
  if (caja) {
    const ajuste = Math.min(caja.ancho / imagen.ancho, caja.alto / imagen.alto)
    medidas = {
      width: Math.floor(imagen.ancho * ajuste * zoom),
      height: Math.floor(imagen.alto * ajuste * zoom),
    }
  }

  return createPortal(
    <div
      className="ed-visor"
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitulo}
      ref={refDialogo}
    >
      <div className="ed-visor__barra">
        <p className="ed-visor__titulo" id={idTitulo}>
          <span className="ed-visor__proyecto">{titulo}</span>
          <span className="ed-visor__imagen-titulo">
            {imagen.titulo}
            {total > 1 && (
              <span className="ed-visor__cuenta">
                {' '}
                · {indice + 1} / {total}
              </span>
            )}
          </span>
        </p>

        <p className="ed-visor__ayuda">Doble clic o + − para acercar · Esc para cerrar</p>

        <div className="ed-visor__controles">
          <IconButton
            icon="minus"
            label="Alejar"
            variant="on-brand"
            size="sm"
            onClick={() => zoomPor(1 / PASO)}
            disabled={zoom <= ZOOM_MIN}
          />
          <span className="ed-visor__zoom" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <IconButton
            icon="plus"
            label="Acercar"
            variant="on-brand"
            size="sm"
            onClick={() => zoomPor(PASO)}
            disabled={zoom >= ZOOM_MAX}
          />
          <Button
            variant="on-brand-outline"
            size="sm"
            className="ed-visor__ajustar"
            onClick={() => zoomA(ZOOM_MIN)}
            disabled={zoom === ZOOM_MIN}
          >
            Ajustar
          </Button>
          <IconButton
            ref={refCerrar}
            icon="close"
            label="Cerrar (Esc)"
            variant="on-brand"
            onClick={onCerrar}
          />
        </div>
      </div>

      <div className="ed-visor__escenario" ref={refEscenario}>
        <div
          className={`ed-visor__lienzo ${zoom > ZOOM_MIN ? 'ed-visor__lienzo--ampliado' : ''}`}
          ref={refLienzo}
          tabIndex={0}
          role="group"
          aria-label="Imagen ampliada. Con el foco aquí, las flechas la desplazan."
          onPointerDown={alPresionar}
          onPointerMove={alArrastrar}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
        >
          <img
            key={imagen.src}
            className="ed-visor__imagen"
            src={imagen.src}
            alt={imagen.alt}
            width={imagen.ancho}
            height={imagen.alto}
            style={medidas}
            draggable={false}
            onDoubleClick={() => zoomA(zoom > ZOOM_MIN ? ZOOM_MIN : 2)}
          />
        </div>

        {total > 1 && (
          <>
            <IconButton
              className="ed-visor__paso ed-visor__paso--anterior"
              icon="arrow-left"
              label="Imagen anterior"
              variant="on-brand"
              onClick={() => mover(-1)}
            />
            <IconButton
              className="ed-visor__paso ed-visor__paso--siguiente"
              icon="arrow-right"
              label="Imagen siguiente"
              variant="on-brand"
              onClick={() => mover(1)}
            />
          </>
        )}
      </div>

      {total > 1 && (
        <div className="ed-visor__tira">
          {imagenes.map((im, i) => (
            <button
              type="button"
              key={im.src}
              className="ed-visor__miniatura"
              aria-label={`Ver ${im.titulo}`}
              aria-current={i === indice ? 'true' : undefined}
              onClick={() => ir(i)}
            >
              <img src={im.srcChico} alt="" width={im.anchoChico} height={Math.round((im.anchoChico * im.alto) / im.ancho)} />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  )
}
