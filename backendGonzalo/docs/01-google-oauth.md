# 01 · Google OAuth

Cómo quedó configurado el login con Google. Todo esto es del **entorno de
desarrollo**; producción se configura aparte y queda anotado más abajo.

## Por qué este flujo y no otro

El navegador nunca le habla directo a Google. El recorrido es:

1. El front manda al usuario a `GET /auth/google` de nuestra API.
2. La API lo redirige a Google.
3. Google lo devuelve a `GET /auth/google/callback` con un código.
4. **La API canjea ese código por el `id_token` servidor a servidor.**
5. La API crea o actualiza el perfil, emite la cookie de sesión y lo manda de
   vuelta al front.
6. El front llama a `GET /yo` para saber quién entró y con qué rol.

Dos consecuencias prácticas: el `client_secret` nunca sale del backend, y el
front **no necesita el SDK de Google** — le alcanza con un enlace y, a la
vuelta, una llamada a `/yo`.

## Configuración en Google Cloud — desarrollo

| Qué | Valor |
|---|---|
| Project ID | `habisite-challenge` |
| Nombre de la app en la pantalla de consentimiento | `habisite-challenge-dev` — **a cambiar por `Habisite Design Challenge`**, ver abajo |
| Tipo de usuario | Externo |
| Estado de publicación | Testing |
| Nombre del cliente OAuth | `habisite-challenge-dev` |
| Tipo de cliente | Aplicación web |
| Orígenes autorizados de JavaScript | *(vacío, a propósito)* |
| URI de redireccionamiento | `http://localhost:3000/auth/google/callback` |
| Usuarios de prueba cargados | `gonzalomaurino@gmail.com`, `zengatomi@gmail.com` |

### Permisos solicitados

Solo estos tres, y no hay que agregar ninguno más:

- `openid`
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`

**Por qué importa:** los tres son "no sensibles", así que el proyecto se puede
publicar sin que Google revise nada. Cualquier permiso adicional dispara una
revisión manual que tarda semanas.

Por el mismo motivo **no se subió el logo** a la pantalla de consentimiento: es
lo único de esa pantalla que también dispara la revisión. Si Habisite lo quiere,
se tramita aparte y no bloquea el desarrollo.

### No hace falta habilitar ninguna API

Con esos tres permisos alcanza el flujo estándar de OpenID Connect, que funciona
sin activar nada en la sección *APIs y servicios habilitados*.

## El nombre de la app lo lee el concursante

El nombre de la pantalla de consentimiento es literalmente el que aparece en el
cartel de Google: *«¿Querés continuar con habisite-challenge-dev?»*. Un estudiante
que ve un nombre así asume que se equivocó de enlace.

Tiene que decir **Habisite Design Challenge**. Se puede cambiar cuando sea y con
permisos no sensibles no dispara ninguna revisión. El sufijo `-dev` va en el
nombre del **cliente OAuth**, que es interno y no lo ve nadie de afuera.

## El tope de 100 usuarios es acumulado, no simultáneo

Textual del aviso de Google: el límite «se calcula según el ciclo de vida
completo de la app». Cada persona que entre alguna vez consume un cupo para
siempre, no se libera. Con eso, pasar el proyecto a *En producción* antes de
abrir la inscripción no es una mejora opcional: sin eso el concurso se rompe
solo al llegar al concursante 101.

## Cosas que hicieron perder tiempo

- **Los dos campos de la pantalla de credenciales no son intercambiables.**
  *Orígenes autorizados de JavaScript* acepta solo esquema, host y puerto
  (`http://localhost:3000`) y rechaza cualquier ruta con el error
  «Los URI no deben contener una ruta o destino con "/"». La URL completa con
  `/auth/google/callback` va en *URIs de redireccionamiento autorizados*.
- **`http://` solo se acepta para `localhost`.** Cualquier otro dominio exige HTTPS.
- **`localhost` y `127.0.0.1` son distintos** para Google. Hay que elegir uno y
  usar siempre el mismo.
- **La URI tiene que coincidir carácter por carácter** con la del `.env`. Una
  barra de más al final y el login falla con un error que no explica el motivo.
- **La consola ya no muestra el client secret completo después de crearlo**:
  aparece enmascarado (`****ABC0`, unos 9 caracteres). Ese valor **no sirve**, y
  no hay ningún cartel que lo aclare. Un secret real empieza con `GOCSPX-` y
  tiene unos 35 caracteres. Si se perdió el original, se entra al cliente,
  *Agregar secreto*, y se copia el nuevo en el momento — se muestra una sola
  vez. El anterior sigue funcionando hasta que se lo borre.
- **Los valores reales van al `.env`, nunca al `.env.example`.** El segundo está
  versionado. Antes de crear ningún `.env` tiene que existir el `.gitignore` de
  la raíz, que ignora `.env`, `.env.*` y `client_secret*.json`, con excepción
  explícita para `.env.example`.
- **Al cargar usuarios de prueba, el correo se corta si se aprieta Enter antes
  de terminar de escribirlo.** Queda una ficha tipo `alguien@gmail.` y el único
  mensaje es «No se permiten direcciones de correo electrónico no válidas», sin
  señalar cuál de las fichas es la mala.

## Variables que salen de acá

Van al `.env`, que no se sube al repo. Ver `backendGonzalo/.env.example`.

| Variable | De dónde sale |
|---|---|
| `GOOGLE_CLIENT_ID` | Consola de Google, pantalla del cliente OAuth |
| `GOOGLE_CLIENT_SECRET` | Ídem. **Secreto**: no va al repo ni a ningún documento |
| `GOOGLE_CALLBACK_URL` | La URI de redireccionamiento registrada, tal cual |

## Producción — todavía sin hacer

- [ ] Decidir si es el mismo proyecto de Google o uno separado. El estado de
      publicación es del proyecto, así que separarlos de verdad implica dos.
- [ ] Crear el cliente OAuth de producción una vez que esté el dominio.
- [ ] Registrar la URI de redireccionamiento real
      (`https://api.challenge.habisite.com/auth/google/callback`, si se confirma
      ese dominio).
- [ ] **Cambiar el nombre de la app a `Habisite Design Challenge`.**
- [ ] **Pasar el proyecto a *En producción*** antes de abrir la inscripción.
- [ ] Cargar el client ID y el secret en las variables de Railway.
