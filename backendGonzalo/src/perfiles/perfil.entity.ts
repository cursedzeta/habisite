import type { Rol } from '../comun/autorizacion/usuario-sesion.js';

export type EstadoPerfil = 'habilitado' | 'activo' | 'bloqueado';
export type TipoInstitucion = 'universidad' | 'trabajo' | 'independiente';

/** Una fila de `perfiles`, ya con los nombres en camelCase. */
export interface Perfil {
  id: string;
  correo: string;
  googleSub: string | null;
  nombre: string;
  apellido: string;
  institucion: string | null;
  tipoInstitucion: TipoInstitucion | null;
  pais: string | null;
  telefono: string | null;
  rol: Rol;
  estado: EstadoPerfil;
  sesionV: number;
  /** El enlace al grupo de WhatsApp: /r/{tokenGrupo}. */
  tokenGrupo: string | null;
  /** El botón «Completar mi inscripción». Secreto; se borra al completar. */
  tokenCompletar: string | null;
}

/** Cómo viene la fila de Postgres, en snake_case. */
export interface FilaPerfil {
  id: string;
  correo: string;
  google_sub: string | null;
  nombre: string;
  apellido: string;
  institucion: string | null;
  tipo_institucion: TipoInstitucion | null;
  pais: string | null;
  telefono: string | null;
  rol: Rol;
  estado: EstadoPerfil;
  sesion_v: number;
  token_grupo: string | null;
  token_completar: string | null;
}

export const aPerfil = (f: FilaPerfil): Perfil => ({
  id: f.id,
  correo: f.correo,
  googleSub: f.google_sub,
  nombre: f.nombre,
  apellido: f.apellido,
  institucion: f.institucion,
  tipoInstitucion: f.tipo_institucion,
  pais: f.pais,
  telefono: f.telefono,
  rol: f.rol,
  estado: f.estado,
  sesionV: f.sesion_v,
  tokenGrupo: f.token_grupo,
  tokenCompletar: f.token_completar,
});

/**
 * Completo = tiene lo que pide el formulario además del correo. El teléfono
 * no cuenta: es opcional del todo (docs/09).
 *
 * Mientras no esté completo, el panel le pide los datos antes de dejarlo
 * armar equipo o subir algo, y la tarea periódica le manda el recordatorio.
 */
export const perfilCompleto = (
  p: Pick<Perfil, 'nombre' | 'apellido' | 'tipoInstitucion' | 'institucion' | 'pais'>,
): boolean => Boolean(p.nombre && p.apellido && p.tipoInstitucion && p.institucion && p.pais);

export const COLUMNAS_PERFIL = `
  id, correo, google_sub, nombre, apellido,
  institucion, tipo_institucion, pais, telefono, rol, estado, sesion_v,
  token_grupo, token_completar
`;
