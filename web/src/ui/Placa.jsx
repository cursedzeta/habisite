/**
 * Placa — el contenedor con esquinas redondeadas de la marca.
 *
 * El motivo sale del propio logotipo, que es una placa redondeada.
 *
 *   marca   naranja pleno, para los momentos que tienen que gritar
 *   suave   crema con borde, para los que solo tienen que agrupar
 */

const variantes = {
  marca: 'bg-primary text-white',
  suave: 'bg-cream border border-cream-borde text-ink',
}

export default function Placa({
  variante = 'marca',
  holgada = false,
  className = '',
  children,
  ...props
}) {
  const relleno = holgada ? 'px-8 py-14 md:px-placa-x md:py-placa-y' : 'p-8'

  return (
    <div className={`rounded-placa ${variantes[variante]} ${relleno} ${className}`} {...props}>
      {children}
    </div>
  )
}
