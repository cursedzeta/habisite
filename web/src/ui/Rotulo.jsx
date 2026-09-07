/**
 * Rotulo — la versalita que titula un bloque o un campo.
 *
 * Acepta `as` porque el mismo estilo cumple dos papeles: encabezado
 * de seccion (<p>) y etiqueta de formulario (<label>). El aspecto es
 * el mismo; el elemento correcto depende del contexto.
 */
export default function Rotulo({ as: Etiqueta = 'p', className = '', children, ...props }) {
  return (
    <Etiqueta
      className={`text-rotulo font-semibold uppercase tracking-rotulo ${className}`}
      {...props}
    >
      {children}
    </Etiqueta>
  )
}
