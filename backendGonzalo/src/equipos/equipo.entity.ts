export type EstadoMiembro = 'invitado' | 'aceptado' | 'baja';

export interface Miembro {
  perfilId: string;
  nombre: string;
  apellido: string;
  correo: string;
  institucion: string | null;
  estado: EstadoMiembro;
  esLider: boolean;
  aceptadoEn: Date | null;
}

export interface Equipo {
  id: string;
  nombre: string | null;
  creadoPor: string;
  tokenInvitacion: string;
  invitacionActiva: boolean;
  miembros: Miembro[];
}

export interface FilaMiembro {
  perfil_id: string;
  nombre: string;
  apellido: string;
  correo: string;
  institucion: string | null;
  estado: EstadoMiembro;
  es_lider: boolean;
  aceptado_en: Date | null;
}

export const aMiembro = (f: FilaMiembro): Miembro => ({
  perfilId: f.perfil_id,
  nombre: f.nombre,
  apellido: f.apellido,
  correo: f.correo,
  institucion: f.institucion,
  estado: f.estado,
  esLider: f.es_lider,
  aceptadoEn: f.aceptado_en,
});
