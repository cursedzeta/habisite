import { Injectable } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import type { TipoInstitucion } from '../perfiles/perfil.entity.js';

export interface FilaInscripto {
  creado_en: Date;
  correo: string;
  nombre: string;
  apellido: string;
  telefono: string | null;
  tipo_institucion: TipoInstitucion | null;
  institucion: string | null;
  pais: string | null;
  origenes: string[];
  clic_grupo_en: Date | null;
  recordatorio_enviado_en: Date | null;
  estado: string;
  equipo: string | null;
  estado_en_equipo: 'invitado' | 'aceptado' | null;
  es_lider: boolean | null;
}

@Injectable()
export class PlanillaRepository {
  constructor(private readonly db: BaseDeDatos) {}

  /**
   * Todos los participantes, del más viejo al más nuevo: así las filas
   * nuevas aparecen abajo y las de arriba no se mueven entre una copia y
   * otra. Jurado y admin no van: la planilla es de inscripciones.
   *
   * De equipo, uno solo por persona: el aceptado si lo hay (nadie está
   * aceptado en dos), si no la invitación más reciente.
   */
  async inscriptos(): Promise<FilaInscripto[]> {
    const { rows } = await this.db.consultar<FilaInscripto>(
      `select p.creado_en, p.correo, p.nombre, p.apellido, p.telefono,
              p.tipo_institucion, p.institucion, p.pais, p.origenes,
              p.clic_grupo_en, p.recordatorio_enviado_en, p.estado,
              e.nombre as equipo, m.estado as estado_en_equipo, m.es_lider
         from perfiles p
         left join lateral (
           select equipo_id, estado, es_lider
             from equipo_miembros
            where perfil_id = p.id and estado <> 'baja'
            order by (estado = 'aceptado') desc, invitado_en desc
            limit 1
         ) m on true
         left join equipos e on e.id = m.equipo_id
        where p.rol = 'participante'
        order by p.creado_en, p.id`,
    );
    return rows;
  }
}
