# 07 · La API para el front

Todo lo que hace falta para construir los paneles. **El contrato completo está
en `contrato/openapi.yaml`**, en la raíz del repo: de ahí salen los tipos.

```bash
npx openapi-typescript ../contrato/openapi.yaml -o src/api/tipos.ts
```

Y con la API corriendo hay documentación navegable en
**http://localhost:3000/docs**, con los esquemas de cada respuesta y un botón
para probar cada llamada.

Este documento es el mapa: qué endpoint sirve para qué pantalla y qué estados
hay que contemplar. **Cómo mostrarlo es decisión tuya.**

---

## Antes que nada: tres cosas que rompen si se pasan por alto

**1 · Todas las llamadas van con `credentials: 'include'`.** La sesión viaja en
una cookie `HttpOnly`; sin esa opción el navegador no la manda y todo responde
`401`.

```js
const r = await fetch(`${API}/yo`, { credentials: 'include' })
```

**2 · `GET /auth/google` es una navegación, no un `fetch`.** Tiene que ser un
enlace o un `window.location`: el navegador va a Google, vuelve a la API y de
ahí al front. Un `fetch` contra esa ruta no hace nada útil.

```jsx
<a href={`${API}/auth/google?retorno=/panel`}>Entrar con Google</a>
```

`retorno` es la ruta del front a la que volver. Solo acepta rutas internas
—las que empiezan con `/`— y cualquier otra cosa se descarta y vuelve a `/`.

**3 · Nadie entra sin estar inscripto.** Los perfiles no nacen del login: nacen
del formulario de inscripción o de una invitación. Una cuenta de Google que no
figure vuelve al front con `?error=sin-acceso`.

| Vuelve con | Qué pasó |
|---|---|
| `/ingresar?error=cancelado` | Canceló en la pantalla de Google |
| `/ingresar?error=sin-acceso` | Esa cuenta no está inscripta |
| La ruta de `retorno` | Entró bien |

El mensaje de «sin acceso» es genérico a propósito: decir *«ese correo no
figura»* filtraría quiénes están inscriptos.

## Todos los errores tienen la misma forma

```json
{
  "estado": 400,
  "mensaje": "Los datos enviados no son válidos",
  "detalles": ["El correo no tiene forma de correo"],
  "ruta": "/inscripcion",
  "hora": "2026-09-09T16:44:28.602Z"
}
```

`detalles` aparece solo cuando la validación rechaza campos, un renglón por
campo — sirve para mostrar los errores debajo de cada input. Los `500` siempre
dicen «Algo falló de nuestro lado»: el detalle queda en el log del servidor.

| Código | Qué mostrar |
|---|---|
| `401` | La sesión venció → mandar a la pantalla de ingreso |
| `403` | Su rol no puede hacer eso, o su cuenta está bloqueada |
| `409` | Choque de estado: ya está inscripto, ya tiene equipo… |
| `423` | **Las entregas están cerradas.** Es el que importa el día del cierre |
| `413` | El PDF se pasa del tope |

---

## La primera llamada de todas las pantallas

### `GET /yo`

De acá sale a qué panel entra y en qué estado está el concurso. **Evita tener
que pedir la configuración aparte.**

```json
{
  "id": "8f2c…",
  "correo": "ana@gmail.com",
  "nombre": "Ana",
  "apellido": "Duarte",
  "institucion": "FADU-UBA",
  "pais": "AR",
  "rol": "participante",
  "edicion": {
    "estado": "entregas",
    "cierreEntregas": "2026-10-15T23:59:59.000Z",
    "margenGraciaMinutos": 15,
    "entregasAbiertas": true,
    "maxBytes": 31457280,
    "maxIntegrantes": 5,
    "maxPaginas": null,
    "zonaHoraria": "America/Argentina/Buenos_Aires"
  }
}
```

**`entregasAbiertas` es lo único que hay que mirar** para decidir si se muestra
el botón de entregar. Ya tiene en cuenta el cierre, el margen de gracia y la
etapa del concurso, y **lo calcula el servidor**. No hay que comparar fechas en
el navegador: el reloj del usuario puede estar corrido y el cierre se aplica
igual del lado del servidor.

