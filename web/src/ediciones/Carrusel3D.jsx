import { useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'

/* Carrusel 3D en bucle, con la estética de una galería editorial.

   Una tarjeta vertical grande y nítida al centro; a los costados,
   tarjetas más chicas que giran en perspectiva, se oscurecen y se
   desenfocan a medida que se alejan. Todas apoyan el borde inferior
   sobre la misma línea de base.

   Cómo está hecho:

   - La posición es un número continuo y sin tope (`pos`), en unidades
     de ítem. Cada tarjeta calcula su desfase circular respecto de esa
     posición, así que el bucle no depende de cuántos ítems haya ni de
     copias: una tarjeta pasa de un lado al otro cuando está invisible.
   - El movimiento corre fuera de React: un bucle de requestAnimationFrame
     a paso fijo de 60 Hz escribe los transform directo en el DOM. React
     solo pinta la estructura y se entera cuando el carrusel se asienta.
   - Las medidas salen de getBoundingClientRect, que da píxeles de
     viewport, ya escalados por el zoom:.9 de .escala. Las transformaciones
     CSS de adentro se aplican antes del zoom, en píxeles propios del
     elemento, así que todo se divide por el zoom efectivo antes de usarse.

   Con menos de CONFIG.minimoBucle ítems no hay bucle: es una tira finita
   con el mismo aspecto. Sin transformaciones 3D, una tira simple. */

/* Todos los parámetros de ajuste. Las tasas y factores por cuadro están
   pensados a 60 Hz: el bucle avanza a ese paso fijo sea cual sea la
   frecuencia de la pantalla. Colores, tipografía y alturas viven en
   carrusel.css, no acá. Para otro ajuste en un uso puntual, la prop
   `config` recibe un objeto completo con esta misma forma. */
const CONFIG_CARRUSEL = {
  tarjeta: {
    // Ancho de la central: C = min(W * fracción, H * fracciónAlto, máximo).
    fraccionAncho: 0.25,
    fraccionAnchoMovil: 0.34,
    fraccionAlto: 0.56,
    maximo: 440,
    // Alto / ancho: tarjetas 3:4.
    proporcion: 4 / 3,
  },
  // Por debajo de este ancho de viewport rige lo «Movil». Es el mismo
  // corte que usa carrusel.css.
  corteMovil: 640,

  perspectiva: 900,
  // Escala = 1 - min(a, topeDistancia) * escalaPorPaso.
  escalaPorPaso: 0.12,
  escalaPorPasoMovil: 0.26,
  topeDistancia: 3,
  // Giro en grados = (lineal * a + cuadratico * a²) * factor.
  giro: { lineal: 12, cuadratico: 5, factor: 0.65 },
  // Profundidad z = -a² * C * profundidad.
  profundidad: 0.12,
  // Separación visible entre tarjetas, en fracción de C.
  separacion: 0.09,
  separacionMovil: 0.07,
  // Cuántas anclas de borde se calculan más allá de la central.
  anclas: 5,

  // Desenfoque en px por unidad de distancia: «cerca» hasta a = 1,
  // «lejos» desde a = 2, interpolado entre medio para que no salte.
  desenfoque: { cerca: 1.8, lejos: 3.4, nitidaHasta: 0.5 },
  // Brillo = 1 - min(a, topeDistancia) * brillo.
  brillo: 0.2,
  // Opacidad 1 hasta «desde», 0 en «hasta». Por debajo de «minima» la
  // tarjeta se oculta del todo.
  opacidad: { desde: 2.2, hasta: 2.8, minima: 0.01 },
  // Opacidad del texto = max(0, 1 - caida * a); baja hasta
  // «desplazamiento» px mientras se apaga.
  texto: { caida: 1.8, desplazamiento: 10 },

  arrastre: {
    // posArrastre = posInicial - dx / (espaciado * factor)
    factor: 1.1,
    // Cuánto se acerca pos a posArrastre por cuadro.
    seguimiento: 0.2,
    // Velocidad del puntero: suavizado * anterior + (1 - suavizado) * última.
    suavizado: 0.6,
    // Al soltar, cuánto se proyecta la velocidad hacia adelante.
    proyeccionMs: 280,
    saltoMaximo: 3,
    // Desde cuántos px es arrastre y no clic.
    umbralPx: 4,
    // Si el puntero estuvo quieto más que esto antes de soltar, no hay
    // inercia: la persona frenó a propósito.
    quietoMs: 90,
    // Más allá de los extremos de una tira finita, el arrastre rinde menos.
    resistenciaBorde: 0.35,
  },
  // Resorte por cuadro: vel += (objetivo - pos) * rigidez; vel *= amortiguacion.
  resorte: { rigidez: 0.026, amortiguacion: 0.89, reposo: 0.0003 },
  /* El reposo exacto llega unos dos segundos después del rebote. Para
     avisar (onAsentar y el anuncio) alcanza con que ya se vea quieto:
     cerca del objetivo y casi sin velocidad. La animación sigue igual. */
  llegada: { distancia: 0.02, velocidad: 0.004 },
  // Tasa de seguimiento de cada tarjeta según su distancia al centro
  // (0, 1, 2 y 3 o más). Las de afuera llegan después: la ondulación.
  ondulacion: [0.32, 0.2, 0.13, 0.1],
  // Con movimiento rápido la pista se achica hasta este tanto.
  achique: { maximo: 0.035, sensibilidad: 10, suavizado: 0.15 },
  // Trackpad horizontal: un paso por gesto.
  rueda: { umbral: 8, esperaMs: 350, pxPorLinea: 16 },

  minimoBucle: 5,
}

const PASO_MS = 1000 / 60
// Un cuadro perdido (pestaña de fondo, depurador) no se recupera entero.
const DT_MAXIMO = 100

const SOPORTA_3D =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('transform-style', 'preserve-3d') &&
  CSS.supports('perspective', '1px')

/* ==========================================================
   Geometría (funciones puras)
   ========================================================== */

function moduloPositivo(x, n) {
  return ((x % n) + n) % n
}

// Desfase del ítem i respecto de la posición p: negativo a la izquierda.
function desfase(i, p, n, circular) {
  return circular ? moduloPositivo(i - p + n / 2, n) - n / 2 : i - p
}

function geometria(a, md, cfg) {
  const paso = md.movil ? cfg.escalaPorPasoMovil : cfg.escalaPorPaso
  const g = cfg.giro
  return {
    escala: 1 - Math.min(a, cfg.topeDistancia) * paso,
    giro: (g.lineal * a + g.cuadratico * a * a) * g.factor,
    z: -a * a * md.C * cfg.profundidad,
  }
}

/* Anclas de borde interno en pantalla: A[n] es dónde se ve el borde
   interno de la tarjeta a distancia n, medido desde el centro. Se
   construyen de adentro hacia afuera proyectando el borde externo de la
   anterior, así la separación visible queda pareja aunque cada tarjeta
   esté a otra profundidad y con otro giro. */
function calcularAnclas(md, cfg) {
  const P = cfg.perspectiva
  const A = [-md.C / 2]
  for (let n = 0; n < cfg.anclas; n++) {
    const F = A[n]
    const { escala, giro, z } = geometria(n, md, cfg)
    const theta = (giro * Math.PI) / 180
    const w = md.C * escala
    const Xh = (F * (P - z)) / P
    const proyectado = ((Xh + w * Math.cos(theta)) * P) / (P - z + w * Math.sin(theta)) - F
    A.push(F + proyectado + md.gap)
  }
  return A
}

function anclaEn(A, a) {
  const i = Math.min(Math.floor(a), A.length - 2)
  return A[i] + (A[i + 1] - A[i]) * (a - i)
}

/* Lo que no es posición: desenfoque, brillo y opacidades. Todo continuo
   en a, para que nada salte durante el movimiento. */
function efectos(a, cfg, n, circular) {
  const { cerca, lejos, nitidaHasta } = cfg.desenfoque
  const tope = cfg.topeDistancia
  let desenfoque
  let brillo
  if (a <= nitidaHasta) {
    desenfoque = 0
    brillo = 1
  } else if (a <= 1) {
    const f = (a - nitidaHasta) / (1 - nitidaHasta)
    desenfoque = f * cerca
    brillo = 1 - f * cfg.brillo
  } else {
    desenfoque = a < 2 ? cerca + (a - 1) * (2 * lejos - cerca) : Math.min(a, tope) * lejos
    brillo = 1 - Math.min(a, tope) * cfg.brillo
  }

  /* Con pocos ítems, la mitad del bucle (n/2) cae antes de «hasta»: la
     tarjeta que cambia de lado tiene que estar ya invisible. */
  const o = cfg.opacidad
  const hasta = circular ? Math.min(o.hasta, n / 2 - 0.05) : o.hasta
  const desde = Math.min(o.desde, hasta - 0.3)
  const opacidad = a <= desde ? 1 : a >= hasta ? 0 : 1 - (a - desde) / (hasta - desde)

  const texto = Math.max(0, 1 - cfg.texto.caida * a)
  return { desenfoque, brillo, opacidad, texto, bajada: (1 - texto) * cfg.texto.desplazamiento }
}

function tasaOndulacion(a, tasas) {
  const i = Math.floor(a)
  if (i >= tasas.length - 1) return tasas[tasas.length - 1]
  return tasas[i] + (tasas[i + 1] - tasas[i]) * (a - i)
}

/* El zoom de todos los ancestros multiplicado. getComputedStyle da el
   de cada elemento, no el acumulado; sin soporte de zoom queda en 1. */
function zoomEfectivo(el) {
  let z = 1
  for (let nodo = el; nodo && nodo.nodeType === 1; nodo = nodo.parentElement) {
    const v = parseFloat(getComputedStyle(nodo).zoom)
    if (v > 0) z *= v
  }
  return z
}

function calcularMedida(el, cfg) {
  const zoom = zoomEfectivo(el)
  const r = el.getBoundingClientRect()
  // De píxeles de viewport a píxeles propios del escenario.
  const W = r.width / zoom
  const H = r.height / zoom
  if (!(W > 0 && H > 0)) return null

  const movil = window.matchMedia(`(max-width: ${cfg.corteMovil}px)`).matches
  const t = cfg.tarjeta
  const C = Math.min(W * (movil ? t.fraccionAnchoMovil : t.fraccionAncho), H * t.fraccionAlto, t.maximo)
  const alto = C * t.proporcion
  const md = {
    W,
    H,
    C,
    alto,
    // La línea de base común: el borde inferior de la central.
    B: H / 2 + alto / 2,
    movil,
    gap: C * (movil ? cfg.separacionMovil : cfg.separacion),
    zoom,
  }
  md.anclas = calcularAnclas(md, cfg)
  // Cuánto hay que arrastrar para pasar un ítem.
  md.espaciado = md.anclas[1] + C / 2
  return md
}

/* ==========================================================
   El motor: estado mutable y bucle, fuera de React
   ========================================================== */

function crearMotor(inicial) {
  const m = {
    pos: inicial,
    objetivo: inicial,
    vel: 0,
    seguidores: [],
    achique: 1,
    arrastre: null,
    suprimirClic: false,
    ultimaRueda: -Infinity,
    medida: null,
    raf: 0,
    ultimoT: 0,
    acumulado: 0,
    fuera: false,
    oculta: false,
    reducido: false,
    interaccion: false,
    ultimoIndice: inicial,
    // Se completan en cada render (ver useLayoutEffect de sincronía).
    cfg: CONFIG_CARRUSEL,
    n: 0,
    circular: false,
    alAsentar: null,
    tarjetas: [],
    textos: [],
    pista: null,
  }
  m.cuadro = (t) => cuadro(m, t)
  return m
}

function limitarIndice(m, i) {
  return Math.min(m.n - 1, Math.max(0, i))
}

function indiceDe(m) {
  const i = Math.round(m.objetivo)
  return m.circular ? moduloPositivo(i, m.n) : limitarIndice(m, i)
}

// Un paso de 60 Hz.
function paso(m) {
  const { cfg } = m
  const r = cfg.resorte
  const ar = m.arrastre?.activo ? m.arrastre : null

  if (m.reducido) {
    // Movimiento reducido: directo a la posición, sin inercia ni rebote.
    m.pos = ar ? ar.posArrastre : m.objetivo
    m.vel = 0
  } else if (ar) {
    const previo = m.pos
    m.pos += (ar.posArrastre - m.pos) * cfg.arrastre.seguimiento
    m.vel = m.pos - previo
  } else {
    m.vel += (m.objetivo - m.pos) * r.rigidez
    m.vel *= r.amortiguacion
    m.pos += m.vel
    if (Math.abs(m.objetivo - m.pos) < r.reposo && Math.abs(m.vel) < r.reposo) {
      m.pos = m.objetivo
      m.vel = 0
    }
  }

  // Cada tarjeta sigue a pos con su propio retraso.
  for (let i = 0; i < m.n; i++) {
    const s = m.seguidores[i]
    const d = m.pos - s
    if (m.reducido || Math.abs(d) < r.reposo) {
      m.seguidores[i] = m.pos
    } else {
      const a = Math.abs(desfase(i, s, m.n, m.circular))
      m.seguidores[i] = s + d * tasaOndulacion(a, cfg.ondulacion)
    }
  }

  const ac = cfg.achique
  const meta = m.reducido ? 1 : 1 - Math.min(1, Math.abs(m.vel) * ac.sensibilidad) * ac.maximo
  m.achique += (meta - m.achique) * ac.suavizado
  if (m.reducido || (meta === 1 && Math.abs(1 - m.achique) < 1e-4)) m.achique = 1
}

function asentado(m) {
  if (m.arrastre?.activo || m.pos !== m.objetivo || m.vel !== 0 || m.achique !== 1) return false
  for (let i = 0; i < m.n; i++) if (m.seguidores[i] !== m.pos) return false
  return true
}

function dibujar(m) {
  const md = m.medida
  if (!md) return
  const { cfg, n, circular } = m
  const P = cfg.perspectiva
  const aMaxima = md.anclas.length - 1

  for (let i = 0; i < n; i++) {
    const el = m.tarjetas[i]
    if (!el) continue
    const o = desfase(i, m.seguidores[i], n, circular)
    const a = Math.abs(o)
    // El cero cuenta como lado derecho.
    const lado = o >= 0 ? 1 : -1
    const ag = Math.min(a, aMaxima)
    const g = geometria(ag, md, cfg)
    // Del ancla en pantalla al mundo, a la profundidad de la tarjeta.
    const Xh = (anclaEn(md.anclas, ag) * (P - g.z)) / P
    const x = lado * (Xh + md.C / 2)
    const e = efectos(a, cfg, n, circular)

    const s = el.style
    s.transform =
      `translate3d(${x.toFixed(2)}px,0,${g.z.toFixed(2)}px) ` +
      `rotateY(${(lado * g.giro).toFixed(3)}deg) scale(${g.escala.toFixed(4)})`
    // Gira sobre su esquina inferior interna.
    s.transformOrigin = lado > 0 ? '0% 100%' : '100% 100%'
    s.filter =
      e.desenfoque > 0.01 || e.brillo < 0.999
        ? `blur(${e.desenfoque.toFixed(2)}px) brightness(${e.brillo.toFixed(3)})`
        : 'none'
    s.opacity = e.opacidad.toFixed(3)
    s.visibility = e.opacidad < cfg.opacidad.minima ? 'hidden' : 'visible'
    s.zIndex = String(Math.round((aMaxima - ag) * 10))

    const t = m.textos[i]
    if (t) {
      t.style.opacity = e.texto.toFixed(3)
      t.style.transform = `translateY(${e.bajada.toFixed(2)}px)`
    }
  }

  if (m.pista) m.pista.style.transform = m.achique === 1 ? 'none' : `scale(${m.achique.toFixed(4)})`
}

function cuadro(m, t) {
  m.raf = 0
  if (m.fuera || m.oculta) {
    m.ultimoT = 0
    return
  }
  const dt = m.ultimoT ? Math.min(t - m.ultimoT, DT_MAXIMO) : PASO_MS
  m.ultimoT = t
  m.acumulado += dt
  while (m.acumulado >= PASO_MS) {
    paso(m)
    m.acumulado -= PASO_MS
  }
  dibujar(m)

  if (asentado(m)) {
    // Quieto: no se piden más cuadros hasta la próxima interacción.
    m.ultimoT = 0
    m.acumulado = 0
    asentar(m)
    return
  }
  if (llego(m)) m.alAsentar?.(indiceDe(m))
  m.raf = requestAnimationFrame(m.cuadro)
}

function llego(m) {
  const l = m.cfg.llegada
  return (
    !m.arrastre?.activo &&
    Math.abs(m.objetivo - m.pos) < l.distancia &&
    Math.abs(m.vel) < l.velocidad
  )
}

function arrancar(m) {
  if (m.raf || m.fuera || m.oculta) return
  m.raf = requestAnimationFrame(m.cuadro)
}

function detener(m) {
  if (m.raf) cancelAnimationFrame(m.raf)
  m.raf = 0
  m.ultimoT = 0
}

function asentar(m) {
  // La posición no crece sin fin: se vuelve a la primera vuelta.
  if (m.circular) {
    const vueltas = Math.floor(m.pos / m.n) * m.n
    if (vueltas) {
      m.pos -= vueltas
      m.objetivo -= vueltas
      m.seguidores.fill(m.pos)
    }
  }
  m.alAsentar?.(indiceDe(m))
}

// Lleva el ítem i al centro por el camino más corto.
function irA(m, i, { inmediato = false } = {}) {
  const destino = m.circular
    ? m.objetivo + Math.round(desfase(i, m.objetivo, m.n, true))
    : limitarIndice(m, i)
  m.objetivo = destino
  m.interaccion = true
  if (inmediato) {
    m.pos = destino
    m.vel = 0
    m.achique = 1
    m.seguidores.fill(destino)
    dibujar(m)
    asentar(m)
    return
  }
  arrancar(m)
}

function mover(m, pasos) {
  const destino = Math.round(m.objetivo) + pasos
  m.objetivo = m.circular ? destino : limitarIndice(m, destino)
  m.interaccion = true
  arrancar(m)
}

/* ==========================================================
   Componente
   ========================================================== */

/* items: [{ src, srcChico, ancho, alto, anchoChico, alt, categoria,
   titulo, proyectoId, indiceImagen }] (itemDeCarrusel en
   edicion-2025-i.js).

   onAsentar(i): el carrusel se quedó quieto en un ítem nuevo.
   onActivar(i): clic o Enter sobre la tarjeta central.
   ref: { irA(i, { inmediato }) } para moverlo desde afuera. */
export default function Carrusel3D(props) {
  return SOPORTA_3D ? <Carrusel {...props} /> : <TiraSimple {...props} />
}

function Carrusel({
  items,
  variante = 'landing',
  etiqueta,
  instrucciones,
  indiceInicial = 0,
  onAsentar,
  onActivar,
  config = CONFIG_CARRUSEL,
  className = '',
  ref,
}) {
  const n = items.length
  const circular = n >= config.minimoBucle

  const refEscenario = useRef(null)
  const refVentana = useRef(null)
  const refPista = useRef(null)
  const motor = useRef(null)
  if (motor.current === null) motor.current = crearMotor(indiceInicial)
  const idInstrucciones = useId()

  const [activo, setActivo] = useState(indiceInicial)
  const [anuncio, setAnuncio] = useState('')
  const [arrastrando, setArrastrando] = useState(false)
  // Tamaño de la tarjeta en px de viewport, para elegir la imagen.
  const [medida, setMedida] = useState(null)
  // Las imágenes lejanas se piden recién cuando el carrusel se acerca.
  const [cerca, setCerca] = useState(false)
  const [fallidas, setFallidas] = useState(() => new Set())

  /* Sincronía: el motor lee siempre las props del último render. Va
     primero para que las medidas de abajo ya la encuentren. */
  useLayoutEffect(() => {
    const m = motor.current
    m.cfg = config
    m.n = n
    m.circular = circular
    m.pista = refPista.current
    if (m.seguidores.length !== n) {
      if (!circular) {
        m.objetivo = limitarIndice(m, Math.round(m.objetivo))
        m.pos = m.objetivo
      }
      m.seguidores = new Array(n).fill(m.pos)
    }
    m.alAsentar = (indice) => {
      if (indice === m.ultimoIndice) return
      m.ultimoIndice = indice
      setActivo(indice)
      // Solo se anuncia lo que eligió la persona, no la carga inicial.
      if (m.interaccion) setAnuncio(`${items[indice].titulo} · ${indice + 1} de ${n}`)
      onAsentar?.(indice)
    }
  })

  // Medidas: al montar y con cada cambio de tamaño, sin perder la posición.
  useLayoutEffect(() => {
    const m = motor.current
    const el = refEscenario.current

    function medir() {
      const md = calcularMedida(el, m.cfg)
      if (!md) return
      m.medida = md
      el.style.setProperty('--car-ancho', `${md.C}px`)
      el.style.setProperty('--car-alto-tarjeta', `${md.alto}px`)
      refVentana.current.style.perspectiveOrigin = `50% ${md.B}px`
      refPista.current.style.transformOrigin = `50% ${md.B}px`
      const ancho = Math.round(md.C * md.zoom)
      const alto = Math.round(md.alto * md.zoom)
      setMedida((previa) =>
        previa && previa.ancho === ancho && previa.alto === alto ? previa : { ancho, alto },
      )
      dibujar(m)
    }

    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [])

  // Pausa fuera de pantalla o con la pestaña oculta.
  useEffect(() => {
    const m = motor.current
    const el = refEscenario.current

    function reanudar() {
      if (!asentado(m)) arrancar(m)
    }

    const enPantalla = new IntersectionObserver(([entrada]) => {
      m.fuera = !entrada.isIntersecting
      if (m.fuera) detener(m)
      else reanudar()
    })
    enPantalla.observe(el)

    const proximo = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        setCerca(true)
        proximo.disconnect()
      },
      { rootMargin: '600px 0px' },
    )
    proximo.observe(el)

    function alCambiarVisibilidad() {
      m.oculta = document.hidden
      if (m.oculta) detener(m)
      else reanudar()
    }
    alCambiarVisibilidad()
    document.addEventListener('visibilitychange', alCambiarVisibilidad)

    return () => {
      enPantalla.disconnect()
      proximo.disconnect()
      document.removeEventListener('visibilitychange', alCambiarVisibilidad)
      detener(m)
    }
  }, [])

  // Movimiento reducido, también si cambia con la página abierta.
  useEffect(() => {
    const m = motor.current
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)')
    function aplicar() {
      m.reducido = consulta.matches
      // Si estaba en movimiento, el próximo paso lo deja en su lugar.
      if (m.reducido && !asentado(m)) arrancar(m)
    }
    aplicar()
    consulta.addEventListener('change', aplicar)
    return () => consulta.removeEventListener('change', aplicar)
  }, [])

  /* Trackpad horizontal. Va con addEventListener porque React registra
     la rueda como pasiva y acá hace falta preventDefault. La rueda
     vertical no se toca: es de la página. */
  useEffect(() => {
    const m = motor.current
    const el = refEscenario.current
    function alRodar(e) {
      const r = m.cfg.rueda
      const escala = e.deltaMode === 1 ? r.pxPorLinea : 1
      const dx = e.deltaX * escala
      const dy = e.deltaY * escala
      if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < r.umbral) return
      e.preventDefault()
      // Un gesto es un paso: la inercia del trackpad sigue mandando
      // eventos, y recién después de una pausa cuenta como otro.
      if (e.timeStamp - m.ultimaRueda > r.esperaMs) mover(m, dx > 0 ? 1 : -1)
      m.ultimaRueda = e.timeStamp
    }
    el.addEventListener('wheel', alRodar, { passive: false })
    return () => el.removeEventListener('wheel', alRodar)
  }, [])

  useImperativeHandle(ref, () => ({ irA: (i, opciones) => irA(motor.current, i, opciones) }), [])

  /* ---------- arrastre ---------- */

  function alPresionar(e) {
    const m = motor.current
    if (!e.isPrimary || e.button !== 0) return
    m.suprimirClic = false
    m.arrastre = { id: e.pointerId, xInicio: e.clientX, activo: false }
  }

  function alMover(e) {
    const m = motor.current
    const ar = m.arrastre
    if (!ar || e.pointerId !== ar.id || !m.medida) return
    const cfg = m.cfg.arrastre

    if (!ar.activo) {
      if (Math.abs(e.clientX - ar.xInicio) <= cfg.umbralPx) return
      // Desde acá es arrastre: el clic que venga después no cuenta.
      ar.activo = true
      ar.x0 = e.clientX
      ar.posInicial = m.pos
      ar.posArrastre = m.pos
      ar.xUltimo = e.clientX
      ar.tUltimo = e.timeStamp
      ar.velPuntero = 0
      m.suprimirClic = true
      try {
        refEscenario.current.setPointerCapture(e.pointerId)
      } catch {
        // El puntero ya no existe: el arrastre sigue sin captura.
      }
      setArrastrando(true)
    }

    const dt = e.timeStamp - ar.tUltimo
    if (dt > 0) {
      const v = (e.clientX - ar.xUltimo) / dt
      ar.velPuntero = cfg.suavizado * ar.velPuntero + (1 - cfg.suavizado) * v
    }
    ar.xUltimo = e.clientX
    ar.tUltimo = e.timeStamp

    const { zoom, espaciado } = m.medida
    let p = ar.posInicial - (e.clientX - ar.x0) / zoom / (espaciado * cfg.factor)
    if (!m.circular) {
      // Pasado el primero o el último, cuesta más.
      const tope = Math.min(m.n - 1, Math.max(0, p))
      p = tope + (p - tope) * cfg.resistenciaBorde
    }
    ar.posArrastre = p
    arrancar(m)
  }

  function alSoltar(e) {
    const m = motor.current
    const ar = m.arrastre
    if (!ar || e.pointerId !== ar.id) return
    m.arrastre = null
    if (!ar.activo) return
    setArrastrando(false)

    const cfg = m.cfg.arrastre
    // pointercancel y lostpointercapture no son una suelta: sin inercia.
    const conInercia = e.type === 'pointerup' && e.timeStamp - ar.tUltimo <= cfg.quietoMs
    const vel = conInercia ? ar.velPuntero / m.medida.zoom : 0
    let proyectada = ar.posArrastre - (vel * cfg.proyeccionMs) / m.medida.espaciado
    proyectada = Math.min(ar.posArrastre + cfg.saltoMaximo, Math.max(ar.posArrastre - cfg.saltoMaximo, proyectada))
    const destino = Math.round(proyectada)
    m.objetivo = m.circular ? destino : limitarIndice(m, destino)
    m.interaccion = true
    arrancar(m)
  }

  /* Clic: en la central, la acción de cada uso; en una lateral, la
     centra. Si hubo arrastre, el clic que llega al soltar se descarta. */
  function alClic(e) {
    const m = motor.current
    if (m.suprimirClic) {
      m.suprimirClic = false
      e.preventDefault()
      e.stopPropagation()
      return
    }
    const tarjeta = e.target.closest?.('[data-indice]')
    if (!tarjeta) return
    const i = Number(tarjeta.dataset.indice)
    if (Math.abs(desfase(i, m.objetivo, m.n, m.circular)) < 0.5) onActivar?.(i)
    else irA(m, i)
  }

  function alTeclear(e) {
    if (e.target !== e.currentTarget) return
    const m = motor.current
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      mover(m, 1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      mover(m, -1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivar?.(indiceDe(m))
    }
  }

  const clases = [
    'car',
    `car--${variante}`,
    arrastrando ? 'car--arrastrando' : '',
    circular ? '' : 'car--finito',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={refEscenario}
      className={clases}
      role="region"
      aria-roledescription="carrusel"
      aria-label={etiqueta}
      aria-describedby={instrucciones ? idInstrucciones : undefined}
      tabIndex={0}
      onKeyDown={alTeclear}
      onPointerDown={alPresionar}
      onPointerMove={alMover}
      onPointerUp={alSoltar}
      onPointerCancel={alSoltar}
      onLostPointerCapture={alSoltar}
      onClick={alClic}
    >
      {instrucciones && (
        <p className="car__lector" id={idInstrucciones}>
          {instrucciones}
        </p>
      )}

      <div className="car__ventana" ref={refVentana} style={{ perspective: `${config.perspectiva}px` }}>
        <div className="car__pista" ref={refPista}>
          {items.map((it, i) => {
            const esActiva = i === activo
            const inicialCerca = Math.abs(desfase(i, indiceInicial, n, circular)) <= 2
            const fallo = fallidas.has(i)
            // Con cover, la imagen tiene que cubrir el alto de la tarjeta.
            const necesario = medida
              ? Math.round(Math.max(medida.ancho, (medida.alto * it.ancho) / it.alto))
              : null
            return (
              <div
                key={`${it.src}-${i}`}
                ref={(el) => {
                  motor.current.tarjetas[i] = el
                }}
                className={`car__tarjeta${esActiva ? ' car__tarjeta--activa' : ''}${fallo ? ' car__tarjeta--sin-imagen' : ''}`}
                data-indice={i}
                role="group"
                aria-roledescription="diapositiva"
                aria-label={`${i + 1} de ${n}`}
                aria-hidden={esActiva ? undefined : 'true'}
              >
                {!fallo && (
                  <img
                    className="car__imagen"
                    src={it.srcChico}
                    srcSet={`${it.srcChico} ${it.anchoChico}w, ${it.src} ${it.ancho}w`}
                    sizes={necesario ? `${necesario}px` : '300px'}
                    width={it.ancho}
                    height={it.alto}
                    alt={it.alt}
                    loading={cerca || inicialCerca ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                    onError={() => setFallidas((previas) => new Set(previas).add(i))}
                  />
                )}
                <div
                  className="car__texto"
                  ref={(el) => {
                    motor.current.textos[i] = el
                  }}
                >
                  <span className="car__categoria">{it.categoria}</span>
                  <span className="car__titulo">{it.titulo}</span>
                  <span className="car__numero">{String(i + 1).padStart(2, '0')}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="car__lector" aria-live="polite" aria-atomic="true">
        {anuncio}
      </p>
    </div>
  )
}

/* Sin transformaciones 3D: una tira que scrollea, con las mismas
   tarjetas. El primer clic elige; sobre la elegida, la acción. */
function TiraSimple({
  items,
  variante = 'landing',
  etiqueta,
  indiceInicial = 0,
  onAsentar,
  onActivar,
  className = '',
  ref,
}) {
  const [activo, setActivo] = useState(indiceInicial)
  const refLista = useRef(null)

  function elegir(i) {
    setActivo(i)
    refLista.current?.children[i]?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }

  useImperativeHandle(ref, () => ({ irA: (i) => elegir(i) }), [])

  return (
    <div className={`car-tira car-tira--${variante} ${className}`.trim()} role="region" aria-label={etiqueta}>
      <ul className="car-tira__lista" ref={refLista}>
        {items.map((it, i) => (
          <li key={`${it.src}-${i}`}>
            <button
              type="button"
              className="car__tarjeta car-tira__tarjeta"
              aria-current={i === activo ? 'true' : undefined}
              onClick={() => {
                if (i === activo) {
                  onActivar?.(i)
                } else {
                  elegir(i)
                  onAsentar?.(i)
                }
              }}
            >
              <img
                className="car__imagen"
                src={it.srcChico}
                width={it.anchoChico}
                height={Math.round((it.anchoChico * it.alto) / it.ancho)}
                alt={it.alt}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.hidden = true
                }}
              />
              <span className="car__texto">
                <span className="car__categoria">{it.categoria}</span>
                <span className="car__titulo">{it.titulo}</span>
                <span className="car__numero">{String(i + 1).padStart(2, '0')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
