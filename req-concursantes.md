# Requerimientos — Panel de concursantes

Habisite Design Challenge 2026. Definido con Tomás el 8 de septiembre de 2026.

Este archivo manda sobre lo que dice `CLAUDE.md` §6 en lo que respecta al panel
de concursantes: varios puntos de ahí quedaron **superados** por lo de acá.

---

## 1. Acceso y perfil

1. Se entra con **Google**. El login lo resuelve el backend.
2. El perfil se crea solo en el primer ingreso, con rol `participante`:
   nombre, apellido, correo, universidad y país.

## 2. La propuesta

3. **Una propuesta puede tener más de un concursante.** Ya no es una propuesta
   por persona: es una propuesta por equipo.
4. La propuesta tiene dos estados: **borrador** y **entregada**.
5. **Se sube un único archivo PDF.** Nada de láminas, memoria y renders por
   separado — un solo PDF y listo.
6. El panel tiene un **visor de PDF** con zoom in y zoom out, para poder mirar
   la propuesta en detalle sin descargarla.
7. Se puede editar **solo hasta el cierre**. El cierre se aplica **en el
   servidor**, no en el botón, con zona horaria explícita.

## 3. Equipo: invitar miembros

8. El panel tiene un botón **"Añadir miembro"**.
9. Al pulsarlo se abre una **card sobre el contenido**, con el fondo
   **desenfocado y oscurecido** detrás.
10. Dentro de la card se carga un **correo electrónico** por miembro.
11. Debajo hay un **botón `+`** para sumar otro miembro, si se quiere invitar a
    varios de una sola vez.
12. **Máximo 5 miembros.** *(Provisorio: el número puede cambiar, así que va
    como constante de configuración y no incrustado en el código.)*
13. La card tiene **Confirmar** y **Cancelar**.
14. Al confirmar, se envía un **correo a cada dirección** invitándola a
    participar del concurso de Habisite **para la propuesta de "Usuario"**
    (el nombre de quien invita).

### El correo de invitación

15. Lleva un **botón para confirmar** la participación.
16. Lleva un **enlace directo a los términos y condiciones** del concurso.
    *(Los términos todavía no existen: hay que redactarlos.)*

## 4. Resultados

17. **No hay puntaje.** El concursante nunca ve una nota ni un número.
18. Lo único que recibe es la **devolución** del jurado.
19. Si quedó entre **los tres mejores**, se le informa por el panel y por los
    medios oficiales del concurso (el grupo de WhatsApp).

## 5. Lo que NO puede hacer

20. Ver propuestas de otros concursantes.
21. Ver nada antes de que el administrador publique.
22. Editar después del cierre.

---

## Preguntas abiertas

Ninguna bloquea empezar el front, pero todas las necesita el backend antes de
crear tablas. Van en orden de cuánto arrastran.

### Bloquean el modelo de datos

1. ~~**Si el jurado sigue puntuando por dentro.**~~ **RESUELTO** — ver
   `req-jurado.md` §2. El jurado confirmó que sí puntúa por criterio, y que
   corrige y no ve los de los otros hasta el cierre. Con el concursante sin
   ver números, la conclusión es: **el puntaje existe pero es interno**. Se
   conservan las tablas `scores` y `criteria`; lo que no existe es una pantalla
   donde el concursante vea una nota.

2. **Los 5 miembros, ¿incluyen al creador o son además de él?** O sea: ¿el
   equipo es de 5 personas en total o de 6?

3. **¿Una persona puede estar en más de una propuesta?** Si no, hay que
   rechazar la invitación cuando ya pertenece a otro equipo.

### Bloquean el flujo de invitación

4. **¿El invitado necesita cuenta de Google?** Si el acceso es solo con Google
   y alguien invita un correo que no lo es, la invitación queda muerta. Conviene
   avisarlo en el momento de invitar, no después.

5. **¿Se puede quitar a un miembro?** ¿Y qué pasa si alguien rechaza o nunca
   confirma: queda pendiente para siempre o vence?

6. **¿Todos los miembros pueden subir y reemplazar el PDF, o solo quien creó la
   propuesta?** Si pueden todos, dos personas editando a la vez se pisan.

### Bloquean la carga

7. **Peso máximo del PDF.** Sin tope, alguien sube 400 MB el último día y tumba
   la carga de todos. Hay que validarlo en el navegador **y otra vez** en el
   servidor: la validación del navegador se saltea con una petición directa.

8. **¿Cuántas páginas puede tener el PDF?** Afecta al visor: no es lo mismo
   mostrar dos láminas que un documento de sesenta páginas.

---

## Qué queda superado de `CLAUDE.md`

| Decía | Ahora |
|---|---|
| Una propuesta **por participante** | Una propuesta **por equipo**, hasta 5 miembros |
| `submission_files`: láminas, memoria y renders con tipo, peso y orden | **Un solo PDF** |
| El participante ve su **puntaje** y su devolución al publicarse | **Sin puntaje.** Solo devolución, y el aviso si entró al podio |

Cuando se cierren las preguntas abiertas hay que actualizar `CLAUDE.md` §6 para
que deje de contradecir este archivo.
