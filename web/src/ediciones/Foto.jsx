/* Una imagen de edicion-2025-i.js con sus dos tamaños.

   width y height van siempre: con eso el navegador reserva el lugar
   antes de que llegue la imagen y la pagina no salta. El tamaño real
   lo decide el CSS; esos atributos solo fijan la proporción.

   Diferida por defecto: solo la portada del ganador entra con
   prioridad, porque es lo primero que se ve de una imagen. */
export default function Foto({ imagen, sizes, prioridad = false, className = '' }) {
  return (
    <img
      className={className || undefined}
      src={imagen.src}
      srcSet={`${imagen.srcChico} ${imagen.anchoChico}w, ${imagen.src} ${imagen.ancho}w`}
      sizes={sizes}
      width={imagen.ancho}
      height={imagen.alto}
      alt={imagen.alt}
      loading={prioridad ? 'eager' : 'lazy'}
      fetchPriority={prioridad ? 'high' : undefined}
      decoding="async"
    />
  )
}
