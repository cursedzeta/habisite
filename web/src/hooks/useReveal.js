import { useEffect, useRef, useState } from 'react'

/**
 * Revela un elemento cuando entra en pantalla.
 * Devuelve la ref y la clase que hay que aplicar.
 *
 * Se desconecta apenas revela: la animacion ocurre una sola vez
 * y no queda un observador vivo por cada tarjeta.
 */
export function useReveal({ margen = '0px 0px -80px 0px', demora = 0 } = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo) return

    // Sin soporte de IntersectionObserver, mostramos el contenido y listo.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.isIntersecting) {
          setVisible(true)
          observador.disconnect()
        }
      },
      { rootMargin: margen, threshold: 0.15 },
    )

    observador.observe(nodo)
    return () => observador.disconnect()
  }, [margen])

  return {
    ref,
    clase: visible ? 'reveal revelado' : 'reveal',
    estilo: { transitionDelay: `${demora}ms` },
  }
}
