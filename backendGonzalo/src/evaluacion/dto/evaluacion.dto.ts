import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CriterioDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'creatividad' }) codigo: string;
  @ApiProperty({ example: 'Creatividad y originalidad' }) nombre: string;
  @ApiProperty({ nullable: true }) descripcion: string | null;
  @ApiProperty({ example: 0.35, description: 'Los pesos suman 1' }) peso: number;
  @ApiProperty() orden: number;
}

export class PuntajeItemDto {
  @ApiProperty() @IsUUID() criterioId: string;

  @ApiProperty({
    minimum: 1,
    maximum: 10,
    description: 'La escala todavía no está confirmada con el jurado.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  valor: number;
}

export class GuardarPuntajesDto {
  @ApiProperty({
    type: [PuntajeItemDto],
    description: 'Se puede mandar parcial: el jurado deja a medias y sigue otro día.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PuntajeItemDto)
  puntajes: PuntajeItemDto[];
}

export class PreseleccionarDto {
  @ApiProperty({ description: 'true la manda a la vuelta 2.' })
  @IsBoolean()
  elegida: boolean;
}

export class DevolucionDto {
  @ApiProperty({
    description: 'Nota interna del jurado, opcional. El concursante no la ve.',
  })
  @IsString()
  @MaxLength(10000)
  texto: string;
}

export class PropuestaJuradoDto {
  @ApiProperty() id: string;
  @ApiProperty() titulo: string;
  @ApiProperty() tieneArchivo: boolean;
  @ApiProperty() finalista: boolean;
  @ApiProperty({ nullable: true, description: 'Vuelta 1: si este jurado la eligió.' })
  preseleccionada: boolean | null;
  @ApiProperty({ description: 'Cuántos de los criterios ya puntuó este jurado.' })
  criteriosPuntuados: number;
  @ApiProperty({ description: 'Total de criterios activos: con esto se arma «3 de 7».' })
  criteriosTotales: number;
  @ApiProperty({
    nullable: true,
    description: 'Null si la evaluación es a ciegas. Sin cerrar todavía.',
  })
  equipo: string | null;
  @ApiProperty({ type: [String], nullable: true, description: 'Null si es a ciegas.' })
  autores: string[] | null;
}

export class AvanceDto {
  @ApiProperty({ enum: ['preseleccion', 'final'] }) vuelta: string;
  @ApiProperty() asignadas: number;
  @ApiProperty() revisadas: number;
  @ApiProperty() completas: number;
}
