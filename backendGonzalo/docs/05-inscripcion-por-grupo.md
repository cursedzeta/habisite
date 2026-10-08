# 05 · Inscripción por grupo

Decidido en la reunión con Sol del 08.09. **Reemplaza la participación
individual** que se había modelado antes: la pregunta 01 del documento que se le
mandó quedó contestada.

## El flujo

Una sola persona anota a todo el equipo. Los demás reciben una invitación por
correo y entran por su cuenta.

```mermaid
sequenceDiagram
    autonumber
    actor G as Gonzalo (arma el grupo)
    participant P as Plataforma
    participant M as Correo
    actor T as Tomás (invitado)

    G->>P: Completa el formulario<br/>sus datos + correos de Tomás y Sol
    P->>P: Crea el equipo<br/>Gonzalo aceptado · el resto invitados
    P->>M: Envía una invitación por cada correo
    M->>T: "Gonzalo te sumó al equipo"
    T->>P: Abre el enlace y entra con Google
    T->>P: Acepta términos y condiciones
    P->>P: Registra quién aceptó, cuándo y desde qué IP
    Note over P: El equipo ya tiene dos integrantes.<br/>Cualquiera de los dos puede subir el PDF.
    T->>P: (opcional) Se da de baja
    P->>P: Lo saca del equipo · los demás siguen
```

## Estados de un integrante

```mermaid
stateDiagram-v2
    direction LR
    [*] --> invitado : alguien lo suma con su correo
    [*] --> aceptado : es quien armó el grupo
    invitado --> aceptado : abre el enlace, entra con Google<br/>y acepta los términos
    aceptado --> baja : se da de baja
    invitado --> [*] : nunca acepta · el grupo compite igual

    note right of aceptado
        Recién acá figura como autor
        y quedan guardados los términos
    end note
```

**Si alguien nunca acepta, el grupo compite igual.** Los que aceptaron siguen
adelante y el que no simplemente no figura como autor. Se decidió así para que
un integrante distraído no hunda al equipo el día del cierre.

## Modelo

```sql
create type estado_miembro as enum ('invitado','aceptado','baja');

create table equipos (
  id          uuid primary key default gen_random_uuid(),
  nombre      text,
  creado_por  uuid not null references perfiles(id),
  creado_en   timestamptz not null default now()
);

create table equipo_miembros (
  id           uuid primary key default gen_random_uuid(),
  equipo_id    uuid not null references equipos(id) on delete cascade,
  perfil_id   uuid not null references perfiles(id),
  estado       estado_miembro not null default 'invitado',
  es_lider     boolean not null default false,
  -- El enlace del correo. Hace que la invitación funcione aunque la cuenta
  -- de Google del invitado tenga un correo distinto al que se tipeó.
  token        text unique,
  invitado_en  timestamptz not null default now(),
  aceptado_en  timestamptz,
  baja_en      timestamptz,
  -- Lo que cubre legalmente a Habisite. Se guarda al aceptar.
  terminos_en      timestamptz,
  terminos_version text,
  terminos_ip      inet,
  unique (equipo_id, perfil_id)
);

-- Nadie compite en dos equipos a la vez.
create unique index un_equipo_por_persona
    on equipo_miembros (perfil_id)
 where estado = 'aceptado';
```

Y `propuestas` deja de colgar de la persona:

```sql
-- antes:  participante_id uuid not null unique references perfiles(id)
-- ahora:
alter table propuestas
  drop column participante_id,
  add  column equipo_id uuid not null unique references equipos(id);
```

La restricción `unique` se mantiene: **una propuesta por equipo**.

## Por qué el token y no el correo

El invitado puede tener una cuenta de Google con un correo distinto al que le
tipearon. Si la invitación se resolviera comparando correos, esa persona no
podría entrar nunca y nadie entendería por qué.

Con el token, el enlace del correo identifica la invitación por sí solo: quien
lo abre y se autentica con Google queda vinculado a esa fila, sin importar con
qué cuenta entró.

