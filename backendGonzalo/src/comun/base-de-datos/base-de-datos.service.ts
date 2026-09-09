import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from 'pg';
import type { Entorno } from '../../configuracion/entorno.js';

/*
 * Único punto de acceso a Postgres. Envuelve el Pool de `pg` para que los
 * repositorios no lo importen directo y para cerrar las conexiones prolijo
 * cuando el proceso termina.
 *
 * El Pool no abre ninguna conexión hasta la primera consulta: la API levanta
 * aunque la base todavía no exista.
 */
@Injectable()
export class BaseDeDatos implements OnModuleDestroy {
  private readonly log = new Logger(BaseDeDatos.name);
  private readonly pool: Pool;

  constructor(config: ConfigService<Entorno, true>) {
    this.pool = new Pool({
      connectionString: config.get('DATABASE_URL', { infer: true }),
      max: 10,
    });
    this.pool.on('error', (error) =>
      this.log.error('Error en una conexión ociosa del pool', error.stack),
    );
  }

  /** Una consulta suelta, con parámetros posicionales ($1, $2, …). */
  consultar<T extends QueryResultRow = QueryResultRow>(
    texto: string,
    valores?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(texto, valores);
  }

  /**
   * Varias consultas que tienen que entrar todas o ninguna.
   * El cliente que recibe `trabajo` ya está dentro de la transacción.
   */
  async transaccion<T>(
    trabajo: (cliente: PoolClient) => Promise<T>,
  ): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('begin');
      const resultado = await trabajo(cliente);
      await cliente.query('commit');
      return resultado;
    } catch (error) {
      await cliente.query('rollback');
      throw error;
    } finally {
      cliente.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
