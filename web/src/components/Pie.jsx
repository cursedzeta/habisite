import { pie } from '../datos'
import { Boton, Campo } from '../ui'

function Columna({ titulo, children }) {
  return (
    <div>
      <h3 className="mb-3 text-cuerpo font-bold leading-titulo text-primary">{titulo}</h3>
      {children}
    </div>
  )
}

export default function Pie() {
  return (
    /* Pie mas alto pero con tipografia mas chica: ocupa presencia
       sin gritar. El aire hace el trabajo, no el tamano de letra. */
    <footer className="bg-ink pb-14 pt-[120px] text-white md:pt-[150px]">
      <div className="contenedor grid grid-cols-1 gap-12 md:grid-cols-[1.12fr_0.38fr_1fr] md:gap-0">
        {/* --- marca --- */}
        <div>
          <h3 className="mb-3 text-subtitulo font-bold leading-titulo tracking-titulo text-primary">
            Habisite
          </h3>
          <p className="max-w-[380px] text-menu leading-cuerpo text-white/85">{pie.descripcion}</p>
          <p className="mt-5 max-w-[380px] text-menu font-bold">{pie.lema}</p>
        </div>

        {/* --- menu --- */}
        <Columna titulo="Menu">
          <ul className="space-y-2">
            {pie.menu.map((item) => (
              <li key={item.texto}>
                <a
                  href={item.href}
                  className="text-menu font-semibold text-white/85 transition-colors duration-200 hover:text-primary"
                >
                  {item.texto}
                </a>
              </li>
            ))}
          </ul>
        </Columna>

        {/* --- noticias --- */}
        <Columna titulo="Noticias">
          <p className="max-w-[360px] text-menu leading-cuerpo text-white/85">{pie.noticias}</p>

          <form className="mt-5 max-w-[330px]" onSubmit={(e) => e.preventDefault()}>
            <Campo id="suscribir" tipo="email" ejemplo="Email" tono="oscuro" aria-label="Email" />
            <Boton type="submit" tamano="sm" className="mt-3">
              Enviar
            </Boton>
          </form>
        </Columna>
      </div>

      <div className="contenedor mt-24 border-t border-white/10 pt-8 md:mt-32">
        <p className="text-micro text-white/55">{pie.copyright}</p>
      </div>
    </footer>
  )
}
