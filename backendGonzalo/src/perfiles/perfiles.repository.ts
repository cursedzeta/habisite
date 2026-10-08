import { Injectable } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import { nuevoToken } from '../comun/tokens.js';
import {
  aPerfil,
  COLUMNAS_PERFIL,
  type FilaPerfil,
  type Perfil,
  type TipoInstitucion,
} from './perfil.entity.js';

/** Lo que puede traer el formulario además del correo. Todo opcional. */
export interface DatosFormulario {
  nombre?: string;
  apellido?: string;
  telefono?: string;
  tipoInstitucion?: TipoInstitucion;
  institucion?: string;
  pais?: string;
}

/** La aceptación de las bases: la versión la pone el servidor, nunca el cliente. */
export interface Aceptacion {
  version: string;
  ip: string | null;
}

/** Cuánto se espera antes del recordatorio único (docs/09). */
const ESPERA_RECORDATORIO = '2 days';

@Injectable()
export class PerfilesRepository {
  constructor(private readonly db: BaseDeDatos) {}

  async porId(id: string): Promise<Perfil | null> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `select ${COLUMNAS_PERFIL} from perfiles where id = $1`,
      [id],
    );
    return rows[0] ? aPerfil(rows[0]) : null;
  }

  async porGoogleSub(sub: string): Promise<Perfil | null> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `select ${COLUMNAS_PERFIL} from perfiles where google_sub = $1`,
      [sub],
    );
    return rows[0] ? aPerfil(rows[0]) : null;
  }

  /** `correo` es citext: la comparación ya es insensible a mayúsculas. */
  async porCorreo(correo: string): Promise<Perfil | null> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `select ${COLUMNAS_PERFIL} from perfiles where correo = $1`,
      [correo],
    );
    return rows[0] ? aPerfil(rows[0]) : null;
  }

  async porTokenCompletar(token: string): Promise<Perfil | null> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `select ${COLUMNAS_PERFIL} from perfiles where token_completar = $1`,
      [token],
    );
    return rows[0] ? aPerfil(rows[0]) : null;
  }

  /**
   * Ata la cuenta de Google al perfil en el primer ingreso. Completa nombre y
   * apellido solo si estaban vacíos: lo que la persona cargó al inscribirse
   * pesa más que lo que diga Google.
   */
  async vincularGoogle(
    id: string,
    googleSub: string,
    nombre?: string,
    apellido?: string,
  ): Promise<Perfil> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `update perfiles
          set google_sub     = $2,
              nombre         = case when nombre   = '' then coalesce($3, '') else nombre end,
              apellido       = case when apellido = '' then coalesce($4, '') else apellido end,
              estado         = case when estado = 'habilitado' then 'activo'::estado_perfil else estado end,
              actualizado_en = now()
        where id = $1
    returning ${COLUMNAS_PERFIL}`,
      [id, googleSub, nombre ?? null, apellido ?? null],
    );
    return aPerfil(rows[0]);
  }

  /**
   * Alta de alguien que entra con una cuenta de Google que no figuraba, pero
   * trae un token de invitación válido. La invitación es la que lo habilita.
   */
  async crearConGoogle(
    correo: string,
    googleSub: string,
    nombre?: string,
    apellido?: string,
  ): Promise<Perfil> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `insert into perfiles (correo, google_sub, nombre, apellido, rol, estado, token_grupo)
       values ($1, $2, coalesce($3, ''), coalesce($4, ''), 'participante', 'activo', $5)
       returning ${COLUMNAS_PERFIL}`,
      [correo, googleSub, nombre ?? null, apellido ?? null, nuevoToken()],
    );
    return aPerfil(rows[0]);
  }

  /** Alta desde el formulario: queda habilitado en el acto, con lo que haya dejado. */
  async crearDesdeFormulario(
    correo: string,
    datos: DatosFormulario,
    origen: string | null,
    aceptacion: Aceptacion,
  ): Promise<Perfil> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `insert into perfiles
         (correo, nombre, apellido, telefono, tipo_institucion, institucion, pais,
          origenes, rol, estado, token_grupo,
          terminos_en, terminos_version, terminos_ip)
       values ($1, coalesce($2, ''), coalesce($3, ''), $4, $5, $6, $7,
               case when $8::text is null then '{}'::text[] else array[$8::text] end,
               'participante', 'habilitado', $9,
               now(), $10, $11)
       returning ${COLUMNAS_PERFIL}`,
      [
        correo,
        datos.nombre ?? null,
        datos.apellido ?? null,
        datos.telefono ?? null,
        datos.tipoInstitucion ?? null,
        datos.institucion ?? null,
        datos.pais ?? null,
        origen,
        nuevoToken(),
        aceptacion.version,
        aceptacion.ip,
      ],
    );
    return aPerfil(rows[0]);
  }

  /**
   * Un correo que ya estaba vuelve a mandar el formulario.
   *
   * Sin `sobrescribir`, solo se llenan los huecos: si alcanzara con saber el
   * correo de alguien para cambiarle el nombre, cualquiera podría hacerlo.
   * Con `sobrescribir` (vino con el token del correo de alerta, que prueba que
   * es la persona), lo nuevo reemplaza a lo viejo.
   */
  async completarDesdeFormulario(
    id: string,
    datos: DatosFormulario,
    origen: string | null,
    aceptacion: Aceptacion,
    sobrescribir: boolean,
  ): Promise<Perfil> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `update perfiles set
         nombre           = case when $8::boolean then coalesce($2, nombre)
                                 when nombre = '' then coalesce($2, '') else nombre end,
         apellido         = case when $8::boolean then coalesce($3, apellido)
                                 when apellido = '' then coalesce($3, '') else apellido end,
         telefono         = case when $8::boolean then coalesce($4, telefono) else coalesce(telefono, $4) end,
         tipo_institucion = case when $8::boolean then coalesce($5::tipo_institucion, tipo_institucion)
                                 else coalesce(tipo_institucion, $5::tipo_institucion) end,
         institucion      = case when $8::boolean then coalesce($6, institucion) else coalesce(institucion, $6) end,
         pais             = case when $8::boolean then coalesce($7, pais) else coalesce(pais, $7) end,
         origenes         = case when $9::text is null or $9::text = any(origenes) then origenes
                                 else origenes || $9::text end,
         token_grupo      = coalesce(token_grupo, $10),
         terminos_en      = now(),
         terminos_version = $11,
         terminos_ip      = $12,
         actualizado_en   = now()
       where id = $1
       returning ${COLUMNAS_PERFIL}`,
      [
        id,
        datos.nombre ?? null,
        datos.apellido ?? null,
        datos.telefono ?? null,
        datos.tipoInstitucion ?? null,
        datos.institucion ?? null,
        datos.pais ?? null,
        sobrescribir,
        origen,
        nuevoToken(),
        aceptacion.version,
        aceptacion.ip,
      ],
    );
    return aPerfil(rows[0]);
  }

  /** Desde el panel, con sesión: lo que manda reemplaza a lo que había. */
  async actualizarDatos(id: string, datos: DatosFormulario): Promise<Perfil> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `update perfiles set
         nombre           = coalesce($2, nombre),
         apellido         = coalesce($3, apellido),
         telefono         = coalesce($4, telefono),
         tipo_institucion = coalesce($5::tipo_institucion, tipo_institucion),
         institucion      = coalesce($6, institucion),
         pais             = coalesce($7, pais),
         token_grupo      = coalesce(token_grupo, $8),
         actualizado_en   = now()
       where id = $1
       returning ${COLUMNAS_PERFIL}`,
      [
        id,
        datos.nombre ?? null,
        datos.apellido ?? null,
        datos.telefono ?? null,
        datos.tipoInstitucion ?? null,
        datos.institucion ?? null,
        datos.pais ?? null,
        nuevoToken(),
      ],
    );
    return aPerfil(rows[0]);
  }

  /**
   * Inscripción incompleta: deja listo el botón «Completar» y la fecha del
   * recordatorio. Si ya estaban, no los toca: volver a mandar el formulario
   * incompleto no corre el recordatorio para adelante.
   */
  async prepararSeguimiento(id: string): Promise<Perfil> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `update perfiles
          set token_completar   = coalesce(token_completar, $2),
              recordatorio_para = coalesce(recordatorio_para, now() + interval '${ESPERA_RECORDATORIO}')
        where id = $1
    returning ${COLUMNAS_PERFIL}`,
      [id, nuevoToken()],
    );
    return aPerfil(rows[0]);
  }

  /** Ya completó: el enlace de «completar» deja de servir. */
  async cerrarSeguimiento(id: string): Promise<void> {
    await this.db.consultar('update perfiles set token_completar = null where id = $1', [id]);
  }

  /** Para jurados y admins que no pasan por el formulario pero igual piden el enlace. */
  async asegurarTokenGrupo(id: string): Promise<string> {
    const { rows } = await this.db.consultar<{ token_grupo: string }>(
      `update perfiles set token_grupo = coalesce(token_grupo, $2)
        where id = $1 returning token_grupo`,
      [id, nuevoToken()],
    );
    return rows[0].token_grupo;
  }

  /** El clic en /r/{token}. Se queda con el primero. */
  async registrarClicGrupo(token: string): Promise<void> {
    await this.db.consultar(
      `update perfiles set clic_grupo_en = coalesce(clic_grupo_en, now())
        where token_grupo = $1`,
      [token],
    );
  }

  /**
   * Los que tienen el recordatorio vencido: no hicieron clic al grupo, no lo
   * recibieron todavía y siguen incompletos.
   */
  async recordatoriosVencidos(): Promise<string[]> {
    const { rows } = await this.db.consultar<{ id: string }>(
      `select id from perfiles
        where recordatorio_para <= now()
          and recordatorio_enviado_en is null
          and clic_grupo_en is null
          and rol = 'participante'
          and estado <> 'bloqueado'
          and (nombre = '' or apellido = '' or tipo_institucion is null
               or institucion is null or pais is null)
        limit 500`,
    );
    return rows.map((f) => f.id);
  }

  /**
   * Marca el recordatorio como enviado ANTES de mandarlo. Si otra tarea ya lo
   * marcó, no devuelve nada y no se manda: es imposible que salgan dos.
   */
  async tomarRecordatorio(id: string): Promise<Perfil | null> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `update perfiles set recordatorio_enviado_en = now()
        where id = $1 and recordatorio_enviado_en is null
    returning ${COLUMNAS_PERFIL}`,
      [id],
    );
    return rows[0] ? aPerfil(rows[0]) : null;
  }

  /**
   * Deja el perfil creado con un correo y un rol, sin datos personales, para
   * que al entrar con Google herede ese rol. Es como se suma a alguien a un
   * equipo por correo.
   */
  async asegurarPorCorreo(correo: string, rol: 'participante' | 'jurado' = 'participante'): Promise<Perfil> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `insert into perfiles (correo, rol, estado)
       values ($1, $2, 'habilitado')
       on conflict (correo) do update set actualizado_en = now()
       returning ${COLUMNAS_PERFIL}`,
      [correo, rol],
    );
    return aPerfil(rows[0]);
  }

  /** Si forma parte de algún equipo, aunque sea como invitado pendiente. */
  async tieneEquipo(id: string): Promise<boolean> {
    const { rows } = await this.db.consultar(
      `select 1 from equipo_miembros where perfil_id = $1 and estado <> 'baja' limit 1`,
      [id],
    );
    return rows.length > 0;
  }

  /** Lo pasa a jurado. Completa nombre y apellido si se los dieron y no tenía. */
  async hacerJurado(id: string, nombre?: string, apellido?: string): Promise<Perfil> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `update perfiles
          set rol = 'jurado',
              nombre   = case when nombre   = '' then coalesce($2, '') else nombre end,
              apellido = case when apellido = '' then coalesce($3, '') else apellido end,
              actualizado_en = now()
        where id = $1
    returning ${COLUMNAS_PERFIL}`,
      [id, nombre ?? null, apellido ?? null],
    );
    return aPerfil(rows[0]);
  }

  async listarPorRol(rol: string): Promise<Perfil[]> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `select ${COLUMNAS_PERFIL} from perfiles
        where rol = $1 and estado <> 'bloqueado'
        order by apellido, nombre`,
      [rol],
    );
    return rows.map(aPerfil);
  }

  /** Bloquear también sube `sesion_v`: la sesión abierta deja de valer ya. */
  async cambiarEstado(id: string, estado: 'activo' | 'bloqueado'): Promise<void> {
    await this.db.consultar(
      `update perfiles
          set estado = $2,
              sesion_v = case when $2 = 'bloqueado' then sesion_v + 1 else sesion_v end,
              actualizado_en = now()
        where id = $1`,
      [id, estado],
    );
  }
}
