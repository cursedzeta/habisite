import { Injectable, Logger } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import { CorreoService } from '../correo/correo.service.js';
import { Enlaces } from '../correo/enlaces.js';
import type { ActualizarEdicionDto } from './dto/edicion.dto.js';
import type { Edicion, EstadoEdicion } from './edicion.entity.js';
import { EdicionRepository } from './edicion.repository.js';

@Injectable()
export class EdicionService {
  private readonly log = new Logger(EdicionService.name);

  constructor(
    private readonly repo: EdicionRepository,
    private readonly db: BaseDeDatos,
    private readonly correos: CorreoService,
    private readonly enlaces: Enlaces,
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
      terminosVersion: 'terminos_version',
      terminosUrl: 'terminos_url',
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
   * El cierre automático: si la etapa sigue en `entregas` y ya pasó el cierre
   * más el margen de gracia, pasa a `preseleccion`. Lo llama la tarea
   * periódica. Devuelve si cerró.
   *
   * Que esto corra cada 30 minutos no deja editar a nadie de más: lo que
   * bloquea las ediciones es la comparación con el reloj en cada pedido
   * (`entregasAbiertas`). Esto solo mueve los borradores y manda el C9.
   */
  async cerrarSiVencio(): Promise<boolean> {
    const edicion = await this.repo.obtener();
    if (edicion.estado !== 'entregas' || !edicion.cierreEntregas || edicion.entregasAbiertas) {
      return false;
    }
    await this.cambiarEstado('preseleccion');
    return true;
  }

  /**
   * Pasa a `entregada` todo borrador que tenga archivo subido, y le avisa al
   * equipo con el C9.
   *
   * Es el segundo camino a entregada: si el equipo subió su lámina y se olvidó
   * de apretar el botón, compite igual. Los borradores sin ningún archivo
   * quedan afuera — marcarlos entregados le daría al jurado una propuesta
   * vacía para evaluar.
   *
   * La fecha de entrega es la del cierre con el margen, no la hora en que
   * corrió esto: es la que vale para el acta.
   */
  async cerrarEntregas(): Promise<number> {
    const { rows } = await this.db.consultar<{
      id: string;
      titulo: string;
      archivo: string;
      correo: string;
      perfil_id: string;
    }>(
      `with cerradas as (
         update propuestas p
            set estado         = 'entregada',
                forma_entrega  = 'automatica',
                entregada_en   = coalesce(
                  (select least(now(), e.cierre_entregas + make_interval(mins => e.margen_gracia_minutos))
                     from edicion e where e.id = 1),
                  now()),
                actualizado_en = now()
          where p.estado = 'borrador'
            and exists (select 1 from propuesta_archivos a where a.propuesta_id = p.id)
        returning p.id, p.titulo, p.equipo_id
       )
       select c.id, c.titulo, a.nombre_original as archivo, pf.correo, pf.id as perfil_id
         from cerradas c
         join propuesta_archivos a on a.propuesta_id = c.id
         join equipo_miembros m    on m.equipo_id = c.equipo_id and m.estado = 'aceptado'
         join perfiles pf          on pf.id = m.perfil_id`,
    );

    for (const f of rows) {
      await this.correos.encolar(
        'c9',
        f.correo,
        { titulo: f.titulo, archivo: f.archivo, enlacePanel: this.enlaces.panel() },
        { clave: `c9:${f.id}:${f.perfil_id}`, perfilId: f.perfil_id },
      );
    }
    return new Set(rows.map((f) => f.id)).size;
  }
}
