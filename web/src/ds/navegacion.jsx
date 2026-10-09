/* ==========================================================
   Sistema de diseño Habisite — navegacion y pie.
   ========================================================== */

import { Button } from './base'

export function Navbar({
  brand,
  links = [],
  cta,
  onCta,
  onNavigate,
  onBrand = false,
  className = '',
  ...props
}) {
  return (
    <nav className={`hs-nav ${onBrand ? 'hs-nav--on-brand' : ''} ${className}`.trim()} {...props}>
      <button
        type="button"
        className="hs-nav__wordmark"
        onClick={() => onNavigate && onNavigate(links[0])}
      >
        {brand}
      </button>

      <ul className="hs-nav__links">
        {links.map((texto) => (
          <li key={texto}>
            <button
              type="button"
              className="hs-nav__link"
              onClick={() => onNavigate && onNavigate(texto)}
            >
              {texto}
            </button>
          </li>
        ))}
      </ul>

      {cta && (
        <Button variant="primary" size="sm" onClick={onCta}>
          {cta}
        </Button>
      )}
    </nav>
  )
}

/* onNavigate no venia en el sistema: sin el, los links del pie no
   llevan a ningun lado. Es opcional, asi que el componente sigue
   siendo el mismo para quien no lo pase. */
export function Footer({ brand, tagline, columns = [], note, onNavigate, className = '', ...props }) {
  return (
    <footer className={`hs-footer ${className}`.trim()} {...props}>
      <span className="hs-footer__brand">
        <b>{brand}</b>
        <span>{tagline}</span>
      </span>

      <div className="hs-footer__cols">
        {columns.map((col) => (
          <div className="hs-footer__col" key={col.title}>
            <span className="hs-eyebrow hs-eyebrow--on-ink">{col.title}</span>
            {col.links.map((link) => (
              <button
                type="button"
                className="hs-footer__link"
                key={link}
                onClick={() => onNavigate && onNavigate(link)}
              >
                {link}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* El CSS de pagina lo oculta; se mantiene por fidelidad al componente. */}
      <hr className="hs-divider hs-divider--on-ink" />

      <span className="hs-footer__link">{note}</span>
    </footer>
  )
}
