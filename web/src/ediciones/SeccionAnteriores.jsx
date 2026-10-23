import { Button, SectionHeader } from '../ds'
import Carrusel3D from './Carrusel3D'
import { EDICION_2025_I as EDICION, imagenesDe, itemDeCarrusel } from './edicion-2025-i'

export const RUTA_ANTERIORES = '/concursos-anteriores'

/* Los ítems del carrusel salen de los datos de la edición: las tres
   imágenes de `enLanding` de cada proyecto, en el orden de los datos.
   El ganador va primero, y su portada queda al centro al cargar.
   Los finalistas no llevan puesto: el 2º y el 3º no se conocen. */
const ITEMS = EDICION.proyectos.flatMap((p) => {
  const imagenes = imagenesDe(p)
  const categoria = `${p.puesto === 1 ? 'Ganador' : 'Finalista'} · ${EDICION.numero}`
  return p.enLanding
    .map((archivo) => imagenes.findIndex((im) => im.archivo === archivo))
    .filter((i) => i >= 0)
    .map((i) => itemDeCarrusel(p, i, { categoria, titulo: p.titulo }))
})

/* Sección de la landing: la 1ª edición en un carrusel a todo el ancho,
   sobre tinta. La tarjeta central lleva a la ficha de su proyecto en
   /concursos-anteriores; una lateral, al tocarla, pasa al centro. */
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
      </div>

      <Carrusel3D
        className="ed-anteriores__escenario"
        variante="landing"
        items={ITEMS}
        etiqueta={`Proyectos de la ${EDICION.numero}`}
        instrucciones="Usa las flechas izquierda y derecha para recorrer las imágenes. Enter abre el proyecto de la imagen central."
        onActivar={(i) => window.location.assign(`${RUTA_ANTERIORES}#${ITEMS[i].proyectoId}`)}
      />

      <div className="page">
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
