import { Injectable } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';

/** Los enlaces de ingreso por correo (docs/12). Solo se guarda el hash del token. */
@Injectable()
export class EnlaceIngresoRepository {
  constructor(private readonly db: BaseDeDatos) {}

  async crear(
    perfilId: string,
    tokenHash: string,
    retorno: string,
    minutos: number,
    ip: string | null,
  ): Promise<string> {
    const { rows } = await this.db.consultar<{ id: string }>(
      `insert into enlaces_ingreso (perfil_id, token_hash, retorno, vence_en, pedido_ip)
       values ($1, $2, $3, now() + make_interval(mins => $4), $5)
       returning id::text`,
      [perfilId, tokenHash, retorno, minutos, ip],
    );
    return rows[0].id;
  }

  /** Cuántos pidió esta persona en los últimos `minutos`. */
  async recientes(perfilId: string, minutos: number): Promise<number> {
    const { rows } = await this.db.consultar<{ n: number }>(
      `select count(*)::int as n from enlaces_ingreso
        where perfil_id = $1 and creado_en > now() - make_interval(mins => $2)`,
      [perfilId, minutos],
    );
    return rows[0].n;
  }

  /**
   * Lo marca usado y devuelve a quién pertenece, en una sola sentencia: dos
   * canjes simultáneos del mismo enlace no pueden ganar los dos.
   */
  async canjear(tokenHash: string): Promise<{ perfilId: string; retorno: string } | null> {
    const { rows } = await this.db.consultar<{ perfil_id: string; retorno: string }>(
      `update enlaces_ingreso
          set usado_en = now()
        where token_hash = $1 and usado_en is null and vence_en > now()
    returning perfil_id::text, retorno`,
      [tokenHash],
    );
    return rows[0] ? { perfilId: rows[0].perfil_id, retorno: rows[0].retorno } : null;
  }

  /** Entrar por primera vez lo pasa de `habilitado` a `activo`, igual que con Google. */
  async marcarActivo(perfilId: string): Promise<void> {
    await this.db.consultar(
      `update perfiles set estado = 'activo', actualizado_en = now()
        where id = $1 and estado = 'habilitado'`,
      [perfilId],
    );
  }
}
