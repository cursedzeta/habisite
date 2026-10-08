import { ApiProperty } from '@nestjs/swagger';

/** El estado del concurso, para que el front no tenga que pedirlo aparte. */
export class EdicionResumenDto {
  @ApiProperty({ enum: ['inscripcion', 'entregas', 'preseleccion', 'final', 'cerrada', 'publicada'] })
  estado: string;

  @ApiProperty({ nullable: true, example: '2026-10-15T23:59:59-03:00' })
  cierreEntregas: string | null;

  @ApiProperty({ description: 'Minutos de gracia después del cierre', example: 15 })
  margenGraciaMinutos: number;

  @ApiProperty({
    description:
      'Lo único que el front necesita mirar para decidir si muestra el botón de entregar. ' +
      'Ya tiene en cuenta el margen de gracia.',
  })
  entregasAbiertas: boolean;

  @ApiProperty({ example: 31457280, description: 'Tope del PDF en bytes' })
  maxBytes: number;

  @ApiProperty({ nullable: true, example: 5 })
  maxIntegrantes: number | null;

  @ApiProperty({ nullable: true })
  maxPaginas: number | null;

  @ApiProperty({ example: 'America/Argentina/Buenos_Aires' })
  zonaHoraria: string;

  @ApiProperty({
    nullable: true,
    description: 'Dónde se leen las bases. `null` mientras no estén publicadas: mostrar el texto sin enlace.',
  })
  terminosUrl: string | null;
}

/** La respuesta de `GET /yo`: la primera llamada de todas las pantallas. */
export class YoDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  correo: string;

  @ApiProperty()
  nombre: string;

  @ApiProperty()
  apellido: string;

  @ApiProperty({ nullable: true, example: '+5491123456789' })
  telefono: string | null;

  @ApiProperty({ nullable: true, enum: ['universidad', 'trabajo', 'independiente'] })
  tipoInstitucion: string | null;

  @ApiProperty({ nullable: true })
  institucion: string | null;

  @ApiProperty({ nullable: true })
  pais: string | null;

  @ApiProperty({
    enum: ['participante', 'jurado', 'admin'],
    description: 'Decide a qué panel entra.',
  })
  rol: string;

  @ApiProperty({
    description:
      'Si es `false`, el panel tiene que pedirle los datos que faltan (`PUT /yo`) antes ' +
      'de dejarlo armar equipo o subir algo: el servidor lo rechaza con 403 igual. ' +
      'Siempre `true` para jurados y admins.',
  })
  perfilCompleto: boolean;

  @ApiProperty({ type: EdicionResumenDto })
  edicion: EdicionResumenDto;
}
