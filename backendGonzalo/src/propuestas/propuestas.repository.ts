import { Injectable } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import type { ArchivoValidado } from './archivo.service.js';
import { aPropuesta, type FilaPropuesta, type Propuesta } from './propuesta.entity.js';

const COLUMNAS = `
  p.id, p.equipo_id, p.titulo, p.memoria, p.estado, p.forma_entrega,
  p.finalista, p.entregada_en, p.motivo_descalificacion,
  a.nombre_original, a.bytes, a.paginas, a.subido_en
`;

const DESDE = `
  from propuestas p
  left join propuesta_archivos a on a.propuesta_id = p.id
`;

@Injectable()
export class PropuestasRepository {
  constructor(private readonly db: BaseDeDatos) {}

  async porEquipo(equipoId: string): Promise<Propuesta | null> {
    const { rows } = await this.db.consultar<FilaPropuesta>(
      `select ${COLUMNAS} ${DESDE} where p.equipo_id = $1`,
      [equipoId],
    );
    return rows[0] ? aPropuesta(rows[0]) : null;
  }

  async porId(id: string): Promise<Propuesta | null> {
    const { rows } = await this.db.consultar<FilaPropuesta>(
      `select ${COLUMNAS} ${DESDE} where p.id = $1`,
      [id],
    );
    return rows[0] ? aPropuesta(rows[0]) : null;
  }

  async actualizarTexto(id: string, titulo: string, memoria: string | null): Promise<void> {
    await this.db.consultar(
      `update propuestas
          set titulo = $2, memoria = $3, actualizado_en = now()
        where id = $1`,
      [id, titulo, memoria],
    );
  }

  /** Guarda o reemplaza el PDF. `on conflict` porque hay uno solo por propuesta. */
  async guardarArchivo(
    propuestaId: string,
    nombre: string,
    archivo: ArchivoValidado,
  ): Promise<void> {
    await this.db.consultar(
      `insert into propuesta_archivos
         (propuesta_id, nombre_original, bytes, paginas, sha256, contenido)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (propuesta_id) do update
          set nombre_original = excluded.nombre_original,
              bytes           = excluded.bytes,
              paginas         = excluded.paginas,
              sha256          = excluded.sha256,
              contenido       = excluded.contenido,
              subido_en       = now()`,
      [propuestaId, nombre, archivo.bytes, archivo.paginas, archivo.sha256, archivo.contenido],
    );
  }

  /** Solo el tamaño y el nombre, sin traer los 30 MB. Para armar las cabeceras. */
  async metadatosArchivo(
    propuestaId: string,
  ): Promise<{ bytes: number; nombre: string } | null> {
    const { rows } = await this.db.consultar<{ bytes: number; nombre_original: string }>(
      'select bytes, nombre_original from propuesta_archivos where propuesta_id = $1',
      [propuestaId],
    );
    return rows[0] ? { bytes: rows[0].bytes, nombre: rows[0].nombre_original } : null;
  }

  /**
   * Un pedazo del PDF, para responder un `Range`.
   *
   * `substring` sobre bytea arranca en 1 y el Range de HTTP en 0, de ahí el +1.
   * Con la columna en STORAGE EXTERNAL, Postgres lee solo los trozos TOAST que
   * caen en el rango en vez de traer y descomprimir los 30 MB.
   */
  async trozo(propuestaId: string, desde: number, largo: number): Promise<Buffer> {
    const { rows } = await this.db.consultar<{ trozo: Buffer }>(
      `select substring(contenido from $2 for $3) as trozo
         from propuesta_archivos where propuesta_id = $1`,
      [propuestaId, desde + 1, largo],
    );
    return rows[0]?.trozo ?? Buffer.alloc(0);
  }

  async entregar(id: string): Promise<void> {
    await this.db.consultar(
      `update propuestas
          set estado = 'entregada', forma_entrega = 'confirmada',
              entregada_en = now(), actualizado_en = now()
        where id = $1 and estado = 'borrador'`,
      [id],
    );
  }

  async descalificar(id: string, motivo: string): Promise<void> {
    await this.db.consultar(
      `update propuestas
          set estado = 'descalificada', motivo_descalificacion = $2, actualizado_en = now()
        where id = $1`,
      [id, motivo],
    );
  }
}
