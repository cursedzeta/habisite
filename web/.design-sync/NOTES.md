# Notas de design-sync — Habisite

Escritas antes de la primera corrida real, durante la exploración del repo.
Nada de esto se descubrió corriendo el conversor: son hechos del repo que la
corrida va a encontrar igual, anotados para que no cueste dos veces.

## Forma del repo

- **Shape `package`.** No hay Storybook ni archivos `*.stories.*`. Confirmado con
  `Glob` sobre `**/.storybook/main.*`, `**/storybook/main.*` y `**/*.stories.*`.
- **La raíz del paquete es `web/`**, no la raíz del repo. El repo también contiene
  `prototipo/` (HTML suelto, prototipos previos), `reference/` (tokens y assets
  extraídos del sitio WordPress viejo) y `plan/`. Nada de eso entra al sync.
- Gestor de paquetes: **npm** (`package-lock.json` presente) → `npm ci`.

## Alcance acordado con el usuario

Solo las **6 primitivas de `src/ui/`**: `Boton`, `Campo`, `Casilla`, `Placa`,
`Rotulo`, `TituloSeccion`. Pinneadas en `componentSrcMap`.

Las secciones de `src/components/` (`Barra`, `Hero`, `Jurado`, `Inscripcion`,
`Pie`) quedan **fuera a propósito**: están atadas al contenido de `src/datos.js`
y solo sirven para esta landing. No son vocabulario reutilizable.

## Gotchas que la corrida va a encontrar

- **`web/` es una aplicación Vite, no una librería publicada.** Su `package.json`
  no tiene `main`, `module` ni `exports`, y `npm run build` produce el bundle de
  la app (`dist/index.html` + chunks con hash), no un entry de librería. Esperar
  modo synth-entry desde `src/`. El barrel `src/ui/index.js` reexporta las seis
  primitivas y es el punto de entrada natural.

- **Los componentes son `.jsx`, no TypeScript.** No hay `.d.ts` en ninguna parte,
  así que los contratos `<Name>Props` van a salir flacos: las props se
  desestructuran con defaults y nada declara tipos. Mitigación parcial: cada
  primitiva tiene un bloque JSDoc arriba explicando qué es y qué variantes
  acepta, y de ahí sale la síntesis del `.prompt.md`. **Pasar `src/ui/` a `.tsx`
  mejoraría de verdad lo que ve el agente de diseño** — es la mejora de mayor
  impacto disponible.

- **`cssEntry` es el punto delicado.** Los tokens viven en el bloque `@theme` de
  `src/index.css`, pero ese archivo es **fuente de Tailwind v4**
  (`@import "tailwindcss"`), no CSS compilado. Apuntar `cssEntry` ahí va a
  disparar `[CSS_PLACEHOLDER]`. El CSS compilado real queda en
  `dist/assets/index-<hash>.css`, y **el hash cambia en cada build**, así que no
  se puede fijar en la config.

  Fix recomendado: compilar a una ruta estable antes del conversor, con
  `npx @tailwindcss/cli -i src/index.css -o dist/habisite.css`, y poner
  `"cssEntry": "dist/habisite.css"`. Conviene además agregarlo como script
  `build:css` en `package.json` y registrarlo como `buildCmd`.

- **Montserrat viene de Google Fonts por `<link>` en `index.html`**, no se
  empaqueta. Esperar `[FONT_MISSING]`. Como es una familia servida en runtime y
  no algo que el bundle deba enviar, lo correcto es
  `"runtimeFontPrefixes": ["Montserrat"]`. Si se prefiere que viaje con el
  sistema, hay que bajar los `.woff2` y usar `extraFonts`.

- **No hace falta `provider`.** Las seis primitivas son libres de contexto: no
  leen theme, router ni i18n. Lo único que necesitan para verse bien es el CSS.

## Material para escribir los previews (§4.2)

No hay `examples/` ni docs-site, pero **sí hay uso real**: las cinco secciones de
`src/components/` usan las seis primitivas con props y contenido de verdad.
Es la fuente de composición a mirar antes de inventar nada.

| Primitiva | Dónde se usa de verdad |
|---|---|
| `Boton` | `Barra` (variante `primario`), `Hero` (`contorno`), `Inscripcion` (`claro`), `Pie` (`primario`) — las tres variantes están ejercitadas |
| `Campo` | `Inscripcion` (tono `marca`, 4 campos), `Pie` (tono `oscuro`) |
| `Casilla` | `Inscripcion`, con el texto de términos |
| `Placa` | `Inscripcion` (variante `marca`, `holgada`) |
| `Rotulo` | `Inscripcion`; también lo usa `Campo` internamente como `<label>` |
| `TituloSeccion` | `Jurado` (centrado) |

Ojo con el contraste al componer: `Boton variante="primario"` sobre una
`Placa variante="marca"` es naranja sobre naranja y desaparece. Sobre placa de
marca va `claro` o `contorno`. Está documentado en `DESIGN.md`.

`DESIGN.md` en la raíz de `web/` ya documenta tokens, primitivas y reglas del
sistema — es buen insumo para el header de convenciones, pero **no es el header**:
ese se escribe aparte en `.design-sync/conventions.md`.

## Riesgos de re-sync

- **`cssEntry` es lo primero que se rompe.** Si alguien cambia el pipeline de CSS
  o borra el paso `build:css`, el sync sube tokens vacíos y todo renderiza sin
  estilo, sin que nada falle ruidosamente. Verificar que `dist/habisite.css`
  exista y tenga los `--color-*` antes de subir.
- **Los tokens se editan seguido.** El sistema es nuevo y la paleta del hero
  (`--color-hero-1` a `-4`) todavía tiene **valores estimados a ojo desde un
  screenshot de Figma**, pendientes de confirmar contra los hex reales. Cuando se
  corrijan, hay que re-sincronizar.
- **`componentSrcMap` está enumerado a mano.** Si se agrega una primitiva nueva a
  `src/ui/`, no entra sola: hay que sumarla al mapa.
- **El proyecto va a crecer.** Están planeadas dos páginas más (panel de
  concursantes y panel de jurado), que van a traer primitivas nuevas: tablas,
  insignias de estado, subida de archivos, campos de puntuación. Esas sí son
  vocabulario y deberían entrar al sync cuando existan.
