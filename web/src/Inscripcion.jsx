import { useEffect, useRef, useState } from 'react'
import { Button, Eyebrow, SectionHeader, Field, Input, Select, Checkbox } from './ds'
import { pedir, TURNSTILE_SITIO } from './api'

/* ==========================================================
   El formulario de inscripción, contra la API real.

   Es el único formulario del concurso y ya no es un pre-registro:
   deja a la persona habilitada para entrar con Google. Todo lo que
   pide el back está en backendGonzalo/docs/11-formulario-para-el-front.md.
   ========================================================== */

/* El país viaja como código ISO. El prefijo sirve para armar el
   teléfono en E.164 y se precarga al elegir país. */
const PAISES = [
  ['AR', 'Argentina', '+54'],
  ['BO', 'Bolivia', '+591'],
  ['BR', 'Brasil', '+55'],
  ['CL', 'Chile', '+56'],
  ['CO', 'Colombia', '+57'],
  ['CR', 'Costa Rica', '+506'],
  ['EC', 'Ecuador', '+593'],
  ['MX', 'México', '+52'],
  ['PY', 'Paraguay', '+595'],
  ['PE', 'Perú', '+51'],
  ['UY', 'Uruguay', '+598'],
  ['ZZ', 'Otro', ''],
]

const TIPOS = [
  ['universidad', 'Estudio en una universidad', 'Facultad o escuela'],
  ['trabajo', 'Trabajo en un estudio o empresa', 'Estudio o empresa'],
  ['independiente', 'Trabajo por mi cuenta', 'Profesión o especialidad'],
]

const VACIO = {
  correo: '',
  nombre: '',
  apellido: '',
  tipoInstitucion: '',
  institucion: '',
  pais: '',
  prefijo: '',
  numero: '',
  aceptaBases: false,
}

/* Un solo intento de redirección; si el navegador la frena queda el botón. */
const ESPERA_REDIRECCION = 3000

function prefijoDe(pais) {
  return PAISES.find((p) => p[0] === pais)?.[2] ?? ''
}

/* De '+5491123456789' a { prefijo: '+54', numero: '91123456789' }.
   Se prueba primero el prefijo más largo: +591 antes que +5. */
function partirTelefono(telefono) {
  if (!telefono) return { prefijo: '', numero: '' }
  const prefijos = PAISES.map((p) => p[2])
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
  const hit = prefijos.find((p) => telefono.startsWith(p))
  return hit ? { prefijo: hit, numero: telefono.slice(hit.length) } : { prefijo: '', numero: telefono }
}

/* Sin prefijo elegido ("Otro"), el número se escribe completo con +. */
function armarTelefono(prefijo, numero) {
  const digitos = numero.replace(/[\s\-().]/g, '')
  if (!digitos) return null
  return prefijo ? prefijo + digitos.replace(/^\+/, '') : digitos
}

function validar(v) {
  const errores = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.correo.trim())) {
    errores.correo = 'Escribe un correo válido.'
  }
  const telefono = armarTelefono(v.prefijo, v.numero)
  if (telefono && !/^\+[1-9]\d{6,14}$/.test(telefono)) {
    errores.telefono = v.prefijo
      ? 'Revisa el número: solo dígitos, sin el prefijo del país.'
      : 'Escribe el número completo, empezando por + y el código de país.'
  }
  if (!v.aceptaBases) errores.aceptaBases = 'Para inscribirte tienes que aceptar las bases.'
  return errores
}

/* De qué canal vino. Se guarda apenas se lee: si la persona navega
   por la landing antes de inscribirse, el parámetro se pierde. */
function leerOrigen(params) {
  const enUrl = params.get('origen') || params.get('utm_source')
  try {
    if (enUrl) sessionStorage.setItem('origen', enUrl)
    return enUrl || sessionStorage.getItem('origen')
  } catch {
    return enUrl
  }
}

/* ==========================================================
   Turnstile (captcha de Cloudflare)

   El token es de un solo uso y vence a los 5 minutos: después de
   cualquier envío fallido hay que reiniciar el widget, o el
   segundo intento siempre da 403.
   ========================================================== */

let cargaTurnstile = null

function cargarTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!cargaTurnstile) {
    cargaTurnstile = new Promise((resolver, rechazar) => {
      const s = document.createElement('script')
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true
      s.onload = () => resolver(window.turnstile)
      s.onerror = () => {
        cargaTurnstile = null
        rechazar(new Error('No cargó Turnstile'))
      }
      document.head.appendChild(s)
    })
  }
  return cargaTurnstile
}

function useTurnstile(contenedor) {
  const [token, setToken] = useState(null)
  const widget = useRef(null)

  useEffect(() => {
    let vivo = true
    cargarTurnstile()
      .then((ts) => {
        if (!vivo || !contenedor.current) return
        widget.current = ts.render(contenedor.current, {
          sitekey: TURNSTILE_SITIO,
          // Solo aparece si Cloudflare necesita que la persona haga algo.
          appearance: 'interaction-only',
          theme: 'light',
          callback: (t) => setToken(t),
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
        })
      })
      .catch(() => {})

    return () => {
      vivo = false
      if (widget.current != null) window.turnstile?.remove(widget.current)
      widget.current = null
    }
  }, [contenedor])

  function reiniciar() {
    setToken(null)
    if (widget.current != null) window.turnstile?.reset(widget.current)
  }

  return { token, reiniciar }
}

