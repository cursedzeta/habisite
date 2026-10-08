# 09 · El embudo de inscripción

**Implementado el 08.10.** Lo que el front tiene que hacer está en el
[doc 11](11-formulario-para-el-front.md); los correos, en el [doc 10](10-correos.md).

El concurso se publicita en varios lugares a la vez: LinkedIn, Instagram,
otras redes y más. **Todos los canales llevan al mismo formulario, el de la
landing**, y de ahí todo termina en el grupo de WhatsApp. El grupo es donde se
comparte el resto de la información y los enlaces a los paneles.

## Decidido · 06.10

- **Hay un único formulario: el de la landing.** No existe otro, ni en nuestra
  web ni en LinkedIn o Meta. Los canales solo llevan gente a ese formulario.
- **Ese formulario es la inscripción**, no un pre-registro aparte: deja a la
  persona en la lista blanca de `perfiles` para entrar con Google.
- **Todo el envío de correos se hace con Resend**: la confirmación, la
  alerta, el recordatorio y el seguimiento de clics.
- **La alerta le llega a quien completó el formulario**, no al equipo de
  Habisite. Es el correo que le avisa que su inscripción quedó incompleta y le
  manda el enlace al grupo.
- **Hay un solo recordatorio, a los 2 días, y no se manda nada más.** Si
  después de ese no entra, no se le insiste. **Solo lo reciben los
  incompletos** (camino B): al que completó todo ya se lo redirigió al grupo
  en el momento.
- **Los correos del equipo no van en el formulario.** El equipo se arma
  después, desde el panel, con la card y el enlace del doc 05.
- **El incompleto puede entrar al panel**, pero lo primero que ve es el pedido
  de completar los datos que faltan. No puede armar equipo ni subir nada hasta
  hacerlo.
- **La alerta trae un botón para completar la inscripción**, que abre el
  formulario de la landing con su correo ya cargado.
- **El tilde de las bases es obligatorio siempre**, aunque deje solo el
  correo: es lo que nos permite guardar sus datos y mandarle correos. Se
  guarda con fecha, versión e IP.
- **Quien completa todo ve la pantalla de gracias y pasa solo a WhatsApp**
  después de unos segundos, con un botón por si el navegador frena la
  redirección.
- **Los correos salen de `noreply@habisite.com`**, sin dirección de
  respuesta (cambiado el 08.10). `habisite.com` ya estaba verificado en Resend
  (región São Paulo) y nada más manda desde ahí, así que no hace falta el
  subdominio. Las consultas van al grupo de WhatsApp; lo que llegue a
  `noreply@` lo descarta una regla de Cloudflare Email Routing. Se agregó
  `_dmarc` con `p=none`.
- **El formulario lleva Cloudflare Turnstile**, más un límite de pedidos por
  IP en la API. Widget «Habisite Challenge · inscripción», modo gestionado,
  hosts `challenge.habisite.com` y `localhost`. La clave de sitio es pública y
  va en el front: `0x4AAAAAAFRVKhCUdvWNByhd`. La secreta vive solo en el
  `.env` y en Railway.
- **Las plantillas se hacen de cero**, con la identidad de Habisite:
  confirmación, alerta y recordatorio.
- **El grupo de WhatsApp todavía no está definido.** El enlace vive en una
  variable de entorno, así se cambia sin tocar código.

## El formulario

| Campo | Obligatorio | Notas |
|---|---|---|
| Correo | **Sí** | El de Google: con ese entra a la plataforma |
| Acepto las bases | **Sí** | Se guarda con fecha, versión e IP |
| Nombre | No | |
| Apellido | No | |
| Teléfono | No | Selector de país + número, guardado en formato internacional (`+5491…`) |
| Tipo | No | Universidad · trabajo · independiente. Lo pidió Sol |
| Universidad o trabajo | No | |
| País | No | |
| Turnstile | — | Invisible para la persona |
| `origen` | — | Lo lee el front de la URL, no se pregunta |

**Está completo** cuando tiene nombre, apellido, tipo, institución y país. El
teléfono no cuenta para eso.

---

## 1 · El embudo completo

```mermaid
flowchart TB
    subgraph origen["① DE DÓNDE VIENE"]
        direction LR
        li["LinkedIn"]
        ig["Instagram"]
        rs["Otras redes"]
        ot["Universidades,<br/>prensa, boca a boca"]
    end

    form["② EL ÚNICO FORMULARIO<br/>landing · challenge.habisite.com/#inscripcion"]

    li -->|"?origen=linkedin"| form
    ig -->|"?origen=instagram"| form
    rs -->|"?origen=…"| form
    ot -->|"sin origen → 'directo'"| form

    api["③ API · POST /inscripcion<br/>guarda el perfil + su origen"]
    form --> api

    api --> q{"④ ¿Qué datos dejó?"}
    api --> rsd["Resend<br/>todos los correos"]

    q -->|"Todo completo"| A["Camino A"]
    q -->|"Solo correo<br/>(± teléfono)"| B["Camino B"]
    q -->|"Ya estaba inscripto"| D["Camino D"]

    wa(["🟢 GRUPO DE WHATSAPP"])

    A --> wa
    B --> wa
    D --> wa
```

