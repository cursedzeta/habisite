/* ==========================================================
   Cáscara tipo CRM: barra superior con pestañas + sidebar.
   La usan los dos paneles para que compartan el mismo esqueleto.
   ========================================================== */

export default function Shell({
  rol,
  persona,
  pestanas = [],
  pestanaActiva,
  onPestana,
  secciones = [],
  seccionActiva,
  onSeccion,
  children,
}) {
  return (
    <div className="crm">
      <div className="crm-cinta">
        Prototipo — datos inventados, sin backend. Nada de lo que hagas acá se guarda.
      </div>

      <header className="crm-top">
        <div className="crm-top__marca">
          Habisite
          <span>Challenge 2026</span>
        </div>

        <nav className="crm-tabs">
          {pestanas.map((p) => (
            <button
              key={p.id}
              type="button"
              className={p.id === pestanaActiva ? 'es-activa' : ''}
              onClick={() => onPestana(p.id)}
            >
              {p.texto}
              {p.contador != null && <span className="crm-contador">{p.contador}</span>}
            </button>
          ))}
        </nav>

        <div className="crm-top__user">
          <span className="crm-top__nombre">{persona}</span>
          <span className="crm-top__rol">{rol}</span>
        </div>
      </header>

      <div className="crm-cuerpo">
        <aside className="crm-side">
          {secciones.map((s) =>
            s.separador ? (
              <span key={s.id} className="crm-side__sep">{s.texto}</span>
            ) : (
              <button
                key={s.id}
                type="button"
                className={s.id === seccionActiva ? 'es-activa' : ''}
                onClick={() => onSeccion(s.id)}
              >
                <span className="crm-side__punto" aria-hidden="true" />
                {s.texto}
                {s.contador != null && <span className="crm-contador">{s.contador}</span>}
              </button>
            ),
          )}
        </aside>

        <main className="crm-main">{children}</main>
      </div>
    </div>
  )
}
