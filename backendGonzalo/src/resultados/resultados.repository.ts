import { Injectable } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';

export interface ResultadoInterno {
  propuestaId: string;
  titulo: string;
  equipo: string | null;
  puntajeFinal: number;
  posicion: number;
  juradosQueEvaluaron: number;
  publicadoEn: Date | null;
}

@Injectable()
export class ResultadosRepository {
  constructor(private readonly db: BaseDeDatos) {}

  /**
   * Calcula y congela el ranking.
   *
   * Puntaje de un jurado = suma de (valor × peso) sobre los siete criterios.
   * Como los pesos suman 1 y cada criterio va de 1 a 10, queda en la escala
   * 1..10. El final es el promedio entre los jurados que evaluaron.
   *
   * El `having` descarta al jurado que dejó criterios sin completar: es un
   * conteo sobre los datos reales, no un indicador guardado que pueda quedar
   * viejo cuando alguien corrige una nota.
   */
  async calcular(): Promise<number> {
    const { rowCount } = await this.db.consultar(
      `with por_jurado as (
         select pu.propuesta_id, pu.jurado_id,
                sum(pu.valor * c.peso) as puntaje
           from puntajes pu
           join criterios c on c.id = pu.criterio_id and c.activo
           join propuestas p on p.id = pu.propuesta_id
          where p.finalista and p.estado = 'entregada'
          group by pu.propuesta_id, pu.jurado_id
         having count(*) = (select count(*) from criterios where activo)
       ),
       promedios as (
         select propuesta_id,
                round(avg(puntaje)::numeric, 3) as puntaje_final,
                count(*) as jurados,
                jsonb_object_agg(jurado_id::text, round(puntaje::numeric, 3)) as desglose
           from por_jurado
          group by propuesta_id
       ),
       ordenadas as (
         select propuesta_id, puntaje_final, jurados, desglose,
                row_number() over (order by puntaje_final desc, propuesta_id) as posicion
           from promedios
       )
       insert into resultados (propuesta_id, puntaje_final, posicion, desglose, calculado_en)
       select propuesta_id, puntaje_final, posicion,
              jsonb_build_object('porJurado', desglose, 'jurados', jurados),
              now()
         from ordenadas
       on conflict (propuesta_id) do update
          set puntaje_final = excluded.puntaje_final,
              posicion      = excluded.posicion,
              desglose      = excluded.desglose,
              calculado_en  = now()`,
    );
    return rowCount ?? 0;
  }

  /**
   * Publicar escribe una fecha y nada más: no recalcula ni mueve puntajes.
   * Por eso el estado «evaluado pero no anunciado» no se puede filtrar por
   * accidente desde una pantalla nueva — el filtro está en el dato.
   */
  async publicar(): Promise<number> {
    const { rowCount } = await this.db.consultar(
      'update resultados set publicado_en = now() where publicado_en is null',
    );
    return rowCount ?? 0;
  }

  /** El ranking completo, con nombres. Solo para el admin y el acta. */
  async ranking(): Promise<ResultadoInterno[]> {
    const { rows } = await this.db.consultar<{
      propuesta_id: string;
      titulo: string;
      equipo: string | null;
      puntaje_final: string;
      posicion: number;
      jurados: number;
      publicado_en: Date | null;
    }>(
      `select r.propuesta_id, p.titulo, e.nombre as equipo,
              r.puntaje_final, r.posicion,
              coalesce((r.desglose->>'jurados')::int, 0) as jurados,
              r.publicado_en
         from resultados r
         join propuestas p on p.id = r.propuesta_id
         join equipos e    on e.id = p.equipo_id
        order by r.posicion`,
    );
    return rows.map((f) => ({
      propuestaId: f.propuesta_id,
      titulo: f.titulo,
      equipo: f.equipo,
      puntajeFinal: Number(f.puntaje_final),
      posicion: f.posicion,
      juradosQueEvaluaron: f.jurados,
      publicadoEn: f.publicado_en,
    }));
  }

  /** Cuántos finalistas tienen evaluaciones incompletas. Bloquea publicar. */
  async evaluacionesIncompletas(): Promise<number> {
    const { rows } = await this.db.consultar<{ n: string }>(
      `select count(*)::text as n
         from propuestas p
        cross join (select count(*) as total from criterios where activo) c
        cross join (select count(*) as total from perfiles
                     where rol = 'jurado' and estado <> 'bloqueado') j
        where p.finalista and p.estado = 'entregada'
          and (select count(*) from puntajes pu where pu.propuesta_id = p.id)
              < c.total * j.total`,
    );
    return Number(rows[0].n);
  }

  /**
   * Lo único que ve el concursante: si su propuesta ganó.
   *
   * Nada de puntaje, ni de posición, ni de devolución. «No deben ver puntaje ni
   * nota o tipo de valor».
   */
  async podioDelEquipo(equipoId: string): Promise<{ gano: boolean; posicion: number | null }> {
    const { rows } = await this.db.consultar<{ posicion: number }>(
      `select r.posicion
         from resultados r
         join propuestas p on p.id = r.propuesta_id
        where p.equipo_id = $1 and r.publicado_en is not null and r.posicion <= 3`,
      [equipoId],
    );
    return rows[0] ? { gano: true, posicion: rows[0].posicion } : { gano: false, posicion: null };
  }

  async hayPublicados(): Promise<boolean> {
    const { rows } = await this.db.consultar(
      'select 1 from resultados where publicado_en is not null limit 1',
    );
    return rows.length > 0;
  }
}
