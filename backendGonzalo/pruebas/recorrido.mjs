/*
 * Recorrido de humo sobre la API, de punta a punta.
 *
 * No levanta nada: le pega a una API que ya esté corriendo (API_URL) usando
 * las sesiones de SESIONES_JSON. Recorre el concurso entero —inscripción,
 * equipo, PDF, entrega, las dos vueltas de evaluación y la publicación—
 * comprobando el código HTTP y la forma de cada respuesta.
 *
 * Es de humo, no exhaustivo: comprueba que el camino feliz ande y que los
 * permisos corten. Los casos de borde van en los *.e2e-spec.ts.
 */
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import pg from 'pg';

const API = process.env.URL_RECORRIDO ?? 'http://localhost:3999';

// Acceso directo a la base de pruebas, solo para LEER lo que la API no expone
// (los correos anotados, los tokens que viajan por correo) y para adelantar
// el reloj del recordatorio. Nunca para saltear una regla de la API.
const db = new pg.Client({
  connectionString: `${process.env.DATABASE_URL.split('?')[0]}?options=-c%20search_path%3Dpruebas,public`,
});
await db.connect();
const sql = async (texto, valores = []) => (await db.query(texto, valores)).rows;
const correosA = async (codigo, destinatario) =>
  Number((await sql('select count(*)::int as n from envios where codigo = $1 and destinatario = $2', [codigo, destinatario]))[0].n);
const perfilDe = async (correo) => (await sql('select * from perfiles where correo = $1', [correo]))[0];
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const sesiones = JSON.parse(readFileSync(process.env.SESIONES_JSON ?? '.tmp-sesiones.json', 'utf8'));

let ok = 0;
let fallos = 0;
const rotos = [];

function comprobar(etiqueta, condicion, detalle = '') {
  if (condicion) {
    ok++;
    console.log(`  ok    ${etiqueta}`);
  } else {
    fallos++;
    rotos.push(etiqueta);
    console.log(`  FALLA ${etiqueta}  ${detalle}`);
  }
}

async function pedir(metodo, ruta, opciones = {}) {
  const { como, cuerpo, formData, cabeceras = {} } = opciones;
  const h = { ...cabeceras };
  if (como) h.Cookie = sesiones[como].cookie;
  let body;
  if (formData) {
    body = formData;
  } else if (cuerpo !== undefined) {
    h['Content-Type'] = 'application/json';
    body = JSON.stringify(cuerpo);
  }
  const r = await fetch(`${API}${ruta}`, { method: metodo, headers: h, body, redirect: 'manual' });
  const tipo = r.headers.get('content-type') ?? '';
  let datos = null;
  if (tipo.includes('json')) datos = await r.json().catch(() => null);
  else if (tipo.includes('pdf')) datos = Buffer.from(await r.arrayBuffer());
  else datos = await r.text().catch(() => null);
  return { estado: r.status, datos, cabeceras: r.headers };
}

const recorte = (x, n = 160) => String(JSON.stringify(x) ?? '').slice(0, n);
const fase = (n) => console.log(`\n-- ${n} ${'-'.repeat(Math.max(0, 58 - n.length))}`);

// === 1 · Público y sesión ===
fase('1 · Publico y sesion');
{
  const s = await pedir('GET', '/salud');
  comprobar('GET /salud -> 200 sin sesion', s.estado === 200 && s.datos?.estado === 'ok', `(${s.estado})`);

  const sin = await pedir('GET', '/yo');
  comprobar('GET /yo sin cookie -> 401', sin.estado === 401, `(${sin.estado})`);
  comprobar(
    'el error trae estado/mensaje/ruta/hora',
    ['estado', 'mensaje', 'ruta', 'hora'].every((k) => k in (sin.datos ?? {})),
  );

  const g = await pedir('GET', '/auth/google');
  const destino = g.cabeceras.get('location') ?? '';
  comprobar(
    'GET /auth/google -> 302 a Google',
    g.estado === 302 && destino.includes('accounts.google.com'),
    `(${g.estado})`,
  );

  const yo = await pedir('GET', '/yo', { como: 'ana' });
  comprobar('GET /yo con sesion -> 200 rol participante', yo.estado === 200 && yo.datos?.rol === 'participante', `(${yo.estado})`);
  comprobar('GET /yo trae edicion.entregasAbiertas', typeof yo.datos?.edicion?.entregasAbiertas === 'boolean');

  const pub = await pedir('GET', '/edicion/publica');
  comprobar('GET /edicion/publica sin sesion -> terminosUrl y nada interno', pub.estado === 200 && 'terminosUrl' in (pub.datos ?? {}) && !('semillaReparto' in (pub.datos ?? {})), `(${pub.estado}) ${recorte(pub.datos)}`);

  const cr = await pedir('GET', '/criterios', { como: 'j1' });
  const suma = (cr.datos ?? []).reduce((a, c) => a + Number(c.peso), 0);
  comprobar('GET /criterios -> 7 criterios que suman 1', cr.datos?.length === 7 && Math.abs(suma - 1) < 1e-6, `(suma ${suma})`);

}