### El origen viaja en la URL

Cada publicación lleva su propio enlace a la landing, por ejemplo
`challenge.habisite.com/?origen=linkedin`. El front lee el parámetro y lo manda
junto con el formulario. Así se sabe qué canal trae más gente sin que nadie
tenga que preguntarle a la persona.

---

## 2 · Las bifurcaciones

```mermaid
flowchart TB
    api["POST /inscripcion"] --> q{"¿Qué dejó?"}

    %% ── Camino A ─────────────────────────────
    q -->|"Todo completo"| a1["Pantalla de gracias<br/>con el botón al grupo"]
    a1 --> a2["Redirección automática<br/>al enlace de WhatsApp"]
    a1 --> a3["Resend · correo de confirmación<br/>con el enlace al grupo<br/>(por si cerró la pestaña)"]

    %% ── Camino B ─────────────────────────────
    q -->|"Solo correo<br/>(± teléfono)"| b1["Pantalla de gracias<br/>con el botón al grupo"]
    q -->|"Solo correo<br/>(± teléfono)"| b2["Resend · ALERTA a la persona<br/>'Tu inscripción quedó incompleta,<br/>sumate al grupo oficial'"]
    b2 --> b3{"¿Hizo clic<br/>en 2 días?"}
    b3 -->|"sí"| b4["El recordatorio<br/>ya no sale"]
    b3 -->|"no"| b5["Resend · UN recordatorio<br/>y no se manda nada más"]

    %% ── Camino D ─────────────────────────────
    q -->|"Correo ya inscripto"| d0{"¿Su inscripción<br/>estaba incompleta?"}
    d0 -->|"sí"| d1["Se completa con<br/>los datos nuevos → Camino A"]
    d0 -->|"no"| d2["Misma pantalla de gracias<br/>sin decirle que ya existía"]

    wa(["🟢 GRUPO DE WHATSAPP"])
    a2 --> wa
    b1 --> wa
    b4 --> wa
    b5 --> wa
    d2 --> wa
```

### Qué es cada camino

| Camino | Qué dejó | Qué pasa | Por qué |
|---|---|---|---|
| **A** | Todo | Va directo al grupo, y además le llega un correo con el enlace | El correo cubre al que cerró la pestaña antes de entrar al grupo |
| **B** | Solo correo, o correo y teléfono | Le llega **la alerta** con el enlace al grupo. Si en 2 días no hizo clic, **un** recordatorio y nada más | Se guarda igual: perder a alguien porque no quiso escribir su universidad es peor que tenerlo incompleto |
| **D** | Ya estaba inscripto | Si estaba incompleto, se completa. Si no, le mostramos lo mismo que a cualquiera | Decir «ya estás inscripto» deja averiguar quién se anotó. El nuevo origen se guarda igual |

**El correo es obligatorio.** Sin correo no hay alerta, no hay recordatorio y
no hay forma de entrar a la plataforma, porque la lista blanca se resuelve por
correo. Por eso no existe un camino «solo teléfono».

---

## 3 · La línea de tiempo de una persona del camino B

```mermaid
sequenceDiagram
    autonumber
    actor P as Persona
    participant F as Formulario de la landing
    participant API as API
    participant R as Resend
    participant W as Grupo de WhatsApp

    P->>F: Llega desde LinkedIn<br/>deja solo su correo
    F->>API: POST /inscripcion { correo, origen: "linkedin" }
    API->>API: Guarda el perfil · marca "incompleto"
    API->>R: Envía la alerta (ya)
    Note over API: Guarda recordatorio_para = ahora + 2 días
    API-->>F: OK → pantalla de gracias + botón
    R->>P: ALERTA · «Tu inscripción quedó incompleta: sumate al grupo»

    alt Hace clic antes de los 2 días
        P->>API: /r/{token}
        Note over API: Marca el clic · el recordatorio ya no sale
        API->>W: Redirige al grupo
    else No hace clic
        Note over API: La tarea de cada 30 min lo encuentra vencido<br/>y marca recordatorio_enviado_en
        API->>R: Envía el recordatorio
        R->>P: RECORDATORIO · el único
        Note over P,R: Fin. No se le manda nada más.
    end
```

### El recordatorio lo maneja la API · cambiado el 08.10

