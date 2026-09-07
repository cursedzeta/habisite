import { jurado } from '../datos'
import { useReveal } from '../hooks/useReveal'
import { TituloSeccion } from '../ui'

function IconoPersona() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[42px] w-[42px]" aria-hidden="true">
      <circle cx="12" cy="7.5" r="3.6" />
      <path d="M12 13c-4 0-6.6 2.1-6.6 4.6V19h13.2v-1.4C18.6 15.1 16 13 12 13z" />
    </svg>
  )
}

function Miembro({ persona, demora }) {
  const { ref, clase, estilo } = useReveal({ demora })

  return (
    <article ref={ref} className={`${clase} group`} style={estilo}>
      {/* Placa en crema: el detalle del sistema sobre el fondo blanco.
         Lleva borde porque el crema puro contra blanco casi no se distingue. */}
      <div
        className="flex aspect-3/4 items-center justify-center overflow-hidden rounded-sutil
                   border border-cream-borde bg-cream text-ink/25
                   transition-all duration-500 ease-out
                   group-hover:border-primary/40 group-hover:text-primary/40"
      >
        <IconoPersona />
      </div>
      <p className="mt-3.5 text-nombre font-bold leading-titulo">{persona.nombre}</p>
      <p className="text-menu leading-snug text-ink/70">{persona.rol}</p>
      <p className="text-menu leading-snug text-ink/70">{persona.nacionalidad}</p>
    </article>
  )
}

export default function Jurado() {
  const titulo = useReveal()

  return (
    <section className="pt-seccion">
      <div className="contenedor">
        <TituloSeccion
          ref={titulo.ref}
          centrado
          className={titulo.clase}
          style={titulo.estilo}
        >
          Jurado Confirmado
        </TituloSeccion>

        <div
          className="mx-auto mt-[62px] grid max-w-[240px] grid-cols-1 gap-8
                     min-[430px]:max-w-[430px] min-[430px]:grid-cols-2
                     min-[700px]:max-w-[700px] min-[700px]:grid-cols-3 min-[700px]:gap-x-[67px] min-[700px]:gap-y-0"
        >
          {jurado.map((persona, i) => (
            <Miembro key={persona.id} persona={persona} demora={i * 120} />
          ))}
        </div>
      </div>
    </section>
  )
}
