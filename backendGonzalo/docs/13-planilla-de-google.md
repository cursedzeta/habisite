# 13 · La planilla de Google

**Agregado el 19.10** (Tomás). Pedido de Jarod el 16.10: que las
inscripciones queden en «una base de datos, como un Excel» que el equipo pueda
mirar. Sol agregó lo que importa: que no se corte la conexión con el
participante, que fue la falla de la 1ª edición.

Eso último ya lo resuelve la plataforma: la base es Postgres y los correos
salen solos (doc 10). La planilla es **una ventana para el equipo**, no otra
base.

## Cómo funciona

- `src/planilla/` reescribe la pestaña **«Inscripciones»** entera cada
  `PLANILLA_INTERVALO_MINUTOS` (5). Si la pestaña no existe, la crea primera y
  con el encabezado fijo.
- **Es un espejo**: no duplica filas, se arregla sola si una vuelta falló, y lo
  que alguien escriba a mano en esa pestaña se pisa. Para anotar, otra pestaña
  (con `BUSCARV` por correo si hace falta).
- Una fila por **participante** (jurado y admin no van), del más viejo al más
  nuevo. Columnas: fecha, correo, nombre, apellido, teléfono, tipo,
  institución, país, completa, clic al grupo, recordatorio, origen, equipo,
  rol en el equipo y bloqueado. En la columna Q, la hora de la última copia.
- Los valores van **RAW**: un nombre que empiece con `=` queda como texto, no
  se ejecuta como fórmula.
- Si Google falla, va al log y nada más. **Una clave mal pegada no tumba la
  API**: por eso `GOOGLE_SHEETS_CREDENCIALES` no se valida en `entorno.ts`
  como el resto, sino en `PlanillaService`, que lo dice en el log al arrancar.

## Lo que hay del lado de Google

| Qué | Dónde |
|---|---|
| La planilla | Dueña: `challenge@habisite.com`, una cuenta de Google sin Gmail. Esa dirección es un reenvío de Cloudflare Email Routing a `growthimbar@gmail.com` |
| La cuenta de servicio | `planilla-inscripciones@habisite-challenge.iam.gserviceaccount.com`, en el mismo proyecto de Cloud que el login, con la Google Sheets API habilitada. Sin roles: solo tiene acceso porque la planilla está compartida con ella como **Editor** |
| La clave (JSON) | Variable `GOOGLE_SHEETS_CREDENCIALES` de `challenge-api` en Railway, y el respaldo en `respaldo-railway/`. Nunca en el repo |
| `PLANILLA_ID` | `1en3H6gm0YSk_wM5K7PeGYNbWcwOi4JEoO96hQUNCBeY` (no es secreto: sin compartirla no sirve) |

La planilla tiene datos personales: se comparte con personas puntuales, nunca
con «cualquiera con el enlace».

## Si deja de copiar

El log de `challenge-api` lo dice en cada vuelta. Un 403 o 404 casi siempre es
que la planilla dejó de estar compartida con la cuenta de servicio, o que el
ID no es el de la planilla.

## Cuando haya pago

Si la inscripción pasa a ser paga, el estado del pago es una columna más en
`armarFilas` y en la consulta de `PlanillaRepository`.
