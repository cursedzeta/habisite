/**
 * Boton — la accion de la interfaz.
 *
 * Tres variantes, una por fondo sobre el que se apoya:
 *   primario  naranja sobre fondo claro
 *   contorno  solo borde, para apoyarse sobre el hero
 *   claro     blanco sobre naranja (naranja sobre naranja no existe)
 *
 * Renderiza <a> si recibe href y <button> si no, para no perder
 * la semantica: navegar y ejecutar no son lo mismo.
 */

const base =
  'inline-block cursor-pointer rounded-control font-bold text-center ' +
  'transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0'

const variantes = {
  primario: 'bg-primary text-white hover:brightness-110',
  contorno: 'border-2 border-white text-white hover:bg-white/15',
  claro: 'bg-white text-primary hover:shadow-[0_10px_30px_rgba(0,0,0,0.18)]',
}

const tamanos = {
  sm: 'px-7 py-3 text-menu',
  md: 'px-10 py-3.5 text-boton',
  lg: 'px-12 py-4 text-boton',
}

export default function Boton({
  variante = 'primario',
  tamano = 'md',
  href,
  className = '',
  children,
  ...props
}) {
  const clases = `${base} ${variantes[variante]} ${tamanos[tamano]} ${className}`

  if (href) {
    return (
      <a href={href} className={clases} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button className={clases} {...props}>
      {children}
    </button>
  )
}
