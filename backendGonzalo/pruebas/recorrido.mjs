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

const API = process.env.API_URL ?? 'http://localhost:3999';
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

  const cr = await pedir('GET', '/criterios', { como: 'j1' });
  const suma = (cr.datos ?? []).reduce((a, c) => a + Number(c.peso), 0);
  comprobar('GET /criterios -> 7 criterios que suman 1', cr.datos?.length === 7 && Math.abs(suma - 1) < 1e-6, `(suma ${suma})`);

  const insc = await pedir('POST', '/inscripcion', {
    cuerpo: {
      correo: `nuevo-${Date.now()}@test.local`,
      nombre: 'Nueva',
      apellido: 'Persona',
      institucion: 'FADU-UBA',
      tipoInstitucion: 'universidad',
      pais: 'AR',
    },
  });
  comprobar('POST /inscripcion sin sesion -> 2xx', insc.estado >= 200 && insc.estado < 300, `(${insc.estado}) ${recorte(insc.datos)}`);

  const dup = await pedir('POST', '/inscripcion', {
    cuerpo: {
      correo: 'ana@test.local',
      nombre: 'Ana',
      apellido: 'Duarte',
      institucion: 'FADU-UBA',
      tipoInstitucion: 'universidad',
      pais: 'AR',
    },
  });
  comprobar('POST /inscripcion repetido -> 409', dup.estado === 409, `(${dup.estado})`);

  const mal = await pedir('POST', '/inscripcion', { cuerpo: { correo: 'no-es-correo', nombre: '' } });
  comprobar('POST /inscripcion invalido -> 400 con detalles[]', mal.estado === 400 && Array.isArray(mal.datos?.detalles), `(${mal.estado})`);
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
    const sumada = await pedir('POST', `/equipos/sumarme/${enlaceToken}`, { como: 'carla', cuerpo: { terminosVersion: '2026-09-01' } });
    comprobar('POST /equipos/sumarme/{token} -> carla se suma', sumada.estado < 300, `(${sumada.estado}) ${recorte(sumada.datos)}`);
  }
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
}

console.log(`\n${'='.repeat(62)}`);
console.log(`  ${ok} comprobaciones OK · ${fallos} fallidas`);
if (rotos.length) {
  console.log('\n  Fallan:');
  rotos.forEach((r) => console.log(`   · ${r}`));
}
console.log('='.repeat(62));
process.exit(fallos ? 1 : 0);
