import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import type { TipoInstitucion } from '../perfil.entity.js';

/*
 * El formulario único de la landing (docs/09 y docs/11).
 *
 * Solo el correo y las bases son obligatorios: perder a alguien porque no
 * quiso escribir su universidad es peor que tenerlo incompleto. Un texto
 * vacío se trata como si no hubiera venido.
 */

const recortar = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const limpio = value.trim();
  return limpio === '' ? undefined : limpio;
};

const aCodigoPais = ({ value }: { value: unknown }) => {
  const limpio = recortar({ value });
  return typeof limpio === 'string' ? limpio.toUpperCase() : limpio;
};

const TIPOS = ['universidad', 'trabajo', 'independiente'];

/** Los datos personales: los comparten el formulario y el «completar» del panel. */
export class DatosPersonalesDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Duarte' })
  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellido?: string;

  @ApiPropertyOptional({
    description: 'Formato internacional E.164: + código de país y número, sin espacios.',
    example: '+5491123456789',
  })
  @Transform(recortar)
  @IsOptional()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'El teléfono tiene que estar en formato internacional, por ejemplo +5491123456789',
  })
  telefono?: string;

  @ApiPropertyOptional({ enum: TIPOS })
  @Transform(recortar)
  @IsOptional()
  @IsIn(TIPOS, { message: 'El tipo tiene que ser universidad, trabajo o independiente' })
  tipoInstitucion?: TipoInstitucion;

  @ApiPropertyOptional({
    description: 'Universidad o lugar de trabajo: puede haber profesionales jóvenes.',
    example: 'FADU-UBA',
  })
  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  institucion?: string;

  @ApiPropertyOptional({ example: 'AR', description: 'Código ISO de dos letras. `ZZ` para «Otro».' })
  @Transform(aCodigoPais)
  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'El país tiene que ser un código de dos letras, por ejemplo AR' })
  pais?: string;
}

export class InscripcionDto extends DatosPersonalesDto {
  @ApiProperty({
    description:
      'El correo de Google con el que va a entrar. Tiene que ser exactamente ese: ' +
      'si después ingresa con otra cuenta, queda afuera.',
    example: 'ana@gmail.com',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'El correo no tiene forma de correo' })
  @MaxLength(254)
  correo: string;

  @ApiProperty({
    description: 'Tiene que ser `true`. La versión de las bases la registra el servidor.',
    example: true,
  })
  @Equals(true, { message: 'Hay que aceptar las bases del concurso' })
  aceptaBases: boolean;

  @ApiProperty({ description: 'El token que genera el widget de Cloudflare Turnstile.' })
  @IsString()
  @IsNotEmpty({ message: 'Falta la verificación de Turnstile' })
  @MaxLength(4096)
  turnstileToken: string;

  @ApiPropertyOptional({
    description: 'De qué canal vino: lo lee el front del parámetro `?origen=` de la URL.',
    example: 'linkedin',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase().slice(0, 40) || undefined : value,
  )
  @IsOptional()
  @IsString()
  origen?: string;

  @ApiPropertyOptional({
    description:
      'Solo si la landing se abrió desde el botón «Completar mi inscripción» del correo ' +
      '(`?completar=`). Completa esa inscripción en vez de crear otra.',
  })
  @Transform(recortar)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tokenCompletar?: string;
}

/** La respuesta del formulario. Es igual para un correo nuevo y uno repetido. */
export class RespuestaInscripcionDto {
  @ApiProperty({
    enum: ['completa', 'incompleta'],
    description:
      '`completa`: redirigir al grupo a los 3 segundos. `incompleta`: mostrar el botón ' +
      'al grupo y avisar que le llega un correo para completar. Depende solo de lo que ' +
      'se mandó en este envío.',
  })
  estado: 'completa' | 'incompleta';

  @ApiProperty({
    description:
      'El enlace al grupo de WhatsApp. Pasa por la API (registra el clic) y de ahí redirige. ' +
      'Usar siempre este, nunca uno escrito en el front.',
    example: 'https://api.challenge.habisite.com/r/Xk3f…',
  })
  whatsapp: string;
}

/** Lo que precarga el formulario cuando se abre con `?completar=`. */
export class DatosParaCompletarDto {
  @ApiProperty() correo: string;
  @ApiProperty() nombre: string;
  @ApiProperty() apellido: string;
  @ApiProperty({ nullable: true }) telefono: string | null;
  @ApiProperty({ nullable: true, enum: TIPOS }) tipoInstitucion: string | null;
  @ApiProperty({ nullable: true }) institucion: string | null;
  @ApiProperty({ nullable: true }) pais: string | null;
}
