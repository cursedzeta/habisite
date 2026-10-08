import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearEquipoDto {
  @ApiPropertyOptional({ description: 'Se puede poner después.', example: 'Estudio Norte' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nombre?: string;
}

export class InvitarDto {
  @ApiProperty({
    type: [String],
    description:
      'Un correo por integrante. A cada uno le llega un enlace que sirve con cualquier ' +
      'cuenta de Google, no solo la de ese correo.',
    example: ['tomas@gmail.com', 'sol@gmail.com'],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'No hay ningún correo para invitar' })
  @ArrayMaxSize(20)
  @IsEmail({}, { each: true, message: 'Hay un correo con forma inválida' })
  correos: string[];
}

export class AceptarInvitacionDto {
  @ApiPropertyOptional({
    deprecated: true,
    description:
      'Ya no se usa: la versión de las bases la pone el servidor (la vigente en la edición). ' +
      'Se acepta para no romper llamadas viejas, pero se ignora.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  terminosVersion?: string;
}

/** Lo que muestra la pantalla de una invitación por correo, antes del login. */
export class InvitacionDto {
  @ApiProperty({ nullable: true, example: 'Estudio Norte' })
  equipo: string | null;

  @ApiProperty({
    nullable: true,
    example: 'Ana Duarte',
    description: 'Quién armó el equipo. `null` si todavía no cargó su nombre.',
  })
  invitadoPor: string | null;
}

export class MiembroDto {
  @ApiProperty() perfilId: string;
  @ApiProperty() nombre: string;
  @ApiProperty() apellido: string;
  @ApiProperty() correo: string;
  @ApiProperty({ nullable: true }) institucion: string | null;
  @ApiProperty({
    enum: ['invitado', 'aceptado'],
    description: '`invitado` todavía no aceptó: figura en la lista pero no cuenta como autor.',
  })
  estado: string;
  @ApiProperty() esLider: boolean;
}

export class EquipoDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) nombre: string | null;
  @ApiProperty({ type: [MiembroDto] }) miembros: MiembroDto[];
  @ApiProperty({
    nullable: true,
    description: 'El enlace para compartir. Solo lo ve el líder; a los demás les llega `null`.',
  })
  enlaceInvitacion: string | null;
  @ApiProperty() invitacionActiva: boolean;
  @ApiProperty({ description: 'Si quien pregunta es el líder del equipo.' })
  soyLider: boolean;
  @ApiProperty({ nullable: true, description: 'Tope de integrantes, o `null` si no hay.' })
  maxIntegrantes: number | null;
}
