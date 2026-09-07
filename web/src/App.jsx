import { useEffect, useRef, useState } from 'react'
import Barra from './components/Barra'
import Hero from './components/Hero'
import Jurado from './components/Jurado'
import Inscripcion from './components/Inscripcion'
import Pie from './components/Pie'
import { useReveal } from './hooks/useReveal'

function Proximamente() {
  const { ref, clase, estilo } = useReveal()

  return (
    <p
      ref={ref}
      style={estilo}
      className={`${clase} py-seccion text-center text-titulo font-bold text-proxi`}
    >
      Mas Secciones Proximamente...
    </p>
  )
}

export default function App() {
  const refHero = useRef(null)
  const [sobreHero, setSobreHero] = useState(true)

  /* Decide si la barra esta sobre el hero naranja o sobre el fondo blanco.
     Recortamos el alto de la barra del area observada, asi el cambio ocurre
     justo cuando el borde inferior del hero pasa por debajo del vidrio. */
  useEffect(() => {
    const nodo = refHero.current
    if (!nodo || typeof IntersectionObserver === 'undefined') return

    const alto =
      getComputedStyle(document.documentElement).getPropertyValue('--alto-nav').trim() || '78px'

    const observador = new IntersectionObserver(
      ([entrada]) => setSobreHero(entrada.isIntersecting),
      { rootMargin: `-${alto} 0px 0px 0px`, threshold: 0 },
    )

    observador.observe(nodo)
    return () => observador.disconnect()
  }, [])

  return (
    <>
      <Barra sobreHero={sobreHero} />
      <Hero refHero={refHero} />
      <main>
        <Jurado />
        <Inscripcion />
        <Proximamente />
      </main>
      <Pie />
    </>
  )
}
