/*
 * Las plantillas de los correos. El catálogo y el porqué de cada uno están en
 * docs/10-correos.md.
 *
 * Cada plantilla recibe los datos y devuelve asunto, HTML y texto plano. El
 * texto plano no es opcional: sin él, los filtros de spam desconfían.
 *
 * El HTML va con tablas y estilos en línea porque es lo único que respetan
 * todos los clientes de correo (Gmail descarta los <style>, Outlook ignora
 * flexbox). Los colores son los de la identidad: tinta, naranja y crema.
 */

export type CodigoCorreo =
  | 'c1'
  | 'c2'
  | 'c3'
  | 'c4'
  | 'c5'
  | 'c7'
  | 'c8'
  | 'c9'
  | 'c13a'
  | 'c13b'
  | 'c14';

export interface CorreoArmado {
  asunto: string;
  html: string;
  texto: string;
}

// ── Los datos de cada correo ─────────────────────────────────────────

export interface DatosC1 {
  nombre: string | null;
  enlaceGrupo: string;
  terminosUrl: string | null;
}
export interface DatosC2 {
  enlaceGrupo: string;
  enlaceCompletar: string;
}
export type DatosC3 = DatosC2;
export interface DatosC4 {
  lider: string;
  equipo: string | null;
  enlace: string;
  terminosUrl: string | null;
}
export interface DatosC5 {
  quienSeFue: string;
  nuevoLider: string | null;
  equipo: string | null;
}
export interface DatosC7 {
  nombre: string | null;
  enlaceIngreso: string;
}
export interface DatosC8 {
  titulo: string;
  archivo: string;
  fecha: string;
  reemplazo: boolean;
  enlacePanel: string;
}
export interface DatosC9 {
  titulo: string;
  archivo: string;
  enlacePanel: string;
}
export interface DatosC13a {
  posicion: number;
  titulo: string;
  enlacePanel: string;
}
export interface DatosC13b {
  enlacePanel: string;
}
export interface DatosC14 {
  nombre: string | null;
  enlace: string;
  minutos: number;
}

export interface DatosPorCodigo {
  c1: DatosC1;
  c2: DatosC2;
  c3: DatosC3;
  c4: DatosC4;
  c5: DatosC5;
  c7: DatosC7;
  c8: DatosC8;
  c9: DatosC9;
  c13a: DatosC13a;
  c13b: DatosC13b;
  c14: DatosC14;
}

// ── Piezas comunes ───────────────────────────────────────────────────

const TINTA = '#0A0B0D';
const NARANJA = '#E43301';
const CREMA = '#FFFAE6';
const GRIS = '#55585E';
const FUENTE = "Montserrat, 'Helvetica Neue', Arial, sans-serif";

/**
 * Todo lo que escribe un usuario (un nombre, el título de una propuesta) pasa
 * por acá. Sin esto, alguien que se llame `<a href=…>` mete un enlace en el
 * correo que le llega a su equipo.
 */
export const esc = (texto: string | number | null | undefined): string =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const parrafo = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${FUENTE};font-size:16px;line-height:1.6;color:${TINTA};">${html}</p>`;