// === 1b · El formulario y el embudo (docs/09 y docs/11) ===
fase('1b · Formulario y embudo');
const BASE = { aceptaBases: true, turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX' };
const marca = Date.now();
{
  // ── Camino A: todo completo ──
  const correoA = `completa-${marca}@test.local`;
  const a = await pedir('POST', '/inscripcion', {
    cuerpo: { ...BASE, correo: correoA, nombre: 'Nueva', apellido: 'Persona', tipoInstitucion: 'universidad',
      institucion: 'FADU-UBA', pais: 'ar', telefono: '+5491123456789', origen: ' LinkedIn ' },
  });
  comprobar('A · completa -> 200 estado "completa"', a.estado === 200 && a.datos?.estado === 'completa', `(${a.estado}) ${recorte(a.datos)}`);
  comprobar('A · devuelve el enlace al grupo por /r/', /\/r\/[\w-]{20,}$/.test(a.datos?.whatsapp ?? ''), String(a.datos?.whatsapp));
  comprobar('A · se anota el C1 (confirmacion)', (await correosA('c1', correoA)) === 1);
  const pa = await perfilDe(correoA);
  comprobar('A · guarda origen normalizado, pais en mayusculas y terminos', pa?.origenes?.[0] === 'linkedin' && pa?.pais === 'AR' && pa?.terminos_version === 'sin-definir' && pa?.terminos_en !== null, recorte({ o: pa?.origenes, p: pa?.pais, v: pa?.terminos_version }));

  // ── Camino D: el mismo correo de nuevo, con otros datos ──
  const d = await pedir('POST', '/inscripcion', { cuerpo: { ...BASE, correo: correoA, nombre: 'Intruso', origen: 'instagram' } });
  comprobar('D · correo repetido -> 200, NO 409', d.estado === 200, `(${d.estado})`);
  comprobar('D · la respuesta tiene la misma forma que una nueva', JSON.stringify(Object.keys(d.datos ?? {}).sort()) === JSON.stringify(Object.keys(a.datos ?? {}).sort()), recorte(d.datos));
  const pd = await perfilDe(correoA);
  comprobar('D · NO pisa los datos de otro (sigue "Nueva")', pd?.nombre === 'Nueva', String(pd?.nombre));
  comprobar('D · suma el canal nuevo sin repetir', JSON.stringify(pd?.origenes) === JSON.stringify(['linkedin', 'instagram']), recorte(pd?.origenes));
  comprobar('D · no repite el C1', (await correosA('c1', correoA)) === 1);

  // ── Camino B: solo el correo ──
  const correoB = `incompleta-${marca}@test.local`;
  const b = await pedir('POST', '/inscripcion', { cuerpo: { ...BASE, correo: correoB } });
  comprobar('B · solo correo -> 200 estado "incompleta"', b.estado === 200 && b.datos?.estado === 'incompleta', `(${b.estado}) ${recorte(b.datos)}`);
  comprobar('B · se anota el C2 (alerta)', (await correosA('c2', correoB)) === 1);
  const pb = await perfilDe(correoB);
  const horas = (new Date(pb?.recordatorio_para) - Date.now()) / 36e5;
  comprobar('B · recordatorio programado a ~2 dias y token de completar', Boolean(pb?.token_completar) && horas > 47 && horas < 49, `horas=${horas.toFixed(1)}`);

  // ── Completar desde el correo de alerta ──
  const pre = await pedir('GET', `/inscripcion/completar/${pb.token_completar}`);
  comprobar('completar · GET precarga con su correo', pre.estado === 200 && pre.datos?.correo === correoB, `(${pre.estado}) ${recorte(pre.datos)}`);
  const comp = await pedir('POST', '/inscripcion', {
    cuerpo: { ...BASE, correo: `otro-${marca}@test.local`, tokenCompletar: pb.token_completar, nombre: 'Bea',
      apellido: 'Moro', tipoInstitucion: 'trabajo', institucion: 'Estudio X', pais: 'UY' },
  });
  comprobar('completar · POST con token -> completa', comp.estado === 200 && comp.datos?.estado === 'completa', `(${comp.estado}) ${recorte(comp.datos)}`);
  const pc = await perfilDe(correoB);
  comprobar('completar · completa ESA inscripcion, no crea otra', pc?.nombre === 'Bea' && !(await perfilDe(`otro-${marca}@test.local`)), recorte({ n: pc?.nombre }));
  comprobar('completar · el token deja de servir', pc?.token_completar === null && (await pedir('GET', `/inscripcion/completar/${pb.token_completar}`)).estado === 404);
  comprobar('completar · ahora sale el C1', (await correosA('c1', correoB)) === 1);

  // ── /r/{token}: el clic al grupo ──
  const tokenGrupo = String(a.datos?.whatsapp).split('/').pop();
  const r = await pedir('GET', `/r/${tokenGrupo}`);
  comprobar('/r/{token} -> 302 (sin grupo cargado, a la landing)', r.estado === 302 && Boolean(r.cabeceras.get('location')), `(${r.estado}) -> ${r.cabeceras.get('location')}`);
  comprobar('/r/{token} anota el clic', (await perfilDe(correoA))?.clic_grupo_en !== null);

  // ── Validaciones ──
  const malCorreo = await pedir('POST', '/inscripcion', { cuerpo: { ...BASE, correo: 'no-es-correo' } });
  comprobar('correo invalido -> 400 con detalles[]', malCorreo.estado === 400 && Array.isArray(malCorreo.datos?.detalles), `(${malCorreo.estado})`);
  const sinBases = await pedir('POST', '/inscripcion', { cuerpo: { correo: `x-${marca}@test.local`, turnstileToken: 'x' } });
  comprobar('sin aceptar las bases -> 400', sinBases.estado === 400, `(${sinBases.estado}) ${recorte(sinBases.datos)}`);
  const sinTurnstile = await pedir('POST', '/inscripcion', { cuerpo: { correo: `y-${marca}@test.local`, aceptaBases: true } });
  comprobar('sin token de Turnstile -> 400', sinTurnstile.estado === 400, `(${sinTurnstile.estado})`);
  const malTel = await pedir('POST', '/inscripcion', { cuerpo: { ...BASE, correo: `z-${marca}@test.local`, telefono: '11 2345-6789' } });
  comprobar('telefono fuera de E.164 -> 400', malTel.estado === 400, `(${malTel.estado})`);

  // ── C3: el recordatorio unico ──
  const correoR = `recordar-${marca}@test.local`;
  const correoClic = `clic-${marca}@test.local`;
  await pedir('POST', '/inscripcion', { cuerpo: { ...BASE, correo: correoR } });
  const conClic = await pedir('POST', '/inscripcion', { cuerpo: { ...BASE, correo: correoClic } });
  await pedir('GET', `/r/${String(conClic.datos?.whatsapp).split('/').pop()}`);
  // Se adelanta el reloj: el recordatorio vence ya.
  await sql(`update perfiles set recordatorio_para = now() - interval '1 minute' where correo = any($1)`, [[correoR, correoClic]]);

  const t1 = await pedir('POST', '/admin/tarea', { como: 'admin' });
  comprobar('POST /admin/tarea -> manda recordatorios', t1.estado === 200 && t1.datos?.recordatorios >= 1, `(${t1.estado}) ${recorte(t1.datos)}`);
  comprobar('C3 · le llega a quien no hizo clic', (await correosA('c3', correoR)) === 1);
  comprobar('C3 · NO le llega a quien ya hizo clic al grupo', (await correosA('c3', correoClic)) === 0);
  await pedir('POST', '/admin/tarea', { como: 'admin' });
  comprobar('C3 · correr la tarea de nuevo no lo repite', (await correosA('c3', correoR)) === 1);
  const tareaAjena = await pedir('POST', '/admin/tarea', { como: 'ana' });
  comprobar('POST /admin/tarea es solo de admin', tareaAjena.estado === 403, `(${tareaAjena.estado})`);

  // ── Perfil incompleto en el panel ──
  const yoEva = await pedir('GET', '/yo', { como: 'eva' });
  comprobar('/yo marca perfilCompleto:false a quien le faltan datos', yoEva.datos?.perfilCompleto === false, recorte(yoEva.datos, 200));
  const equipoEva = await pedir('POST', '/mi-equipo', { como: 'eva', cuerpo: {} });
  comprobar('incompleto NO puede armar equipo -> 403', equipoEva.estado === 403, `(${equipoEva.estado})`);
  const completaEva = await pedir('PUT', '/yo', { como: 'eva', cuerpo: { tipoInstitucion: 'trabajo', telefono: '+59899123456' } });
  comprobar('PUT /yo completa -> perfilCompleto:true', completaEva.estado === 200 && completaEva.datos?.perfilCompleto === true, `(${completaEva.estado}) ${recorte(completaEva.datos, 200)}`);
  comprobar('al completar desde el panel sale el C1', (await correosA('c1', 'eva@test.local')) === 1);

  // ── Jurados ──
  const jur = await pedir('POST', '/admin/jurados', { como: 'admin', cuerpo: { correo: `Jurado-${marca}@Test.local`, nombre: 'Sol' } });
  comprobar('POST /admin/jurados -> crea el jurado', jur.estado < 300 && jur.datos?.correo === `jurado-${marca}@test.local`, `(${jur.estado}) ${recorte(jur.datos)}`);
  comprobar('C7 · le llega la invitacion al jurado', (await correosA('c7', `jurado-${marca}@test.local`)) === 1);
  const jurConcursante = await pedir('POST', '/admin/jurados', { como: 'admin', cuerpo: { correo: 'ana@test.local' } });
  comprobar('un concursante NO puede ser jurado -> 409', jurConcursante.estado === 409, `(${jurConcursante.estado})`);
}

// === 2 · Permisos ===
fase('2 · Permisos por rol');
{
  const matriz = [
    ['participante en PUT /admin/edicion', 'PUT', '/admin/edicion', 'ana', 403, { nombre: 'x' }],
    ['participante en POST /admin/reparto', 'POST', '/admin/reparto', 'ana', 403, {}],
    ['participante en GET /admin/resultados', 'GET', '/admin/resultados', 'ana', 403, undefined],
    ['participante en GET /jurado/propuestas', 'GET', '/jurado/propuestas', 'ana', 403, undefined],
    ['jurado en GET /admin/resultados', 'GET', '/admin/resultados', 'j1', 403, undefined],
    ['jurado en PUT /admin/edicion/estado', 'PUT', '/admin/edicion/estado', 'j1', 403, { estado: 'entregas' }],
    ['admin en GET /admin/resultados', 'GET', '/admin/resultados', 'admin', 200, undefined],
  ];
  for (const [etiqueta, metodo, ruta, como, esperado, cuerpo] of matriz) {
    const r = await pedir(metodo, ruta, { como, cuerpo });
    comprobar(`${etiqueta} -> ${esperado}`, r.estado === esperado, `(${r.estado})`);
  }
}

// === 3 · Equipos ===
fase('3 · Equipos');
let enlaceToken = null;
{
  // Ojo con esta: no alcanza con que dé 200. Tiene que llegar el literal
  // `null` con content-type json. Con el cuerpo vacío, el `await r.json()`
  // del front tira SyntaxError, y este es el estado inicial del panel.
  const vacio = await pedir('GET', '/mi-equipo', { como: 'ana' });
  comprobar(
    'GET /mi-equipo sin equipo -> 200 y null en JSON',
    vacio.estado === 200 && vacio.datos === null && (vacio.cabeceras.get('content-type') ?? '').includes('json'),
    `(${vacio.estado}) tipo=${vacio.cabeceras.get('content-type')} cuerpo=${recorte(vacio.datos, 40)}`,
  );

  const propVacia = await pedir('GET', '/mi-propuesta', { como: 'ana' });
  comprobar(
    'GET /mi-propuesta sin equipo -> 200 y null en JSON',
    propVacia.estado === 200 && propVacia.datos === null && (propVacia.cabeceras.get('content-type') ?? '').includes('json'),
    `(${propVacia.estado}) tipo=${propVacia.cabeceras.get('content-type')}`,
  );

  const creado = await pedir('POST', '/mi-equipo', { como: 'ana', cuerpo: { nombre: 'Estudio Norte' } });
  comprobar('POST /mi-equipo -> 2xx y soyLider', creado.estado < 300 && creado.datos?.soyLider === true, `(${creado.estado}) ${recorte(creado.datos)}`);

  const inv = await pedir('POST', '/mi-equipo/invitaciones', { como: 'ana', cuerpo: { correos: ['bruno@test.local'] } });
  comprobar(
    'POST /mi-equipo/invitaciones -> enlace por correo',
    inv.estado < 300 && Array.isArray(inv.datos) && typeof inv.datos?.[0]?.enlace === 'string',
    `(${inv.estado}) ${recorte(inv.datos)}`,
  );
  comprobar('C4 · le llega la invitacion a bruno', (await correosA('c4', 'bruno@test.local')) === 1);

  // Antes, reinvitar devolvía un token nuevo que nunca se guardaba.
  const reinv = await pedir('POST', '/mi-equipo/invitaciones', { como: 'ana', cuerpo: { correos: ['bruno@test.local'] } });
  comprobar('reinvitar devuelve el MISMO enlace (antes salia uno muerto)', reinv.datos?.[0]?.enlace === inv.datos?.[0]?.enlace, `${recorte(reinv.datos?.[0]?.enlace, 60)} vs ${recorte(inv.datos?.[0]?.enlace, 60)}`);
  comprobar('reinvitar no repite el C4', (await correosA('c4', 'bruno@test.local')) === 1);

  const tokenBruno = String(inv.datos?.[0]?.enlace).split('/').pop();
  const ver = await pedir('GET', `/invitacion/${tokenBruno}`);
  comprobar('GET /invitacion/{token} sin sesion -> equipo y quien invita', ver.estado === 200 && ver.datos?.equipo === 'Estudio Norte' && ver.datos?.invitadoPor === 'Ana Duarte', `(${ver.estado}) ${recorte(ver.datos)}`);
  const acepta = await pedir('POST', `/invitacion/${tokenBruno}/aceptar`, { como: 'bruno' });
  comprobar('POST /invitacion/{token}/aceptar -> bruno entra', acepta.estado < 300 && acepta.datos?.miembros?.some((m) => m.correo === 'bruno@test.local' && m.estado === 'aceptado'), `(${acepta.estado}) ${recorte(acepta.datos)}`);
  comprobar('la invitacion ya usada -> 404', (await pedir('GET', `/invitacion/${tokenBruno}`)).estado === 404);

  // La invitación sirve con OTRA cuenta: se invita un correo y acepta gabi.
  const correoOtro = `gabi-otra-cuenta-${marca}@test.local`;
  const invOtro = await pedir('POST', '/mi-equipo/invitaciones', { como: 'ana', cuerpo: { correos: [correoOtro] } });
  const tokenOtro = String(invOtro.datos?.[0]?.enlace).split('/').pop();
  const aceptaGabi = await pedir('POST', `/invitacion/${tokenOtro}/aceptar`, { como: 'gabi' });
  comprobar('la invitacion de un correo la acepta otra cuenta (gabi)', aceptaGabi.estado < 300 && aceptaGabi.datos?.miembros?.some((m) => m.correo === 'gabi@test.local'), `(${aceptaGabi.estado}) ${recorte(aceptaGabi.datos)}`);
  comprobar('el perfil reservado para el correo invitado se borra', !(await perfilDe(correoOtro)));
  const gabiTerminos = (await sql(`select m.terminos_version from equipo_miembros m join perfiles p on p.id = m.perfil_id where p.correo = 'gabi@test.local'`))[0];
  comprobar('la version de las bases la pone el servidor', gabiTerminos?.terminos_version === 'sin-definir', recorte(gabiTerminos));

  const lider = await pedir('GET', '/mi-equipo', { como: 'ana' });
  comprobar('el lider ve enlaceInvitacion', typeof lider.datos?.enlaceInvitacion === 'string', recorte(lider.datos, 200));
  comprobar('maxIntegrantes viaja en la respuesta', lider.datos?.maxIntegrantes === 5, String(lider.datos?.maxIntegrantes));

  const nuevo = await pedir('PUT', '/mi-equipo/enlace', { como: 'ana' });
  const url = nuevo.datos?.enlace ?? nuevo.datos?.enlaceInvitacion ?? '';
  enlaceToken = String(url).split('/').pop();
  comprobar('PUT /mi-equipo/enlace -> genera token', Boolean(enlaceToken), `(${nuevo.estado}) ${recorte(nuevo.datos, 140)}`);

  const noLider = await pedir('GET', '/mi-equipo', { como: 'bruno' });
  comprobar('quien no es lider NO ve el enlace', noLider.datos === null || noLider.datos?.enlaceInvitacion === null, recorte(noLider.datos, 200));

  if (enlaceToken) {
    // Manda el cuerpo viejo a propósito: se acepta, pero la versión la pone el servidor.
    const sumada = await pedir('POST', `/equipos/sumarme/${enlaceToken}`, { como: 'carla', cuerpo: { terminosVersion: '2026-09-01' } });
    comprobar('POST /equipos/sumarme/{token} -> carla se suma', sumada.estado < 300, `(${sumada.estado}) ${recorte(sumada.datos)}`);
    const carlaTerminos = (await sql(`select m.terminos_version from equipo_miembros m join perfiles p on p.id = m.perfil_id where p.correo = 'carla@test.local'`))[0];
    comprobar('el cliente ya no elige la version de las bases', carlaTerminos?.terminos_version === 'sin-definir', recorte(carlaTerminos));
  }

  // Darse de baja respondía 500: la restricción de la base lo hacía imposible.
  const baja = await pedir('DELETE', '/mi-equipo/miembros/yo', { como: 'gabi' });
  comprobar('DELETE /mi-equipo/miembros/yo -> 204 (antes, 500)', baja.estado === 204, `(${baja.estado}) ${recorte(baja.datos)}`);
  comprobar('C5 · al resto del equipo le llega el aviso', (await correosA('c5', 'ana@test.local')) === 1 && (await correosA('c5', 'bruno@test.local')) === 1 && (await correosA('c5', 'carla@test.local')) === 1);
  comprobar('C5 · a quien se fue no', (await correosA('c5', 'gabi@test.local')) === 0);
}

// === 4 · Propuesta y PDF ===
fase('4 · Propuesta y PDF');
{
  const abrir = await pedir('PUT', '/admin/edicion/estado', { como: 'admin', cuerpo: { estado: 'entregas' } });
  comprobar('admin pasa la edicion a "entregas"', abrir.estado < 300, `(${abrir.estado}) ${recorte(abrir.datos, 140)}`);

  const guardada = await pedir('PUT', '/mi-propuesta', { como: 'ana', cuerpo: { titulo: 'Refugio en la ladera', memoria: 'Una memoria breve.' } });
  comprobar('PUT /mi-propuesta -> guarda titulo', guardada.estado < 300 && guardada.datos?.titulo === 'Refugio en la ladera', `(${guardada.estado}) ${recorte(guardada.datos)}`);
  comprobar('la propuesta viene con editable', typeof guardada.datos?.editable === 'boolean');

  // Un PDF de verdad, no bytes inventados: el servidor cuenta las paginas.
  const doc = await PDFDocument.create();
  doc.addPage([595, 842]).drawText('Habisite - propuesta de prueba', { x: 60, y: 760, size: 18 });
  const pdf = Buffer.from(await doc.save());

  const fd = new FormData();
  fd.append('archivo', new Blob([pdf], { type: 'application/pdf' }), 'propuesta.pdf');
  const subida = await pedir('PUT', '/mi-propuesta/archivo', { como: 'ana', formData: fd });
  comprobar('PUT /mi-propuesta/archivo -> sube el PDF', subida.estado < 300, `(${subida.estado}) ${recorte(subida.datos)}`);
  comprobar('devuelve archivo.paginas y bytes', subida.datos?.archivo?.paginas === 1 && subida.datos?.archivo?.bytes > 0, recorte(subida.datos?.archivo));

  const noPdf = new FormData();
  noPdf.append('archivo', new Blob([Buffer.from('esto no es un pdf')], { type: 'application/pdf' }), 'trampa.pdf');
  const rech = await pedir('PUT', '/mi-propuesta/archivo', { como: 'ana', formData: noPdf });
  comprobar('un archivo que no es PDF -> 400', rech.estado === 400, `(${rech.estado})`);

  const bajada = await pedir('GET', '/mi-propuesta/archivo', { como: 'ana' });
  comprobar(
    'GET /mi-propuesta/archivo -> 200 con bytes de PDF',
    bajada.estado === 200 && Buffer.isBuffer(bajada.datos) && bajada.datos.subarray(0, 5).toString() === '%PDF-',
    `(${bajada.estado})`,
  );
  comprobar(
    'se sirve inline y sin cache',
    /inline/.test(bajada.cabeceras.get('content-disposition') ?? '') && /no-store/.test(bajada.cabeceras.get('cache-control') ?? ''),
    `${bajada.cabeceras.get('content-disposition')} | ${bajada.cabeceras.get('cache-control')}`,
  );

  const rango = await pedir('GET', '/mi-propuesta/archivo', { como: 'ana', cabeceras: { Range: 'bytes=0-99' } });
  comprobar('Range -> 206 (PDF.js carga de a pedazos)', rango.estado === 206, `(${rango.estado})`);

  const entregada = await pedir('POST', '/mi-propuesta/entregar', { como: 'ana' });
  comprobar('POST /mi-propuesta/entregar -> estado entregada', entregada.estado < 300 && entregada.datos?.estado === 'entregada', `(${entregada.estado}) ${recorte(entregada.datos)}`);
  comprobar('formaEntrega = confirmada', entregada.datos?.formaEntrega === 'confirmada', String(entregada.datos?.formaEntrega));
  comprobar('C8 · comprobante a cada integrante (ana, bruno, carla)', (await correosA('c8', 'ana@test.local')) === 1 && (await correosA('c8', 'bruno@test.local')) === 1 && (await correosA('c8', 'carla@test.local')) === 1);
  await pedir('POST', '/mi-propuesta/entregar', { como: 'ana' });
  comprobar('C8 · entregar dos veces no repite el comprobante', (await correosA('c8', 'ana@test.local')) === 1);

  await esperar(20); // que la hora de subida cambie
  const fd2 = new FormData();
  fd2.append('archivo', new Blob([pdf], { type: 'application/pdf' }), 'propuesta-v2.pdf');
  const reemplazo = await pedir('PUT', '/mi-propuesta/archivo', { como: 'ana', formData: fd2 });
  comprobar('reemplazar el PDF ya entregado -> 2xx', reemplazo.estado < 300, `(${reemplazo.estado})`);
  comprobar('C8 · el reemplazo manda un comprobante nuevo', (await correosA('c8', 'ana@test.local')) === 2);

  // Otro equipo que sube y NO confirma: lo tiene que entregar el cierre.
  await pedir('POST', '/mi-equipo', { como: 'dario', cuerpo: { nombre: 'Taller Sur' } });
  const fd3 = new FormData();
  fd3.append('archivo', new Blob([pdf], { type: 'application/pdf' }), 'taller-sur.pdf');
  const subeDario = await pedir('PUT', '/mi-propuesta/archivo', { como: 'dario', formData: fd3 });
  comprobar('dario sube su PDF y no confirma', subeDario.estado < 300 && subeDario.datos?.estado === 'borrador', `(${subeDario.estado}) ${recorte(subeDario.datos)}`);
}

// === 5 · Cierre ===
fase('5 · El cierre se aplica en el servidor');
{
  const ayer = new Date(Date.now() - 864e5).toISOString();
  const cerrar = await pedir('PUT', '/admin/edicion', { como: 'admin', cuerpo: { cierreEntregas: ayer, margenGraciaMinutos: 0 } });
  comprobar('admin carga un cierre ya vencido', cerrar.estado < 300, `(${cerrar.estado}) ${recorte(cerrar.datos, 140)}`);

  const tarde = await pedir('PUT', '/mi-propuesta', { como: 'ana', cuerpo: { titulo: 'Tarde' } });
  comprobar('escribir pasado el cierre -> 423 Locked', tarde.estado === 423, `(${tarde.estado})`);

  const yo = await pedir('GET', '/yo', { como: 'ana' });
  comprobar('entregasAbiertas pasa a false', yo.datos?.edicion?.entregasAbiertas === false, String(yo.datos?.edicion?.entregasAbiertas));

  // El cierre automático: lo hace la tarea periódica, no un botón.
  const tarea = await pedir('POST', '/admin/tarea', { como: 'admin' });
  comprobar('la tarea cierra las entregas vencidas', tarea.estado === 200 && tarea.datos?.cierreDeEntregas === true, `(${tarea.estado}) ${recorte(tarea.datos)}`);
  const ed = await pedir('GET', '/edicion', { como: 'admin' });
  comprobar('la edicion pasa sola a "preseleccion"', ed.datos?.estado === 'preseleccion', String(ed.datos?.estado));
  const propDario = await pedir('GET', '/mi-propuesta', { como: 'dario' });
  comprobar('el borrador con PDF queda entregado (automatica)', propDario.datos?.estado === 'entregada' && propDario.datos?.formaEntrega === 'automatica', recorte(propDario.datos));
  comprobar('la fecha de entrega es la del cierre, no la de la tarea', Math.abs(new Date(propDario.datos?.entregadaEn) - new Date(ayer)) < 5000, `${propDario.datos?.entregadaEn} vs ${ayer}`);
  comprobar('C9 · a dario le avisa que compite igual', (await correosA('c9', 'dario@test.local')) === 1);
  comprobar('C9 · a quien confirmo no le llega', (await correosA('c9', 'ana@test.local')) === 0);
}

// === 6 · Evaluación ===
fase('6 · Evaluacion en dos vueltas');
{
  const pre = await pedir('PUT', '/admin/edicion/estado', { como: 'admin', cuerpo: { estado: 'preseleccion' } });
  comprobar('edicion pasa a "preseleccion"', pre.estado < 300, `(${pre.estado}) ${recorte(pre.datos, 140)}`);

  const reparto = await pedir('POST', '/admin/reparto', { como: 'admin', cuerpo: {} });
  comprobar('POST /admin/reparto -> reparte entre jurados', reparto.estado < 300, `(${reparto.estado}) ${recorte(reparto.datos)}`);

  // El reparto es por tercios: con una sola propuesta, cae en el jurado que
  // le toque. Buscamos cuál, en vez de dar por sentado que es j1.
  let evaluador = null;
  let lista = { estado: 0, datos: [] };
  for (const j of ['j1', 'j2', 'j3']) {
    const r = await pedir('GET', '/jurado/propuestas', { como: j });
    if (r.datos?.length) { evaluador = j; lista = r; break; }
    if (!evaluador) lista = r;
  }
  comprobar('GET /jurado/propuestas -> 200 lista', lista.estado === 200 && Array.isArray(lista.datos), `(${lista.estado}) ${recorte(lista.datos, 200)}`);
  comprobar('el reparto le asigno la propuesta a algun jurado', Boolean(evaluador), '(ningun jurado la tiene)');

  const otro = ['j1', 'j2', 'j3'].find((j) => j !== evaluador) ?? 'j1';

  const avance = await pedir('GET', '/jurado/avance', { como: evaluador ?? 'j1' });
  comprobar('GET /jurado/avance -> 200', avance.estado === 200, `(${avance.estado}) ${recorte(avance.datos, 140)}`);

  const propId = lista.datos?.[0]?.id;
  if (!propId) {
    comprobar('el jurado tiene al menos una propuesta asignada', false, '(lista vacia: el resto de la fase no corre)');
  } else {
    comprobar('la fila trae criteriosPuntuados/criteriosTotales', typeof lista.datos[0].criteriosPuntuados === 'number' && lista.datos[0].criteriosTotales === 7, recorte(lista.datos[0], 200));

    const p = await pedir('PUT', `/jurado/propuestas/${propId}/preseleccion`, { como: evaluador, cuerpo: { elegida: true } });
    comprobar('PUT .../preseleccion -> 2xx', p.estado < 300, `(${p.estado}) ${recorte(p.datos, 140)}`);

    const fin = await pedir('PUT', '/admin/edicion/estado', { como: 'admin', cuerpo: { estado: 'final' } });
    comprobar('edicion pasa a "final"', fin.estado < 300, `(${fin.estado})`);

    const criterios = (await pedir('GET', '/criterios', { como: evaluador })).datos ?? [];
    const puntajes = criterios.map((c, i) => ({ criterioId: c.id, valor: 7 + (i % 3) }));

    const g1 = await pedir('PUT', `/jurado/propuestas/${propId}/puntajes`, { como: evaluador, cuerpo: { puntajes } });
    comprobar('PUT .../puntajes (7 criterios) -> 2xx', g1.estado < 300, `(${g1.estado}) ${recorte(g1.datos)}`);

    const fuera = await pedir('PUT', `/jurado/propuestas/${propId}/puntajes`, { como: evaluador, cuerpo: { puntajes: [{ criterioId: criterios[0].id, valor: 99 }] } });
    comprobar('un puntaje fuera de escala -> 400', fuera.estado === 400, `(${fuera.estado})`);

    const mios = await pedir('GET', `/jurado/propuestas/${propId}/puntajes`, { como: evaluador });
    comprobar('GET .../puntajes -> el jurado ve los suyos', mios.estado === 200, `(${mios.estado})`);

    const g2 = await pedir('PUT', `/jurado/propuestas/${propId}/puntajes`, { como: otro, cuerpo: { puntajes: puntajes.map((x) => ({ ...x, valor: 3 })) } });
    const ajenos = await pedir('GET', `/jurado/propuestas/${propId}/puntajes`, { como: evaluador });
    const textoAjenos = JSON.stringify(ajenos.datos ?? '');
    comprobar('AISLAMIENTO: j1 no ve los puntajes de j2 antes del cierre', g2.estado >= 300 || !/"valor":3/.test(textoAjenos), `j2 guardo ${g2.estado} · j1 lee ${textoAjenos.slice(0, 160)}`);

    const dev = await pedir('PUT', `/jurado/propuestas/${propId}/devolucion`, { como: evaluador, cuerpo: { texto: 'Nota interna de prueba.' } });
    comprobar('PUT .../devolucion -> 2xx', dev.estado < 300, `(${dev.estado}) ${recorte(dev.datos, 140)}`);

    const pdfJurado = await pedir('GET', `/jurado/propuestas/${propId}/archivo`, { como: evaluador });
    comprobar('el jurado descarga el PDF', pdfJurado.estado === 200, `(${pdfJurado.estado})`);

    const pdfAjeno = await pedir('GET', `/jurado/propuestas/${propId}/archivo`, { como: 'ana' });
    comprobar('un participante NO baja el PDF por la ruta del jurado', pdfAjeno.estado === 403, `(${pdfAjeno.estado})`);
  }
}

// === 7 · Resultados ===
fase('7 · Resultados');
{
  const calc = await pedir('POST', '/admin/resultados/calcular', { como: 'admin', cuerpo: {} });
  comprobar('POST /admin/resultados/calcular -> 2xx', calc.estado < 300, `(${calc.estado}) ${recorte(calc.datos)}`);

  const antes = await pedir('GET', '/mi-resultado', { como: 'ana' });
  comprobar('GET /mi-resultado antes de publicar -> publicado:false', antes.estado === 200 && antes.datos?.publicado === false, `(${antes.estado}) ${recorte(antes.datos)}`);
  comprobar('NUNCA hay puntaje en /mi-resultado', !/puntaje|score|nota|promedio/i.test(JSON.stringify(antes.datos ?? {})), recorte(antes.datos));

  const pub = await pedir('POST', '/admin/resultados/publicar', { como: 'admin', cuerpo: { forzar: true } });
  comprobar('POST /admin/resultados/publicar -> 2xx', pub.estado < 300, `(${pub.estado}) ${recorte(pub.datos)}`);

  const despues = await pedir('GET', '/mi-resultado', { como: 'ana' });
  comprobar('tras publicar -> publicado:true', despues.datos?.publicado === true, recorte(despues.datos));
  comprobar('sigue sin haber puntaje', !/puntaje|score|nota|promedio/i.test(JSON.stringify(despues.datos ?? {})), recorte(despues.datos));

  const ranking = await pedir('GET', '/admin/resultados', { como: 'admin' });
  comprobar('GET /admin/resultados (interno) -> 200', ranking.estado === 200, `(${ranking.estado})`);

  const c13 = await sql(`select codigo, count(*)::int as n from envios where codigo in ('c13a', 'c13b') group by codigo`);
  const cuenta = Object.fromEntries(c13.map((f) => [f.codigo, f.n]));
  comprobar('C13a al podio y C13b al resto', cuenta.c13a >= 1 && cuenta.c13b >= 1, recorte(cuenta));
  const conNumeros = await sql(`select count(*)::int as n from envios where codigo in ('c13a','c13b') and datos::text ~* 'puntaje|nota|promedio'`);
  comprobar('NINGUN correo de resultados lleva puntaje', conNumeros[0].n === 0);
}

// === 8 · Límite y correos ===
fase('8 · Limite por IP y correos');
{
  let bloqueado = null;
  for (let i = 0; i < 25 && !bloqueado; i++) {
    const r = await pedir('POST', '/inscripcion', { cuerpo: { ...BASE, correo: `rafaga-${marca}-${i}@test.local` } });
    if (r.estado === 429) bloqueado = r;
  }
  comprobar('muchos envios desde la misma IP -> 429', Boolean(bloqueado), '(nunca corto)');

  await esperar(1500); // que la cola termine de procesar
  const estados = Object.fromEntries(
    (await sql(`select estado, count(*)::int as n from envios group by estado`)).map((f) => [f.estado, f.n]),
  );
  comprobar('en pruebas NINGUN correo sale de verdad (todos "omitido")', !estados.enviado && !estados.fallido && !estados.pendiente && estados.omitido > 0, recorte(estados));
}

await db.end();

console.log(`\n${'='.repeat(62)}`);
console.log(`  ${ok} comprobaciones OK · ${fallos} fallidas`);
if (rotos.length) {
  console.log('\n  Fallan:');
  rotos.forEach((r) => console.log(`   · ${r}`));
}
console.log('='.repeat(62));
process.exit(fallos ? 1 : 0);
