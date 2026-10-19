import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';
import type { Entorno } from '../configuracion/entorno.js';
import { perfilCompleto } from '../perfiles/perfil.entity.js';
import {
  type FilaInscripto,
  PlanillaRepository,
} from './planilla.repository.js';

/** La pestaña que escribe la API. Si no existe, la crea. */
export const PESTANA = 'Inscripciones';

/** Un rato después de arrancar, como la tarea periódica. */
const PRIMERA_VUELTA_MS = 20_000;

const API = 'https://sheets.googleapis.com/v4/spreadsheets';

const ENCABEZADO = [
  'Fecha de inscripción',
  'Correo',
  'Nombre',
  'Apellido',
  'Teléfono',
  'Tipo',
  'Universidad o trabajo',
  'País',
  'Inscripción completa',
  'Clic al grupo',
  'Recordatorio enviado',
  'Origen',
  'Equipo',
  'En el equipo',
  'Bloqueado',
];

const TIPOS: Record<string, string> = {
  universidad: 'Universidad',
  trabajo: 'Trabajo',
  independiente: 'Independiente',
};

/** «2026-10-19 14:30» en la zona del concurso: se lee bien y se ordena como texto. */
export function fechaCorta(fecha: Date | null, zonaHoraria: string): string {
  if (!fecha) return '';
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(fecha);
}

function enEquipo(f: FilaInscripto): string {
  if (f.estado_en_equipo === 'invitado') return 'Invitado, sin aceptar';
  if (f.estado_en_equipo === 'aceptado')
    return f.es_lider ? 'Líder' : 'Integrante';
  return '';
}

/** Encabezado más una fila por inscripto. */
export function armarFilas(
  inscriptos: FilaInscripto[],
  zonaHoraria: string,
): string[][] {
  const completa = (f: FilaInscripto) =>
    perfilCompleto({
      nombre: f.nombre,
      apellido: f.apellido,
      tipoInstitucion: f.tipo_institucion,
      institucion: f.institucion,
      pais: f.pais,
    });

  return [
    ENCABEZADO,
    ...inscriptos.map((f) => [
      fechaCorta(f.creado_en, zonaHoraria),
      f.correo,
      f.nombre,
      f.apellido,
      f.telefono ?? '',
      f.tipo_institucion ? TIPOS[f.tipo_institucion] : '',
      f.institucion ?? '',
      f.pais ?? '',
      completa(f) ? 'Sí' : 'No',
      fechaCorta(f.clic_grupo_en, zonaHoraria),
      fechaCorta(f.recordatorio_enviado_en, zonaHoraria),
      f.origenes.join(', '),
      f.estado_en_equipo ? f.equipo || 'Sin nombre' : '',
      enEquipo(f),
      f.estado === 'bloqueado' ? 'Sí' : '',
    ]),
  ];
}

/** A, B, … Z, AA: la letra de una columna a partir de su número (1 = A). */
export function letraDeColumna(n: number): string {
  let letra = '';
  for (; n > 0; n = Math.floor((n - 1) / 26))
    letra = String.fromCharCode(65 + ((n - 1) % 26)) + letra;
  return letra;
}

/** Lee la clave de la cuenta de servicio. null si no está o no sirve. */
export function leerCredenciales(
  json: string | undefined,
): { email: string; key: string } | null {
  if (!json) return null;
  try {
    const c = JSON.parse(json) as {
      client_email?: unknown;
      private_key?: unknown;
    };
    if (typeof c.client_email !== 'string' || typeof c.private_key !== 'string')
      return null;
    return { email: c.client_email, key: c.private_key };
  } catch {
    return null;
  }
}

/*
 * Copia las inscripciones a una planilla de Google para el equipo de Habisite
 * (pedido de Jarod, 16.10). Ver docs/13.
 *
 * La base es la fuente de verdad y la planilla, un espejo: cada vuelta
 * reescribe la pestaña entera. Así nunca duplica una fila, se arregla sola si
 * una vuelta falló, y cualquier dato nuevo (el pago, si lo hay) es una
 * columna más. Lo que alguien escriba a mano en esa pestaña se pisa.
 *
 * Los valores van RAW: Sheets no los interpreta, así que un «nombre» que
 * empiece con = queda como texto y no se ejecuta como fórmula.
 *
 * Si la planilla falla, se anota en el log y nada más: la inscripción no
 * depende de esto.
 */