const boton = (texto: string, url: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
    <tr><td style="border-radius:999px;background:${NARANJA};">
      <a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font-family:${FUENTE};font-size:15px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:999px;">${esc(texto)}</a>
    </td></tr>
  </table>`;

const enlaceSecundario = (texto: string, url: string) =>
  `<a href="${esc(url)}" style="color:${NARANJA};font-weight:600;">${esc(texto)}</a>`;

const nota = (html: string) =>
  `<p style="margin:0 0 16px;font-family:${FUENTE};font-size:14px;line-height:1.6;color:${GRIS};">${html}</p>`;

/*
 * Los correos salen de noreply@habisite.com y nadie los lee: lo que llega ahí
 * lo descarta Cloudflare. Por eso el pie no invita a responder, sino que
 * manda al canal oficial, que es el grupo de WhatsApp. El jurado no está en
 * ese grupo: a ellos les habla la organización directo.
 */
const PIE_CONCURSANTE = {
  html: 'Este correo se envía automáticamente y no recibe respuestas.<br>Las consultas del concurso se responden en el grupo oficial.',
  texto: 'Este correo se envía automáticamente y no recibe respuestas. Las consultas del concurso se responden en el grupo oficial.',
};
const PIE_JURADO = {
  html: 'Este correo se envía automáticamente y no recibe respuestas.<br>Ante cualquier duda, contacta a la organización del concurso.',
  texto: 'Este correo se envía automáticamente y no recibe respuestas. Ante cualquier duda, contacta a la organización del concurso.',
};

/** El marco de todos los correos: barra de marca, cuerpo y pie. */
function marco(titulo: string, cuerpo: string, pie: string = PIE_CONCURSANTE.html): string {
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title></head>
<body style="margin:0;padding:0;background:${CREMA};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREMA};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:24px;overflow:hidden;">
        <tr><td style="background:${TINTA};padding:24px 32px;">
          <span style="font-family:${FUENTE};font-size:20px;font-weight:700;color:#FFFFFF;letter-spacing:-0.01em;">Habi<span style="color:${NARANJA};">site</span></span>
          <span style="display:block;margin-top:4px;font-family:${FUENTE};font-size:11px;font-weight:600;letter-spacing:0.18em;color:${CREMA};">CHALLENGE 2026-II</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 20px;font-family:${FUENTE};font-size:24px;line-height:1.25;font-weight:700;color:${TINTA};">${esc(titulo)}</h1>
          ${cuerpo}
        </td></tr>
        <tr><td style="padding:20px 32px;background:${CREMA};font-family:${FUENTE};font-size:12px;line-height:1.6;color:${GRIS};">
          ${pie}<br>
          Habisite · Estudio latinoamericano de diseño de espacios
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** El texto plano: mismo contenido, sin formato. */
const plano = (titulo: string, ...renglones: (string | null | false)[]) =>
  [titulo, '', ...renglones.filter((r): r is string => typeof r === 'string'), '', '—', 'Habisite Challenge 2026-II', PIE_CONCURSANTE.texto].join('\n');

const saludo = (nombre: string | null) => (nombre ? `Hola, ${nombre}:` : 'Hola:');

const PUESTOS: Record<number, string> = { 1: 'primer', 2: 'segundo', 3: 'tercer' };

// ── Las plantillas ───────────────────────────────────────────────────

const plantillas: { [C in CodigoCorreo]: (d: DatosPorCodigo[C]) => CorreoArmado } = {
  c1: (d) => {
    const titulo = 'Ya estás inscrito en el Habisite Challenge';
    return {
      asunto: 'Ya estás inscrito en el Habisite Challenge 2026-II',
      html: marco(
        titulo,
        parrafo(esc(saludo(d.nombre))) +
          parrafo('Tu inscripción quedó registrada. En el grupo oficial compartimos las bases, el calendario y el acceso a la plataforma.') +
          boton('Entrar al grupo oficial', d.enlaceGrupo) +
          nota('<strong>Importante:</strong> a la plataforma vas a entrar con <strong>este mismo correo</strong>: con su cuenta de Google o con un enlace que te enviamos acá.') +
          (d.terminosUrl ? nota(`Puedes volver a leer ${enlaceSecundario('las bases del concurso', d.terminosUrl)} cuando quieras.`) : ''),
      ),
      texto: plano(
        titulo,
        saludo(d.nombre),
        'Tu inscripción quedó registrada. En el grupo oficial compartimos las bases, el calendario y el acceso a la plataforma.',
        '',
        `Entrar al grupo oficial: ${d.enlaceGrupo}`,
        '',
        'Importante: a la plataforma vas a entrar con este mismo correo: con su cuenta de Google o con un enlace que te enviamos acá.',
        d.terminosUrl ? `Las bases: ${d.terminosUrl}` : null,
      ),
    };
  },

  c2: (d) => {
    const titulo = 'Te falta un paso';
    return {
      asunto: 'Te falta un paso para el Habisite Challenge',
      html: marco(
        titulo,
        parrafo('Hola:') +
          parrafo('Recibimos tu correo, pero tu inscripción quedó incompleta. Completarla te lleva un minuto:') +
          boton('Completar mi inscripción', d.enlaceCompletar) +
          parrafo('Y mientras tanto, súmate al grupo oficial: ahí compartimos las bases, el calendario y el acceso a la plataforma.') +
          nota(enlaceSecundario('Entrar al grupo oficial →', d.enlaceGrupo)),
      ),
      texto: plano(
        titulo,
        'Hola:',
        'Recibimos tu correo, pero tu inscripción quedó incompleta. Completarla te lleva un minuto:',
        d.enlaceCompletar,
        '',
        'Y mientras tanto, súmate al grupo oficial, donde compartimos las bases, el calendario y el acceso a la plataforma:',
        d.enlaceGrupo,
      ),
    };
  },

  c3: (d) => {
    const titulo = '¿Te sumaste al grupo?';
    return {
      asunto: 'Recordatorio: el grupo oficial del Habisite Challenge',
      html: marco(
        titulo,
        parrafo('Hola:') +
          parrafo('Hace un par de días te anotaste en el Habisite Challenge 2026-II. Todo lo importante pasa en el grupo oficial: las bases, el calendario y el acceso a la plataforma.') +
          boton('Entrar al grupo oficial', d.enlaceGrupo) +
          nota(`Y si quieres dejar lista tu inscripción: ${enlaceSecundario('completar mis datos', d.enlaceCompletar)}.`) +
          nota('Es el único recordatorio que te vamos a mandar.'),
      ),
      texto: plano(
        titulo,
        'Hola:',
        'Hace un par de días te anotaste en el Habisite Challenge 2026-II. Todo lo importante pasa en el grupo oficial: las bases, el calendario y el acceso a la plataforma.',
        '',
        `Entrar al grupo oficial: ${d.enlaceGrupo}`,
        `Completar mis datos: ${d.enlaceCompletar}`,
        '',
        'Es el único recordatorio que te vamos a mandar.',
      ),
    };
  },

  c4: (d) => {
    const equipo = d.equipo ? ` «${d.equipo}»` : '';
    const titulo = `${d.lider} te invitó a su equipo`;
    return {
      asunto: `${d.lider} te invitó a su equipo del Habisite Challenge`,
      html: marco(
        titulo,
        parrafo('Hola:') +
          parrafo(`<strong>${esc(d.lider)}</strong> te sumó a su equipo${esc(equipo)} para presentar una propuesta en el Habisite Challenge 2026-II, el concurso de arquitectura para estudiantes y jóvenes profesionales de Latinoamérica.`) +
          boton('Confirmar mi participación', d.enlace) +
          nota('Vas a entrar con tu cuenta de Google. Puede ser cualquiera: el enlace te reconoce igual.') +
          (d.terminosUrl
            ? nota(`Al confirmar aceptas ${enlaceSecundario('los términos y condiciones del concurso', d.terminosUrl)}.`)
            : nota('Al confirmar aceptas los términos y condiciones del concurso.')),
      ),
      texto: plano(
        titulo,
        'Hola:',
        `${d.lider} te sumó a su equipo${equipo} para presentar una propuesta en el Habisite Challenge 2026-II.`,
        '',
        `Confirmar mi participación: ${d.enlace}`,
        '',
        'Vas a entrar con tu cuenta de Google. Puede ser cualquiera: el enlace te reconoce igual.',
        d.terminosUrl
          ? `Al confirmar aceptas los términos y condiciones: ${d.terminosUrl}`
          : 'Al confirmar aceptas los términos y condiciones del concurso.',
      ),
    };
  },

  c5: (d) => {
    const titulo = `${d.quienSeFue} dejó el equipo`;
    const lider = d.nuevoLider
      ? `Como era quien armó el equipo, ahora la persona responsable es <strong>${esc(d.nuevoLider)}</strong>.`
      : null;
    return {
      asunto: `${d.quienSeFue} dejó tu equipo del Habisite Challenge`,
      html: marco(
        titulo,
        parrafo('Hola:') +
          parrafo(`<strong>${esc(d.quienSeFue)}</strong> se dio de baja de tu equipo${d.equipo ? ` «${esc(d.equipo)}»` : ''}. Ya no figura como autor de la propuesta.`) +
          (lider ? parrafo(lider) : '') +
          nota('La propuesta sigue siendo del equipo: nada de lo que subieron se perdió.'),
      ),
      texto: plano(
        titulo,
        'Hola:',
        `${d.quienSeFue} se dio de baja de tu equipo${d.equipo ? ` «${d.equipo}»` : ''}. Ya no figura como autor de la propuesta.`,
        d.nuevoLider ? `Como era quien armó el equipo, ahora la persona responsable es ${d.nuevoLider}.` : null,
        '',
        'La propuesta sigue siendo del equipo: nada de lo que subieron se perdió.',
      ),
    };
  },

  c7: (d) => {
    const titulo = 'Te invitamos a ser jurado';
    return {
      asunto: 'Te invitamos a ser jurado del Habisite Challenge 2026-II',
      html: marco(
        titulo,
        parrafo(esc(saludo(d.nombre))) +
          parrafo('Te sumamos como jurado del Habisite Challenge 2026-II. Desde la plataforma vas a poder leer las propuestas sin descargar nada y cargar tu evaluación.') +
          boton('Entrar a la plataforma', d.enlaceIngreso) +
          nota('<strong>Importante:</strong> entra con <strong>este mismo correo</strong>: con su cuenta de Google o pidiendo un enlace que te llega acá. Con otro correo, la plataforma no te va a reconocer.'),
        PIE_JURADO.html,
      ),
      texto: plano(
        titulo,
        saludo(d.nombre),
        'Te sumamos como jurado del Habisite Challenge 2026-II. Desde la plataforma vas a poder leer las propuestas sin descargar nada y cargar tu evaluación.',
        '',
        `Entrar a la plataforma: ${d.enlaceIngreso}`,
        '',
        'Importante: entra con este mismo correo: con su cuenta de Google o pidiendo un enlace que te llega acá. Con otro correo, la plataforma no te va a reconocer.',
      ).replace(PIE_CONCURSANTE.texto, PIE_JURADO.texto),
    };
  },

  c8: (d) => {
    const titulo = d.reemplazo ? 'Actualizaron el archivo de tu propuesta' : 'Recibimos tu propuesta';
    const intro = d.reemplazo
      ? 'Tu equipo reemplazó el archivo de la propuesta. Este es el nuevo comprobante:'
      : 'Tu equipo confirmó la entrega. Este es tu comprobante:';
    return {
      asunto: d.reemplazo
        ? 'Nuevo comprobante de entrega · Habisite Challenge'
        : 'Comprobante de entrega · Habisite Challenge',
      html: marco(
        titulo,
        parrafo('Hola:') +
          parrafo(intro) +
          `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;background:${CREMA};border-radius:16px;">
             <tr><td style="padding:20px 24px;font-family:${FUENTE};font-size:15px;line-height:1.8;color:${TINTA};">
               <strong>Propuesta:</strong> ${esc(d.titulo || 'Sin título')}<br>
               <strong>Archivo:</strong> ${esc(d.archivo)}<br>
               <strong>Fecha:</strong> ${esc(d.fecha)}
             </td></tr>
           </table>` +
          nota('Hasta el cierre puedes reemplazar el archivo desde la plataforma; te llegará un comprobante nuevo.') +
          nota(enlaceSecundario('Ver mi propuesta →', d.enlacePanel)),
      ),
      texto: plano(
        titulo,
        'Hola:',
        intro,
        '',
        `Propuesta: ${d.titulo || 'Sin título'}`,
        `Archivo: ${d.archivo}`,
        `Fecha: ${d.fecha}`,
        '',
        'Hasta el cierre puedes reemplazar el archivo desde la plataforma; te llegará un comprobante nuevo.',
        `Ver mi propuesta: ${d.enlacePanel}`,
      ),
    };
  },

  c9: (d) => {
    const titulo = 'Tu propuesta quedó entregada';
    return {
      asunto: 'Tu propuesta quedó entregada · Habisite Challenge',
      html: marco(
        titulo,
        parrafo('Hola:') +
          parrafo('Cerró el plazo de entregas. Tu equipo había subido el archivo pero no llegó a confirmar la entrega, así que <strong>la entregamos automáticamente</strong>: tu propuesta compite igual.') +
          `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;background:${CREMA};border-radius:16px;">
             <tr><td style="padding:20px 24px;font-family:${FUENTE};font-size:15px;line-height:1.8;color:${TINTA};">
               <strong>Propuesta:</strong> ${esc(d.titulo || 'Sin título')}<br>
               <strong>Archivo:</strong> ${esc(d.archivo)}
             </td></tr>
           </table>` +
          nota(enlaceSecundario('Ver mi propuesta →', d.enlacePanel)),
      ),
      texto: plano(
        titulo,
        'Hola:',
        'Cerró el plazo de entregas. Tu equipo había subido el archivo pero no llegó a confirmar la entrega, así que la entregamos automáticamente: tu propuesta compite igual.',
        '',
        `Propuesta: ${d.titulo || 'Sin título'}`,
        `Archivo: ${d.archivo}`,
        '',
        `Ver mi propuesta: ${d.enlacePanel}`,
      ),
    };
  },

  c13a: (d) => {
    const puesto = PUESTOS[d.posicion] ?? `${d.posicion}.º`;
    const titulo = '¡Tu propuesta está en el podio!';
    return {
      asunto: `¡Felicitaciones! Tu propuesta obtuvo el ${puesto} puesto`,
      html: marco(
        titulo,
        parrafo('Hola:') +
          parrafo(`Se publicaron los resultados del Habisite Challenge 2026-II y la propuesta de tu equipo, <strong>«${esc(d.titulo || 'Sin título')}»</strong>, obtuvo el <strong>${esc(puesto)} puesto</strong>.`) +
          parrafo('En los próximos días te contactamos para coordinar la entrega del premio.') +
          boton('Ver en la plataforma', d.enlacePanel),
      ),
      texto: plano(
        titulo,
        'Hola:',
        `Se publicaron los resultados del Habisite Challenge 2026-II y la propuesta de tu equipo, «${d.titulo || 'Sin título'}», obtuvo el ${puesto} puesto.`,
        'En los próximos días te contactamos para coordinar la entrega del premio.',
        '',
        `Ver en la plataforma: ${d.enlacePanel}`,
      ),
    };
  },

  // Nunca dice «no ganaste», ni un puesto, ni un puntaje: solo que ya están.
  c13b: (d) => {
    const titulo = 'Ya se publicaron los resultados';
    return {
      asunto: 'Ya se publicaron los resultados del Habisite Challenge',
      html: marco(
        titulo,
        parrafo('Hola:') +
          parrafo('Se publicaron los resultados del Habisite Challenge 2026-II. Gracias por presentar tu propuesta: fue un placer ver tu trabajo.') +
          boton('Ver los resultados', d.enlacePanel),
      ),
      texto: plano(
        titulo,
        'Hola:',
        'Se publicaron los resultados del Habisite Challenge 2026-II. Gracias por presentar tu propuesta: fue un placer ver tu trabajo.',
        '',
        `Ver los resultados: ${d.enlacePanel}`,
      ),
    };
  },

  // El enlace para entrar sin Google (docs/12). Sale para cualquier rol,
  // así que el pie es el neutro del jurado y no manda al grupo.
  c14: (d) => {
    const titulo = 'Tu enlace para entrar';
    const aviso = `El enlace vence en ${d.minutos} minutos y sirve una sola vez. Si no lo pediste, ignora este correo: nadie puede entrar sin abrirlo.`;
    return {
      asunto: 'Tu enlace para entrar a la plataforma · Habisite Challenge',
      html: marco(
        titulo,
        parrafo(esc(saludo(d.nombre))) +
          parrafo('Pediste entrar a la plataforma del Habisite Challenge con este correo. Toca el botón para entrar directo, sin contraseña.') +
          boton('Entrar a la plataforma', d.enlace) +
          nota(esc(aviso)),
        PIE_JURADO.html,
      ),
      texto: plano(
        titulo,
        saludo(d.nombre),
        'Pediste entrar a la plataforma del Habisite Challenge con este correo. Abre este enlace para entrar directo, sin contraseña:',
        '',
        d.enlace,
        '',
        aviso,
      ).replace(PIE_CONCURSANTE.texto, PIE_JURADO.texto),
    };
  },
};

export function armarCorreo<C extends CodigoCorreo>(codigo: C, datos: DatosPorCodigo[C]): CorreoArmado {
  return plantillas[codigo](datos);
}
