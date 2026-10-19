import { describe, expect, it } from 'vitest';
import type { FilaInscripto } from './planilla.repository.js';
import {
  armarFilas,
  fechaCorta,
  leerCredenciales,
  letraDeColumna,
} from './planilla.service.js';

const ZONA = 'America/Argentina/Buenos_Aires';

const inscripto = (extra: Partial<FilaInscripto> = {}): FilaInscripto => ({
  creado_en: new Date('2026-10-19T17:30:00Z'),
  correo: 'ana@ejemplo.com',
  nombre: 'Ana',
  apellido: 'Paz',
  telefono: '+5491123456789',
  tipo_institucion: 'universidad',
  institucion: 'UBA',
  pais: 'Argentina',
  origenes: ['instagram', 'linkedin'],
  clic_grupo_en: null,
  recordatorio_enviado_en: null,
  estado: 'habilitado',
  equipo: null,
  estado_en_equipo: null,
  es_lider: null,
  ...extra,
});

describe('planilla', () => {
  it('escribe la fecha en la zona del concurso', () => {
    expect(fechaCorta(new Date('2026-10-19T17:30:00Z'), ZONA)).toBe(
      '2026-10-19 14:30',
    );
    expect(fechaCorta(null, ZONA)).toBe('');
  });

  it('arma encabezado y una fila por inscripto, con las columnas alineadas', () => {
    const filas = armarFilas(
      [
        inscripto(),
        inscripto({ nombre: '', estado_en_equipo: 'aceptado', es_lider: true }),
      ],
      ZONA,
    );
    expect(filas).toHaveLength(3);
    filas.forEach((f) => expect(f).toHaveLength(filas[0].length));
    expect(filas[1].slice(0, 9)).toEqual([
      '2026-10-19 14:30',
      'ana@ejemplo.com',
      'Ana',
      'Paz',
      '+5491123456789',
      'Universidad',
      'UBA',
      'Argentina',
      'Sí',
    ]);
    expect(filas[1][11]).toBe('instagram, linkedin');
    expect(filas[2][8]).toBe('No');
    expect(filas[2].slice(12, 14)).toEqual(['Sin nombre', 'Líder']);
  });

  it('cuenta columnas como Sheets', () => {
    expect(letraDeColumna(1)).toBe('A');
    expect(letraDeColumna(17)).toBe('Q');
    expect(letraDeColumna(26)).toBe('Z');
    expect(letraDeColumna(27)).toBe('AA');
  });

  it('rechaza una clave que no es de cuenta de servicio', () => {
    expect(leerCredenciales(undefined)).toBeNull();
    expect(leerCredenciales('no es json')).toBeNull();
    expect(leerCredenciales('{"client_email":"x@y"}')).toBeNull();
    expect(
      leerCredenciales('{"client_email":"x@y","private_key":"k"}'),
    ).toEqual({ email: 'x@y', key: 'k' });
  });
});
