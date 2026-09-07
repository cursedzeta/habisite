/* ==========================================================
   Sistema de diseño Habisite — formularios.
   ========================================================== */

import { Icon } from './base'

export function Field({ label, htmlFor, className = '', children, hint, error, ...props }) {
  return (
    <div className={`hs-field ${className}`.trim()} {...props}>
      {label && (
        <label className="hs-field__label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && <span className="hs-field__hint">{hint}</span>}
      {error && <span className="hs-field__error">{error}</span>}
    </div>
  )
}

export function Input({ onBrand = false, invalid = false, className = '', ...props }) {
  const clases = [
    'hs-input',
    onBrand ? 'hs-input--on-brand' : '',
    invalid ? 'hs-input--invalid' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return <input className={clases} {...props} />
}

export function Select({ onBrand = false, className = '', children, ...props }) {
  const clases = ['hs-input', 'hs-select', onBrand ? 'hs-input--on-brand' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className="hs-select-wrap">
      <select className={clases} {...props}>
        {children}
      </select>
      <Icon name="chevron-down" size={18} />
    </span>
  )
}

export function Checkbox({ onBrand = false, label, className = '', ...props }) {
  return (
    <label className={`hs-check ${onBrand ? 'hs-check--on-brand' : ''} ${className}`.trim()}>
      <input type="checkbox" {...props} />
      {/* El tilde hereda currentColor: la caja lo mantiene transparente
          hasta que el input queda checked. */}
      <span className="hs-check__box">
        <Icon name="check" size={14} />
      </span>
      <span>{label}</span>
    </label>
  )
}
