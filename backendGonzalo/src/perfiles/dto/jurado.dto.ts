import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class InvitarJuradoDto {
  @ApiProperty({
    description: 'El correo de su cuenta de Google: con ese y solo con ese va a poder entrar.',
    example: 'jurado@gmail.com',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'El correo no tiene forma de correo' })
  @MaxLength(254)
  correo: string;

  @ApiPropertyOptional({ example: 'Sol' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional({ example: 'Pulido' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  apellido?: string;
}

export class JuradoDto {
  @ApiProperty() id: string;
  @ApiProperty() correo: string;
  @ApiProperty() nombre: string;
  @ApiProperty() apellido: string;
  @ApiProperty({ description: '`habilitado` hasta que entre por primera vez; después `activo`.' })
  estado: string;
}
