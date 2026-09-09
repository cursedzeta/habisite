export type EstadoPropuesta = 'borrador' | 'entregada' | 'descalificada';
export type FormaEntrega = 'confirmada' | 'automatica';

export interface ArchivoResumen {
  nombreOriginal: string;
  bytes: number;
  paginas: number | null;
  subidoEn: Date;
}

export interface Propuesta {
  id: string;
  equipoId: string;
  titulo: string;
  memoria: string | null;
  estado: EstadoPropuesta;
  formaEntrega: FormaEntrega | null;
  finalista: boolean;
  entregadaEn: Date | null;
  motivoDescalificacion: string | null;
  archivo: ArchivoResumen | null;
}

export interface FilaPropuesta {
  id: string;
  equipo_id: string;
  titulo: string;
  memoria: string | null;
  estado: EstadoPropuesta;
  forma_entrega: FormaEntrega | null;
  finalista: boolean;
  entregada_en: Date | null;
  motivo_descalificacion: string | null;
  nombre_original: string | null;
  bytes: number | null;
  paginas: number | null;
  subido_en: Date | null;
}

export const aPropuesta = (f: FilaPropuesta): Propuesta => ({
  id: f.id,
  equipoId: f.equipo_id,
  titulo: f.titulo,
  memoria: f.memoria,
  estado: f.estado,
  formaEntrega: f.forma_entrega,
  finalista: f.finalista,
  entregadaEn: f.entregada_en,
  motivoDescalificacion: f.motivo_descalificacion,
  archivo: f.nombre_original
    ? {
        nombreOriginal: f.nombre_original,
        bytes: f.bytes!,
        paginas: f.paginas,
        subidoEn: f.subido_en!,
      }
    : null,
});
