import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, Eyebrow, Footer, Icon, Navbar, SectionHeader } from '../ds'
import { irA, useAnclaInicial, useSobreHero } from '../barra'
import Foto from './Foto'
import Visor from './Visor'
import { EDICION_2025_I as EDICION, FINALISTAS, GANADOR } from './edicion-2025-i'

/* /concursos-anteriores — la memoria de la 1ª edición.

   Misma barra, mismo hero naranja y mismo pie que la landing. Los
   datos salen todos de edicion-2025-i.js: esta página no escribe
   ningún nombre ni cifra. */

// Links de la barra. «Inicio» vuelve a la landing; el resto son anclas.
const NAV = [
  ['Inicio', null],
  ['Ganador', 'ganador'],
  ['Finalistas', 'finalistas'],
  ['Jurado', 'jurado'],
]

// Links del pie: los mismos que en la landing, que viven allá.
const DESTINOS_PIE = {
  'El reto': '/#reto',
  Jurado: '/#jurado',
  Premios: '/#premios',
  'Concursos anteriores': '/concursos-anteriores',
  Inscripción: '/#inscripcion',
}

export default function PaginaConcursosAnteriores() {
  const refHero = useRef(null)
  const sobreHero = useSobreHero(refHero)
  useAnclaInicial()

  // { titulo, imagenes, inicial } mientras el visor está abierto.
  const [visor, setVisor] = useState(null)
  const abrir = useCallback((titulo, imagenes, inicial = 0) => {
    setVisor({ titulo, imagenes, inicial })
  }, [])
  const cerrar = useCallback(() => setVisor(null), [])

  useEffect(() => {
    const anterior = document.title
    document.title = `Concursos anteriores · ${EDICION.nombre}`
    return () => {
      document.title = anterior
    }
  }, [])

  function navegar(label) {
    const hit = NAV.find((n) => n[0] === label)
    if (!hit) return
    if (hit[1]) irA(hit[1])
    else window.location.assign('/')
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
          onCta={() => window.location.assign('/#inscripcion')}
          onNavigate={navegar}
        />
      </div>

      <div className="escala">
        <section ref={refHero} className="hero ed-hero" data-screen-label="Concursos anteriores">
          <div className="page hero__in">
            <Eyebrow tone="on-brand">Concursos anteriores · {EDICION.numero}</Eyebrow>
            <h1 className="hero__h1">
              Habisite
              <br />
              Design Challenge
              <br />
              <span>2025-I</span>
            </h1>
            <p className="hero__sub">
              Las tres propuestas responden al mismo reto: {EDICION.reto}
            </p>

            <dl className="facts">
              <div>
                <dt>Edición</dt>
                <dd>{EDICION.numero}</dd>
              </div>
              <div>
                <dt>Ganador</dt>
                <dd>{GANADOR.titulo}</dd>
              </div>
              <div>
                <dt>Propuestas recibidas</dt>
                <dd>{EDICION.propuestasRecibidas ?? 'Próximamente'}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="sec" id="ganador" data-screen-label="Ganador">
          <div className="page">
            <SectionHeader
              eyebrow="Primer puesto"
              title={
                <>
                  El proyecto <em>ganador</em>
                </>
              }
            />
            <Ficha proyecto={GANADOR} destacada onAbrir={abrir} />
          </div>
        </section>

        <section className="sec" id="finalistas" data-screen-label="Finalistas">
          <div className="page">
            <SectionHeader
              eyebrow="Finalistas"
              title={
                <>
                  Otras dos miradas sobre <em>el mismo reto</em>
                </>
              }
            />
            {FINALISTAS.map((p, i) => (
              <Ficha key={p.id} proyecto={p} invertida={i % 2 === 1} onAbrir={abrir} />
            ))}
          </div>
        </section>

        <section className="sec" id="jurado" data-screen-label="Jurado 1ª edición">
          <div className="page">
            <SectionHeader
              eyebrow={`Jurado de la ${EDICION.numero}`}
              title={
                <>
                  Quiénes <em>eligieron</em>
                </>
              }
            />
            <Jurado jurado={EDICION.jurado} />
          </div>
        </section>

        <section className="ed-cierre" data-screen-label="Inscripción 2026-II">
          <div className="page ed-cierre__in">
            <div>
              <Eyebrow tone="on-brand">Habisite Challenge 2026-II</Eyebrow>
              <h2 className="ed-cierre__titulo">
                La próxima propuesta <em>puede ser la tuya</em>
              </h2>
              <p className="ed-cierre__texto">
                La edición 2026-II ya recibe inscripciones. Inscríbete sin costo, súmate al
                grupo oficial y recibe todo lo que necesitas para participar.
              </p>
            </div>
            <div className="ed-cierre__acciones">
              <Button variant="ink" size="lg" href="/#inscripcion" icon="arrow-right">
                Inscribirme
              </Button>
              <Button variant="on-brand-outline" size="lg" href="/#reto">
                Conoce el reto
              </Button>
            </div>
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
          onNavigate={(label) => {
            if (label === 'Concursos anteriores') window.scrollTo({ top: 0, behavior: 'smooth' })
            else if (DESTINOS_PIE[label]) window.location.assign(DESTINOS_PIE[label])
          }}
          note="© 2026 Habisite · Challenge 2026-II"
        />
      </div>

      {visor && (
        <Visor
          titulo={visor.titulo}
          imagenes={visor.imagenes}
          inicial={visor.inicial}
          onCerrar={cerrar}
        />
      )}
    </>
  )
}

/* La ficha de un proyecto. El ganador va en formato destacado:
   portada a todo el ancho, texto a dos columnas y galería grande.
   Los finalistas, en compacto: portada y texto lado a lado. */
