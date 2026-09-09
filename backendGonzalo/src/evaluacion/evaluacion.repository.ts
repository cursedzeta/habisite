import { Injectable } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';

export interface Criterio {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  peso: number;
  orden: number;
}

export interface PropuestaParaJurado {
  id: string;
  titulo: string;
  estado: string;
  finalista: boolean;
  tieneArchivo: boolean;
  preseleccionada: boolean | null;
  revisadaEn: Date | null;
  criteriosPuntuados: number;
  // Se llenan solo si la evaluación NO es a ciegas.
  equipo: string | null;
  autores: string[] | null;
}

@Injectable()
export class EvaluacionRepository {
  constructor(private readonly db: BaseDeDatos) {}

  async criterios(): Promise<Criterio[]> {
    const { rows } = await this.db.consultar<{
      id: string;
      codigo: string;
      nombre: string;
      descripcion: string | null;
      peso: string;
      orden: number;
    }>(
      `select id, codigo, nombre, descripcion, peso, orden
         from criterios where activo order by orden`,
    );
    return rows.map((f) => ({ ...f, peso: Number(f.peso) }));
  }

  async cantidadCriterios(): Promise<number> {
    const { rows } = await this.db.consultar<{ n: string }>(
      'select count(*)::text as n from criterios where activo',
    );
    return Number(rows[0].n);
  }

  /**
   * Lo que ve un jurado.
   *
   * En la vuelta 1 son las que le tocaron por el reparto; en la vuelta 2, todos
   * los finalistas. El `anonimo` decide si se acompañan los datos del autor:
   * está sin cerrar y por eso es un parámetro y no algo incrustado.
   */
  async propuestasDelJurado(
    juradoId: string,
    vuelta: 'preseleccion' | 'final',
    anonimo: boolean,
  ): Promise<PropuestaParaJurado[]> {
    const filtro =
      vuelta === 'preseleccion'
        ? "a.jurado_id = $1 and p.estado = 'entregada'"
        : "p.finalista and p.estado = 'entregada'";

    const { rows } = await this.db.consultar<{
      id: string;
      titulo: string;
      estado: string;
      finalista: boolean;
      tiene_archivo: boolean;
      preseleccionada: boolean | null;
      revisada_en: Date | null;
      criterios_puntuados: string;
      equipo: string | null;
      autores: string[] | null;
    }>(
      `select p.id, p.titulo, p.estado, p.finalista,
              (ar.propuesta_id is not null) as tiene_archivo,
              a.preseleccionada, a.revisada_en,
              (select count(*)::text from puntajes pu
                where pu.propuesta_id = p.id and pu.jurado_id = $1) as criterios_puntuados,
              case when $2 then null else e.nombre end as equipo,
              case when $2 then null else (
                select array_agg(pe.nombre || ' ' || pe.apellido order by pe.apellido)
                  from equipo_miembros em
                  join perfiles pe on pe.id = em.perfil_id
                 where em.equipo_id = e.id and em.estado = 'aceptado'
              ) end as autores
         from propuestas p
         join equipos e on e.id = p.equipo_id
         left join propuesta_archivos ar on ar.propuesta_id = p.id
         left join asignaciones a on a.propuesta_id = p.id
        where ${filtro}
        order by p.id`,
      [juradoId, anonimo],
    );

    return rows.map((f) => ({
      id: f.id,
      titulo: f.titulo,
      estado: f.estado,
      finalista: f.finalista,
      tieneArchivo: f.tiene_archivo,
      preseleccionada: f.preseleccionada,
      revisadaEn: f.revisada_en,
      criteriosPuntuados: Number(f.criterios_puntuados),
      equipo: f.equipo,
      autores: f.autores,
    }));
  }

  async estaAsignada(propuestaId: string, juradoId: string): Promise<boolean> {
    const { rows } = await this.db.consultar(
      'select 1 from asignaciones where propuesta_id = $1 and jurado_id = $2',
      [propuestaId, juradoId],
    );
    return rows.length > 0;
  }

