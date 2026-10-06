# Recorrido de la API

Un recorrido de humo que le pega a la API de verdad —con Postgres, los guards y
el cierre puestos— y comprueba los 35 endpoints de punta a punta: inscripción,
equipo, PDF, entrega, las dos vueltas de evaluación y la publicación.

**62 comprobaciones.** Tarda unos segundos.

```bash
npm run build            # el recorrido pega contra dist/
npm run pruebas:preparar # esquema limpio + migraciones + 7 perfiles
npm run pruebas:api      # levanta la API en el 3999 (dejar corriendo)
npm run pruebas:recorrido
```

## No toca la base de desarrollo

Todo vive en el esquema **`pruebas`** de la misma base. Se eligió así porque
crear una base aparte necesita el superusuario de Postgres, y un esquema no.
`preparar` lo borra y lo rehace entero en cada corrida, así que el recorrido
siempre arranca de cero y `public` —la base de desarrollo— queda intacta.

El `search_path` es `pruebas,public`: las tablas se crean en `pruebas`, que va
primero, pero las extensiones (`citext`, `pgcrypto`) se siguen encontrando en
`public`, que es donde están instaladas.

## El único atajo

`preparar` inserta los perfiles directo en la base y les firma la cookie de
sesión con el mismo `JWT_SECRET` que usa la API. Eso saltea el consentimiento
de Google —que es de Google, no nuestro— y **nada más**: el `SesionGuard` real
valida el token, el rol se lee de la base en cada request y el `RolGuard`
corta igual que en producción.

Las sesiones quedan en `.tmp-sesiones.json`, ignorado por git.

| Perfil | Rol |
|---|---|
| `ana`, `bruno`, `carla` | participante |
| `j1`, `j2`, `j3` | jurado |
| `admin` | admin |

## Qué cubre, y qué no

Cubre el camino feliz completo y las reglas que, si se rompen, se rompen en
silencio:

- **Un participante no ve un puntaje jamás** — se comprueba el texto entero de
  la respuesta de `/mi-resultado`, antes y después de publicar.
- **Un jurado no ve los puntajes de otro** antes del cierre.
- **El cierre se aplica en el servidor**: `423` aunque el botón esté habilitado.
- **La matriz de permisos** por rol sobre las rutas de admin y de jurado.
- Que el PDF se valide de verdad (bytes mágicos, no la extensión) y que
  soporte `Range`, que es lo que hace que PDF.js abra sin bajar los 30 MB.

**No es exhaustivo.** Es humo: comprueba que cada endpoint anda y que los
permisos cortan. Los casos de borde —qué pasa con 6 integrantes, con dos
líderes, con un token de invitación vencido— van en los `*.e2e-spec.ts`, que
corren sin servidor levantado.

## Una trampa ya encontrada

El recorrido comprueba que `GET /mi-equipo` y `GET /mi-propuesta` devuelvan el
literal `null` **con content-type JSON**, y no solo un `200`. Nest serializa un
`null` devuelto por el handler como **cuerpo vacío**, y ahí el `await r.json()`
del front tira `SyntaxError`. Es el estado inicial del panel, así que reventaba
en la primera pantalla. Por eso los dos handlers responden con `@Res`.
