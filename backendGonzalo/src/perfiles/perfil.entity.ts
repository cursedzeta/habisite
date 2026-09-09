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
  rol: Rol;
  estado: EstadoPerfil;
  sesionV: number;
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
  rol: Rol;
  estado: EstadoPerfil;
  sesion_v: number;
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
  rol: f.rol,
  estado: f.estado,
  sesionV: f.sesion_v,
});

export const COLUMNAS_PERFIL = `
  id, correo, google_sub, nombre, apellido,
  institucion, tipo_institucion, pais, rol, estado, sesion_v
`;
