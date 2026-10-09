/*
 * El ingreso con un enlace por correo (docs/12), de punta a punta, contra la
 * API de pruebas: pedir el enlace, la validación del retorno, los dos
 * límites, el canje y lo que queda (y lo que NO queda) en la base.
 *
 * Igual que el recorrido, le pega a una API ya levantada (`pruebas:api`) y
 * no depende de lo que haya hecho el recorrido: crea su propia gente, con
 * correos que llevan la marca de la corrida.
 *
 *   npm run pruebas:enlace
 *
 * El atajo, el mismo que el de `preparar`: la API nunca expone el token del
 * enlace —solo viaja en el correo, y en pruebas el correo no sale—. Para
 * probar el canje se inserta una fila en `enlaces_ingreso` con el sha256 de
 * un token generado acá, que es exactamente lo que hace la API al pedirlo.
 * El canje en sí corre entero por la API.
 *
 * Cada bloque usa su propia IP inventada (CF-Connecting-IP, dentro de
 * 198.51.0.0/16) para que el límite por IP de un bloque no contamine a los
 * demás, ni al recorrido, que pega desde localhost.
 */
import { createHash, randomBytes } from 'node:crypto';
import { comprobar, conectarBase, esperar, fase, FRONT, pedir, recorte, terminar } from './ayudantes.mjs';

const { db, sql } = await conectarBase();

