import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { TipoInstitucion } from '../perfil.entity.js';

/** Lo que manda el formulario de inscripción de la landing. */
export class InscripcionDto {
  @ApiProperty({
    description:
      'El correo de Google con el que va a entrar. Tiene que ser exactamente ese: ' +
      'si después ingresa con otra cuenta, queda afuera.',
    example: 'ana@gmail.com',
  })
  @IsEmail({}, { message: 'El correo no tiene forma de correo' })
  correo: string;

  @ApiProperty({ example: 'Ana' })
  @IsString()
  @IsNotEmpty({ message: 'Falta el nombre' })
  @MaxLength(120)
  nombre: string;

  @ApiProperty({ example: 'Duarte' })
  @IsString()
  @IsNotEmpty({ message: 'Falta el apellido' })
  @MaxLength(120)
  apellido: string;

  @ApiProperty({
    description: 'Universidad o lugar de trabajo: puede haber profesionales jóvenes.',
    example: 'FADU-UBA',
  })
  @IsString()
  @IsNotEmpty({ message: 'Falta la universidad o el trabajo' })
  @MaxLength(200)
  institucion: string;

  @ApiProperty({ enum: ['universidad', 'trabajo', 'independiente'] })
  @IsIn(['universidad', 'trabajo', 'independiente'])
  tipoInstitucion: TipoInstitucion;

  @ApiProperty({ example: 'AR', description: 'Código ISO de dos letras' })
  @IsString()
  @IsNotEmpty({ message: 'Falta el país' })
  @MaxLength(80)
  pais: string;

  @ApiProperty({
    required: false,
    description:
      'Token del enlace de invitación de un equipo. Si viene, además de inscribirse ' +
      'queda como integrante de ese equipo.',
  })
  @IsOptional()
  @IsString()
  tokenEquipo?: string;
}