function Ficha({ proyecto, destacada = false, invertida = false, onAbrir }) {
  // La portada es la primera imagen del visor; la galería sigue después.
  const imagenes = [proyecto.portada, ...proyecto.galeria]
  const idTitulo = `${proyecto.id}-titulo`

  const clases = [
    'ed-ficha',
    destacada ? 'ed-ficha--destacada' : 'ed-ficha--compacta',
    invertida ? 'ed-ficha--invertida' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={clases} id={proyecto.id} aria-labelledby={idTitulo}>
      {/* Portada y texto comparten un contenedor que termina con la cita:
          la portada sticky de los finalistas se frena ahí. La galería va
          afuera; si quedara adentro, la portada bajaría hasta taparla. */}
      <div className="ed-ficha__principal">
        <button
          type="button"
          className="ed-ficha__portada"
          onClick={() => onAbrir(proyecto.titulo, imagenes, 0)}
          aria-label={`Ampliar: ${proyecto.portada.titulo}`}
        >
          <Foto
            imagen={proyecto.portada}
            prioridad={destacada}
            sizes={destacada ? '(max-width: 1280px) 100vw, 1220px' : '(max-width: 900px) 100vw, 700px'}
          />
          <span className="ed-ficha__ampliar" aria-hidden="true">
            <Icon name="expand" size={18} />
          </span>
        </button>

        <div className="ed-ficha__cuerpo">
          <div className="ed-ficha__ident">
            <Badge tone={destacada ? 'brand' : 'outline'}>{proyecto.distincion}</Badge>
            <h3 className="ed-ficha__titulo" id={idTitulo}>
              {proyecto.titulo}
            </h3>
            <p className="ed-ficha__lema">{proyecto.lema}</p>

            <Autoria proyecto={proyecto} />

            <dl className="ed-datos">
              {proyecto.datos.map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt>{rotulo}</dt>
                  <dd>{valor}</dd>
                </div>
              ))}
            </dl>

            <button
              type="button"
              className="ed-lamina"
              onClick={() => onAbrir(proyecto.titulo, [proyecto.lamina], 0)}
            >
              <span className="ed-lamina__miniatura">
                <Foto imagen={proyecto.lamina} sizes="120px" />
              </span>
              <span className="ed-lamina__texto">
                <span className="hs-eyebrow hs-eyebrow--brand">Lámina A1</span>
                <b>Mira la lámina completa</b>
                <span>Ábrela y acércate a cada detalle.</span>
              </span>
            </button>
          </div>

          <div className="ed-ficha__relato">
            {proyecto.memoria.map((parrafo, i) => (
              <p key={i} className={i === 0 ? 'ed-ficha__entrada' : undefined}>
                {parrafo}
              </p>
            ))}

            {proyecto.claves.length > 0 && (
              <ol className="ed-claves">
                {proyecto.claves.map((c) => (
                  <li key={c.rotulo}>
                    <span className="ed-claves__rotulo">{c.rotulo}</span>
                    <b>{c.titulo}</b>
                    <p>{c.texto}</p>
                  </li>
                ))}
              </ol>
            )}

            {proyecto.cita && (
              <blockquote className="ed-cita">
                <p>«{proyecto.cita}»</p>
              </blockquote>
            )}
          </div>
        </div>
      </div>

      <div className="ed-galeria">
        {proyecto.galeria.map((im, i) => (
          <button
            type="button"
            key={im.src}
            className="ed-galeria__item"
            onClick={() => onAbrir(proyecto.titulo, imagenes, i + 1)}
            aria-label={`Ampliar: ${im.titulo}`}
          >
            <span className="ed-galeria__marco">
              <Foto
                imagen={im}
                sizes={
                  destacada
                    ? '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 420px'
                    : '(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 320px'
                }
              />
            </span>
            <span className="ed-galeria__pie">{im.titulo}</span>
          </button>
        ))}
      </div>
    </article>
  )
}

/* Autoría: nombre, y universidad, país y foto cuando lleguen. */
function Autoria({ proyecto }) {
  const detalle = [proyecto.universidad, proyecto.paisAutor].filter(Boolean).join(' · ')

  return (
    <div className="ed-autoria">
      {proyecto.fotoEquipo ? (
        <img
          className="ed-autoria__foto"
          src={proyecto.fotoEquipo}
          alt={`Retrato de ${proyecto.autores}`}
          width="160"
          height="160"
          loading="lazy"
        />
      ) : (
        <div className="ed-autoria__foto ed-pendiente">
          <span>Foto del equipo · próximamente</span>
        </div>
      )}
      <div className="ed-autoria__texto">
        <span className="hs-eyebrow">Autoría</span>
        <p className="ed-autoria__nombre">{proyecto.autores}</p>
        <p className="ed-autoria__detalle">{detalle || 'Universidad y país · próximamente'}</p>
      </div>
    </div>
  )
}

function Jurado({ jurado }) {
  if (!jurado.length) {
    return (
      <div className="ed-pendiente ed-pendiente--bloque">
        <span>Jurado de la {EDICION.numero} · próximamente</span>
      </div>
    )
  }

  return (
    <div className="ed-jurado">
      {jurado.map((j) => (
        <article className="juror" key={j.nombre}>
          {j.foto ? (
            <img
              className="ed-jurado__foto"
              src={j.foto}
              alt={`Retrato de ${j.nombre}`}
              width="400"
              height="500"
              loading="lazy"
            />
          ) : (
            <div className="juror__ph">
              <span>Retrato</span>
            </div>
          )}
          <h3>{j.nombre}</h3>
          {j.rol && <p className="juror__role">{j.rol}</p>}
        </article>
      ))}
    </div>
  )
}
