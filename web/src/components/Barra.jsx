import { navegacion } from '../datos'
import { Boton } from '../ui'

/**
 * Barra fija de vidrio esmerilado.
 *
 * El material (velo crema + blur) es el mismo durante todo el scroll.
 * Lo unico que cambia es el color del texto: sobre el hero naranja va
 * en blanco, y al pasar al fondo blanco pasa a tinta, porque blanco
 * sobre blanco no se lee.
 */
export default function Barra({ sobreHero }) {
  const colorTexto = sobreHero ? 'text-white' : 'text-ink'

  return (
    <header
      className={`vidrio animate-bajar fixed inset-x-0 top-0 z-50 h-(--alto-nav)
                  border-b transition-colors duration-500
                  ${sobreHero ? 'border-white/20' : 'border-cream-borde'}`}
    >
      <div className="contenedor flex h-full items-center justify-between gap-6">
        <a
          href="#"
          className={`text-marca font-bold leading-none tracking-titulo
                      transition-all duration-500 hover:scale-[1.03] ${colorTexto}`}
        >
          Habisite
        </a>

        <nav className="flex items-center gap-8">
          {navegacion.map((item) => (
            <a
              key={item.texto}
              href={item.href}
              className={`relative hidden text-menu transition-colors duration-500
                          after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0
                          after:bg-current after:transition-all after:duration-300
                          hover:after:w-full sm:block ${colorTexto}`}
            >
              {item.texto}
            </a>
          ))}

          <Boton href="#inscribirme" tamano="sm" className="animate-latir whitespace-nowrap">
            Inscribirme
          </Boton>
        </nav>
      </div>
    </header>
  )
}