`maxIntegrantes` y `maxPaginas` pueden venir en `null`: significa «sin tope».

### El estado de la edición gobierna las pantallas

```
inscripcion → entregas → preseleccion → final → cerrada → publicada
```

| Estado | Concursante | Jurado |
|---|---|---|
| `inscripcion` | Arma equipo, invita | — |
| `entregas` | Sube y entrega | — |
| `preseleccion` | Solo lectura | **Vuelta 1**: elige de su tercio |
| `final` | Solo lectura | **Vuelta 2**: puntúa los finalistas |
| `cerrada` | Solo lectura | Ve los puntajes de los otros |
| `publicada` | Ve si ganó | Ve todo |

---

## Panel de concursantes

### El equipo

| Método | Ruta | Para qué |
|---|---|---|
| `GET` | `/mi-equipo` | El equipo, o **`null`** si todavía no tiene |
| `POST` | `/mi-equipo` | Lo arma. Se puede crear vacío |
| `POST` | `/mi-equipo/invitaciones` | Invita por correo *(solo el líder)* |
| `PUT` | `/mi-equipo/enlace` | Genera un enlace nuevo, invalida el anterior |
| `DELETE` | `/mi-equipo/enlace` | Apaga el enlace |
| `POST` | `/equipos/sumarme/{token}` | Se suma con el enlace compartido |
| `DELETE` | `/mi-equipo/miembros/yo` | Se da de baja |

**`GET /mi-equipo` devuelve `null`, no un 404**, cuando la persona todavía no
armó ni se sumó a ninguno. Es el estado inicial del panel.

```json
{
  "id": "3a1f…",
  "nombre": "Estudio Norte",
  "miembros": [
    { "perfilId": "8f2c…", "nombre": "Ana", "apellido": "Duarte",
      "correo": "ana@gmail.com", "institucion": "FADU-UBA",
      "estado": "aceptado", "esLider": true },
    { "perfilId": "b711…", "nombre": "", "apellido": "",
      "correo": "tomas@gmail.com", "institucion": null,
      "estado": "invitado", "esLider": false }
  ],
  "enlaceInvitacion": "https://challenge.habisite.com/equipo/sumarme/Xk3…",
  "invitacionActiva": true,
  "soyLider": true,
  "maxIntegrantes": 5
}
```

Tres cosas de esta respuesta:

- **`enlaceInvitacion` viene en `null` si quien pregunta no es el líder.** Es
  quien decide con quién compartirlo. `soyLider` está aparte para no tener que
  deducirlo.
- **Un miembro en `invitado` todavía no aceptó**: figura en la lista pero no
  cuenta como autor, y sus datos vienen vacíos porque los carga él al entrar.
  Si nunca acepta, el equipo compite igual.
- **Los dos caminos de invitación conviven.** La card de correos que ya armaste
  y el enlace para compartir. El enlace además **inscribe** a quien lo usa, así
  que sirve para gente que no pasó por el formulario.

Sobre la card: el correo tipeado **tiene que ser el de la cuenta de Google del
invitado**. Si no coincide, esa invitación queda muerta y nadie entiende por
qué — conviene avisarlo ahí mismo. El enlace no tiene ese problema.

`POST /mi-equipo/invitaciones` devuelve el enlace de cada invitación:

```json
[{ "correo": "tomas@gmail.com", "enlace": "https://…/invitacion/9fA…" }]
```

*(El envío del correo todavía no está: falta verificar el dominio remitente.)*

### La propuesta

| Método | Ruta | Para qué |
|---|---|---|
| `GET` | `/mi-propuesta` | La propuesta, o `null` si no tiene equipo |
| `PUT` | `/mi-propuesta` | Guarda título y memoria |
| `PUT` | `/mi-propuesta/archivo` | Sube o reemplaza el PDF |
| `GET` | `/mi-propuesta/archivo` | El PDF, para previsualizarlo |
| `POST` | `/mi-propuesta/entregar` | Confirma la entrega |

