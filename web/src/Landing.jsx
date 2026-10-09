import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  Eyebrow,
  SectionHeader,
  IconButton,
  Navbar,
  Footer,
} from './ds'
import Inscripcion from './Inscripcion'

const NAV = [
  ['El reto', 'reto'],
  ['Jurado', 'jurado'],
  ['Premios', 'premios'],
  ['Inscripción', 'inscripcion'],
]

const JURY = [
  { role: 'Dirección de proyecto', bio: 'Arquitecta de obra en vivienda colectiva y equipamiento público en México y Colombia.' },
  { role: 'Paisaje', bio: 'Proyecto de paisaje y espacio abierto; docente de taller en escuelas del Cono Sur.' },
  { role: 'Estructura y materialidad', bio: 'Ingeniero estructural especializado en madera laminada y tierra compactada.' },
  { role: 'Curaduría', bio: 'Curador de exposiciones de arquitectura y editor de publicaciones de proyecto.' },
  { role: 'Desarrollo', bio: 'Desarrollo inmobiliario y gestión de suelo; evalúa viabilidad y escala del proyecto.' },
  { role: 'Sostenibilidad', bio: 'Consultora en energía, agua y ciclo de vida de materiales para vivienda de baja huella.' },
]

/* Sin fechas a propósito: las que traía el diseño ya pasaron y nunca
   estuvieron confirmadas. Vuelven cuando la organización las defina. */
const FACTS = [
  ['Modalidad', 'Individual o en equipo · en línea'],
  ['Entrega', 'Un único PDF'],
  ['Calendario', 'Se comparte en el grupo oficial'],
]

/* El desplazamiento lo resuelve el navegador con scroll-margin-top.
   Restar pixeles a mano dejaba de ser correcto con el zoom del 90%. */
