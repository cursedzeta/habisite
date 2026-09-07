/**
 * TituloSeccion — el encabezado de cada tramo de la pagina.
 *
 * Admite `destacado` para partir el color como lo hace el logotipo:
 * una parte en peso normal y otra en bold con otro color.
 */
export default function TituloSeccion({
  as: Etiqueta = 'h2',
  destacado,
  centrado = false,
  className = '',
  children,
  ...props
}) {
  return (
    <Etiqueta
      className={`text-titulo font-bold leading-titulo tracking-titulo text-balance
                  ${centrado ? 'text-center' : ''} ${className}`}
      {...props}
    >
      {children}
      {destacado && <b className="font-bold text-ink"> {destacado}</b>}
    </Etiqueta>
  )
}
