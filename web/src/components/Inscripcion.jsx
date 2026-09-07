import { useState } from 'react'
import { camposFormulario, preRegistro, enlaceWhatsapp } from '../datos'
import { useReveal } from '../hooks/useReveal'
import { Boton, Campo, Casilla, Placa, Rotulo } from '../ui'

const enlaceSinConfigurar = enlaceWhatsapp.includes('REEMPLAZAR')

export default function Inscripcion() {
  const tarjeta = useReveal()
  const [redirigiendo, setRedirigiendo] = useState(false)

  /* Todavia no hay backend. El formulario cumple su otra funcion:
     mandar al grupo de WhatsApp, que es donde se pasa el resto. */
  function manejarEnvio(evento) {
    evento.preventDefault()
    setRedirigiendo(true)

    if (enlaceSinConfigurar) return
    window.open(enlaceWhatsapp, '_blank', 'noopener,noreferrer')
  }

  return (
    <section id="inscribirme" className="pt-seccion">
      <div className="contenedor">
        <Placa
          ref={tarjeta.ref}
          holgada
          style={tarjeta.estilo}
          className={`${tarjeta.clase} grid grid-cols-1 gap-12 md:grid-cols-[0.85fr_1.15fr] md:gap-16`}
        >
          {/* ---------- columna izquierda: el mensaje ---------- */}
          <div>
            <Rotulo className="text-white">{preRegistro.rotulo}</Rotulo>

            <h2 className="mt-6 text-titulo-placa leading-titulo tracking-apretado text-white">
              {preRegistro.tituloClaro}{' '}
              <b className="font-bold text-ink">{preRegistro.tituloFuerte}</b>
            </h2>

            <p className="mt-6 max-w-[42ch] text-cuerpo leading-suelto text-white">
              {preRegistro.bajada}
            </p>
          </div>

          {/* ---------- columna derecha: el formulario ---------- */}
          <form onSubmit={manejarEnvio} className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {camposFormulario.map((campo) => (
              <Campo
                key={campo.id}
                id={campo.id}
                etiqueta={campo.etiqueta}
                tipo={campo.tipo}
                ejemplo={campo.ejemplo}
                requerido={campo.requerido}
                tono="marca"
                className={campo.mitad ? 'sm:col-span-1' : 'sm:col-span-2'}
              />
            ))}

            <div className="mt-2 sm:col-span-2">
              <Casilla id="terminos" requerido>
                {preRegistro.terminos}
              </Casilla>
            </div>

            <div className="mt-3 sm:col-span-2">
              <Boton type="submit" variante="claro" tamano="lg">
                {preRegistro.boton}
              </Boton>

              {redirigiendo && (
                <p className="animate-aparecer mt-5 max-w-[46ch] text-menu leading-cuerpo text-white">
                  {enlaceSinConfigurar ? (
                    <>
                      Falta cargar el enlace del grupo de WhatsApp en{' '}
                      <code className="font-mono text-ink">src/datos.js</code>.
                    </>
                  ) : (
                    <>Te abrimos el grupo de WhatsApp en otra pestaña.</>
                  )}
                </p>
              )}
            </div>
          </form>
        </Placa>
      </div>
    </section>
  )
}