function go(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function Hero({ refHero }) {
  return (
    <section ref={refHero} className="hero" data-screen-label="Hero">
      <div className="page hero__in">
        <div className="hero__grid">
          <div>
            <h1 className="hero__h1">
              Habisite
              <br />
              Challenge
              <br />
              <span>2026-II</span>
            </h1>
            <p className="hero__sub">
              Un reto abierto al talento emergente de América Latina para imaginar nuevas formas de
              habitar el espacio.
            </p>
          </div>

          <div className="hero__datos">
            <p className="hero__rotulo">PREMIO</p>
            <p className="hero__valor">USD 5.000</p>

            <p className="hero__rotulo">INSCRIPCIÓN</p>
            <p className="hero__valor">SIN COSTO</p>

            <Button
              href="#inscripcion"
              className="hero__boton"
              onClick={(e) => {
                e.preventDefault()
                go('inscripcion')
              }}
            >
              Inscribirme
            </Button>
          </div>
        </div>

        <dl className="facts">
          {FACTS.map((f) => (
            <div key={f[0]}>
              <dt>{f[0]}</dt>
              <dd>{f[1]}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function Jurado() {
  const track = useRef(null)

  function slide(dir) {
    const t = track.current
    if (t) t.scrollBy({ left: dir * (t.clientWidth * 0.62), behavior: 'smooth' })
  }

  return (
    <section className="sec" id="jurado" data-screen-label="Jurado">
      <div className="page">
        <div className="sec__head">
          <SectionHeader
            eyebrow="Jurado"
            title={
              <>
                Quién lee tu <em>propuesta</em>
              </>
            }
            text="Perfiles del oficio: proyecto, paisaje, estructura, curaduría, desarrollo y sostenibilidad."
          />
          <div className="arrows">
            <IconButton icon="arrow-left" label="Anterior" onClick={() => slide(-1)} />
            <IconButton icon="arrow-right" label="Siguiente" onClick={() => slide(1)} />
          </div>
        </div>

        <div className="rail" ref={track}>
          {JURY.map((j, i) => (
            <article className="juror" key={i}>
              <div className="juror__ph">
                <span>Retrato</span>
              </div>
              <h3>Nombre Apellido</h3>
              <p className="juror__role">{j.role}</p>
              <p className="juror__bio">{j.bio}</p>
            </article>
          ))}
        </div>

        <p className="fine">
          Los nombres y retratos del jurado 2026-II se publican próximamente.
        </p>
      </div>
    </section>
  )
}

function Reto() {
  const items = [
    ['01', 'Promover el desarrollo territorial con arquitectura de impacto social, económico y ambiental.'],
    ['02', 'Integrar miradas desde la arquitectura, el diseño, el paisaje y la ingeniería.'],
    ['03', 'Conectar talento emergente con desarrolladores y plataformas profesionales.'],
    ['04', 'Documentar el proceso: croquis, decisiones de materialidad y ficha técnica.'],
  ]

  return (
    <section className="sec" id="reto" data-screen-label="El reto">
      <div className="page reto">
        <div>
          <SectionHeader
            eyebrow="El reto"
            title={
              <>
                Diseña el lugar. <em>Vive la idea</em>
              </>
            }
          />
          <p className="reto__claim">
            Una propuesta de arquitectura con impacto territorial: concepto, experiencia y técnica
            en una sola entrega.
          </p>
          <p className="fine">
            Entrega digital en un único PDF, con todo el proyecto adentro. Sin maquetas físicas.
          </p>
        </div>

        <ul className="rows">
          {items.map((it) => (
            <li key={it[0]}>
              <span className="rows__n">{it[0]}</span>
              <span className="rows__t">{it[1]}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Premios() {
  const list = [
    {
      pos: 'Primer lugar',
      amount: 'USD 5.000',
      tone: 'cream',
      items: [
        'Pasantía remunerada con el estudio organizador',
        'Certificado profesional avalado por IMB',
        'Publicación en la exposición virtual',
        'Cupo gratuito en los talleres 2026',
      ],
    },
    {
      pos: 'Segundo lugar',
      amount: 'USD 2.000',
      tone: 'white',
      items: ['Certificaciones oficiales', 'Publicación en la exposición virtual'],
    },
    {
      pos: 'Tercer lugar',
      amount: 'USD 1.000',
      tone: 'white',
      items: ['Certificaciones oficiales', 'Publicación en la exposición virtual'],
    },
  ]

  return (
    <section className="sec" id="premios" data-screen-label="Premios">
      <div className="page">
        <SectionHeader
          eyebrow="Reconocimiento"
          title={
            <>
              Premios y <em>beneficios</em>
            </>
          }
        />
        <div className="prizes">
          {list.map((p) => (
            <Card key={p.pos} tone={p.tone} outline={p.tone === 'white'} className="prize-card">
              <Eyebrow tone="brand">{p.pos}</Eyebrow>
              <p className="prize-card__amount">{p.amount}</p>
              <ul>
                {p.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <p className="fine">
          Certificado oficial e insignia digital para todo participante que complete la entrega.
        </p>
      </div>
    </section>
  )
}

export default function Landing() {
  const refHero = useRef(null)
  const [sobreHero, setSobreHero] = useState(true)

  /* La barra cambia de aspecto segun este sobre el hero naranja o sobre
     el fondo blanco.

     Va con scroll y getBoundingClientRect, no con IntersectionObserver:
     el contenido esta dentro de .escala (zoom .9) y el observador mezcla
     coordenadas con y sin zoom, asi que el punto de cambio se corre.
     getBoundingClientRect y el alto de la barra estan los dos en pixeles
     de viewport, que es la unica comparacion que se sostiene. */
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
  }, [])

  return (
    <>
      <div className={`topbar ${sobreHero ? 'topbar--sobre-hero' : ''}`}>
        <Navbar
          className="page"
          onBrand
          brand="Habisite"
          links={NAV.map((n) => n[0])}
          cta="Inscribirme"
          onCta={() => go('inscripcion')}
          onNavigate={(label) => {
            const hit = NAV.find((n) => n[0] === label)
            if (hit) go(hit[1])
          }}
        />
      </div>

      <div className="escala">
      <Hero refHero={refHero} />
      <Jurado />
      <Reto />
      <Premios />
      <Inscripcion />

      <section className="footcta">
        <div className="page footcta__in">
          <p>
            Aún hay tiempo para <em>inscribirte</em>
          </p>
          <Button variant="primary" size="lg" onClick={() => go('inscripcion')}>
            Inscribirme
          </Button>
        </div>
      </section>

      <Footer
        brand="Habisite"
        tagline="Estudio latinoamericano de arquitectura, interiorismo y paisaje. Enseñamos lo que hacemos."
        columns={[
          { title: 'Concurso', links: ['El reto', 'Jurado', 'Premios', 'Inscripción'] },
          { title: 'Estudio', links: ['Proyectos', 'Talleres 2026', 'Publicaciones', 'Contacto'] },
        ]}
        note="© 2026 Habisite · Challenge 2026-II"
      />
      </div>
    </>
  )
}
