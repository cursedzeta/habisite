import { Injectable } from '@nestjs/common';
import { BaseDeDatos } from '../comun/base-de-datos/base-de-datos.service.js';
import {
  aPerfil,
  COLUMNAS_PERFIL,
  type FilaPerfil,
  type Perfil,
  type TipoInstitucion,
} from './perfil.entity.js';

export interface DatosInscripcion {
  correo: string;
  nombre: string;
  apellido: string;
  institucion: string;
  tipoInstitucion: TipoInstitucion;
  pais: string;
}

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

  /** Alta desde el formulario de inscripción: queda habilitado en el acto. */
  async inscribir(datos: DatosInscripcion): Promise<Perfil> {
    const { rows } = await this.db.consultar<FilaPerfil>(
      `insert into perfiles
         (correo, nombre, apellido, institucion, tipo_institucion, pais, rol, estado)
       values ($1, $2, $3, $4, $5, $6, 'participante', 'habilitado')
       returning ${COLUMNAS_PERFIL}`,
      [
        datos.correo,
        datos.nombre,
        datos.apellido,
        datos.institucion,
        datos.tipoInstitucion,
        datos.pais,
      ],
    );
    return aPerfil(rows[0]);
  }

  /**
   * Deja el perfil creado con un correo y un rol, sin datos personales, para
   * que al entrar con Google herede ese rol. Es como se invita a un jurado y
   * como se suma a alguien a un equipo.
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