@Injectable()
export class PlanillaService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly log = new Logger(PlanillaService.name);
  private temporizadores: NodeJS.Timeout[] = [];
  private corriendo = false;
  private cliente: JWT | null = null;
  private pestanaLista = false;

  constructor(
    private readonly config: ConfigService<Entorno, true>,
    private readonly repositorio: PlanillaRepository,
  ) {}

  onApplicationBootstrap(): void {
    const minutos = this.config.get('PLANILLA_INTERVALO_MINUTOS', {
      infer: true,
    });
    const json = this.config.get('GOOGLE_SHEETS_CREDENCIALES', { infer: true });
    const planilla = this.config.get('PLANILLA_ID', { infer: true });

    if (minutos === 0 || !json || !planilla) {
      this.log.log(
        'Copia a la planilla apagada (faltan GOOGLE_SHEETS_CREDENCIALES o PLANILLA_ID)',
      );
      return;
    }
    const credenciales = leerCredenciales(json);
    if (!credenciales) {
      this.log.error(
        'GOOGLE_SHEETS_CREDENCIALES no es el JSON de una cuenta de servicio (falta client_email o private_key). La planilla no se copia.',
      );
      return;
    }
    this.cliente = new JWT({
      email: credenciales.email,
      key: credenciales.key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const vuelta = () =>
      void this.copiar().catch((e: Error) =>
        this.log.error(`Falló la copia a la planilla: ${e.message}`),
      );
    this.temporizadores.push(setTimeout(vuelta, PRIMERA_VUELTA_MS));
    this.temporizadores.push(setInterval(vuelta, minutos * 60_000));
    this.log.log(
      `Copia a la planilla cada ${minutos} minutos, como ${credenciales.email}`,
    );
  }

  onModuleDestroy(): void {
    this.temporizadores.forEach((t) => clearTimeout(t));
  }

  /** Una copia completa. Devuelve cuántos inscriptos escribió. */
  async copiar(): Promise<number> {
    if (!this.cliente || this.corriendo) return 0;
    this.corriendo = true;
    try {
      const zona = this.config.get('ZONA_HORARIA', { infer: true });
      const filas = armarFilas(await this.repositorio.inscriptos(), zona);
      // Al costado, para que se vea que la copia está viva.
      const columnaSello = letraDeColumna(ENCABEZADO.length + 2);
      const sello = `Copiada de la plataforma: ${fechaCorta(new Date(), zona)} (${zona})`;

      await this.asegurarPestana();
      await this.escribir(`${PESTANA}!A1`, filas);
      await this.escribir(`${PESTANA}!${columnaSello}1`, [[sello]]);
      // Lo que sobre de una copia anterior más larga.
      await this.pedir(
        'POST',
        `/values/${encodeURIComponent(`${PESTANA}!A${filas.length + 1}:${letraDeColumna(ENCABEZADO.length)}`)}:clear`,
        {},
      );
      return filas.length - 1;
    } finally {
      this.corriendo = false;
    }
  }

  private async asegurarPestana(): Promise<void> {
    if (this.pestanaLista) return;
    const { sheets } = await this.pedir<{
      sheets: { properties: { title: string } }[];
    }>('GET', '?fields=sheets.properties.title');
    if (!sheets.some((s) => s.properties.title === PESTANA)) {
      await this.pedir('POST', ':batchUpdate', {
        requests: [
          {
            addSheet: {
              properties: {
                title: PESTANA,
                index: 0,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          },
        ],
      });
      this.log.log(`Pestaña «${PESTANA}» creada en la planilla`);
    }
    this.pestanaLista = true;
  }

  private escribir(rango: string, valores: string[][]) {
    return this.pedir(
      'PUT',
      `/values/${encodeURIComponent(rango)}?valueInputOption=RAW`,
      { values: valores },
    );
  }

  private async pedir<T = unknown>(
    metodo: 'GET' | 'POST' | 'PUT',
    ruta: string,
    cuerpo?: object,
  ): Promise<T> {
    const planilla = this.config.get('PLANILLA_ID', { infer: true });
    try {
      const { data } = await this.cliente!.request<T>({
        url: `${API}/${planilla}${ruta}`,
        method: metodo,
        data: cuerpo,
      });
      return data;
    } catch (e) {
      // Si la borraron o renombraron, la próxima vuelta la vuelve a buscar.
      this.pestanaLista = false;
      const estado =
        (e as { status?: number; response?: { status?: number } }).status ??
        (e as { response?: { status?: number } }).response?.status;
      if (estado === 403 || estado === 404) {
        throw new Error(
          `${estado}: ¿la planilla está compartida como Editor con la cuenta de servicio y el PLANILLA_ID es el correcto?`,
        );
      }
      throw e;
    }
  }
}
