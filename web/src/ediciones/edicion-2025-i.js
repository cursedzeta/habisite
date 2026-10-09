/* ==========================================================
   1ª edición — Habisite Design Challenge 2025-I

   TODO lo que muestran la sección de la landing y la página
   /concursos-anteriores sale de este archivo. Completar un dato
   pendiente es editar solo acá.

   Fuente: las tres láminas A1 que mandó la organización
   (material/edicion-2025-i/, fuera de git). No hay nada inventado:
   lo que la lámina no dice queda en null y la página lo muestra
   como «próximamente».

   Las imágenes están en public/ediciones/2025-i/<proyecto>/, cada
   una en dos tamaños: <nombre>.webp (lado mayor ~1600 px) y
   <nombre>-600.webp. La lámina completa mide 2800 px de alto.
   ========================================================== */

const BASE = '/ediciones/2025-i'

/* Arma la ficha de una imagen. ancho y alto son los del archivo
   grande; el chico se calcula igual que lo exportó el script
   (lado mayor 600). */
function imagen(carpeta, archivo, ancho, alto, titulo, alt) {
  return {
    src: `${BASE}/${carpeta}/${archivo}.webp`,
    srcChico: `${BASE}/${carpeta}/${archivo}-600.webp`,
    ancho,
    alto,
    anchoChico: ancho >= alto ? 600 : Math.round((600 * ancho) / alto),
    titulo,
    alt,
  }
}

const TRES = 'tres-horizontes'
const MOLDES = 'entre-agua-fuego-y-cielo'
const FEATHER = 'the-feather'

