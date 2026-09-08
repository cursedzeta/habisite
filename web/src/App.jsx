import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Badge,
  Card,
  Eyebrow,
  SectionHeader,
  IconButton,
  Field,
  Input,
  Select,
  Checkbox,
  Navbar,
  Footer,
} from './ds'

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

const FACTS = [
  ['Cierre de inscripciones', '24 mayo 2026'],
  ['Período del reto', '25 mayo – 7 junio'],
  ['Anuncio de ganadores', '13 junio 2026'],
  ['Modalidad', 'Individual · en línea'],
]

const PAISES = ['Argentina', 'Bolivia', 'Brasil', 'Chile', 'Colombia', 'Costa Rica', 'Ecuador', 'México', 'Paraguay', 'Perú', 'Uruguay', 'Otro']

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
        <div className="hero__titulo">
          <h1 className="hero__h1">
            Habisite
            <br />
            Design
            <br />
            Challenge <span>2026</span>
          </h1>
          <span className="prize">
            <Badge tone="ink">Premio mayor</Badge>
            <b>USD 5.000</b>
          </span>
        </div>
        <p className="hero__sub">
          Un reto abierto al talento emergente de América Latina para imaginar nuevas formas de
          habitar el espacio.
        </p>
        <div className="hero__cta">
          <Button
            variant="ink"
            size="lg"
            href="#inscripcion"
            onClick={(e) => {
              e.preventDefault()
              go('inscripcion')
            }}
            icon="arrow-right"
          >
            Inscribirme
          </Button>
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
            text="Seis perfiles del oficio: proyecto, paisaje, estructura, curaduría, desarrollo y sostenibilidad. Cada propuesta pasa por todos."
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
          Los nombres y retratos se publican con las bases del concurso, en abril 2026.
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
            Entrega digital: memoria descriptiva, planos esquemáticos y una lámina de presentación.
            Sin maquetas físicas.
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

function Inscripcion() {
  const [sent, setSent] = useState(null)
  const [v, setV] = useState({ nombre: '', apellido: '', email: '', institucion: '', pais: '', terms: false })

  function set(k, val) {
    setV(Object.assign({}, v, { [k]: val }))
  }

  function submit(e) {
    e.preventDefault()
    if (!v.nombre.trim() || !/.+@.+\..+/.test(v.email) || !v.terms) {
      setSent(false)
      return
    }
    setSent(true)
  }

  return (
    <section className="signup" id="inscripcion" data-screen-label="Inscripción">
      <div className="page signup__in">
        <div>
          <SectionHeader
            onBrand
            eyebrow="Inscripción"
            title={
              <>
                Pre-registro <em>2026</em>
              </>
            }
          />
          <p className="signup__apoyo">
            Deja tus datos y te enviamos las bases, el calendario y el enlace al grupo oficial del
            concurso.
          </p>
          <ol className="steps">
            <li>
              <b>01</b>
              <span>Completas el pre-registro. Sin costo.</span>
            </li>
            <li>
              <b>02</b>
              <span>Recibes las bases y la plantilla de entrega.</span>
            </li>
            <li>
              <b>03</b>
              <span>Subes tu propuesta antes del 7 de junio.</span>
            </li>
          </ol>
        </div>

        {sent === true ? (
          <div className="done" role="status">
            <Eyebrow tone="on-brand">Pre-registro recibido</Eyebrow>
            <p>
              Listo, {v.nombre.trim().split(' ')[0]}. Te escribimos a <b>{v.email.trim()}</b> con las
              bases y el enlace al grupo oficial.
            </p>
          </div>
        ) : (
          <form className="fields" onSubmit={submit} noValidate>
            <Field label="Nombre" htmlFor="nombre">
              <Input
                onBrand
                id="nombre"
                value={v.nombre}
                placeholder="Juan Carlos"
                onChange={(e) => set('nombre', e.target.value)}
              />
            </Field>

            <Field label="Apellido" htmlFor="apellido">
              <Input
                onBrand
                id="apellido"
                value={v.apellido}
                placeholder="Pérez García"
                onChange={(e) => set('apellido', e.target.value)}
              />
            </Field>

            <Field className="full" label="Correo electrónico" htmlFor="email">
              <Input
                onBrand
                id="email"
                type="email"
                value={v.email}
                placeholder="tu@correo.com"
                onChange={(e) => set('email', e.target.value)}
              />
            </Field>

            <Field label="Universidad o estudio" htmlFor="institucion">
              <Input
                onBrand
                id="institucion"
                value={v.institucion}
                placeholder="Facultad, escuela u oficina"
                onChange={(e) => set('institucion', e.target.value)}
              />
            </Field>

            <Field label="País" htmlFor="pais">
              <Select onBrand id="pais" value={v.pais} onChange={(e) => set('pais', e.target.value)}>
                <option value="">Selecciona</option>
                {PAISES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="full">
              <Checkbox
                onBrand
                checked={v.terms}
                onChange={(e) => set('terms', e.target.checked)}
                label="Acepto las bases del concurso y el tratamiento de mis datos para recibir información del Habisite Design Challenge 2026."
              />
            </div>

            <div className="full submit">
              <Button variant="ink" size="lg" type="submit">
                Pre-registrarme
              </Button>
              <span className="signup__fine">
                {sent === false
                  ? 'Revisa nombre, correo y aceptación de las bases.'
                  : 'Cierra el 24 de mayo 2026 · sin costo'}
              </span>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

export default function App() {
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
          { title: 'Contacto', links: ['challenge@habisite.com', '+52 55 1234 5678', 'Instagram'] },
        ]}
        note="© 2026 Habisite · Design Challenge — bases sujetas a publicación en abril 2026"
      />
      </div>
    </>
  )
}
