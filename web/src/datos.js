/* ==========================================================
   Contenido del concurso.
   Todo lo que puede cambiar sin tocar el diseño vive acá:
   fechas, premio, jurado y menús. Cambiar una fecha no
   deberia obligar a editar un componente.
   ========================================================== */

/* Grupo de WhatsApp al que se redirige despues de inscribirse.
   PENDIENTE: reemplazar por el enlace real de invitacion del grupo. */
export const enlaceWhatsapp = 'https://chat.whatsapp.com/REEMPLAZAR_CON_EL_LINK_REAL'

export const concurso = {
  titulo: ['Habisite', 'DESIGN', 'CHALLENGE', '2026'],
  premio: '$100.000 ARS',
  // OJO: septiembre tiene 30 dias. Valor tal cual el mockup.
  cierreInscripcion: '31 DE SEPTIEMBRE',
}

export const navegacion = [
  { texto: 'Test 1', href: '#' },
  { texto: 'Test 2', href: '#' },
  { texto: 'Test 3', href: '#' },
]

export const jurado = [
  { id: 1, nombre: 'Nombre', rol: 'Rol', nacionalidad: 'Nacionalidad' },
  { id: 2, nombre: 'Nombre', rol: 'Rol', nacionalidad: 'Nacionalidad' },
  { id: 3, nombre: 'Nombre', rol: 'Rol', nacionalidad: 'Nacionalidad' },
]

/* Bloque de pre-registro. Los campos son los mismos que ya usa
   el formulario de WordPress (hab-nom, hab-ape, hab-email, hab-uni). */
export const preRegistro = {
  rotulo: 'ÚNETE AL CONCURSO',
  tituloClaro: 'Pre-registro',
  tituloFuerte: 'Design Challenge 2026.',
  bajada:
    'Completá tus datos y unite al grupo oficial del concurso. Te avisamos cuando se publiquen las bases y la documentación técnica.',
  terminos:
    'Acepto las bases del concurso y el tratamiento de mis datos para recibir información del Habisite Design Challenge 2026.',
  boton: 'Pre-registrarme',
}

export const camposFormulario = [
  { id: 'nombre', etiqueta: 'NOMBRE', tipo: 'text', ejemplo: 'Juan Carlos', requerido: true, mitad: true },
  { id: 'apellido', etiqueta: 'APELLIDO', tipo: 'text', ejemplo: 'Pérez García', requerido: true, mitad: true },
  { id: 'email', etiqueta: 'CORREO ELECTRÓNICO', tipo: 'email', ejemplo: 'tu@email.com', requerido: true },
  { id: 'universidad', etiqueta: 'UNIVERSIDAD O INSTITUCIÓN', tipo: 'text', ejemplo: 'Ej: UBA, FADU, IED...', requerido: true },
]

export const pie = {
  descripcion:
    'Creamos y promovemos espacios únicos donde la arquitectura, el arte y la naturaleza se integran para ofrecer experiencias memorables.',
  lema: 'Diseña el lugar. Vive la idea.',
  menu: [
    { texto: 'Inicio', href: '#' },
    { texto: 'Nosotros', href: '#' },
    { texto: 'Servicios', href: '#' },
    { texto: 'Contacto', href: '#' },
  ],
  noticias: 'Para más noticias e inspiración sobre diseño de espacios, dejanos tu correo:',
  copyright: '2026 HabiSite. Todos los derechos reservados.',
}
