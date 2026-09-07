/**
 * Casilla — checkbox propio.
 *
 * El checkbox nativo sobre naranja se ve gris y cada sistema operativo
 * lo dibuja distinto. Este es un cuadrado blanco con un tilde que aparece
 * al marcarlo. El input real sigue existiendo (sr-only), asi que conserva
 * el teclado, el required y el envio del formulario.
 *
 * El <span> tiene que ser hermano directo del input: el modificador
 * peer-checked genera `.peer:checked ~ *` y con un nivel de anidado
 * de mas dejaria de aplicar.
 */
export default function Casilla({ id, requerido = false, children, ...props }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-4">
      <input id={id} type="checkbox" required={requerido} className="peer sr-only" {...props} />

      <span
        className="mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-sutil bg-white
                   after:h-[11px] after:w-[6px] after:rotate-45 after:border-b-2 after:border-r-2
                   after:border-primary after:opacity-0 after:transition-opacity after:duration-200
                   after:content-[''] peer-checked:after:opacity-100
                   peer-focus-visible:ring-2 peer-focus-visible:ring-white
                   peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-primary"
      />

      <span className="text-menu leading-cuerpo text-white">{children}</span>
    </label>
  )
}
