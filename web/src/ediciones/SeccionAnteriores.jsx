import { Badge, Button, Icon, SectionHeader } from '../ds'
import Foto from './Foto'
import { EDICION_2025_I as EDICION, FINALISTAS, GANADOR } from './edicion-2025-i'

export const RUTA_ANTERIORES = '/concursos-anteriores'

/* Sección de la landing: la 1ª edición en tres tarjetas, con el
   ganador arriba y a lo ancho. Cada tarjeta lleva a su ficha en
   /concursos-anteriores. */
export default function SeccionAnteriores() {
  return (
    <section className="sec" id="concursos-anteriores" data-screen-label="Concursos anteriores">
      <div className="page">
        <SectionHeader
          className="ed-anteriores__cabeza"
          eyebrow="Concursos anteriores"
          title={
            <>
              Así se respondió <em>la 1ª edición</em>
            </>
          }
          text={`${EDICION.nombre}. Tres propuestas para un mismo reto: ${EDICION.reto}`}
        />

        <div className="ed-anteriores">
          <Tarjeta proyecto={GANADOR} destacada />
          {FINALISTAS.map((p) => (
            <Tarjeta key={p.id} proyecto={p} />
          ))}
        </div>

        <div className="ed-anteriores__pie">
          <p className="fine">
            Descubre la memoria, la galería y la lámina completa de cada proyecto.
          </p>
          <Button href={RUTA_ANTERIORES} icon="arrow-right">
            Mira los proyectos
          </Button>
        </div>
      </div>
    </section>
  )
}

function Tarjeta({ proyecto, destacada = false }) {
  return (
    <a
      href={`${RUTA_ANTERIORES}#${proyecto.id}`}
      className={`ed-tarjeta ${destacada ? 'ed-tarjeta--destacada' : ''}`.trim()}
    >
      <div className="ed-tarjeta__media">
        <Foto
          imagen={proyecto.portada}
          sizes={
            destacada
              ? '(max-width: 900px) 100vw, 800px'
              : '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 600px'
          }
        />
      </div>

      <div className="ed-tarjeta__texto">
        <Badge tone={destacada ? 'brand' : 'outline'}>{proyecto.distincion}</Badge>
        <h3 className="ed-tarjeta__titulo">{proyecto.titulo}</h3>
        {destacada && <p className="ed-tarjeta__lema">{proyecto.lema}</p>}
        <p className="ed-tarjeta__meta">
          {proyecto.autores}
          <br />
          {proyecto.lugar}
        </p>
        <span className="ed-tarjeta__ir">
          Ver el proyecto <Icon name="arrow-right" size={16} />
        </span>
      </div>
    </a>
  )
}
