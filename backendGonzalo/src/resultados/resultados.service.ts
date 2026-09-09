import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { EdicionRepository } from '../edicion/edicion.repository.js';
import { EquiposRepository } from '../equipos/equipos.repository.js';
import { ResultadosRepository } from './resultados.repository.js';

@Injectable()
export class ResultadosService {
  private readonly log = new Logger(ResultadosService.name);

  constructor(
    private readonly repo: ResultadosRepository,
    private readonly equipos: EquiposRepository,
    private readonly edicion: EdicionRepository,
  ) {}

  async calcular(): Promise<{ calculados: number; incompletas: number }> {
    const calculados = await this.repo.calcular();
    const incompletas = await this.repo.evaluacionesIncompletas();
    this.log.log(`Ranking calculado: ${calculados} finalista(s), ${incompletas} incompleta(s)`);
    return { calculados, incompletas };
  }

  /**
   * Publicar es una decisión, no algo que pase solo. Se bloquea mientras haya
   * evaluaciones incompletas: una propuesta juzgada por dos jurados competiría
   * en desventaja frente a otra juzgada por tres.
   */
  async publicar(forzar: boolean): Promise<{ publicados: number }> {
    const incompletas = await this.repo.evaluacionesIncompletas();
    if (incompletas > 0 && !forzar) {
      throw new ConflictException(
        `Hay ${incompletas} propuesta(s) con evaluaciones sin terminar. ` +
          'Completalas, o publicá con `forzar` si es a propósito.',
      );
    }
    const publicados = await this.repo.publicar();
    await this.edicion.cambiarEstado('publicada');
    this.log.log(`Resultados publicados: ${publicados}`);
    return { publicados };
  }

  ranking() {
    return this.repo.ranking();
  }

  /** Lo que ve el concursante: si ganó y nada más. */
  async mio(perfilId: string): Promise<{ publicado: boolean; gano: boolean; posicion: number | null }> {
    const publicado = await this.repo.hayPublicados();
    if (!publicado) return { publicado: false, gano: false, posicion: null };

    const equipo = await this.equipos.delPerfil(perfilId);
    if (!equipo) return { publicado: true, gano: false, posicion: null };

    return { publicado: true, ...(await this.repo.podioDelEquipo(equipo.id)) };
  }
}
