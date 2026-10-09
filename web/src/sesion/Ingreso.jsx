import { useEffect, useState } from 'react'
import { Button, Field, Input } from '../ds'
import { pedir } from '../api'
import { PANEL_DEL_ROL, urlGoogle } from './sesion'

/* ==========================================================
   La pantalla de ingreso: Google o un enlace por correo.

   Sin contraseñas (decidido el 09.10, backendGonzalo/docs/12):
   quien no usa Gmail pide un enlace que le llega al correo con el
   que se inscribió, y con ese entra.
   ========================================================== */

const ERRORES_DE_GOOGLE = {
  cancelado: 'Cancelaste el ingreso con Google. Puedes intentarlo de nuevo.',
  'sin-acceso':
    'Esa cuenta no tiene acceso. Entra con el mismo correo con el que te inscribiste, o inscríbete primero en la página del concurso.',
}

export function Ingreso({ retorno, aviso = null, titulo = 'Entrar a la plataforma' }) {
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState('inicial') // inicial | enviando | enviado
  const [error, setError] = useState(null)

  async function pedirEnlace(e) {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError('Escribe un correo válido.')
      return
    }
    setEstado('enviando')
    try {
      await pedir('/auth/enlace', { metodo: 'POST', cuerpo: { correo: correo.trim(), retorno } })
      setEstado('enviado')
    } catch (err) {
      setEstado('inicial')
      setError(
        err.estado === 429
          ? 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.'
          : 'No pudimos enviar el enlace. Inténtalo de nuevo en unos minutos.',
      )
    }
  }

  return (
    <div className="pnl-acceso">
      <div className="pnl-acceso__card ing">
        <span className="hs-eyebrow hs-eyebrow--brand">Habisite Challenge 2026-II</span>
        <h1>{titulo}</h1>

        {aviso && (
          <p className="ing__aviso" role="alert">
            {aviso}
          </p>
        )}

        <Button href={urlGoogle(retorno)} variant="primary" size="lg" className="ing__boton">
          Entrar con Google
        </Button>

        <div className="ing__separador">
          <span>o con un enlace a tu correo</span>
        </div>

        {estado === 'enviado' ? (
          <p className="ing__listo" role="status">
            Si <b>{correo.trim()}</b> está inscrito, en unos minutos te llega un enlace para entrar.
            Vence en 15 minutos. Revisa también la carpeta de spam.
          </p>
        ) : (
          <form className="ing__form" onSubmit={pedirEnlace} noValidate>
            <Field label="Correo con el que te inscribiste" htmlFor="ing-correo" error={error}>
              <Input
                id="ing-correo"
                type="email"
                autoComplete="email"
                value={correo}
                invalid={Boolean(error)}
                placeholder="tu@correo.com"
                onChange={(e) => setCorreo(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="outline" size="lg" disabled={estado === 'enviando'}>
              {estado === 'enviando' ? 'Enviando…' : 'Enviarme el enlace'}
            </Button>
          </form>
        )}

        <p className="pnl-nota">
          ¿Todavía no te inscribiste? <a href="/#inscripcion">Inscríbete en la página del concurso</a>.
        </p>
      </div>
    </div>
  )
}

/* La ruta /ingresar. Tres casos:
   - ?enlace=…  viene del correo: canjea el enlace y entra.
   - ?error=…   vuelve de Google sin éxito: muestra por qué.
   - nada       si ya hay sesión, va directo a su panel. */
export default function PaginaIngreso() {
  const params = new URLSearchParams(window.location.search)
  const enlace = params.get('enlace')
  const errorGoogle = params.get('error')

  const [estado, setEstado] = useState(enlace || !errorGoogle ? 'verificando' : 'formulario')
  const [aviso, setAviso] = useState(errorGoogle ? (ERRORES_DE_GOOGLE[errorGoogle] ?? null) : null)

  useEffect(() => {
    if (enlace) {
      pedir('/auth/enlace/canjear', { metodo: 'POST', cuerpo: { token: enlace } })
        .then(({ retorno }) => entrar(retorno))
        .catch(() => {
          setAviso('Ese enlace venció o ya se usó. Pide uno nuevo abajo.')
          setEstado('formulario')
        })
      return
    }
    if (errorGoogle) return

    pedir('/yo')
      .then((yo) => entrar('/', yo))
      .catch(() => setEstado('formulario'))
  }, [enlace, errorGoogle])

  if (estado === 'verificando') {
    return (
      <div className="pnl-acceso">
        <div className="pnl-acceso__card">
          <p className="pnl-nota">{enlace ? 'Entrando…' : 'Un momento…'}</p>
        </div>
      </div>
    )
  }

  // Después de entrar desde acá, /ingresar vuelve a mirar el rol y manda al panel que toca.
  return <Ingreso retorno="/ingresar" aviso={aviso} />
}

/* `retorno` '/' o '/ingresar' no dicen a qué panel ir: lo decide el rol. */
async function entrar(retorno, yo) {
  if (retorno && retorno !== '/' && retorno !== '/ingresar') {
    window.location.replace(retorno)
    return
  }
  const quien = yo ?? (await pedir('/yo').catch(() => null))
  window.location.replace(quien ? (PANEL_DEL_ROL[quien.rol] ?? '/') : '/ingresar')
}
