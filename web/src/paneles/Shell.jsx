import { NOMBRE_DEL_ROL, nombreCompleto, salir } from '../sesion/sesion'

/* ==========================================================
   Cáscara tipo CRM: barra superior con pestañas + sidebar.
   La usan los tres paneles para que compartan el mismo esqueleto.

   `yo` es la respuesta de GET /yo: quién está adentro de verdad.
   ========================================================== */

export default function Shell({
  yo,
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
      {/* Tu sesión ya es real; lo de adentro del panel todavía no. Se va
          cuando cada sección lea de la API. */}
      <div className="crm-cinta">
        En construcción: tu cuenta es real, pero la propuesta, el equipo y las evaluaciones
        todavía son de ejemplo.
      </div>

      <header className="crm-top">
        <div className="crm-top__marca">
          Habisite
          <span>Habisite Challenge 2026-II</span>
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
          <span className="crm-top__nombre">{nombreCompleto(yo)}</span>
          <span className="crm-top__correo">{yo.correo}</span>
          <span className="crm-top__rol">{NOMBRE_DEL_ROL[yo.rol]}</span>
        </div>
        <button type="button" className="crm-top__salir" onClick={salir}>
          Salir
        </button>
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
