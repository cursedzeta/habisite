import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class PedirEnlaceDto {
  @ApiProperty({ description: 'El correo con el que se inscribió.', example: 'ana@estudio.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'El correo no tiene forma de correo' })
  @MaxLength(254)
  correo: string;

  @ApiPropertyOptional({
    description: 'Ruta del front a la que volver después de entrar. Solo rutas internas.',
    example: '/panel',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  // Sin esto el enlace del correo serviría de redirector abierto.
  @Matches(/^\/(?!\/)/, { message: 'El retorno tiene que ser una ruta interna' })
  retorno?: string;
}

export class CanjearEnlaceDto {
  @ApiProperty({ description: 'El token que trae el enlace del correo (`?enlace=`).' })
  @IsString()
  @MaxLength(100)
  token: string;
}

export class RespuestaCanjeDto {
  @ApiProperty({ description: 'A dónde llevar a la persona ahora que tiene sesión.', example: '/panel' })
  retorno: string;
}
