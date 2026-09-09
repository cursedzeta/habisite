export type EstadoEdicion =
  | 'inscripcion'
  | 'entregas'
  | 'preseleccion'
  | 'final'
  | 'cerrada'
  | 'publicada';

export interface Edicion {
  nombre: string;
  estado: EstadoEdicion;
  zonaHoraria: string;
  cierreEntregas: Date | null;
  cierreEvaluacion: Date | null;
  margenGraciaMinutos: number;
  cupoPreseleccion: number | null;
  maxIntegrantes: number | null;
  maxBytes: number;
  maxPaginas: number | null;
  semillaReparto: string | null;
  /** Calculado en SQL: ya tiene en cuenta el margen de gracia. */
  entregasAbiertas: boolean;
}

export interface FilaEdicion {
  nombre: string;
  estado: EstadoEdicion;
  zona_horaria: string;
  cierre_entregas: Date | null;
  cierre_evaluacion: Date | null;
  margen_gracia_minutos: number;
  cupo_preseleccion: number | null;
  max_integrantes: number | null;
  max_bytes: number;
  max_paginas: number | null;
  semilla_reparto: string | null;
  entregas_abiertas: boolean;
}

export const aEdicion = (f: FilaEdicion): Edicion => ({
  nombre: f.nombre,
  estado: f.estado,
  zonaHoraria: f.zona_horaria,
  cierreEntregas: f.cierre_entregas,
  cierreEvaluacion: f.cierre_evaluacion,
  margenGraciaMinutos: f.margen_gracia_minutos,
  cupoPreseleccion: f.cupo_preseleccion,
  maxIntegrantes: f.max_integrantes,
  maxBytes: f.max_bytes,
  maxPaginas: f.max_paginas,
  semillaReparto: f.semilla_reparto,
  entregasAbiertas: f.entregas_abiertas,
});
