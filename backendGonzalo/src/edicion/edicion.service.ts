import { Injectable, Logger } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import type { ActualizarEdicionDto } from './dto/edicion.dto.js';
import type { Edicion, EstadoEdicion } from './edicion.entity.js';
import { EdicionRepository } from './edicion.repository.js';

@Injectable()
export class EdicionService {
  private readonly log = new Logger(EdicionService.name);

  constructor(
    private readonly repo: EdicionRepository,
    private readonly db: BaseDeDatos,
  ) {}

  obtener(): Promise<Edicion> {
    return this.repo.obtener();
  }

  actualizar(cambios: ActualizarEdicionDto): Promise<Edicion> {
    // camelCase del DTO → snake_case de las columnas.
    const mapa: Record<string, string> = {
      nombre: 'nombre',
      cierreEntregas: 'cierre_entregas',
      cierreEvaluacion: 'cierre_evaluacion',
      margenGraciaMinutos: 'margen_gracia_minutos',
      cupoPreseleccion: 'cupo_preseleccion',
      maxIntegrantes: 'max_integrantes',
      maxBytes: 'max_bytes',
      maxPaginas: 'max_paginas',
    };
    const columnas: Record<string, unknown> = {};
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor !== undefined && mapa[clave]) columnas[mapa[clave]] = valor;
    }
    return this.repo.actualizar(columnas);
  }

  /**
   * Cambiar de etapa. El paso a `preseleccion` arrastra la consecuencia más
   * importante del concurso: cierra las entregas de verdad.
   */
  async cambiarEstado(estado: EstadoEdicion): Promise<Edicion> {
    if (estado === 'preseleccion') {
      const cerradas = await this.cerrarEntregas();
      this.log.log(`Cierre de entregas: ${cerradas} borrador(es) pasaron a entregada`);
    }
    return this.repo.cambiarEstado(estado);
  }

  /**
   * Pasa a `entregada` todo borrador que tenga archivo subido.
   *
   * Es el segundo camino a entregada: si el equipo subió su lámina y se olvidó
   * de apretar el botón, compite igual. Los borradores sin ningún archivo
   * quedan afuera — marcarlos entregados le daría al jurado una propuesta
   * vacía para evaluar.
   */
  async cerrarEntregas(): Promise<number> {
    const { rowCount } = await this.db.consultar(
      `update propuestas p
          set estado        = 'entregada',
              forma_entrega = 'automatica',
              entregada_en  = now(),
              actualizado_en = now()
        where p.estado = 'borrador'
          and exists (select 1 from propuesta_archivos a where a.propuesta_id = p.id)`,
    );
    return rowCount ?? 0;
  }
}