> **Esto hoy no funciona así (revisado el 08.10).** El login rechaza con `403`
> toda cuenta que no esté en la lista blanca, así que el que entra con otra
> cuenta queda frenado **antes** de llegar a aceptar. Para que el token cumpla
> lo que promete hace falta el ajuste del login descripto en
> [Aceptar una invitación por correo](#aceptar-una-invitación-por-correo--definido-0810).

## Términos y condiciones

Se guardan **por persona, no por equipo** — cada integrante acepta los suyos.
Quedan registrados el momento, la versión del texto y la IP. Sin la versión, el
día que cambien las bases no hay forma de saber qué aceptó cada uno.

El líder acepta los términos al completar el formulario inicial; los invitados,
al abrir el enlace.

**La versión la pone el servidor, no el cliente** (definido el 08.10). Hoy
`terminosVersion` viaja en el body, así que cualquiera puede mandar el valor
que quiera. Pasa a leerse de la edición:

```sql
alter table edicion
  add column terminos_version text,
  add column terminos_url     text;
```

Cuando cambian las bases se actualiza esa fila, sin tocar código. Aplica a
`POST /inscripcion`, `POST /equipos/sumarme/{token}` y
`POST /invitacion/{token}/aceptar`. El texto de las bases tiene que estar
publicado en algún lado (una página `/bases` o un PDF); eso queda fuera del
backend.

## El formulario, con la menor fricción posible

> **Superado el 08.10 por el [doc 09](09-embudo-de-inscripcion.md).** El
> formulario de la landing **no lleva los correos del equipo**: el equipo se
> arma después, desde el panel. Lo de abajo queda como registro.

El motivo número uno por el que alguien abandona una inscripción es no tener a
mano los datos de los demás. Por eso, dos decisiones:

**Del invitado solo se pide el correo.** Sus datos los carga él cuando acepta.
El líder tipea tres correos, no tres fichas completas.

**El equipo se puede crear vacío.** Uno se inscribe solo y suma gente después.

```
TUS DATOS
  Nombre y apellido
  Correo de Google   ← con este vas a entrar a la plataforma
  Universidad o trabajo
  País

TU EQUIPO
  Correos de tus compañeros    [ + agregar otro ]
  ← podés dejarlo vacío y sumarlos más adelante

  ☐ Acepto las bases
                                        [ Inscribirme ]
```

## Sumar integrantes: dos caminos

Decidido el 08.09: **conviven los dos**, porque resuelven situaciones distintas
y Tomás ya construyó el primero.

### Por correo, desde una card

Botón *Añadir miembro*, se abre una card sobre el contenido con el fondo
desenfocado, se cargan correos con un botón `+` para sumar varios de una vez, y
*Confirmar* dispara un correo a cada dirección. Sirve para invitar a alguien
puntual. Está definido en `req-concursantes.md` §3.

Su punto débil era que **el correo tipeado tenía que ser el de la cuenta de
Google del invitado**. Con el ajuste del login del 08.10 deja de serlo: el
token del correo alcanza, entre con la cuenta que entre. El correo que llega
es el C4 del [doc 10](10-correos.md).

### Con un enlace del equipo

El equipo tiene un enlace que el líder pega en el WhatsApp del grupo. Quien lo abre entra con Google, completa sus datos,
acepta las bases y queda adentro — **y ese mismo enlace lo inscribe**, así que no
hace falta que estuviera habilitado de antes.

Resuelve dos cosas de una: el alta en la plataforma y el ingreso al equipo. Y
saca del medio el problema del correo que no coincide, porque quien lo abre se
autentica con la cuenta que quiera.

```mermaid
stateDiagram-v2
    direction LR
    [*] --> generado : el líder pide el enlace
    generado --> usado : alguien lo abre y acepta
    usado --> generado : sigue sirviendo para el próximo
    generado --> vencido : cierra la inscripción
    vencido --> [*]
```

El enlace lleva un token largo y aleatorio, distinto del token de las
invitaciones individuales por correo:

```sql
alter table equipos
  add column token_invitacion text unique,
  add column invitacion_activa boolean not null default true;
```

**El riesgo es que un enlace circule más de la cuenta** y se sume alguien que no
corresponde. Se acota con tres cosas, y falta que Sol elija cuáles:

- Que el líder pueda **regenerar el enlace**, invalidando el anterior.
- Que el líder pueda **apagarlo** cuando el equipo está completo.
- Que las altas por enlace **necesiten confirmación del líder** antes de contar
  como integrantes.

En cualquier caso, **el enlace deja de funcionar cuando cierran las entregas**:
no se agregan autores después de entregar.

En los dos casos, **sumar gente se cierra junto con las entregas**: no se
agregan autores después de entregar.

## Aceptar una invitación por correo · implementado 08.10

Hoy la card genera enlaces `/invitacion/{token}`, pero **no existe ningún
endpoint que los acepte**. Se completa así:

| Qué | Para qué |
|---|---|
| `GET /invitacion/{token}` · público | Quién invita y a qué equipo, para que la pantalla diga «Ana te invitó a Estudio Norte» antes de pedir el login |
| `GET /auth/google?invitacion={token}` | El login lleva el token firmado en el `state` de OAuth |
| `POST /invitacion/{token}/aceptar` · con sesión | Lo suma como aceptado y guarda los términos con fecha, versión (de `edicion`) e IP |

### El ajuste del login

```mermaid
flowchart TB
    v["Vuelve de Google"] --> s{"¿Hay perfil con<br/>ese google_sub o correo?"}
    s -->|"sí"| ok["Entra como siempre"]
    s -->|"no"| t{"¿El state trae un<br/>token de invitación válido?"}
    t -->|"no"| no["403 · sin-acceso"]
    t -->|"sí"| m["Vincula esa cuenta de Google<br/>a la fila invitada"]
    m --> ok
```

Si la invitación era para `juan@gmail.com` y Juan entra con
`juan@facultad.edu`, el perfil reservado se queda con la cuenta con la que
entró. El token solo vale mientras la invitación esté en `invitado` y la
edición esté en `inscripcion` o `entregas`.

### El arreglo de la reinvitación

`invitar()` hace `on conflict do nothing` pero devuelve un token nuevo que
nunca se guardó: el correo saldría con un enlace muerto. Pasa a **reusar el
token existente** si la invitación sigue pendiente.

Del lado del front hace falta la pantalla `/invitacion/{token}`.

El mismo ajuste del login sirve para el **enlace del equipo**:
`/auth/google?equipo={token}` deja entrar a una cuenta que no estaba inscripta,
que es lo que este documento prometía desde el principio («ese mismo enlace lo
inscribe»).

### Un error que apareció al implementarlo

**Darse de baja respondía siempre 500.** La restricción `coherencia_aceptacion`
exigía que solo un integrante «aceptado» tuviera fecha de aceptación, pero la
baja conserva esa fecha a propósito. El recorrido de pruebas no cubría la baja.
Lo corrige la migración `003`, y ahora el recorrido la prueba.

## Cuando alguien se da de baja

- **La fila no se borra**, queda en `estado = 'baja'`. Hace falta para saber que
  en su momento aceptó las bases y cuándo.
- **Se avisa por correo al resto del equipo.** Si no, se enteran en la
  premiación.
- **El líder no puede irse dejando el equipo sin responsable.** Se le pasa el rol
  al integrante aceptado más antiguo, automáticamente.
- **La propuesta no se toca.** Es del equipo, no de la persona.
- **Después del cierre no se puede dar de baja.** Una vez entregada, la lista de
  autores queda firme: si no, alguien podría salirse después de ganar, o
  cambiarse la autoría con el premio ya asignado.

## Definido el 08.09

- **Tope de 5 integrantes**, guardado en `edicion.max_integrantes` y no escrito
  en el código, porque el número puede cambiar. Falta definir si los 5 incluyen
  a quien armó el equipo o son además de él.
- **Sí se pueden sumar integrantes** después del formulario inicial.
- **Una persona no puede estar en dos equipos.** Lo impone el índice único
  parcial de más arriba.

Lo que sigue abierto está en `dudas-para-sol.md`, fuera del repo.
