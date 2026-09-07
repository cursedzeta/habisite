/* ==========================================================
   Sistema de diseño Habisite — piezas base.
   Portado del bundle que genero Claude Design. Los nombres
   quedan en ingles a proposito: son los del sistema, y asi el
   port de app.jsx se puede verificar linea por linea.
   ========================================================== */

/* Los iconos se pintan como mascara CSS, no como <svg>: la clase .hs-icon
   define background-color:currentColor y recorta con mask-image, que es
   como estaba hecho el sistema original. */
function mascara(trazo) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" ' +
    'stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    trazo +
    '</svg>'
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const ICONOS = {
  'arrow-right': mascara('<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>'),
  'arrow-left': mascara('<path d="M19 12H5"/><path d="M11 18l-6-6 6-6"/>'),
  'chevron-down': mascara('<path d="M6 9l6 6 6-6"/>'),
  check: mascara('<path d="M4 12.5l5.5 5.5L20 7"/>'),
}

export function Icon({ name, size = 20, className = '', ...props }) {
  const mask = ICONOS[name]
  return (
    <span
      className={`hs-icon ${className}`.trim()}
      style={{ width: size, height: size, maskImage: mask, WebkitMaskImage: mask }}
      aria-hidden="true"
      {...props}
    />
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  href,
  icon,
  className = '',
  children,
  ...props
}) {
  const clases = `hs-btn hs-btn--${size} hs-btn--${variant} ${className}`.trim()
  const contenido = (
    <>
      {children}
      {icon && <Icon name={icon} size={16} />}
    </>
  )

  if (href) {
    return (
      <a href={href} className={clases} {...props}>
        {contenido}
      </a>
    )
  }
  return (
    <button className={clases} {...props}>
      {contenido}
    </button>
  )
}

export function IconButton({ icon, label, variant = 'outline', size = 'md', className = '', ...props }) {
  return (
    <button
      className={`hs-iconbtn hs-iconbtn--${size} hs-iconbtn--${variant} ${className}`.trim()}
      aria-label={label}
      title={label}
      {...props}
    >
      <Icon name={icon} size={18} />
    </button>
  )
}

export function Badge({ tone, className = '', children, ...props }) {
  return (
    <span className={`hs-badge ${tone ? `hs-badge--${tone}` : ''} ${className}`.trim()} {...props}>
      {children}
    </span>
  )
}

export function Eyebrow({ tone, as: Etiqueta = 'span', className = '', children, ...props }) {
  return (
    <Etiqueta
      className={`hs-eyebrow ${tone ? `hs-eyebrow--${tone}` : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </Etiqueta>
  )
}

export function Card({ tone, outline = false, className = '', children, ...props }) {
  const clases = [
    'hs-card',
    tone === 'cream' ? 'hs-card--cream' : '',
    outline ? 'hs-card--outline' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={clases} {...props}>
      <div className="hs-card__body">{children}</div>
    </div>
  )
}

export function SectionHeader({ eyebrow, title, text, onBrand = false, className = '', ...props }) {
  return (
    <div
      className={`hs-section-head ${onBrand ? 'hs-section-head--on-brand' : ''} ${className}`.trim()}
      {...props}
    >
      {eyebrow && <Eyebrow tone={onBrand ? 'on-brand' : 'brand'}>{eyebrow}</Eyebrow>}
      {title && <h2 className="hs-section-head__title">{title}</h2>}
      {text && <p className="hs-card__text">{text}</p>}
    </div>
  )
}
