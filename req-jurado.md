# Requerimientos — Panel de jurado

Habisite Design Challenge 2026. Definido con Tomás el 8 de septiembre de 2026.

**Este panel está a medio definir a propósito.** Varias decisiones dependen de
conversaciones que el equipo todavía no tuvo con la gente del jurado. Lo que
está confirmado abajo es firme; lo que está en "sin definir" **no debe
implementarse todavía**, ni siquiera "por las dudas".

---

## 1. Confirmado

1. Se entra con **Google**, con rol `jurado`. **Se invita uno por uno**, no hay
   registro abierto.
2. Deja **devolución escrita** sobre cada propuesta, con un **interruptor** que
   define si el concursante la ve o no.
3. Carga **un puntaje por criterio, por jurado, por propuesta**. Clave única
   sobre los tres: nadie puntúa dos veces lo mismo.
4. Puede **corregir sus propios** puntajes.
5. **No ve los puntajes de los otros jurados hasta el cierre.** No es capricho
   técnico: si el segundo jurado ve el 9 que puso el primero, tiende a acercarse
   a ese número.
6. **No puede modificar propuestas.** Solo lee y evalúa.

---

## 2. Una cosa que quedó resuelta sin querer

Los puntos 3, 4 y 5 de arriba están confirmados, y los tres dan por sentado que
**los puntajes existen**. Al mismo tiempo, `req-concursantes.md` establece que
el concursante **nunca ve un puntaje**.

Las dos cosas juntas cierran la pregunta que estaba abierta en ese archivo:

> **El jurado sí puntúa, pero el puntaje es interno.** Sirve para ordenar y
> sacar el podio; nunca se le muestra al concursante, que solo recibe la
> devolución escrita.

O sea: **se conservan las tablas `scores` y `criteria`.** Lo que no existe es
una pantalla donde el concursante vea números.

---

## 3. Sin definir — no implementar

### 3.1 ¿Cada jurado ve todas las propuestas?

Estaba anotado que sí. **Se dio de baja**: el equipo está haciendo cambios y
todavía no está decidido.

Importa mucho más de lo que parece. Si cada jurado ve **solo un subconjunto**,
aparecen cosas que hoy no existen en el modelo:

- Una tabla de **asignación** (qué jurado evalúa qué propuestas)
- Una pantalla de **admin para repartirlas**
- Una regla de **cuántos jurados por propuesta**, y qué pasa si alguien no
  llega a evaluar las suyas
- El promedio final deja de ser "entre todos los jurados" y pasa a ser "entre
  los asignados"

**Hasta que esto se defina no conviene escribir la pantalla del listado**, es
justamente lo que cambia.

### 3.2 Los criterios de evaluación

`CLAUDE.md` §6.2 lista siete criterios con pesos (35/20/20/10/5/5/5), sacados de
las bases publicadas del sitio viejo. **No están confirmados**: el equipo todavía
no habló con la gente del jurado.

Consecuencia práctica: **los criterios y sus pesos van en base de datos, no
escritos en el código.** Ya estaban pensados como tabla `criteria`, y esa
decisión ahora es obligatoria — van a cambiar.

La pantalla de puntuación tiene que **generarse desde esa tabla**: tantos campos
como criterios haya, sin nada incrustado. Si se programa contra siete criterios
fijos, hay que rehacerla cuando el jurado defina los suyos.

### 3.3 ¿El jurado ve quién es el autor?

**Reabierto.** Estaba anotado como decidido a favor de mostrarlo (nombre,
universidad y nacionalidad), pero vuelve a estar en duda y hay que charlarlo
con el equipo.

Para tenerlo a mano cuando se discuta: la práctica habitual en concursos de
arquitectura es **evaluar a ciegas**, para que el prestigio de la facultad no
pese en la nota. La opción intermedia es anónimo durante la evaluación y
revelar la autoría al cerrar — el sistema igual guarda de quién es cada
propuesta, así que no se pierde nada.

Cambia cómo se construye la pantalla, así que conviene cerrarlo antes de
escribirla.

⚠️ **`CLAUDE.md` §7 lo lista entre las "decisiones tomadas — no volver a
discutirlas". Eso ya no es cierto y hay que corregirlo.**

---

## 4. Preguntas abiertas

Además de las tres de arriba, quedan sin definir:

1. **Con qué escala se puntúa.** ¿0 a 10? ¿0 a 100? ¿Con decimales? Define el
   tipo de columna, así que el back lo necesita antes de crear la tabla.
2. **Qué pasa si un jurado no puntúa una propuesta.** ¿Se promedia con los que
   sí lo hicieron, o queda bloqueada hasta que todos completen?
3. **Cómo se elige el podio.** El concursante se entera de si entró a los tres
   primeros, así que tiene que haber una regla: ¿el promedio ponderado más alto,
   o el jurado decide sobre esa base?
4. **Menciones especiales.** El sitio viejo las mencionaba; el modelo actual no
   las contempla.
5. **Si la devolución es una por jurado o una consolidada.** Hoy el modelo
   guarda una por jurado. ¿El concursante recibe las seis por separado, o
   alguien las unifica antes de publicar?

---

## 5. Lo que sí se puede ir haciendo

Aunque falte definir el listado y los criterios, hay partes que no dependen de
eso y no se van a tener que rehacer:

- El **acceso con Google** y el rol `jurado`.
- El **flujo de invitación** uno por uno.
- El **visor de PDF**, que es el mismo componente que usa el panel de
  concursantes.
- El **campo de devolución** con su interruptor de visibilidad.
- Las **acciones de admin**: cerrar evaluación y publicar resultados.