const marca = Date.now();
const sha256 = (texto) => createHash('sha256').update(texto).digest('hex');
const nuevoToken = () => randomBytes(32).toString('base64url');
const BASE = { aceptaBases: true, turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX' };
// Cada corrida usa otro tercer octeto: el límite por IP vive en memoria y
// sobrevive entre corridas mientras la API siga levantada.
const red = (marca % 200) + 20;
const ip = (n) => `198.51.${red}.${n}`;

const pedirEnlace = (correo, retorno, desdeIp, extra = {}) =>
  pedir('POST', '/auth/enlace', {
    cuerpo: retorno === undefined ? { correo, ...extra } : { correo, retorno, ...extra },
    cabeceras: { 'CF-Connecting-IP': desdeIp },
  });
const canjear = (token) => pedir('POST', '/auth/enlace/canjear', { cuerpo: { token } });

const perfilDe = async (correo) => (await sql('select * from perfiles where correo = $1', [correo]))[0];
const enlacesDe = async (correo) =>
  sql(
    `select e.*, host(e.pedido_ip) as ip_texto from enlaces_ingreso e
       join perfiles p on p.id = e.perfil_id
      where p.correo = $1 order by e.creado_en`,
    [correo],
  );
const c14De = async (correo) => sql(`select * from envios where codigo = 'c14' and destinatario = $1 order by id`, [correo]);

/** Crea un perfil directo en la base, como `preparar`. */
async function sembrarPerfil(correo, estado = 'habilitado', nombre = 'Prueba') {
  const [f] = await sql(
    `insert into perfiles (correo, nombre, apellido, rol, estado, institucion, pais, tipo_institucion)
     values ($1, $2, 'Enlace', 'participante', $3, 'FADU-UBA', 'AR', 'universidad')
     returning id::text`,
    [correo, nombre, estado],
  );
  return f.id;
}

/** El atajo del canje: una fila con el hash de un token que conocemos. */
async function sembrarEnlace(perfilId, { retorno = '/panel', vencido = false } = {}) {
  const token = nuevoToken();
  await sql(
    `insert into enlaces_ingreso (perfil_id, token_hash, retorno, vence_en)
     values ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [perfilId, sha256(token), retorno, vencido ? '-1' : '15'],
  );
  return token;
}

/** Espera a que la cola de correos procese un envío (sin Resend, queda `omitido`). */
async function esperarProcesado(clave, listo = (f) => f.estado !== 'pendiente', ms = 4000) {
  const hasta = Date.now() + ms;
  let fila;
  do {
    [fila] = await sql('select * from envios where clave = $1', [clave]);
    if (fila && listo(fila)) return fila;
    await esperar(100);
  } while (Date.now() < hasta);
  return fila;
}

/*
 * ¿Aparece en algún lado un token cuyo sha256 esté en `hashes`? Un token es
 * base64url de 32 bytes: 43 caracteres. Se prueban todas las ventanas de 43
 * de cada tira de caracteres base64url del texto, así que lo encuentra suelto,
 * dentro de una URL o pegado a otra cosa.
 */
function contieneToken(texto, hashes) {
  for (const [tira] of texto.matchAll(/[A-Za-z0-9_-]{43,}/g)) {
    for (let i = 0; i + 43 <= tira.length; i++) {
      if (hashes.has(sha256(tira.slice(i, i + 43)))) return true;
    }
  }
  return false;
}

// === 0 · Precondiciones ===
fase('0 · Precondiciones');
{
  const s = await pedir('GET', '/salud');
  comprobar('la API de pruebas responde', s.estado === 200, `(${s.estado})`);
  comprobar('FRONTEND_URL esta definida (para comparar enlaces)', FRONT.startsWith('http'), `FRONTEND_URL=${FRONT}`);
  comprobar('WHATSAPP_URL vacia en el entorno de pruebas', !process.env.WHATSAPP_URL, '(el caso de /r/ espera la landing)');
  const tok = nuevoToken();
  comprobar('el detector de tokens encuentra uno dentro de una URL', contieneToken(`{"enlace":"${FRONT}/ingresar?enlace=${tok}"}`, new Set([sha256(tok)])));
}

// === 1 · Pedir el enlace: siempre 204 ===
fase('1 · Pedir el enlace: siempre 204');
const correoIns = `enlace-ins-${marca}@test.local`;
const correoNada = `enlace-nadie-${marca}@test.local`;
const correoBloq = `enlace-bloq-${marca}@test.local`;
let tokenGrupo = null;
let enlaceIns = null;
{
  // El inscripto entra por el formulario, el camino de verdad.
  const ins = await pedir('POST', '/inscripcion', {
    cuerpo: { ...BASE, correo: correoIns, nombre: 'Lia', apellido: 'Enlace', tipoInstitucion: 'universidad', institucion: 'FADU-UBA', pais: 'AR' },
    cabeceras: { 'CF-Connecting-IP': ip(1) },
  });
  comprobar('se inscribe por POST /inscripcion -> 200', ins.estado === 200, `(${ins.estado}) ${recorte(ins.datos)}`);
  tokenGrupo = String(ins.datos?.whatsapp ?? '').split('/').pop();

  const idBloq = await sembrarPerfil(correoBloq, 'bloqueado', 'Bloqueada');
  comprobar('perfil bloqueado sembrado', Boolean(idBloq));

  const rIns = await pedirEnlace(correoIns, '/panel', ip(2));
  const rNada = await pedirEnlace(correoNada, '/panel', ip(2));
  const rBloq = await pedirEnlace(correoBloq, '/panel', ip(2));
  comprobar('inscripto -> 204', rIns.estado === 204, `(${rIns.estado}) ${recorte(rIns.datos)}`);
  comprobar('correo inexistente -> 204', rNada.estado === 204, `(${rNada.estado}) ${recorte(rNada.datos)}`);
  comprobar('perfil bloqueado -> 204', rBloq.estado === 204, `(${rBloq.estado}) ${recorte(rBloq.datos)}`);
  comprobar('las tres respuestas son identicas (no filtran quien esta)', rIns.datos === rNada.datos && rNada.datos === rBloq.datos && rIns.datos === '', recorte([rIns.datos, rNada.datos, rBloq.datos]));

  const filasIns = await enlacesDe(correoIns);
  comprobar('inscripto -> 1 fila en enlaces_ingreso', filasIns.length === 1, `filas=${filasIns.length}`);
  comprobar('inexistente -> ningun perfil ni correo creado', !(await perfilDe(correoNada)) && (await c14De(correoNada)).length === 0);
  comprobar('bloqueado -> 0 filas en enlaces_ingreso', (await enlacesDe(correoBloq)).length === 0);
  comprobar('bloqueado -> 0 correos c14', (await c14De(correoBloq)).length === 0);

  enlaceIns = filasIns[0];
  const c14 = await c14De(correoIns);
  comprobar('inscripto -> 1 correo c14 con clave c14:{id del enlace}', c14.length === 1 && c14[0].clave === `c14:${enlaceIns?.id}`, recorte(c14.map((f) => f.clave)));

  // ── Lo que se guarda del enlace ──
  comprobar('token_hash es sha256 en hex (64)', /^[0-9a-f]{64}$/.test(enlaceIns?.token_hash ?? ''), String(enlaceIns?.token_hash));
  comprobar('retorno guardado "/panel"', enlaceIns?.retorno === '/panel', String(enlaceIns?.retorno));
  const vida = (new Date(enlaceIns?.vence_en) - new Date(enlaceIns?.creado_en)) / 6e4;
  comprobar('vence a los 15 minutos de creado', Math.abs(vida - 15) < 0.1, `minutos=${vida}`);
  comprobar('sin usar', enlaceIns?.usado_en === null);
  comprobar('pedido_ip = la de CF-Connecting-IP', enlaceIns?.ip_texto === ip(2), String(enlaceIns?.ip_texto));

  // ── El correo, una vez procesado ──
  const envio = await esperarProcesado(`c14:${enlaceIns?.id}`);
  comprobar('el c14 queda "omitido" (sin RESEND_API_KEY no sale)', envio?.estado === 'omitido', `${envio?.estado} ${envio?.error ?? ''}`);
  comprobar('envios.datos ya NO tiene la clave "enlace"', envio && !('enlace' in envio.datos), recorte(envio?.datos));
  comprobar('envios.datos conserva "minutos" (15) y "nombre"', envio?.datos?.minutos === 15 && envio?.datos?.nombre === 'Lia', recorte(envio?.datos));

  // ── El token no está en ningún lado ──
  // El hash del enlace del inscripto: si el token apareciera en cualquier
  // columna de enlaces_ingreso o de envios, el detector lo encontraría.
  const hashes = new Set([enlaceIns?.token_hash]);
  const filaEnlace = JSON.stringify((await sql('select * from enlaces_ingreso where id = $1', [enlaceIns?.id]))[0]);
  comprobar('ninguna columna de enlaces_ingreso tiene el token', !contieneToken(filaEnlace.replace(enlaceIns?.token_hash, ''), hashes), filaEnlace.slice(0, 200));
  const todaEnvios = JSON.stringify(await sql('select * from envios'));
  comprobar('ninguna fila de envios tiene el token', !contieneToken(todaEnvios, hashes));
  comprobar('ningun c14 procesado conserva "ingresar?enlace="', (await sql(`select count(*)::int as n from envios where codigo = 'c14' and estado <> 'pendiente' and datos::text like '%ingresar?enlace=%'`))[0].n === 0);
}

// === 2 · Validación de `retorno` ===
fase('2 · Validacion de retorno');
{
  const correoRet = `enlace-ret-${marca}@test.local`;
  await sembrarPerfil(correoRet, 'habilitado', 'Ret');
  const malos = [
    ['//evil.com', '//evil.com'],
    ['/\\evil.com', '/\\evil.com'],
    ['/<tab>/evil.com', '/\t/evil.com'],
    ['/ panel', '/ panel'],
    ['https://evil.com', 'https://evil.com'],
    ['evil', 'evil'],
    // Extras: el navegador también descarta saltos de línea en la URL.
    ['/<LF>/evil.com', '/\n/evil.com'],
    ['/<CR>/evil.com', '/\r/evil.com'],
    ['/panel\\..\\x', '/panel\\..\\x'],
    ['"" (vacio)', ''],
  ];
  for (const [etiqueta, retorno] of malos) {
    const r = await pedirEnlace(correoRet, retorno, ip(3));
    comprobar(`retorno ${etiqueta} -> 400`, r.estado === 400, `(${r.estado}) ${recorte(r.datos)}`);
  }
  comprobar('los 400 no crean ningun enlace', (await enlacesDe(correoRet)).length === 0);

  const buenos = [
    ['/panel', '/panel', '/panel'],
    ['/panel?x=1#y', '/panel?x=1#y', '/panel?x=1#y'],
    ['ausente', undefined, '/'],
  ];
  for (const [etiqueta, retorno] of buenos) {
    const r = await pedirEnlace(correoRet, retorno, ip(3));
    comprobar(`retorno ${etiqueta} -> 204`, r.estado === 204, `(${r.estado}) ${recorte(r.datos)}`);
  }
  const guardados = (await enlacesDe(correoRet)).map((f) => f.retorno);
  comprobar('se guardan /panel, /panel?x=1#y y "/" (por defecto)', JSON.stringify(guardados) === JSON.stringify(buenos.map((b) => b[2])), recorte(guardados));
}

// === 3 · Límite por persona ===
fase('3 · Limite por persona: 3 cada 15 minutos');
{
  const correoLim = `enlace-lim-${marca}@test.local`;
  await sembrarPerfil(correoLim, 'habilitado', 'Lim');
  const estados = [];
  for (let i = 0; i < 4; i++) estados.push((await pedirEnlace(correoLim, '/panel', ip(4))).estado);
  comprobar('los 4 pedidos responden 204', estados.every((e) => e === 204), recorte(estados));
  comprobar('solo 3 filas en enlaces_ingreso', (await enlacesDe(correoLim)).length === 3, `filas=${(await enlacesDe(correoLim)).length}`);
  comprobar('solo 3 correos c14', (await c14De(correoLim)).length === 3, `c14=${(await c14De(correoLim)).length}`);
  // Con otro formato del mismo correo tampoco se saltea.
  const r5 = await pedirEnlace(`  ${correoLim.toUpperCase()}  `, '/panel', ip(4));
  comprobar('el mismo correo en mayusculas/espacios -> 204 y sigue en 3', r5.estado === 204 && (await enlacesDe(correoLim)).length === 3, `(${r5.estado})`);
}

// === 4 · Límite por IP ===
fase('4 · Limite por IP: 20 cada 15 minutos');
{
  const estados = [];
  for (let i = 1; i <= 21; i++) {
    estados.push((await pedirEnlace(`enlace-ip-${marca}-${i}@test.local`, '/panel', ip(5))).estado);
  }
  comprobar('los primeros 20 -> 204', estados.slice(0, 20).every((e) => e === 204), recorte(estados));
  comprobar('el 21 -> 429', estados[20] === 429, `(${estados[20]})`);
  const otra = await pedirEnlace(`enlace-ip-${marca}-otra@test.local`, '/panel', ip(6));
  comprobar('desde otra IP sigue respondiendo 204', otra.estado === 204, `(${otra.estado})`);
  const validacion = await pedirEnlace('no-es-correo', '/panel', ip(5));
  comprobar('la IP bloqueada igual recibe 400 por un cuerpo invalido (valida antes de contar)', validacion.estado === 400, `(${validacion.estado})`);
}

// === 5 · Canje ===
fase('5 · Canje');
{
  // ── El camino feliz ──
  const correoCanje = `enlace-canje-${marca}@test.local`;
  const idCanje = await sembrarPerfil(correoCanje, 'habilitado', 'Canje');
  const token = await sembrarEnlace(idCanje, { retorno: '/panel?x=1' });

  const c = await canjear(token);
  comprobar('canje -> 200 con { retorno }', c.estado === 200 && c.datos?.retorno === '/panel?x=1', `(${c.estado}) ${recorte(c.datos)}`);
  const setCookie = c.cabeceras.getSetCookie?.() ?? [];
  const cookieSesion = setCookie.find((v) => v.startsWith('sesion='));
  comprobar('Set-Cookie: sesion= ...', Boolean(cookieSesion), recorte(setCookie));
  comprobar('la cookie de sesion es HttpOnly', /;\s*HttpOnly/i.test(cookieSesion ?? ''), String(cookieSesion).replace(/sesion=[^;]+/, 'sesion=…'));
  comprobar('la respuesta no trae el token ni otra cosa que el retorno', JSON.stringify(Object.keys(c.datos ?? {})) === '["retorno"]', recorte(c.datos));

  const cookie = (cookieSesion ?? '').split(';')[0];
  const yo = await pedir('GET', '/yo', { cookie });
  comprobar('con esa cookie GET /yo -> 200', yo.estado === 200, `(${yo.estado}) ${recorte(yo.datos)}`);
  comprobar('/yo es del perfil del enlace', yo.datos?.id === idCanje && yo.datos?.correo === correoCanje, recorte(yo.datos, 200));
  const pc = await perfilDe(correoCanje);
  comprobar('el perfil pasa de "habilitado" a "activo"', pc?.estado === 'activo', String(pc?.estado));
  const [usado] = await sql('select usado_en from enlaces_ingreso where token_hash = $1', [sha256(token)]);
  comprobar('el enlace queda marcado usado', usado?.usado_en !== null, recorte(usado));

  const otra = await canjear(token);
  comprobar('segundo canje del mismo token -> 401', otra.estado === 401, `(${otra.estado}) ${recorte(otra.datos)}`);
  comprobar('el 401 no emite cookie', !(otra.cabeceras.getSetCookie?.() ?? []).some((v) => v.startsWith('sesion=') && !/sesion=;/.test(v)));

  // ── Vencido ──
  const tokVencido = await sembrarEnlace(idCanje, { vencido: true });
  const v = await canjear(tokVencido);
  comprobar('token vencido -> 401', v.estado === 401, `(${v.estado}) ${recorte(v.datos)}`);
  const [filaVencida] = await sql('select usado_en from enlaces_ingreso where token_hash = $1', [sha256(tokVencido)]);
  comprobar('el vencido no queda marcado usado', filaVencida?.usado_en === null);

  // ── Inexistente ──
  const n = await canjear(nuevoToken());
  comprobar('token inexistente -> 401', n.estado === 401, `(${n.estado})`);
  comprobar('el 401 trae estado/mensaje/ruta/hora', ['estado', 'mensaje', 'ruta', 'hora'].every((k) => k in (n.datos ?? {})), recorte(n.datos));

  // ── Cuerpos inválidos ──
  const sinToken = await pedir('POST', '/auth/enlace/canjear', { cuerpo: {} });
  comprobar('canje sin token -> 400', sinToken.estado === 400, `(${sinToken.estado})`);
  const largo = await canjear('x'.repeat(101));
  comprobar('token de mas de 100 caracteres -> 400', largo.estado === 400, `(${largo.estado})`);

  // ── Bloqueado ──
  const correoB = `enlace-canje-bloq-${marca}@test.local`;
  const idB = await sembrarPerfil(correoB, 'habilitado', 'Bloq');
  const tokB = await sembrarEnlace(idB);
  await sql(`update perfiles set estado = 'bloqueado' where id = $1`, [idB]);
  const b = await canjear(tokB);
  comprobar('perfil bloqueado -> 403', b.estado === 403, `(${b.estado}) ${recorte(b.datos)}`);
  comprobar('el 403 no emite cookie de sesion', !(b.cabeceras.getSetCookie?.() ?? []).some((x) => /^sesion=[^;]+/.test(x)), recorte(b.cabeceras.getSetCookie?.()));
  comprobar('el bloqueado sigue "bloqueado"', (await perfilDe(correoB))?.estado === 'bloqueado');

  // ── Un perfil ya activo sigue activo ──
  const tokActivo = await sembrarEnlace(idCanje);
  const a = await canjear(tokActivo);
  comprobar('un perfil "activo" canjea igual y sigue "activo"', a.estado === 200 && (await perfilDe(correoCanje))?.estado === 'activo', `(${a.estado})`);

  // ── Simultáneos ──
  const correoS = `enlace-simul-${marca}@test.local`;
  const idS = await sembrarPerfil(correoS, 'habilitado', 'Simul');
  const tokS = await sembrarEnlace(idS);
  const dos = await Promise.all([canjear(tokS), canjear(tokS)]);
  const ganan2 = dos.filter((r) => r.estado === 200).length;
  comprobar('dos canjes simultaneos -> exactamente uno 200', ganan2 === 1 && dos.filter((r) => r.estado === 401).length === 1, recorte(dos.map((r) => r.estado)));
  const tokS10 = await sembrarEnlace(idS);
  const diez = await Promise.all(Array.from({ length: 10 }, () => canjear(tokS10)));
  comprobar('diez canjes simultaneos -> exactamente uno 200, nueve 401', diez.filter((r) => r.estado === 200).length === 1 && diez.filter((r) => r.estado === 401).length === 9, recorte(diez.map((r) => r.estado)));

  // ── Un retorno guardado que no es ruta interna ──
  // La base solo exige que empiece con `/`: una fila vieja o cargada a mano
  // puede traer `//otro.com`. El canje lo revalida y manda al panel.
  for (const malo of ['//evil.com', '/\\evil.com', '/\t/evil.com']) {
    const tok = await sembrarEnlace(idS, { retorno: malo });
    const r = await canjear(tok);
    comprobar(`retorno guardado ${JSON.stringify(malo)} -> el canje devuelve "/panel"`, r.estado === 200 && r.datos?.retorno === '/panel', `(${r.estado}) ${recorte(r.datos)}`);
  }
}

// === 5b · CF-Connecting-IP que no es una IP ===
fase('5b · CF-Connecting-IP invalida');
{
  // Antes daba 500 al guardarla en la columna inet, y solo con correos
  // inscriptos: delataba quién se anotó. Ahora se ignora la cabecera.
  const correoIp = `enlace-ip-${marca}@test.local`;
  await sembrarPerfil(correoIp, 'habilitado', 'Ip');
  const conPerfil = await pedirEnlace(correoIp, '/panel', 'no-es-una-ip');
  const sinPerfil = await pedirEnlace(`enlace-ip-nadie-${marca}@test.local`, '/panel', 'no-es-una-ip');
  comprobar('cabecera invalida, correo inscripto -> 204', conPerfil.estado === 204, `(${conPerfil.estado}) ${recorte(conPerfil.datos)}`);
  comprobar('cabecera invalida, correo inexistente -> 204', sinPerfil.estado === 204, `(${sinPerfil.estado})`);
  const [fila] = await enlacesDe(correoIp);
  comprobar('el enlace se crea con la IP real de la conexion', Boolean(fila) && fila.ip_texto !== 'no-es-una-ip', String(fila?.ip_texto));
}

// === 6 · El C14 que no salió a tiempo ===
fase('6 · C14 vencido en la cola');
{
  // La cola procesa al toque, así que para probar el vencimiento se anota un
  // c14 viejo a mano y se deja que lo levante la tarea periódica (rezagados).
  const correoV = `enlace-cola-${marca}@test.local`;
  const idV = await sembrarPerfil(correoV, 'habilitado', 'Cola');
  const anotar = (clave, estado, minutosAtras) =>
    sql(
      `insert into envios (codigo, destinatario, perfil_id, clave, datos, estado, creado_en)
       values ('c14', $1, $2, $3, $4, $5, now() - ($6 || ' minutes')::interval)`,
      [correoV, idV, clave, JSON.stringify({ nombre: 'Cola', enlace: `${FRONT}/ingresar?enlace=${nuevoToken()}`, minutos: 15 }), estado, String(minutosAtras)],
    );
  await anotar(`c14:prueba-vencido-${marca}`, 'pendiente', 20);
  await anotar(`c14:prueba-fallido-${marca}`, 'fallido', 20);
  await anotar(`c14:prueba-a-tiempo-${marca}`, 'pendiente', 12);

  const t = await pedir('POST', '/admin/tarea', { como: 'admin' });
  comprobar('POST /admin/tarea -> 200', t.estado === 200, `(${t.estado}) ${recorte(t.datos)}`);
  const vencido = await esperarProcesado(`c14:prueba-vencido-${marca}`);
  comprobar('c14 pendiente con mas de 15 min -> "omitido" por vencido', vencido?.estado === 'omitido' && vencido?.error === 'El enlace venció antes de salir', `${vencido?.estado} · ${vencido?.error}`);
  comprobar('...y sin la clave "enlace" (conserva minutos/nombre)', vencido && !('enlace' in vencido.datos) && vencido.datos.minutos === 15 && vencido.datos.nombre === 'Cola', recorte(vencido?.datos));
  comprobar('...y no se le sumo un intento', vencido?.intentos === 0, `intentos=${vencido?.intentos}`);
  // El fallido se reintenta enseguida (no espera los 10 minutos del pendiente).
  const fallido = await esperarProcesado(`c14:prueba-fallido-${marca}`, (f) => f.estado !== 'fallido');
  comprobar('c14 fallido con mas de 15 min -> "omitido" por vencido y sin enlace', fallido?.estado === 'omitido' && fallido?.error === 'El enlace venció antes de salir' && !('enlace' in fallido.datos), `${fallido?.estado} · ${fallido?.error} · ${recorte(fallido?.datos)}`);
  const aTiempo = await esperarProcesado(`c14:prueba-a-tiempo-${marca}`);
  comprobar('c14 pendiente de 12 min (no vencido) -> se procesa: "omitido" sin error, sin enlace', aTiempo?.estado === 'omitido' && aTiempo?.error === null && !('enlace' in aTiempo.datos) && aTiempo.intentos === 1, `${aTiempo?.estado} · ${aTiempo?.error} · intentos=${aTiempo?.intentos} · ${recorte(aTiempo?.datos)}`);
}

// === 7 · /r/{token} sin grupo ===
fase('7 · /r/{token} sin WHATSAPP_URL');
{
  const r = await pedir('GET', `/r/${tokenGrupo}`);
  const destino = r.cabeceras.get('location') ?? '';
  comprobar('/r/{token} -> 302', r.estado === 302, `(${r.estado})`);
  comprobar('redirige a la landing (FRONTEND_URL + "/")', destino === `${FRONT}/`, destino);
  comprobar('no redirige a /panel', !destino.endsWith('/panel'), destino);
}

// === 8 · Nada salió ===
fase('8 · Ningun correo sale de verdad');
{
  await esperar(500);
  const estados = Object.fromEntries((await sql(`select estado, count(*)::int as n from envios where codigo = 'c14' group by estado`)).map((f) => [f.estado, f.n]));
  comprobar('todos los c14 quedan "omitido" (ninguno enviado, fallido ni pendiente)', !estados.enviado && !estados.fallido && !estados.pendiente && estados.omitido > 0, recorte(estados));
  const conEnlace = (await sql(`select count(*)::int as n from envios where codigo = 'c14' and datos ? 'enlace'`))[0].n;
  comprobar('ningun c14 de la tabla conserva la clave "enlace"', conEnlace === 0, `quedan ${conEnlace}`);
  const enviados = (await sql(`select count(*)::int as n from envios where estado = 'enviado'`))[0].n;
  comprobar('ningun envio de la tabla quedo "enviado"', enviados === 0, `enviados=${enviados}`);
}

await terminar(db);
