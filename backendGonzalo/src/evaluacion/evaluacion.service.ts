import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { EdicionRepository } from '../edicion/edicion.repository.js';
import type { AvanceDto, PropuestaJuradoDto } from './dto/evaluacion.dto.js';
import { type Criterio, EvaluacionRepository } from './evaluacion.repository.js';

/*
 * Si el jurado ve o no quién es el autor está SIN DECIDIR: se reabrió el 08.09
 * y lo tiene que resolver Sol (`docs/dudas-para-sol.md`, pregunta 19).
 *
 * Vive acá como una constante y no repartido por las consultas, así el día que
 * se decida se cambia en un solo lugar.
 */
const EVALUACION_A_CIEGAS = false;

@Injectable()
export class EvaluacionService {
  private readonly log = new Logger(EvaluacionService.name);

  constructor(
    private readonly repo: EvaluacionRepository,
    private readonly edicion: EdicionRepository,
  ) {}

  criterios(): Promise<Criterio[]> {
    return this.repo.criterios();
  }

  /**
   * El listado del jurado. Cambia según la vuelta: en la 1 son las que le
   * tocaron por el reparto, en la 2 son todos los finalistas.
   */
  async listado(juradoId: string): Promise<PropuestaJuradoDto[]> {
    const vuelta = await this.vueltaActual();
    const [propuestas, criteriosTotales] = await Promise.all([
      this.repo.propuestasDelJurado(juradoId, vuelta, EVALUACION_A_CIEGAS),
      this.repo.cantidadCriterios(),
    ]);

    return propuestas.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      tieneArchivo: p.tieneArchivo,
      finalista: p.finalista,
      preseleccionada: p.preseleccionada,
      criteriosPuntuados: p.criteriosPuntuados,
      criteriosTotales,
      equipo: p.equipo,
      autores: p.autores,
    }));
  }

  async preseleccionar(propuestaId: string, juradoId: string, elegida: boolean): Promise<void> {
    const { estado } = await this.edicion.obtener();
    if (estado !== 'preseleccion') {
      throw new ForbiddenException('La preselección no está abierta');
    }
    if (!(await this.repo.estaAsignada(propuestaId, juradoId))) {
      throw new ForbiddenException('Esa propuesta no te fue asignada');
    }
    await this.repo.preseleccionar(propuestaId, juradoId, elegida);
  }

  async guardarPuntajes(
    propuestaId: string,
    juradoId: string,
    puntajes: { criterioId: string; valor: number }[],
  ): Promise<void> {
    const { estado } = await this.edicion.obtener();
    if (estado !== 'final') {
      throw new ForbiddenException('La evaluación final no está abierta');
    }
    await this.repo.guardarPuntajes(propuestaId, juradoId, puntajes);
  }

  /** Solo los propios hasta el cierre. La cláusula está en el repositorio. */
  async puntajes(propuestaId: string, juradoId: string) {
    const { estado } = await this.edicion.obtener();
    return this.repo.puntajes(propuestaId, juradoId, estado);
  }

  guardarDevolucion(propuestaId: string, juradoId: string, texto: string): Promise<void> {
    return this.repo.guardarDevolucion(propuestaId, juradoId, texto);
  }

  devolucion(propuestaId: string, juradoId: string): Promise<string | null> {
    return this.repo.devolucion(propuestaId, juradoId);
  }

  async avance(juradoId: string): Promise<AvanceDto> {
    const vuelta = await this.vueltaActual();
    const [propuestas, totales] = await Promise.all([
      this.repo.propuestasDelJurado(juradoId, vuelta, EVALUACION_A_CIEGAS),
      this.repo.cantidadCriterios(),
    ]);

    return {
      vuelta,
      asignadas: propuestas.length,
      revisadas: propuestas.filter((p) => p.revisadaEn !== null).length,
      // Terminada = tiene sus N filas de puntajes. Es un count, no un flag que
      // pueda quedar desincronizado de los datos reales.
      completas: propuestas.filter((p) => p.criteriosPuntuados === totales).length,
    };
  }

  /** Reparto al azar de la vuelta 1. Guarda la semilla para poder repetirlo. */
  async repartir(): Promise<{ asignadas: number; semilla: string }> {
    const semilla = randomBytes(8).toString('hex');
    const asignadas = await this.repo.repartir(semilla);
    await this.edicion.guardarSemilla(semilla);
    this.log.log(`Reparto hecho: ${asignadas} propuesta(s), semilla ${semilla}`);
    return { asignadas, semilla };
  }

  private async vueltaActual(): Promise<'preseleccion' | 'final'> {
    const { estado } = await this.edicion.obtener();
    return estado === 'preseleccion' ? 'preseleccion' : 'final';
  }
}