```json
{
  "id": "c4d2…",
  "titulo": "Refugio en la ladera",
  "memoria": "…",
  "estado": "borrador",
  "formaEntrega": null,
  "entregadaEn": null,
  "archivo": {
    "nombreOriginal": "propuesta-final.pdf",
    "bytes": 24117248,
    "paginas": 1,
    "subidoEn": "2026-10-14T18:22:10.000Z"
  },
  "editable": true
}
```

**`editable` reemplaza cualquier cuenta de fechas en el navegador.** Cuando es
`false`, se deshabilita todo. Y el servidor rechaza igual con `423` aunque el
botón siga habilitado: **el front esconde el botón *además*, no *en vez*.**

La subida es `multipart/form-data` con el campo `archivo`:

```js
const cuerpo = new FormData()
cuerpo.append('archivo', archivo)
await fetch(`${API}/mi-propuesta/archivo`, {
  method: 'PUT', body: cuerpo, credentials: 'include',
})
```

Conviene comprobar el tamaño contra `edicion.maxBytes` **antes** de subir, para
no hacerle esperar 30 MB a alguien que va a recibir un `413`. Eso es comodidad,
no seguridad: el servidor lo valida igual, además del tipo real del archivo, si
tiene contraseña y la cantidad de páginas.

**Hay dos caminos a `entregada`.** Uno es el botón; el otro es automático: al
vencer el plazo, **todo borrador que tenga archivo pasa a entregado igual**.
`formaEntrega` dice por cuál entró (`confirmada` o `automatica`). Vale la pena
decírselo al concursante: que sepa que si sube y no confirma, compite lo mismo.

### El resultado

```
GET /mi-resultado
```

```json
{ "publicado": false, "gano": false, "posicion": null }
```

**Es lo único que el concursante sabe del final.** No hay puntaje, ni nota, ni
posición fuera del podio, ni devolución: *«no deben ver puntaje ni nota o tipo
de valor»*. Mientras `publicado` sea `false`, no hay nada que mostrar.

Si entró al podio, `gano: true` y `posicion` es 1, 2 o 3.

---

## Panel de jurado

> **Ojo antes de construir esta pantalla:** si el jurado ve o no quién es el
> autor **se reabrió y lo tiene que decidir Sol**. Hoy la API manda los autores;
> si se decide evaluar a ciegas, `equipo` y `autores` van a venir en `null` y la
> pantalla no se cae —pero el diseño cambia bastante—. Conviene esperar esa
> respuesta antes de invertir mucho acá.

| Método | Ruta | Para qué |
|---|---|---|
| `GET` | `/criterios` | Los criterios con sus pesos |
| `GET` | `/jurado/propuestas` | Las que le tocan |
| `GET` | `/jurado/avance` | Cuántas le faltan |
| `GET` | `/jurado/propuestas/{id}/archivo` | El PDF |
| `PUT` | `/jurado/propuestas/{id}/preseleccion` | **Vuelta 1**: pasa o no pasa |
| `GET` `PUT` | `/jurado/propuestas/{id}/puntajes` | **Vuelta 2**: las notas |
| `GET` `PUT` | `/jurado/propuestas/{id}/devolucion` | La nota interna |

### La pantalla de puntuación se genera desde `GET /criterios`

```json
[
  { "id": "…", "codigo": "creatividad", "nombre": "Creatividad y originalidad",
    "peso": 0.35, "orden": 1 },
  { "id": "…", "codigo": "narrativa",   "nombre": "Narrativa arquitectónica y experiencia",
    "peso": 0.2,  "orden": 2 }
]
```

**No hay que programar contra siete criterios fijos.** Los criterios y sus pesos
**no están confirmados** —el equipo todavía no habló con la gente del jurado— y
van a cambiar. Tantos campos como criterios devuelva la API.

### El listado

```json
[{
  "id": "c4d2…",
  "titulo": "Refugio en la ladera",
  "tieneArchivo": true,
  "finalista": false,
  "preseleccionada": null,
  "criteriosPuntuados": 3,
  "criteriosTotales": 7,
  "equipo": "Estudio Norte",
  "autores": ["Ana Duarte", "Tomás Zenga"]
}]
```

`criteriosPuntuados` sobre `criteriosTotales` arma el «3 de 7» de cada fila, sin
tener que pedir los puntajes de todas.

