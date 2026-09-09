import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import { aEdicion, type Edicion, type EstadoEdicion, type FilaEdicion } from './edicion.entity.js';

/*
 * `edicion` es una tabla de una sola fila. Todas las consultas llevan
 * `where id = 1` y el check de la tabla hace imposible que aparezca otra.
 *
 * `entregas_abiertas` se calcula acá, en SQL, y no en TypeScript: el cierre se
 * decide con el reloj del servidor, no con el del navegador ni con el de la
 * máquina que corra el proceso.
 */
const SELECCION = `
  select nombre, estado, zona_horaria, cierre_entregas, cierre_evaluacion,
         margen_gracia_minutos, cupo_preseleccion, max_integrantes,
         max_bytes, max_paginas, semilla_reparto,
         coalesce(
           estado = 'entregas'
           and now() <= cierre_entregas
                        + make_interval(mins => margen_gracia_minutos),
           estado = 'entregas'  -- sin fecha cargada todavía: abierto
         ) as entregas_abiertas
    from edicion
   where id = 1
`;

@Injectable()
export class EdicionRepository {
  constructor(private readonly db: BaseDeDatos) {}

  async obtener(): Promise<Edicion> {
    const { rows } = await this.db.consultar<FilaEdicion>(SELECCION);
    if (rows.length === 0) {
      throw new ServiceUnavailableException('La edición del concurso no está configurada');
    }
    return aEdicion(rows[0]);
  }

  async actualizar(cambios: Partial<Record<string, unknown>>): Promise<Edicion> {
    // Lista blanca de columnas: los nombres nunca salen del cuerpo de la
    // petición sin pasar por acá.
    const permitidas = [
      'nombre',
      'zona_horaria',
      'cierre_entregas',
      'cierre_evaluacion',
      'margen_gracia_minutos',
      'cupo_preseleccion',
      'max_integrantes',
      'max_bytes',
      'max_paginas',
    ];
    const columnas = Object.keys(cambios).filter((c) => permitidas.includes(c));

    if (columnas.length > 0) {
      const asignaciones = columnas.map((c, i) => `${c} = $${i + 1}`).join(', ');
      await this.db.consultar(
        `update edicion set ${asignaciones}, actualizado_en = now() where id = 1`,
        columnas.map((c) => cambios[c]),
      );
    }
    return this.obtener();
  }

  async cambiarEstado(estado: EstadoEdicion): Promise<Edicion> {
    await this.db.consultar(
      'update edicion set estado = $1, actualizado_en = now() where id = 1',
      [estado],
    );
    return this.obtener();
  }

  async guardarSemilla(semilla: string): Promise<void> {
    await this.db.consultar('update edicion set semilla_reparto = $1 where id = 1', [semilla]);
  }
}
