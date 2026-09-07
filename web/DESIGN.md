# Sistema de diseño — Habisite

Identidad extraída del sitio en WordPress y verificada contra los píxeles del
logotipo original. Todo vive en código: los tokens en `src/index.css` (bloque
`@theme`) y las primitivas en `src/ui/`.

**Regla del proyecto:** ningún componente escribe un valor suelto. Si hace falta
un número nuevo, primero se le pone nombre en `@theme`.

---

## Color

| Token | Valor | Papel |
|---|---|---|
| `--color-ink` | `#0a0b0d` | Texto y trazos. Fondo del pie. **Nunca como relleno de tarjetas.** |
| `--color-primary` | `#e43301` | El naranja de la marca: el "Site" del logotipo. Acción y superficie de marca. |
| `--color-cream` | `#fffae6` | El detalle cálido sobre el fondo blanco. |
| `--color-cream-borde` | `#efe7cb` | Crema apagado para bordes: el crema puro contra blanco no se ve. |

El fondo de página es blanco puro. El crema es acento, no papel.

**Degradé del hero** (`--color-hero-1` a `-4`): claro a la izquierda, oscuro a la
derecha, a 100°. Los cuatro valores están estimados desde un screenshot de Figma
y siguen pendientes de confirmación.

### Contraste

El naranja tiene luminancia media: blanco y tinta dan ambos ≈4.4:1 sobre él.
Alcanza para texto grande, va justo para texto chico. Por eso, sobre naranja:

- Títulos grandes: el énfasis va en `text-ink`, replicando la inversión del logotipo.
- Texto de apoyo: blanco pleno, no gris ni blanco translúcido.
- Botones: **nunca naranja sobre naranja.** Se usa la variante `claro` o `contorno`.

---

## Tipografía

**Montserrat**, y solo tres pesos: Regular 400, Semibold 600, Bold 700.

La escala se nombra por rol, no por tamaño: el componente dice *qué es* el texto,
no cuántos píxeles mide.

| Token | Valor | Uso |
|---|---|---|
| `--text-rotulo` | 13px | Versalitas de etiqueta |
| `--text-micro` | 13px | Letra chica legal |
| `--text-menu` | 15px | Navegación, links del pie |
| `--text-cuerpo` | 17px | Párrafos |
| `--text-boton` | 18px | Botones |
| `--text-nombre` | 19px | Nombre del jurado |
| `--text-subtitulo` | 26px | Marca en el pie |
| `--text-marca` | `clamp(24px, 2.4vw, 32px)` | Wordmark de la barra |
| `--text-dato` | `clamp(30px, 3.1vw, 40px)` | Premio y fecha |
| `--text-titulo` | `clamp(30px, 3.5vw, 42px)` | Títulos de sección |
| `--text-titulo-placa` | `clamp(30px, 3.6vw, 44px)` | Título dentro de una placa |
| `--text-hero` | `clamp(48px, 6.6vw, 95px)` | Titular del hero |

Interlineado: `--leading-titulo` 1.2 · `--leading-cuerpo` 1.65 · `--leading-suelto` 1.7
Tracking: `--tracking-rotulo` 0.18em · `--tracking-titulo` -0.005em · `--tracking-apretado` -0.015em

---

## Forma y espacio

| Token | Valor | Uso |
|---|---|---|
| `--radius-placa` | 24px | Tarjetas y bloques |
| `--radius-control` | pill | Botones y campos |
| `--radius-sutil` | 4px | Casillas, placas de foto |
| `--spacing-seccion` | 7rem | Aire entre secciones |
| `--spacing-placa-y` / `-x` | 4.75 / 5.375rem | Relleno interno de la placa holgada |
| `--spacing-gutter` | 3rem | Margen lateral del contenido |

El contenedor mide 1080px como máximo. La utilidad `.contenedor` resuelve ancho
y gutter juntos: no se repite en cada pantalla.

**El motivo de la placa sale del logotipo**, que es un rectángulo redondeado.
Esa forma se repite a escala de página.

---

## Primitivas

Se importan desde `src/ui`, nunca desde el archivo suelto.

```jsx
import { Boton, Campo, Casilla, Placa, Rotulo, TituloSeccion } from '../ui'
```

### `<Boton>`

Renderiza `<a>` si recibe `href` y `<button>` si no: navegar y ejecutar no son
lo mismo.

- `variante`: `primario` (naranja) · `contorno` (borde, sobre el hero) · `claro` (blanco sobre naranja)
- `tamano`: `sm` · `md` · `lg`

### `<Campo>`

Etiqueta e input como una sola pieza — separarlos es como se pierden los
`htmlFor` y el formulario deja de ser accesible.

- `tono`: `marca` (sobre naranja) · `oscuro` (sobre la tinta del pie)

### `<Casilla>`

Checkbox propio. El nativo sobre naranja se ve gris y cada sistema operativo lo
dibuja distinto. El input real sigue existiendo oculto, así que conserva teclado,
`required` y envío.

### `<Placa>`

El contenedor redondeado de la marca.

- `variante`: `marca` (naranja) · `suave` (crema con borde)
- `holgada`: relleno grande para bloques protagonistas

### `<Rotulo>` y `<TituloSeccion>`

Ambos aceptan `as` para elegir el elemento correcto sin cambiar el aspecto.
`TituloSeccion` admite `destacado` para partir el color como hace el logotipo.

---

## Movimiento

| Token | Uso |
|---|---|
| `--animate-subir` | Entrada escalonada de las líneas del hero |
| `--animate-bajar` | Entrada de la barra |
| `--animate-aparecer` | Avisos que aparecen |
| `--animate-deriva` | Deriva lenta del degradé del hero (22s) |
| `--animate-latir` | Halo del botón principal |

Para revelar al hacer scroll está el hook `useReveal()`, que devuelve `ref`,
`clase` y `estilo`. Se desconecta al revelar: no quedan observadores vivos.

Todo respeta `prefers-reduced-motion`. Si el sistema pide menos movimiento, nada
se mueve y el contenido se ve completo.

---

## Estructura

```
src/
├─ index.css      tokens (@theme) + utilidades propias
├─ datos.js       contenido editable: fechas, premio, jurado, copy
├─ ui/            primitivas del sistema de diseño
├─ components/    secciones de página (Barra, Hero, Jurado, ...)
└─ hooks/
```

La separación entre `ui/` y `components/` importa: `ui/` es reutilizable en
cualquier pantalla del proyecto, `components/` es específico de esta página.
Las próximas dos páginas —panel de concursantes y panel de jurado— consumen
`ui/` y traen sus propias secciones.
