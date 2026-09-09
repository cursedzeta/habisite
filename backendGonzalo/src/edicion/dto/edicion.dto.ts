import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Cambios de configuración del concurso. Todo opcional: se manda solo lo que cambia. */
export class ActualizarEdicionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Con zona horaria explícita. Sin ella, el cierre cae a otra hora de la anunciada.',
    example: '2026-10-15T23:59:59-03:00',
  })
  @IsOptional()
  @IsDateString()
  cierreEntregas?: string;

  @ApiPropertyOptional({ example: '2026-10-30T23:59:59-03:00' })
  @IsOptional()
  @IsDateString()
  cierreEvaluacion?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 1440, example: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  margenGraciaMinutos?: number;

  @ApiPropertyOptional({ description: 'Cuántas preselecciona cada jurado en la vuelta 1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cupoPreseleccion?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxIntegrantes?: number;

  @ApiPropertyOptional({ example: 31457280 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxBytes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPaginas?: number;
}

export class CambiarEstadoDto {
  @ApiProperty({
    enum: ['inscripcion', 'entregas', 'preseleccion', 'final', 'cerrada', 'publicada'],
    description:
      'El paso a `preseleccion` cierra las entregas y pasa a entregadas los borradores con archivo.',
  })
  @IsIn(['inscripcion', 'entregas', 'preseleccion', 'final', 'cerrada', 'publicada'])
  estado: 'inscripcion' | 'entregas' | 'preseleccion' | 'final' | 'cerrada' | 'publicada';
}