  async preseleccionar(propuestaId: string, juradoId: string, elegida: boolean): Promise<void> {
    await this.db.transaccion(async (cliente) => {
      await cliente.query(
        `update asignaciones
            set preseleccionada = $3, revisada_en = now()
          where propuesta_id = $1 and jurado_id = $2`,
        [propuestaId, juradoId, elegida],
      );
      // `finalista` es lo que mira la vuelta 2 y el cálculo del ranking.
      await cliente.query('update propuestas set finalista = $2 where id = $1', [
        propuestaId,
        elegida,
      ]);
    });
  }

  /** Carga parcial: el jurado puede dejarlo a medias y seguir otro día. */
  async guardarPuntajes(
    propuestaId: string,
    juradoId: string,
    valores: { criterioId: string; valor: number }[],
  ): Promise<void> {
    await this.db.transaccion(async (cliente) => {
      for (const { criterioId, valor } of valores) {
        await cliente.query(
          `insert into puntajes (propuesta_id, jurado_id, criterio_id, valor)
           values ($1, $2, $3, $4)
           on conflict (propuesta_id, jurado_id, criterio_id) do update
              set valor = excluded.valor, actualizado_en = now()`,
          [propuestaId, juradoId, criterioId, valor],
        );
      }
    });
  }

  /**
   * Los puntajes de una propuesta.
   *
   * Un jurado ve solo los suyos hasta que la evaluación cierra: si el segundo
   * ve el 9 que puso el primero, tiende a acercarse a ese número. Es la regla
   * de `CLAUDE.md` §5.3 y vive acá, en un solo lugar.
   */
  async puntajes(
    propuestaId: string,
    juradoId: string,
    estadoEdicion: string,
  ): Promise<{ criterioId: string; juradoId: string; valor: number }[]> {
    const { rows } = await this.db.consultar<{
      criterio_id: string;
      jurado_id: string;
      valor: number;
    }>(
      `select criterio_id, jurado_id, valor
         from puntajes
        where propuesta_id = $1
          and ($3 in ('cerrada', 'publicada') or jurado_id = $2)`,
      [propuestaId, juradoId, estadoEdicion],
    );
    return rows.map((f) => ({
      criterioId: f.criterio_id,
      juradoId: f.jurado_id,
      valor: f.valor,
    }));
  }

  async guardarDevolucion(propuestaId: string, juradoId: string, texto: string): Promise<void> {
    await this.db.consultar(
      `insert into devoluciones (propuesta_id, jurado_id, texto)
       values ($1, $2, $3)
       on conflict (propuesta_id, jurado_id) do update
          set texto = excluded.texto, actualizado_en = now()`,
      [propuestaId, juradoId, texto],
    );
  }

  async devolucion(propuestaId: string, juradoId: string): Promise<string | null> {
    const { rows } = await this.db.consultar<{ texto: string }>(
      'select texto from devoluciones where propuesta_id = $1 and jurado_id = $2',
      [propuestaId, juradoId],
    );
    return rows[0]?.texto ?? null;
  }

  /**
   * Reparte las propuestas entregadas entre los jurados, al azar.
   *
   * El hash con semilla da un orden pseudoaleatorio pero repetible: si alguien
   * cuestiona el sorteo, se vuelve a correr con la misma semilla y da idéntico.
   * Eso es lo que lo hace defendible en un acta.
   */
  async repartir(semilla: string): Promise<number> {
    const { rowCount } = await this.db.consultar(
      `with mezcladas as (
         select id, row_number() over (order by md5(id::text || $1)) - 1 as n
           from propuestas
          where estado = 'entregada'
       ),
       jurados as (
         select id, row_number() over (order by id) - 1 as j,
                count(*) over () as total
           from perfiles
          where rol = 'jurado' and estado <> 'bloqueado'
       )
       insert into asignaciones (propuesta_id, jurado_id)
       select m.id, ju.id
         from mezcladas m
         join jurados ju on ju.j = m.n % ju.total
       on conflict (propuesta_id) do nothing`,
      [semilla],
    );
    return rowCount ?? 0;
  }
}