/* ========================================================== */

function Gracias({ resultado, nombre }) {
  const completa = resultado.estado === 'completa'

  useEffect(() => {
    if (!completa) return
    const t = setTimeout(() => window.location.assign(resultado.whatsapp), ESPERA_REDIRECCION)
    return () => clearTimeout(t)
  }, [completa, resultado.whatsapp])

  return (
    <div className="done" role="status">
      <Eyebrow tone="on-brand">{completa ? 'Inscripción confirmada' : 'Inscripción recibida'}</Eyebrow>
      {completa ? (
        <p>
          ¡Listo{nombre ? `, ${nombre}` : ''}! Te llevamos al grupo oficial del concurso…
        </p>
      ) : (
        <>
          <p>Te mandamos un correo para que completes tus datos cuando puedas.</p>
          <p>
            Mientras tanto, súmate al grupo oficial: ahí compartimos las bases, el calendario y el
            acceso a la plataforma.
          </p>
        </>
      )}
      <div>
        {/* Siempre la URL que da la API: registra el clic y frena el recordatorio. */}
        <Button variant="ink" size="lg" href={resultado.whatsapp}>
          Ir al grupo de WhatsApp
        </Button>
      </div>
    </div>
  )
}

export default function Inscripcion() {
  const [v, setV] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const [terminosUrl, setTerminosUrl] = useState(null)
  const [origen] = useState(() => leerOrigen(new URLSearchParams(window.location.search)))
  const [tokenCompletar, setTokenCompletar] = useState(null)
  const [prefijoTocado, setPrefijoTocado] = useState(false)

  const refTurnstile = useRef(null)
  const turnstile = useTurnstile(refTurnstile)

  useEffect(() => {
    // Hasta que se escriban las bases viene null: el texto va sin enlace.
    pedir('/edicion/publica')
      .then((e) => setTerminosUrl(e?.terminosUrl ?? null))
      .catch(() => {})

    // Viene del botón «Completar mi inscripción» del correo de alerta.
    const completar = new URLSearchParams(window.location.search).get('completar')
    if (completar) {
      pedir(`/inscripcion/completar/${encodeURIComponent(completar)}`)
        .then((d) => {
          const tel = partirTelefono(d.telefono)
          setV((prev) => ({
            ...prev,
            correo: d.correo ?? '',
            nombre: d.nombre ?? '',
            apellido: d.apellido ?? '',
            tipoInstitucion: d.tipoInstitucion ?? '',
            institucion: d.institucion ?? '',
            pais: d.pais ?? '',
            ...tel,
          }))
          if (tel.prefijo) setPrefijoTocado(true)
          setTokenCompletar(completar)
        })
        // 404: el token no existe o ya se usó. Queda el formulario vacío.
        .catch(() => {})
    }
  }, [])

  function set(k, val) {
    setV((prev) => ({ ...prev, [k]: val }))
    if (errores[k]) setErrores((prev) => ({ ...prev, [k]: undefined }))
  }

  function elegirPais(pais) {
    setV((prev) => ({ ...prev, pais, prefijo: prefijoTocado ? prev.prefijo : prefijoDe(pais) }))
  }

  async function enviar(e) {
    e.preventDefault()
    setAviso(null)

    const encontrados = validar(v)
    setErrores(encontrados)
    if (Object.keys(encontrados).length) {
      // El tilde no tiene lugar para un error propio: se avisa abajo.
      setAviso(
        encontrados.correo || encontrados.telefono ? 'Revisa los campos marcados.' : encontrados.aceptaBases,
      )
      return
    }
    if (!turnstile.token) {
      setAviso('Estamos verificando el envío. Inténtalo de nuevo en unos segundos.')
      return
    }

    // Lo que quedó vacío se omite: la API no acepta "".
    const opcional = (s) => s.trim() || undefined
    const cuerpo = {
      correo: v.correo.trim(),
      aceptaBases: true,
      nombre: opcional(v.nombre),
      apellido: opcional(v.apellido),
      telefono: armarTelefono(v.prefijo, v.numero) ?? undefined,
      tipoInstitucion: v.tipoInstitucion || undefined,
      institucion: opcional(v.institucion),
      pais: v.pais || undefined,
      turnstileToken: turnstile.token,
      origen: origen ?? undefined,
      tokenCompletar: tokenCompletar ?? undefined,
    }

    setEnviando(true)
    try {
      setResultado(await pedir('/inscripcion', { metodo: 'POST', cuerpo }))
    } catch (err) {
      turnstile.reiniciar()
      if (err.estado === 400) {
        setAviso(err.detalles.length ? err.detalles.join(' · ') : 'Revisa los datos e inténtalo de nuevo.')
      } else if (err.estado === 403) {
        setAviso('No pudimos verificar el envío. Inténtalo de nuevo.')
      } else if (err.estado === 429) {
        setAviso('Demasiados intentos. Espera un minuto e inténtalo de nuevo.')
      } else {
        setAviso('Algo falló de nuestro lado. Inténtalo de nuevo en unos minutos.')
      }
    } finally {
      setEnviando(false)
    }
  }

  const tipo = TIPOS.find((t) => t[0] === v.tipoInstitucion)

  const bases = terminosUrl ? (
    <a href={terminosUrl} target="_blank" rel="noreferrer">
      las bases del concurso
    </a>
  ) : (
    'las bases del concurso'
  )

  return (
    <section className="signup" id="inscripcion" data-screen-label="Inscripción">
      <div className="page signup__in">
        <div>
          <SectionHeader
            onBrand
            eyebrow="Inscripción"
            title={
              <>
                Inscripción <em>2026-II</em>
              </>
            }
          />
          <p className="signup__apoyo">
            Deja tus datos y súmate al grupo oficial, donde compartimos las bases, el calendario y el
            acceso a la plataforma.
          </p>
          <ol className="steps">
            <li>
              <b>01</b>
              <span>Te inscribes. Sin costo.</span>
            </li>
            <li>
              <b>02</b>
              <span>Te sumas al grupo oficial y recibes las bases.</span>
            </li>
            <li>
              <b>03</b>
              <span>Subes tu propuesta desde la plataforma.</span>
            </li>
          </ol>
        </div>

        {resultado ? (
          <Gracias resultado={resultado} nombre={v.nombre.trim().split(' ')[0]} />
        ) : (
          <form className="fields" onSubmit={enviar} noValidate>
            <Field
              className="full"
              label="Correo de Google"
              htmlFor="correo"
              hint="Con este correo vas a entrar a la plataforma."
              error={errores.correo}
            >
              <Input
                onBrand
                id="correo"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={v.correo}
                readOnly={Boolean(tokenCompletar)}
                invalid={Boolean(errores.correo)}
                placeholder="tu@gmail.com"
                onChange={(e) => set('correo', e.target.value)}
              />
            </Field>

            <Field label="Nombre" htmlFor="nombre">
              <Input
                onBrand
                id="nombre"
                autoComplete="given-name"
                maxLength={120}
                value={v.nombre}
                placeholder="Juan Carlos"
                onChange={(e) => set('nombre', e.target.value)}
              />
            </Field>

            <Field label="Apellido" htmlFor="apellido">
              <Input
                onBrand
                id="apellido"
                autoComplete="family-name"
                maxLength={120}
                value={v.apellido}
                placeholder="Pérez García"
                onChange={(e) => set('apellido', e.target.value)}
              />
            </Field>

            <Field label="Actualmente" htmlFor="tipo">
              <Select
                onBrand
                id="tipo"
                value={v.tipoInstitucion}
                onChange={(e) => set('tipoInstitucion', e.target.value)}
              >
                <option value="">Selecciona</option>
                {TIPOS.map((t) => (
                  <option key={t[0]} value={t[0]}>
                    {t[1]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Universidad o trabajo" htmlFor="institucion">
              <Input
                onBrand
                id="institucion"
                autoComplete="organization"
                maxLength={200}
                value={v.institucion}
                placeholder={tipo ? tipo[2] : 'Facultad, escuela o estudio'}
                onChange={(e) => set('institucion', e.target.value)}
              />
            </Field>

            <Field label="País" htmlFor="pais">
              <Select onBrand id="pais" value={v.pais} onChange={(e) => elegirPais(e.target.value)}>
                <option value="">Selecciona</option>
                {PAISES.map((p) => (
                  <option key={p[0]} value={p[0]}>
                    {p[1]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Teléfono" htmlFor="telefono" error={errores.telefono}>
              <div className="telefono">
                <Select
                  onBrand
                  aria-label="Código de país"
                  value={v.prefijo}
                  onChange={(e) => {
                    setPrefijoTocado(true)
                    set('prefijo', e.target.value)
                  }}
                >
                  {PAISES.map((p) => (
                    <option key={p[0]} value={p[2]}>
                      {p[2] ? `${p[0]} ${p[2]}` : 'Otro'}
                    </option>
                  ))}
                </Select>
                <Input
                  onBrand
                  id="telefono"
                  type="tel"
                  autoComplete="tel-national"
                  value={v.numero}
                  invalid={Boolean(errores.telefono)}
                  placeholder={v.prefijo ? '11 2345 6789' : '+00 000 000 000'}
                  onChange={(e) => set('numero', e.target.value)}
                />
              </div>
            </Field>

            <div className="full">
              <Checkbox
                onBrand
                checked={v.aceptaBases}
                onChange={(e) => set('aceptaBases', e.target.checked)}
                label={
                  <>
                    Acepto {bases} y el tratamiento de mis datos para recibir información del Habisite
                    Challenge 2026-II.
                  </>
                }
              />
            </div>

            <div className="full" ref={refTurnstile} />

            <div className="full submit">
              <Button variant="ink" size="lg" type="submit" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Inscribirme'}
              </Button>
              <span className="signup__fine" role={aviso ? 'alert' : undefined}>
                {aviso ?? 'Sin costo'}
              </span>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}
