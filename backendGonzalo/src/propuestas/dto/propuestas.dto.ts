import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarPropuestaDto {
  @ApiProperty({ example: 'Refugio en la ladera' })
  @IsString()
  @MaxLength(200)
  titulo: string;

  @ApiPropertyOptional({ description: 'Memoria descriptiva, si va aparte del PDF.' })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  memoria?: string;
}

export class DescalificarDto {
  @ApiProperty({ example: 'El archivo no corresponde al tema del concurso' })
  @IsString()
  @MaxLength(500)
  motivo: string;
}

export class ArchivoResumenDto {
  @ApiProperty() nombreOriginal: string;
  @ApiProperty({ description: 'Tamaño en bytes' }) bytes: number;
  @ApiProperty({ nullable: true }) paginas: number | null;
  @ApiProperty() subidoEn: string;
}

export class PropuestaDto {
  @ApiProperty() id: string;
  @ApiProperty() titulo: string;
  @ApiProperty({ nullable: true }) memoria: string | null;
  @ApiProperty({ enum: ['borrador', 'entregada', 'descalificada'] })
  estado: string;
  @ApiProperty({
    enum: ['confirmada', 'automatica'],
    nullable: true,
    description:
      '`automatica` = el equipo no confirmó y la entregó el sistema al vencer el plazo.',
  })
  formaEntrega: string | null;
  @ApiProperty({ nullable: true }) entregadaEn: string | null;
  @ApiProperty({
    type: ArchivoResumenDto,
    nullable: true,
    description: 'Los metadatos del PDF. El contenido se pide aparte, por su propia ruta.',
  })
  archivo: ArchivoResumenDto | null;
  @ApiProperty({ description: 'Si todavía se puede editar. Ya tiene en cuenta el margen de gracia.' })
  editable: boolean;
}
