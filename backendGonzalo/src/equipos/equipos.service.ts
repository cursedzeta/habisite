import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Entorno } from '../configuracion/entorno.js';
import { EdicionRepository } from '../edicion/edicion.repository.js';
import { PerfilesRepository } from '../perfiles/perfiles.repository.js';
import type { EquipoDto } from './dto/equipos.dto.js';
import type { Equipo } from './equipo.entity.js';
import { EquiposRepository } from './equipos.repository.js';

@Injectable()
export class EquiposService {
  private readonly log = new Logger(EquiposService.name);

  constructor(
    private readonly equipos: EquiposRepository,
    private readonly perfiles: PerfilesRepository,
    private readonly edicion: EdicionRepository,
    private readonly config: ConfigService<Entorno, true>,
  ) {}

  async crear(perfilId: string, nombre?: string): Promise<EquipoDto> {
    if (await this.equipos.delPerfil(perfilId)) {
      throw new ConflictException('Ya formás parte de un equipo');
    }
    const equipo = await this.equipos.crear(perfilId, nombre ?? null);
    return this.aDto(await this.equipos.delPerfil(perfilId) ?? equipo, perfilId);
  }

  async mio(perfilId: string): Promise<EquipoDto | null> {
    const equipo = await this.equipos.delPerfil(perfilId);
    return equipo ? this.aDto(equipo, perfilId) : null;
  }

  /**
   * Invitación por correo, desde la card del panel.
   *
   * Deja el perfil creado con ese correo aunque la persona no exista todavía:
   * así, cuando entre con Google, la lista blanca la encuentra y hereda su
   * lugar en el equipo.
   */
  async invitar(perfilId: string, correos: string[]): Promise<{ correo: string; enlace: string }[]> {
    const equipo = await this.exigirEquipo(perfilId);
    await this.exigirLider(equipo, perfilId);
    await this.exigirCupo(equipo, correos.length);

    const front = this.config.get('FRONTEND_URL', { infer: true });
    const invitaciones: { correo: string; enlace: string }[] = [];

    for (const correo of correos) {
      const invitado = await this.perfiles.asegurarPorCorreo(correo);
      const token = await this.equipos.invitar(equipo.id, invitado.id);
      invitaciones.push({ correo, enlace: `${front}/invitacion/${token}` });
    }

    // TODO(fase de correos): despachar el mail de invitación con este enlace.
    this.log.log(`${invitaciones.length} invitación(es) generadas para el equipo ${equipo.id}`);
    return invitaciones;
  }

  /**
   * Alta por el enlace que comparte el líder. Es el camino sin fricción: quien
   * lo abre queda inscripto Y adentro del equipo, con la cuenta de Google que
   * use, sin que ningún correo tenga que coincidir.
   */
  async aceptarPorEnlace(
    token: string,
    perfilId: string,
    terminosVersion: string,
    ip: string | null,
  ): Promise<EquipoDto> {
    const equipo = await this.equipos.porToken(token);
    if (!equipo) throw new NotFoundException('Ese enlace de invitación no existe');
    if (!equipo.invitacionActiva) {
      throw new ForbiddenException('El equipo cerró las invitaciones');
    }

    const { estado } = await this.edicion.obtener();
    if (estado !== 'inscripcion' && estado !== 'entregas') {
      throw new ForbiddenException('Ya cerró el plazo para sumarse a un equipo');
    }

    const otro = await this.equipos.delPerfil(perfilId);
    if (otro && otro.id !== equipo.id) {
      throw new ConflictException('Ya formás parte de otro equipo');
    }
    await this.exigirCupo(equipo, 1);

    await this.equipos.aceptar(equipo.id, perfilId, terminosVersion, ip);
    return this.aDto((await this.equipos.delPerfil(perfilId))!, perfilId);
  }

  async darseDeBaja(perfilId: string): Promise<void> {
    const equipo = await this.exigirEquipo(perfilId);

    // Después de entregar, la lista de autores queda firme: si no, alguien
    // podría salirse después de ganar, o cambiar la autoría con el premio ya
    // asignado.
    const { estado } = await this.edicion.obtener();
    if (estado !== 'inscripcion' && estado !== 'entregas') {
      throw new ForbiddenException('Ya no se puede dar de baja: la propuesta está entregada');
    }
    await this.equipos.darDeBaja(equipo.id, perfilId);
  }

  async regenerarEnlace(perfilId: string): Promise<{ enlaceInvitacion: string }> {
    const equipo = await this.exigirEquipo(perfilId);
    await this.exigirLider(equipo, perfilId);
    const token = await this.equipos.regenerarEnlace(equipo.id);
    return { enlaceInvitacion: this.enlace(token) };
  }

  async activarEnlace(perfilId: string, activa: boolean): Promise<void> {
    const equipo = await this.exigirEquipo(perfilId);
    await this.exigirLider(equipo, perfilId);
    await this.equipos.activarEnlace(equipo.id, activa);
  }

  // ── auxiliares ───────────────────────────────────────────────────

  private async exigirEquipo(perfilId: string): Promise<Equipo> {
    const equipo = await this.equipos.delPerfil(perfilId);
    if (!equipo) throw new NotFoundException('Todavía no formás parte de ningún equipo');
    return equipo;
  }

  private exigirLider(equipo: Equipo, perfilId: string): void {
    const yo = equipo.miembros.find((m) => m.perfilId === perfilId);
    if (!yo?.esLider) throw new ForbiddenException('Solo quien armó el equipo puede hacer esto');
  }

  private async exigirCupo(equipo: Equipo, sumando: number): Promise<void> {
    const { maxIntegrantes } = await this.edicion.obtener();
    if (maxIntegrantes === null) return;

    const actuales = equipo.miembros.length;
    if (actuales + sumando > maxIntegrantes) {
      throw new BadRequestException(
        `El equipo puede tener hasta ${maxIntegrantes} integrantes y ya tiene ${actuales}`,
      );
    }
  }

  private enlace(token: string): string {
    return `${this.config.get('FRONTEND_URL', { infer: true })}/equipo/sumarme/${token}`;
  }

  private async aDto(equipo: Equipo, perfilId: string): Promise<EquipoDto> {
    const yo = equipo.miembros.find((m) => m.perfilId === perfilId);
    const soyLider = yo?.esLider ?? false;
    const { maxIntegrantes } = await this.edicion.obtener();

    return {
      id: equipo.id,
      nombre: equipo.nombre,
      miembros: equipo.miembros.map((m) => ({
        perfilId: m.perfilId,
        nombre: m.nombre,
        apellido: m.apellido,
        correo: m.correo,
        institucion: m.institucion,
        estado: m.estado,
        esLider: m.esLider,
      })),
      // El enlace solo lo ve el líder: es quien decide con quién compartirlo.
      enlaceInvitacion: soyLider ? this.enlace(equipo.tokenInvitacion) : null,
      invitacionActiva: equipo.invitacionActiva,
      soyLider,
      maxIntegrantes,
    };
  }
}