export const EDICION_2025_I = {
  nombre: 'Habisite Design Challenge 2025-I',
  numero: '1ª edición',

  /* Deducido de las tres láminas: las tres resuelven el mismo programa.
     Va en minúscula porque se usa dentro de una frase: «Las tres
     propuestas responden al mismo reto: …». */
  reto:
    'un conjunto ecoturístico de tres unidades de alojamiento y un espacio social común, implantado en un paisaje natural.',

  // PENDIENTE: cifras de la 1ª edición (CLAUDE.md §8, punto 5).
  propuestasRecibidas: null,
  paisesParticipantes: null,

  // PENDIENTE: el jurado de la 1ª edición. Cada uno: { nombre, rol, foto }.
  jurado: [],

  proyectos: [
    {
      id: TRES,
      /* Solo el ganador tiene puesto. El 2º y el 3º no se conocen:
         los otros dos van como finalistas, sin número. */
      puesto: 1,
      distincion: 'Ganador · 1er puesto',
      titulo: 'Tres Horizontes',
      lema: 'Arquitectura para habitar el tiempo',
      autores: 'Arq. Jarod Daza',
      // PENDIENTE: universidad y país del autor, y su foto.
      universidad: null,
      paisAutor: null,
      fotoEquipo: null,
      lugar: 'Valle del Cocora, Colombia',
      datos: [
        ['Lugar', 'Valle del Cocora, Colombia'],
        ['Programa', 'Tres refugios y un hub social'],
        ['Refugios', '50 m² cada uno · 35 cubiertos y 15 semicubiertos'],
        ['Hub social', '100 m², planta circular'],
      ],
      memoria: [
        '¿Cómo puede la arquitectura convertir el paso del tiempo en una experiencia habitable? Implantado en el Valle del Cocora, el proyecto interpreta la palma de cera como símbolo de conexión entre tierra y cielo, entre el habitante y su territorio.',
        'La propuesta transforma el ciclo solar en arquitectura mediante tres horizontes temporales, uno por refugio. Un hub central articula esas experiencias y convierte el tiempo, el paisaje y la comunidad en un único sistema habitable.',
      ],
      claves: [
        {
          rotulo: 'Amanecer',
          titulo: 'Contemplar',
          texto: 'Un refugio entre las palmas donde la luz inicial del día despierta los sentidos y revela el paisaje.',
        },
        {
          rotulo: 'Atardecer',
          titulo: 'Crear',
          texto: 'Un espacio de encuentro donde la transición de la luz acompaña la interacción, el intercambio y la creación colectiva.',
        },
        {
          rotulo: 'Noche',
          titulo: 'Reflexionar',
          texto: 'Un lugar orientado al cielo donde el silencio y la oscuridad permiten reconectar con uno mismo.',
        },
      ],
      cita: 'Habitar el tiempo antes que ocupar el espacio.',
      portada: imagen(
        TRES,
        'vista-general',
        1383,
        922,
        'Vista general',
        'Vista aérea al atardecer del conjunto Tres Horizontes: el hub social de cubierta tensada en el centro y los refugios de madera entre palmas de cera, con el valle cubierto de niebla al fondo.',
      ),
      galeria: [
        imagen(
          TRES,
          'implantacion',
          1472,
          1600,
          'Implantación',
          'Planta de implantación sobre el bosque: el hub circular al centro, tres refugios alargados en abanico y los senderos elevados que los unen.',
        ),
        imagen(
          TRES,
          'hub-social-atardecer',
          1600,
          1295,
          'Hub social',
          'Render del hub social al atardecer: una gran cubierta curva sobre una plataforma de madera con mesas y un fogón, rodeada de palmas.',
        ),
        imagen(
          TRES,
          'interior-refugio',
          717,
          448,
          'Interior de un refugio',
          'Interior de un refugio con cama, tragaluz circular y ventanales de piso a techo hacia el bosque de palmas en la niebla.',
        ),
        imagen(
          TRES,
          'corte-longitudinal',
          1420,
          710,
          'Corte longitudinal general',
          'Corte longitudinal del conjunto: dos refugios elevados sobre pilotes a los lados del hub social, unidos por la pasarela, con palmas de fondo.',
        ),
        imagen(
          TRES,
          'horizonte-1-y-hub-plantas-cortes',
          1536,
          1024,
          'Horizonte 1 y hub social: plantas, cortes y fachadas',
          'Lámina técnica con la planta, los cortes y las fachadas del refugio Horizonte 1 y la planta circular del hub social.',
        ),
      ],
      lamina: imagen(
        TRES,
        'lamina-completa',
        1978,
        2800,
        'Lámina completa',
        'Lámina A1 completa del proyecto Tres Horizontes, con memoria, implantación, renders, cortes, esquemas y plantas.',
      ),
    },

    {
      id: MOLDES,
      puesto: null,
      distincion: 'Finalista',
      titulo: 'Entre agua, fuego y cielo',
      lema: 'Arquitectura eco-turística · Habitar el paisaje, contemplar y permanecer',
      /* La lámina no nombra a los autores: sale del nombre del archivo
         (CONCURSO_MOLDES-ARANDIA_A1). CONFIRMAR los nombres completos. */
      autores: 'Equipo Moldes · Arandia',
      universidad: null,
      paisAutor: null,
      fotoEquipo: null,
      lugar: 'Paisaje andino',
      datos: [
        ['Lugar', 'Paisaje andino, junto a un lago'],
        ['Programa', 'Tres unidades habitacionales y un pabellón social'],
        ['Geometría', 'Hexagonal, inspirada en los panales de abeja'],
      ],
      memoria: [
        'Un complejo ecoturístico de residencia temporal concebido como una experiencia inmersiva en el paisaje andino. La geometría hexagonal de los panales de abeja da eficiencia espacial, estabilidad estructural y capacidad de crecimiento modular, y le otorga al conjunto una identidad unificada.',
        'La implantación aprovecha la pendiente natural del terreno para organizar una secuencia escalonada que conecta el agua, el encuentro y la contemplación: tres unidades independientes y un pabellón social central, articulados por senderos, terrazas y espacios exteriores.',
        'Amplias superficies vidriadas abren cada volumen al lago y al bosque. Sistemas constructivos modulares, materiales de bajo impacto y estrategias pasivas de iluminación y ventilación minimizan la intervención sobre el paisaje.',
      ],
      claves: [],
      cita: null,
      portada: imagen(
        MOLDES,
        'conjunto-junto-al-lago',
        1600,
        777,
        'El conjunto junto al lago',
        'Render al anochecer de las cabañas de madera oscura y volumen facetado, escalonadas en la ladera entre pinos, con una plaza de fogata frente al lago.',
      ),
      galeria: [
        imagen(
          MOLDES,
          'planimetria',
          1600,
          1294,
          'Planimetría',
          'Planimetría en acuarela: tres cabañas y el hub social alrededor de una plaza hexagonal con fogata, en una península junto al agua.',
        ),
        imagen(
          MOLDES,
          'cabana-exterior',
          1600,
          881,
          'Cabaña',
          'Render exterior de una cabaña de madera de perfil hexagonal con gran vidriado, deck y sillas colgantes, en el bosque al atardecer.',
        ),
        imagen(
          MOLDES,
          'area-de-fogata',
          1600,
          1036,
          'Área de fogata',
          'Plaza empedrada con una fogata encendida entre dos cabañas iluminadas, rodeadas de pinos.',
        ),
        imagen(
          MOLDES,
          'interior-cabana',
          1600,
          1039,
          'Interior de cabaña',
          'Dormitorio de una cabaña revestido en madera, con lámparas colgantes, escalera y una ventana al bosque.',
        ),
        imagen(
          MOLDES,
          'corte-hub-social',
          1600,
          490,
          'Corte longitudinal · hub social',
          'Corte longitudinal del hub social: un volumen hexagonal de dos niveles apoyado en la pendiente.',
        ),
        imagen(
          MOLDES,
          'corte-cabana',
          1600,
          494,
          'Corte longitudinal · cabaña',
          'Corte longitudinal de una cabaña facetada en la ladera, abierta hacia el lago.',
        ),
        imagen(
          MOLDES,
          'hub-social-plantas',
          1600,
          1073,
          'Plantas del hub social',
          'Plantas amobladas del hub social en sus dos niveles: comedor, cocina y juegos abajo; estar y terraza arriba.',
        ),
        imagen(
          MOLDES,
          'conjunto-de-noche',
          1354,
          758,
          'El conjunto de noche',
          'Las cabañas iluminadas junto al lago bajo un cielo nocturno con la Vía Láctea.',
        ),
      ],
      lamina: imagen(
        MOLDES,
        'lamina-completa',
        1978,
        2800,
        'Lámina completa',
        'Lámina A1 completa del proyecto Entre agua, fuego y cielo, con renders, memoria conceptual, planimetría, plantas y cortes.',
      ),
    },

    {
      id: FEATHER,
      puesto: null,
      distincion: 'Finalista',
      titulo: 'The Feather',
      lema: 'Eco-Lodge Villa Altagracia',
      autores: 'Anirelys Rodríguez Vargas',
      universidad: null,
      paisAutor: null,
      fotoEquipo: null,
      lugar: 'Villa Altagracia, San Cristóbal, República Dominicana',
      datos: [
        ['Lugar', 'Villa Altagracia, República Dominicana'],
        ['Programa', 'Tres cabañas sobre pilotes y un módulo social'],
        ['Superficie', '250 m² en un terreno de 2.965 m²'],
        ['Materialidad', 'Envolvente de madera de acacia local'],
      ],
      memoria: [
        'Un proyecto ecoturístico de 250 m² concebido como un manifiesto de arquitectura regenerativa, diseñado para fundirse con el paisaje forestal y el lago. La premisa es la preservación absoluta de la naturaleza: un refugio para aves en peligro de extinción, con una envolvente transpirable de madera de acacia local sobre núcleos de hormigón y cristal.',
        'Las tres cabañas se elevan un metro sobre pilotes: protegen el suelo, dejan pasar a la fauna y ganan las visuales del bosque. La habitación ocupa la mezanina, desde donde se divisa el paisaje y la avifauna.',
        'El módulo social reúne micro-cowork, biblioteca, música, talleres de pintura y una zona gastronómica con showcooking que se abre hacia las áreas verdes y el lago.',
      ],
      claves: [],
      cita: 'La arquitectura no domina el paisaje; se convierte en el lente a través del cual el ser humano contempla, comprende y protege la fragilidad de la vida silvestre de Villa Altagracia.',
      portada: imagen(
        FEATHER,
        'vista-aerea',
        1536,
        1024,
        'Vista aérea',
        'Vista aérea del eco-lodge: el módulo social circular en el centro de un claro, tres cabañas conectadas por senderos y el lago al fondo.',
      ),
      galeria: [
        imagen(
          FEATHER,
          'sendero-y-cabanas',
          1280,
          853,
          'Sendero y cabañas',
          'Render de una pasarela de madera que atraviesa la vegetación hacia las cabañas de celosía de madera, al atardecer.',
        ),
        imagen(
          FEATHER,
          'cabana-sobre-pilotes',
          1280,
          837,
          'Cabaña sobre pilotes',
          'Cabaña de volúmenes en voladizo con envolvente de celosía de madera, elevada sobre la ladera.',
        ),
        imagen(
          FEATHER,
          'ilustracion-acceso',
          1264,
          842,
          'Ilustración del acceso',
          'Ilustración del acceso: un pórtico de celosía de madera, cabañas elevadas y visitantes caminando entre palmas.',
        ),
        imagen(
          FEATHER,
          'implantacion',
          1536,
          1024,
          'Implantación',
          'Vista cenital de la implantación: el módulo social circular y las cabañas distribuidas en el bosque, con senderos radiales.',
        ),
        imagen(
          FEATHER,
          'axonometria-explotada',
          1264,
          842,
          'Axonometría explotada',
          'Axonometría explotada del sistema: el microclima del hábitat de avifauna, la plataforma de servicios y la envolvente de celosía.',
        ),
        imagen(
          FEATHER,
          'secciones-modulo-social',
          1135,
          928,
          'Secciones del módulo social',
          'Secciones arquitectónicas norte-sur y este-oeste del módulo social, elevado sobre el terreno.',
        ),
        imagen(
          FEATHER,
          'boceto-concepto',
          967,
          515,
          'Boceto del concepto',
          'Boceto a mano: la estructura de celosía del proyecto junto al dibujo de una pluma, que da nombre a la propuesta.',
        ),
      ],
      lamina: imagen(
        FEATHER,
        'lamina-completa',
        1977,
        2800,
        'Lámina completa',
        'Lámina A1 completa del proyecto The Feather, con memoria, proceso conceptual, bocetos, renders, plantas y secciones.',
      ),
    },
  ],
}

export const GANADOR = EDICION_2025_I.proyectos.find((p) => p.puesto === 1)
export const FINALISTAS = EDICION_2025_I.proyectos.filter((p) => p.puesto !== 1)
