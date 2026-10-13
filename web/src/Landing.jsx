import { useRef } from 'react'
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
import { LUGARES_JURADO_2026_II, juradoDe, nombreJurado } from './jurado'
import { irA as go, useAnclaInicial, useSobreHero } from './barra'
import SeccionAnteriores from './ediciones/SeccionAnteriores'

const NAV = [
  ['El reto', 'reto'],
  ['Jurado', 'jurado'],
  ['Premios', 'premios'],
  ['Concursos anteriores', 'concursos-anteriores'],
  ['Inscripción', 'inscripcion'],
]

/* Sin fechas a propósito: las que traía el diseño ya pasaron y nunca
   estuvieron confirmadas. Vuelven cuando la organización las defina. */
const FACTS = [
  ['Modalidad', 'Individual o en equipo · en línea'],
  ['Entrega', 'Un único PDF'],
  ['Calendario', 'Se comparte en el grupo oficial'],
]

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

/* La tarjeta que pidió Jarod: foto en blanco y negro, profesión · país
   y enfoque. */
function TarjetaJurado({ j }) {
  const lugar = [j.profesion, j.pais].filter(Boolean).join(' · ')
  return (
    <article className="juror">
      <img
        className="juror__foto"
        src={j.fotoChica}
        srcSet={`${j.fotoChica} 400w, ${j.foto} 800w`}
        sizes="300px"
        alt={`Retrato de ${nombreJurado(j)}`}
        width="400"
        height="500"
        loading="lazy"
      />
      <h3>{nombreJurado(j)}</h3>
      {lugar && <p className="juror__role">{lugar}</p>}
      {j.enfoque && (
        <p className="juror__enfoque">
          <b>Enfoque:</b> {j.enfoque}
        </p>
      )}
      {j.bio && <p className="juror__bio">{j.bio}</p>}
      {j.portafolio && (
        <a className="juror__enlace" href={j.portafolio} target="_blank" rel="noreferrer">
          Ver portafolio
        </a>
      )}
    </article>
  )
}

function Jurado() {
  const track = useRef(null)
  const jurado = juradoDe('2026-II')
  const porConfirmar = Math.max(0, LUGARES_JURADO_2026_II - jurado.length)

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
            text="Profesionales de la arquitectura y el desarrollo de América Latina. Presentamos al jurado de la 2026-II a medida que se confirma."
          />
          <div className="arrows">
            <IconButton icon="arrow-left" label="Anterior" onClick={() => slide(-1)} />
            <IconButton icon="arrow-right" label="Siguiente" onClick={() => slide(1)} />
          </div>
        </div>

        <div className="rail" ref={track}>
          {jurado.map((j) => (
            <TarjetaJurado key={j.id} j={j} />
          ))}
          {Array.from({ length: porConfirmar }, (_, i) => (
            <article className="juror juror--pendiente" key={`pendiente-${i}`}>
              <div className="juror__ph">
                <span>Próximamente</span>
              </div>
              <h3>Próximamente</h3>
            </article>
          ))}
        </div>

        <p className="fine">El resto del jurado 2026-II se presenta a medida que se confirma.</p>
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
  const sobreHero = useSobreHero(refHero)
  useAnclaInicial()

  function navegar(label) {
    const hit = NAV.find((n) => n[0] === label)
    if (hit) go(hit[1])
  }

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
          onNavigate={navegar}
        />
      </div>

      <div className="escala">
      <Hero refHero={refHero} />
      <Jurado />
      <Reto />
      <Premios />
      <SeccionAnteriores />
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
          {
            title: 'Concurso',
            links: ['El reto', 'Jurado', 'Premios', 'Concursos anteriores', 'Inscripción'],
          },
          { title: 'Estudio', links: ['Proyectos', 'Talleres 2026', 'Publicaciones', 'Contacto'] },
        ]}
        onNavigate={navegar}
        note="© 2026 Habisite · Challenge 2026-II"
      />
      </div>
    </>
  )
}
