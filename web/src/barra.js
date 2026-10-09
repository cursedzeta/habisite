import { useEffect, useState } from 'react'

/* Lo que comparten la landing y /concursos-anteriores sobre la barra
   fija y los anclas. */

/* La barra cambia de aspecto segun este sobre el hero naranja o sobre
   el fondo blanco.

   Va con scroll y getBoundingClientRect, no con IntersectionObserver:
   el contenido esta dentro de .escala (zoom .9) y el observador mezcla
   coordenadas con y sin zoom, asi que el punto de cambio se corre.
   getBoundingClientRect y el alto de la barra estan los dos en pixeles
   de viewport, que es la unica comparacion que se sostiene. */
export function useSobreHero(refHero) {
  const [sobreHero, setSobreHero] = useState(true)

  useEffect(() => {
    let pendiente = false

    function medir() {
      const hero = refHero.current
      if (!hero) return
      const barra = document.querySelector('.topbar')
      const altoNav = barra ? barra.getBoundingClientRect().height : 88
      // Seguimos sobre el hero mientras su borde inferior pase la barra.
      setSobreHero(hero.getBoundingClientRect().bottom > altoNav)
    }

    function alScrollear() {
      if (pendiente) return
      pendiente = true
      requestAnimationFrame(() => {
        pendiente = false
        medir()
      })
    }

    medir()
    window.addEventListener('scroll', alScrollear, { passive: true })
    window.addEventListener('resize', alScrollear)
    return () => {
      window.removeEventListener('scroll', alScrollear)
      window.removeEventListener('resize', alScrollear)
    }
  }, [refHero])

  return sobreHero
}

/* Al llegar desde otra pagina con un ancla (/#inscripcion), el
   navegador busca el elemento antes de que React lo pinte, no lo
   encuentra y se queda arriba. Lo buscamos de nuevo ya montado. */
export function useAnclaInicial() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [])
}

/* El desplazamiento lo resuelve el navegador con scroll-margin-top.
   Restar pixeles a mano dejaba de ser correcto con el zoom del 90%. */
export function irA(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
