import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import { aMiembro, type Equipo, type FilaMiembro, type Miembro } from './equipo.entity.js';

interface FilaEquipo {
  id: string;
  nombre: string | null;
  creado_por: string;
  token_invitacion: string;
  invitacion_activa: boolean;
}

/** 32 bytes en base64url: imposible de adivinar por fuerza bruta. */
export const nuevoToken = (): string => randomBytes(32).toString('base64url');

@Injectable()
export class EquiposRepository {
  constructor(private readonly db: BaseDeDatos) {}

  async crear(liderId: string, nombre: string | null): Promise<Equipo> {
    return this.db.transaccion(async (cliente) => {
      const { rows } = await cliente.query<FilaEquipo>(
        `insert into equipos (nombre, creado_por, token_invitacion)
         values ($1, $2, $3)
         returning id, nombre, creado_por, token_invitacion, invitacion_activa`,
        [nombre, liderId, nuevoToken()],
      );
      const equipo = rows[0];

      await cliente.query(
        `insert into equipo_miembros (equipo_id, perfil_id, estado, es_lider, aceptado_en)
         values ($1, $2, 'aceptado', true, now())`,
        [equipo.id, liderId],
      );

      // Un equipo sin propuesta no existe para el concurso: se crea junto.
      await cliente.query('insert into propuestas (equipo_id) values ($1)', [equipo.id]);

      return {
        id: equipo.id,
        nombre: equipo.nombre,
        creadoPor: equipo.creado_por,
        tokenInvitacion: equipo.token_invitacion,
        invitacionActiva: equipo.invitacion_activa,
        miembros: [],
      };
    });
  }

  /** El equipo del que la persona forma parte, con todos sus integrantes. */
  async delPerfil(perfilId: string): Promise<Equipo | null> {
    const { rows } = await this.db.consultar<FilaEquipo>(
      `select e.id, e.nombre, e.creado_por, e.token_invitacion, e.invitacion_activa
         from equipos e
         join equipo_miembros m on m.equipo_id = e.id
        where m.perfil_id = $1 and m.estado <> 'baja'`,
      [perfilId],
    );
    if (rows.length === 0) return null;

    return {
      id: rows[0].id,
      nombre: rows[0].nombre,
      creadoPor: rows[0].creado_por,
      tokenInvitacion: rows[0].token_invitacion,
      invitacionActiva: rows[0].invitacion_activa,
      miembros: await this.miembros(rows[0].id),
    };
  }

  async porToken(token: string): Promise<Equipo | null> {
    const { rows } = await this.db.consultar<FilaEquipo>(
      `select id, nombre, creado_por, token_invitacion, invitacion_activa
         from equipos where token_invitacion = $1`,
      [token],
    );
    if (rows.length === 0) return null;
    return {
      id: rows[0].id,
      nombre: rows[0].nombre,
      creadoPor: rows[0].creado_por,
      tokenInvitacion: rows[0].token_invitacion,
      invitacionActiva: rows[0].invitacion_activa,
      miembros: await this.miembros(rows[0].id),
    };
  }

  async miembros(equipoId: string): Promise<Miembro[]> {
    const { rows } = await this.db.consultar<FilaMiembro>(
      `select m.perfil_id, p.nombre, p.apellido, p.correo, p.institucion,
              m.estado, m.es_lider, m.aceptado_en
         from equipo_miembros m
         join perfiles p on p.id = m.perfil_id
        where m.equipo_id = $1 and m.estado <> 'baja'
        order by m.es_lider desc, m.invitado_en`,
      [equipoId],
    );
    return rows.map(aMiembro);
  }

  /** Deja la invitación creada. Devuelve el token para armar el enlace del correo. */
  async invitar(equipoId: string, perfilId: string): Promise<string> {
    const token = nuevoToken();
    await this.db.consultar(
      `insert into equipo_miembros (equipo_id, perfil_id, estado, token)
       values ($1, $2, 'invitado', $3)
       on conflict (equipo_id, perfil_id) do nothing`,
      [equipoId, perfilId, token],
    );
    return token;
  }

  /**
   * Suma a la persona como integrante aceptado y guarda la aceptación de
   * términos. Se guarda POR PERSONA, con la versión del texto: sin ella, el día
   * que cambien las bases no hay forma de saber qué aceptó cada uno.
   */
  async aceptar(
    equipoId: string,
    perfilId: string,
    terminosVersion: string,
    ip: string | null,
  ): Promise<void> {
    await this.db.consultar(
      `insert into equipo_miembros
         (equipo_id, perfil_id, estado, aceptado_en, terminos_en, terminos_version, terminos_ip)
       values ($1, $2, 'aceptado', now(), now(), $3, $4)
       on conflict (equipo_id, perfil_id) do update
          set estado           = 'aceptado',
              aceptado_en      = now(),
              terminos_en      = now(),
              terminos_version = excluded.terminos_version,
              terminos_ip      = excluded.terminos_ip`,
      [equipoId, perfilId, terminosVersion, ip],
    );
  }

  /**
   * Baja voluntaria. La fila queda —hace falta el rastro de que aceptó las
   * bases— y, si era el líder, el rol pasa al integrante aceptado más antiguo.
   */
  async darDeBaja(equipoId: string, perfilId: string): Promise<void> {
    await this.db.transaccion(async (cliente) => {
      const { rows } = await cliente.query<{ es_lider: boolean }>(
        `update equipo_miembros
            set estado = 'baja', baja_en = now(), es_lider = false
          where equipo_id = $1 and perfil_id = $2 and estado <> 'baja'
        returning es_lider`,
        [equipoId, perfilId],
      );

      if (rows[0]?.es_lider) {
        await cliente.query(
          `update equipo_miembros
              set es_lider = true
            where id = (
              select id from equipo_miembros
               where equipo_id = $1 and estado = 'aceptado'
               order by aceptado_en
               limit 1
            )`,
          [equipoId],
        );
      }
    });
  }

  async regenerarEnlace(equipoId: string): Promise<string> {
    const token = nuevoToken();
    await this.db.consultar(
      'update equipos set token_invitacion = $2, invitacion_activa = true where id = $1',
      [equipoId, token],
    );
    return token;
  }

  async activarEnlace(equipoId: string, activa: boolean): Promise<void> {
    await this.db.consultar('update equipos set invitacion_activa = $2 where id = $1', [
      equipoId,
      activa,
    ]);
  }
}