**El listado cambia según la vuelta**, y la API se encarga: en `preseleccion`
son las de su tercio, en `final` son todos los finalistas. Del lado del front
alcanza con mirar `edicion.estado` para saber si mostrar los botones de
«pasa / no pasa» o la grilla de puntuación.

### Los puntajes

Se pueden mandar parciales: el jurado deja a medias y sigue otro día.

```js
await fetch(`${API}/jurado/propuestas/${id}/puntajes`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    puntajes: [{ criterioId: '…', valor: 9 }],
  }),
})
```

**Hasta que la evaluación cierra, `GET .../puntajes` devuelve solo los de quien
pregunta.** No es una restricción de la pantalla: si el segundo jurado ve el 9
que puso el primero, tiende a acercarse a ese número.

La escala es 1 a 10 entera, pero **tampoco está confirmada** con el jurado.

### El visor de PDF

```
GET /jurado/propuestas/{id}/archivo
GET /mi-propuesta/archivo
```

Los dos soportan **`Range`**, así que PDF.js carga de a pedazos: abre en cuanto
tiene el índice en vez de bajar los 30 MB antes de dibujar la primera página. Es
lo que hace que el jurado pueda leer en la plataforma en lugar de descargarse
todo, que es el motivo por el que la plataforma existe.

Alcanza con pasarle la URL a PDF.js con `withCredentials`. Lo que **no** hay que
hacer es traer el archivo entero a memoria con un `fetch` y pasarlo como blob:
ahí se pierde la carga progresiva.

Se sirven con `Content-Disposition: inline` y `Cache-Control: private, no-store`
— es material sin publicar y no tiene que quedar en ninguna caché.

---

## Panel de administración

| Método | Ruta | Para qué |
|---|---|---|
| `PUT` | `/admin/edicion` | Fechas y topes |
| `PUT` | `/admin/edicion/estado` | Mueve el concurso de etapa |
| `POST` | `/admin/reparto` | Reparte las propuestas entre los jurados |
| `POST` | `/admin/resultados/calcular` | Calcula el ranking |
| `POST` | `/admin/resultados/publicar` | Publica el podio |
| `GET` | `/admin/resultados` | El ranking completo, con puntajes |

Dos acciones tienen consecuencias que conviene advertir en pantalla antes de
confirmarlas:

**Pasar a `preseleccion` cierra las entregas de verdad.** Los borradores con
archivo pasan a entregados y ya nadie puede tocar nada.

**Publicar no tiene vuelta atrás cómoda.** Se bloquea con `409` si hay
evaluaciones sin terminar; ahí el admin decide si completa o manda
`{ "forzar": true }`.

`GET /admin/resultados` es **interno**: es lo que va al acta. Ese endpoint sí
trae puntajes y nombres, y nunca tiene que llegar a una pantalla de concursante.

---

## Lo que todavía puede cambiar

Ninguna de estas rompe el contrato, pero conviene saberlas antes de diseñar.

| Sin definir | Qué cambiaría |
|---|---|
| **Si el jurado ve al autor** | `equipo` y `autores` pasarían a `null`. Cambia toda la pantalla del jurado |
| **La escala de puntuación** | Hoy 1–10 entera. Si lleva decimales, cambian los inputs |
| **Cuántas preselecciona cada jurado** | Hoy sin tope. Con cupo, hay que mostrar «te quedan N» |
| **Los siete criterios y sus pesos** | Por eso la pantalla se genera desde `GET /criterios` |
| **El tope de integrantes** | Hoy 5, en `edicion.maxIntegrantes`. Puede venir `null` |

La lista completa está en `docs/dudas-para-sol.md`, fuera del repo.

---

## Levantar la API en local

```bash
cd backendGonzalo
npm install
npm run start:dev     # http://localhost:3000
```

Con `FRONTEND_URL=http://localhost:5173` en el `.env`, que es el puerto fijo del
front. **CORS habilita ese único origen**, así que si el front corre en otro
puerto hay que cambiarlo ahí.

Para regenerar el contrato después de tocar un endpoint:

```bash
npm run build && npm run contrato
```
