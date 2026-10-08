import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../configuracion/entorno.js';
import { CorreoService } from '../correo/correo.service.js';
import { Enlaces } from '../correo/enlaces.js';
import { EdicionService } from '../edicion/edicion.service.js';
import { PerfilesRepository } from '../perfiles/perfiles.repository.js';

/** Un rato después de arrancar: que la API termine de levantar antes. */
const PRIMERA_VUELTA_MS = 30_000;

export interface ResumenTarea {
  cierreDeEntregas: boolean;
  recordatorios: number;
  correosReintentados: number;
}

/*
 * El reloj de la API. Cada TAREA_INTERVALO_MINUTOS (30 por defecto):
 *
 *   1. Cierra las entregas si venció el plazo con el margen, y avisa (C9).
 *   2. Manda el recordatorio único (C3) a quien dejó solo el correo hace más
 *      de 2 días y no hizo clic al grupo.
 *   3. Vuelve a meter en la cola los correos que no salieron.
 *
 * Corre adentro del mismo proceso: no es un servicio aparte en Railway ni
 * suma costo. La condición es que la API esté siempre prendida (App Sleeping
 * apagado). Si estuvo caída, al volver hace lo atrasado.
 *
 * Por qué no los recordatorios programados de Resend: la clave de solo envío
 * no puede cancelarlos (probado el 08.10, docs/09).
 */
@Injectable()
export class TareaPeriodicaService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(TareaPeriodicaService.name);
  private temporizadores: NodeJS.Timeout[] = [];
  private corriendo = false;

  constructor(
    private readonly config: ConfigService<Entorno, true>,
    private readonly edicion: EdicionService,
    private readonly perfiles: PerfilesRepository,
    private readonly correos: CorreoService,
    private readonly enlaces: Enlaces,
  ) {}

  onApplicationBootstrap(): void {
    const minutos = this.config.get('TAREA_INTERVALO_MINUTOS', { infer: true });
    if (minutos === 0) {
      this.log.log('Tarea periódica apagada (TAREA_INTERVALO_MINUTOS=0)');
      return;
    }
    const vuelta = () => void this.ejecutar().catch((e: Error) => this.log.error('Falló la tarea', e.stack));
    this.temporizadores.push(setTimeout(vuelta, PRIMERA_VUELTA_MS));
    this.temporizadores.push(setInterval(vuelta, minutos * 60_000));
    this.log.log(`Tarea periódica cada ${minutos} minutos`);
  }

  onModuleDestroy(): void {
    this.temporizadores.forEach((t) => clearTimeout(t));
  }

  /** Una vuelta completa. También la dispara `POST /admin/tarea`. */
  async ejecutar(): Promise<ResumenTarea> {
    // Si una vuelta tarda más que el intervalo, la siguiente no se le encima.
    if (this.corriendo) return { cierreDeEntregas: false, recordatorios: 0, correosReintentados: 0 };
    this.corriendo = true;
    try {
      const cierreDeEntregas = await this.edicion.cerrarSiVencio();
      const recordatorios = await this.mandarRecordatorios();
      const correosReintentados = await this.correos.reintentarRezagados();

      if (cierreDeEntregas || recordatorios || correosReintentados) {
        this.log.log(
          `Vuelta: cierre=${cierreDeEntregas} · recordatorios=${recordatorios} · reintentos=${correosReintentados}`,
        );
      }
      return { cierreDeEntregas, recordatorios, correosReintentados };
    } finally {
      this.corriendo = false;
    }
  }

  /**
   * C3. Cada perfil se marca ANTES de encolar el correo, con una consulta que
   * solo devuelve la fila si nadie la marcó antes: no puede salir más de uno.
   */
  private async mandarRecordatorios(): Promise<number> {
    let mandados = 0;
    for (const id of await this.perfiles.recordatoriosVencidos()) {
      const tomado = await this.perfiles.tomarRecordatorio(id);
      if (!tomado) continue;

      const perfil = tomado.tokenCompletar ? tomado : await this.perfiles.prepararSeguimiento(id);
      const tokenGrupo = perfil.tokenGrupo ?? (await this.perfiles.asegurarTokenGrupo(id));

      await this.correos.encolar(
        'c3',
        perfil.correo,
        {
          enlaceGrupo: this.enlaces.grupo(tokenGrupo),
          enlaceCompletar: this.enlaces.completar(perfil.tokenCompletar!),
        },
        { clave: `c3:${id}`, perfilId: id },
      );
      mandados++;
    }
    return mandados;
  }
}
