import { concurso } from '../datos'
import { Boton } from '../ui'

function Dato({ rotulo, valor, demora }) {
  return (
    <div className="animate-subir" style={{ animationDelay: `${demora}ms` }}>
      <p className="text-cuerpo">{rotulo}</p>
      <p className="mb-[26px] mt-0.5 text-dato font-bold leading-titulo">{valor}</p>
    </div>
  )
}

export default function Hero({ refHero }) {
  return (
    <section
      ref={refHero}
      /* pt compensa la barra fija: sin esto el titulo queda debajo del vidrio */
      className="degrade-hero animate-deriva overflow-hidden pb-24 pt-[calc(var(--alto-nav)+3rem)]
                 text-white md:pb-28 md:pt-[calc(var(--alto-nav)+6.5rem)]"
    >
      <div className="contenedor grid grid-cols-1 items-start gap-9 md:grid-cols-[1.6fr_1fr] md:gap-10">
        {/* --- titulo: cada linea entra escalonada --- */}
        <h1 className="text-hero font-bold leading-titulo tracking-titulo">
          {concurso.titulo.map((linea, i) => (
            <span
              key={linea}
              className="block animate-subir"
              style={{ animationDelay: `${i * 110}ms` }}
            >
              {linea}
            </span>
          ))}
        </h1>

        {/* --- premio y fecha --- */}
        <div className="md:pt-[98px]">
          <Dato rotulo="PREMIO" valor={concurso.premio} demora={460} />
          <Dato rotulo="FECHA FINAL DE INSCRIPCION" valor={concurso.cierreInscripcion} demora={560} />

          <Boton
            href="#inscribirme"
            variante="contorno"
            tamano="md"
            className="animate-subir mt-2 block w-fit md:mx-auto"
            style={{ animationDelay: '660ms' }}
          >
            Inscribirme
          </Boton>
        </div>
      </div>
    </section>
  )
}
