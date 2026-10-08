import { Injectable } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import type { CodigoCorreo } from './plantillas.js';

export interface Envio {
  id: string;
  codigo: CodigoCorreo;
  destinatario: string;
  clave: string;
  datos: Record<string, unknown>;
  intentos: number;
}

/** Cuántas veces se reintenta un correo antes de darlo por perdido. */
export const MAX_INTENTOS = 5;

@Injectable()
export class CorreoRepository {
  constructor(private readonly db: BaseDeDatos) {}

  /**
   * Anota el correo. Si la clave ya existe no hace nada y devuelve null: es lo
   * que impide que el mismo correo salga dos veces, aunque la acción que lo
   * dispara se repita.
   */
  async anotar(
    codigo: CodigoCorreo,
    destinatario: string,
    clave: string,
    datos: object,
    perfilId: string | null,
  ): Promise<string | null> {
    const { rows } = await this.db.consultar<{ id: string }>(
      `insert into envios (codigo, destinatario, clave, datos, perfil_id)
       values ($1, $2, $3, $4, $5)
       on conflict (clave) do nothing
       returning id`,
      [codigo, destinatario, clave, JSON.stringify(datos), perfilId],
    );
    return rows[0]?.id ?? null;
  }

  /**
   * Toma el envío para mandarlo. Sumar el intento en la misma consulta hace
   * que un envío que falla siempre deje de reintentarse solo.
   */
  async tomar(id: string): Promise<Envio | null> {
    const { rows } = await this.db.consultar<Envio>(
      `update envios
          set intentos = intentos + 1
        where id = $1
          and estado in ('pendiente', 'fallido')
          and intentos < $2
      returning id::text, codigo, destinatario, clave, datos, intentos`,
      [id, MAX_INTENTOS],
    );
    return rows[0] ?? null;
  }

  async marcarEnviado(id: string, resendId: string | null): Promise<void> {
    await this.db.consultar(
      `update envios set estado = 'enviado', resend_id = $2, error = null, enviado_en = now()
        where id = $1`,
      [id, resendId],
    );
  }

  async marcarOmitido(id: string): Promise<void> {
    await this.db.consultar(
      `update envios set estado = 'omitido', enviado_en = now() where id = $1`,
      [id],
    );
  }

  async marcarFallido(id: string, error: string): Promise<void> {
    await this.db.consultar(`update envios set estado = 'fallido', error = $2 where id = $1`, [
      id,
      error.slice(0, 1000),
    ]);
  }

  /**
   * Los que quedaron sin salir: fallaron, o el proceso se cayó con el correo
   * todavía en la cola. Los pendientes recientes no, porque probablemente la
   * cola los esté por mandar.
   */
  async rezagados(): Promise<string[]> {
    const { rows } = await this.db.consultar<{ id: string }>(
      `select id::text from envios
        where intentos < $1
          and (estado = 'fallido'
               or (estado = 'pendiente' and creado_en < now() - interval '10 minutes'))
          and creado_en > now() - interval '3 days'
        order by creado_en
        limit 500`,
      [MAX_INTENTOS],
    );
    return rows.map((f) => f.id);
  }
}
