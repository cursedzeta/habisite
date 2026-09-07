import Rotulo from './Rotulo'

/**
 * Campo — etiqueta e input como una sola pieza.
 *
 * La etiqueta y el input siempre viajan juntos: separarlos es como
 * se pierden los htmlFor y el formulario deja de ser accesible.
 *
 * Dos tonos, uno por fondo:
 *   marca   sobre el naranja (transparente, borde blanco tenue)
 *   oscuro  sobre la tinta del pie
 */

const tonos = {
  marca:
    'border-white/45 bg-transparent text-white placeholder:text-white/60 ' +
    'hover:border-white/70 focus:border-white focus:bg-white/10',
  oscuro:
    'border-white/15 bg-white/10 text-white placeholder:text-white/45 ' +
    'hover:border-white/30 focus:border-primary focus:bg-white/15',
}

export default function Campo({
  id,
  etiqueta,
  tipo = 'text',
  ejemplo,
  requerido = false,
  tono = 'marca',
  className = '',
  ...props
}) {
  return (
    <div className={className}>
      {etiqueta && (
        <Rotulo as="label" htmlFor={id} className="mb-2.5 block">
          {etiqueta}
        </Rotulo>
      )}

      <input
        id={id}
        name={id}
        type={tipo}
        placeholder={ejemplo}
        required={requerido}
        className={`w-full rounded-control border px-6 py-3.5 text-cuerpo
                    transition-all duration-200 focus:outline-none ${tonos[tono]}`}
        {...props}
      />
    </div>
  )
}