La idea original era programarlo en Resend (`scheduledAt`) y cancelarlo si la
persona hacía clic. **Se probó el 08.10 y no se puede:** la clave de Resend es
de *Sending access* y cancelar devuelve `401 restricted_api_key`. Una clave
*Full access* lo resolvería, pero si se filtra da el control de toda la
cuenta. Se descartó.

En su lugar:

1. Cuando entra la inscripción incompleta, se manda la alerta y se guarda
   `recordatorio_para = ahora + 2 días`.
2. El clic en `/r/{token}` guarda `clic_en`.
3. **Una tarea de la API corre cada 30 minutos** (configurable con
   `TAREA_INTERVALO_MINUTOS`) y busca los vencidos que no
   hicieron clic ni completaron la inscripción.
4. Antes de mandar, **marca el envío en la misma consulta**:

   ```sql
   update perfiles
      set recordatorio_enviado_en = now()
    where id = $1 and recordatorio_enviado_en is null
   returning id;
   ```

   Si la fila ya estaba marcada no devuelve nada y no se manda. **No puede
   salir más de un recordatorio**, ni con dos tareas corriendo a la vez.

Si la API estuvo caída, al volver manda los atrasados.

**Por qué cada 30 y no cada 15 (08.10):** el recordatorio puede salir hasta
media hora tarde, que nadie nota. El cierre de entregas sigue siendo exacto,
porque lo que bloquea las ediciones es el `CierreGuard` en cada pedido, no la
tarea; ella solo pasa los borradores a `entregada` y manda el C9, y guarda como
fecha la del cierre, no la hora en que corrió. **Requisito en Railway:** la API
tiene que estar siempre prendida, así que *App Sleeping* debe quedar apagado. Esta misma tarea es la
que hace falta para pasar los borradores a entregados al cierre (doc 04), que
hoy no existe: la usan las dos cosas.

### Por qué el enlace pasa primero por nuestra API

El enlace de los correos es `/r/{token}`: pasa por la API y recién de ahí va a
WhatsApp.

1. **Es lo que frena el recordatorio.** WhatsApp no avisa quién entró al
   grupo, así que el clic es la única señal que tenemos.
2. **Podemos cambiar el grupo sin reenviar nada.** Si el grupo se llena (el
   tope es 1024 personas) o hay que regenerar el enlace, se cambia una
   variable y todos los correos ya enviados siguen funcionando.

> Resend también puede rastrear clics por su cuenta y avisarnos por webhook.
> Lo descartamos para esto: reescribe los enlaces con su dominio y el aviso
> llega de forma asincrónica. El redirect propio es más simple y no depende de
> que el webhook llegue.

---

## 4 · Qué cambia en lo que ya existe

El formulario de la landing pasa a llamar a `POST /inscripcion`, que ya existe
pero hoy pide todos los campos y no manda ningún correo.

| Hoy | Con el embudo |
|---|---|
| Todos los campos son obligatorios | Solo el **correo** es obligatorio |
| No hay teléfono | Columna `telefono` en `perfiles` |
| No se sabe de dónde vino | Columna `origen` en `perfiles` |
| No se sabe si está completo | Se calcula: le falta nombre, apellido, tipo, institución o país |
| Correo repetido → `409` | Correo repetido → completa lo que faltaba, o responde igual que siempre |
| No manda nada | Confirmación o alerta por Resend; el recordatorio lo manda la tarea periódica |
| — | Columnas `recordatorio_para`, `recordatorio_enviado_en`, `clic_en` y el token de `/r/{token}` |
| — | `GET /r/{token}`: guarda el clic y redirige al grupo |
| — | Tarea cada 30 minutos (un `setInterval` adentro de la API, sin dependencias): recordatorios vencidos, cierre de entregas y reintento de correos. `POST /admin/tarea` la corre a mano |

| No hay aceptación de bases en la inscripción | Columnas `terminos_en`, `terminos_version`, `terminos_ip` también en `perfiles` |
| La versión de las bases la manda el cliente | La pone el servidor, desde `edicion.terminos_version`. El enlace sale de `edicion.terminos_url` (doc 05) |
| — | Validación del token de Turnstile y límite de pedidos por IP |
| — | `GET /yo` avisa si el perfil está incompleto; el panel pide completarlo antes de seguir |

---

## 5 · Preguntas que quedan

1. **El grupo de WhatsApp**: ¿uno, una Comunidad, varios? No bloquea, porque
   el enlace va en una variable.
2. **El texto de las bases** y su versión. El tilde es obligatorio, así que
   hace falta un enlace a algo, aunque sea una versión preliminar.
3. ~~Verificar el dominio en Resend.~~ Resuelto el 08.10: se usa
   `habisite.com`, que ya estaba verificado.
