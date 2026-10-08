import { Injectable } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import { nuevoToken } from '../comun/tokens.js';
import { aMiembro, type Equipo, type FilaMiembro, type Miembro } from './equipo.entity.js';

export interface InvitacionPendiente {
  miembroId: string;
  equipoId: string;
  /** El perfil que se reservó para el correo invitado. */
  perfilId: string;
  equipo: string | null;
  /** «Nombre Apellido» del líder, o null si todavía no cargó sus datos. */
  lider: string | null;
}

interface FilaEquipo {
  id: string;
  nombre: string | null;
  creado_por: string;
  token_invitacion: string;
  invitacion_activa: boolean;
}

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

  /**
   * Deja la invitación creada y devuelve el token para el enlace del correo.
   *
   * Si la persona ya estaba invitada, devuelve el token que ya tenía: antes se
   * generaba uno nuevo que nunca se guardaba, y el correo salía con un enlace
   * muerto. Si se había dado de baja, vuelve a quedar invitada. Si ya es
   * integrante aceptado, devuelve null: no hay nada que invitar.
   */
  async invitar(equipoId: string, perfilId: string): Promise<string | null> {
    const { rows } = await this.db.consultar<{ token: string }>(
      `insert into equipo_miembros (equipo_id, perfil_id, estado, token)
       values ($1, $2, 'invitado', $3)
       on conflict (equipo_id, perfil_id) do update
          set token       = coalesce(equipo_miembros.token, excluded.token),
              invitado_en = case when equipo_miembros.estado = 'baja' then now()
                                 else equipo_miembros.invitado_en end,
              estado      = 'invitado',
              aceptado_en = null,
              baja_en     = null
        where equipo_miembros.estado <> 'aceptado'
    returning token`,
      [equipoId, perfilId, nuevoToken()],
    );
    return rows[0]?.token ?? null;
  }

  /** La invitación individual por correo, por su token. Solo si sigue pendiente. */
  async invitacionPorToken(token: string): Promise<InvitacionPendiente | null> {
    const { rows } = await this.db.consultar<{
      id: string;
      equipo_id: string;
      perfil_id: string;
      equipo: string | null;
      lider: string | null;
    }>(
      `select m.id, m.equipo_id, m.perfil_id, e.nombre as equipo,
              (select nullif(trim(p.nombre || ' ' || p.apellido), '')
                 from equipo_miembros l join perfiles p on p.id = l.perfil_id
                where l.equipo_id = m.equipo_id and l.es_lider and l.estado = 'aceptado'
                limit 1) as lider
         from equipo_miembros m
         join equipos e on e.id = m.equipo_id
        where m.token = $1 and m.estado = 'invitado'`,
      [token],
    );
    const f = rows[0];
    return f
      ? { miembroId: f.id, equipoId: f.equipo_id, perfilId: f.perfil_id, equipo: f.equipo, lider: f.lider }
      : null;
  }

  /**
   * Acepta la invitación del correo con la cuenta que la persona usó para
   * entrar, aunque no sea la del correo invitado. Ese es todo el punto del
   * token (docs/05): la fila de la invitación pasa a ser de quien la abrió.
   *
   * Si el perfil que se había reservado para el correo invitado queda sin uso
   * (nunca entró, no tiene datos ni otros equipos), se borra: si no, ese
   * correo quedaría habilitado para entrar a un panel vacío.
   */
  async aceptarInvitacion(
    invitacion: InvitacionPendiente,
    perfilId: string,
    terminosVersion: string,
    ip: string | null,
  ): Promise<void> {
    await this.db.transaccion(async (cliente) => {
      if (invitacion.perfilId !== perfilId) {
        // Si ya tenía su propia fila en este equipo, la invitación ajena sobra.
        const { rows } = await cliente.query(
          'select 1 from equipo_miembros where equipo_id = $1 and perfil_id = $2',
          [invitacion.equipoId, perfilId],
        );
        if (rows.length > 0) {
          await cliente.query('delete from equipo_miembros where id = $1', [invitacion.miembroId]);
        } else {
          await cliente.query('update equipo_miembros set perfil_id = $2 where id = $1', [
            invitacion.miembroId,
            perfilId,
          ]);
        }
      }

      await cliente.query(
        `update equipo_miembros
            set estado = 'aceptado', aceptado_en = now(), baja_en = null, token = null,
                terminos_en = now(), terminos_version = $3, terminos_ip = $4
          where equipo_id = $1 and perfil_id = $2`,
        [invitacion.equipoId, perfilId, terminosVersion, ip],
      );

      if (invitacion.perfilId !== perfilId) {
        await cliente.query(
          `delete from perfiles p
            where p.id = $1
              and p.google_sub is null and p.nombre = '' and p.rol = 'participante'
              and p.terminos_en is null
              and not exists (select 1 from equipo_miembros m where m.perfil_id = p.id)`,
          [invitacion.perfilId],
        );
      }
    });
  }

  /** Los integrantes que cuentan: los que aceptaron. A ellos les llegan los correos del equipo. */
  async aceptados(equipoId: string): Promise<Miembro[]> {
    return (await this.miembros(equipoId)).filter((m) => m.estado === 'aceptado');
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
              -- Vuelve alguien que se había dado de baja: sin esto, la fila
              -- quedaría aceptada con fecha de baja y la restricción la rechaza.
              baja_en          = null,
              token            = null,
              terminos_en      = now(),
              terminos_version = excluded.terminos_version,
              terminos_ip      = excluded.terminos_ip`,
      [equipoId, perfilId, terminosVersion, ip],
    );
  }

  /**
   * Baja voluntaria. La fila queda —hace falta el rastro de que aceptó las
   * bases— y, si era el líder, el rol pasa al integrante aceptado más antiguo.
   * Devuelve quién quedó de líder, si cambió.
   */
  async darDeBaja(equipoId: string, perfilId: string): Promise<{ nuevoLiderId: string | null }> {
    return this.db.transaccion(async (cliente) => {
      const { rows } = await cliente.query<{ es_lider: boolean }>(
        `update equipo_miembros
            set estado = 'baja', baja_en = now(), es_lider = false
          where equipo_id = $1 and perfil_id = $2 and estado <> 'baja'
        returning es_lider`,
        [equipoId, perfilId],
      );

      if (!rows[0]?.es_lider) return { nuevoLiderId: null };

      const { rows: nuevo } = await cliente.query<{ perfil_id: string }>(
        `update equipo_miembros
            set es_lider = true
          where id = (
            select id from equipo_miembros
             where equipo_id = $1 and estado = 'aceptado'
             order by aceptado_en
             limit 1
          )
      returning perfil_id`,
        [equipoId],
      );
      return { nuevoLiderId: nuevo[0]?.perfil_id ?? null };
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
