import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CorreoService } from '../correo/correo.service.js';
import { Enlaces } from '../correo/enlaces.js';
import { EdicionRepository } from '../edicion/edicion.repository.js';
import { PerfilesRepository } from '../perfiles/perfiles.repository.js';
import { PerfilesService } from '../perfiles/perfiles.service.js';
import type { EquipoDto, InvitacionDto } from './dto/equipos.dto.js';
import type { Equipo } from './equipo.entity.js';
import { EquiposRepository } from './equipos.repository.js';

/** Lo que se graba como versión mientras la organización no cargue la real. */
const VERSION_SIN_DEFINIR = 'sin-definir';

@Injectable()
export class EquiposService {
  private readonly log = new Logger(EquiposService.name);

  constructor(
    private readonly equipos: EquiposRepository,
    private readonly perfiles: PerfilesRepository,
    private readonly perfilesService: PerfilesService,
    private readonly edicion: EdicionRepository,
    private readonly correos: CorreoService,
    private readonly enlaces: Enlaces,
  ) {}

  async crear(perfilId: string, nombre?: string): Promise<EquipoDto> {
    // Primero completa sus datos, después arma equipo (docs/09).
    await this.perfilesService.exigirCompleto(perfilId);
    if (await this.equipos.delPerfil(perfilId)) {
      throw new ConflictException('Ya formás parte de un equipo');
    }
    const equipo = await this.equipos.crear(perfilId, nombre ?? null);
    return this.aDto((await this.equipos.delPerfil(perfilId)) ?? equipo, perfilId);
  }

  async mio(perfilId: string): Promise<EquipoDto | null> {
    const equipo = await this.equipos.delPerfil(perfilId);
    return equipo ? this.aDto(equipo, perfilId) : null;
  }

  /**
   * Invitación por correo, desde la card del panel. A cada dirección le llega
   * el C4 con su propio enlace.
   *
   * Deja el perfil creado con ese correo aunque la persona no exista todavía,
   * así la lista blanca la encuentra si entra con esa cuenta. Si entra con
   * otra, el token del enlace la reconoce igual (docs/05).
   */
  async invitar(perfilId: string, correos: string[]): Promise<{ correo: string; enlace: string }[]> {
    const equipo = await this.exigirEquipo(perfilId);
    this.exigirLider(equipo, perfilId);
    await this.exigirPlazo();

    const yo = equipo.miembros.find((m) => m.perfilId === perfilId)!;
    const yaEstan = new Set(equipo.miembros.map((m) => m.correo.toLowerCase()));
    const nuevos = [...new Set(correos.map((c) => c.trim().toLowerCase()))].filter(
      (c) => c !== yo.correo.toLowerCase(),
    );
    // Reinvitar a alguien pendiente no ocupa otro lugar.
    await this.exigirCupo(equipo, nuevos.filter((c) => !yaEstan.has(c)).length);

    const lider = `${yo.nombre} ${yo.apellido}`.trim() || yo.correo;
    const { terminosUrl } = await this.edicion.obtener();
    const invitaciones: { correo: string; enlace: string }[] = [];

    for (const correo of nuevos) {
      const invitado = await this.perfiles.asegurarPorCorreo(correo);
      const token = await this.equipos.invitar(equipo.id, invitado.id);
      if (!token) continue; // ya es integrante

      const enlace = this.enlaces.invitacion(token);
      invitaciones.push({ correo, enlace });
      // La clave lleva el token: reinvitar a alguien pendiente no le manda el
      // mismo correo otra vez, pero si se dio de baja y lo vuelven a invitar, sí.
      await this.correos.encolar(
        'c4',
        correo,
        { lider, equipo: equipo.nombre, enlace, terminosUrl },
        { clave: `c4:${token}`, perfilId: invitado.id },
      );
    }

    this.log.log(`${invitaciones.length} invitación(es) para el equipo ${equipo.id}`);
    return invitaciones;
  }

  /** Lo que muestra la pantalla de la invitación antes de pedir el login. */
  async verInvitacion(token: string): Promise<InvitacionDto> {
    const invitacion = await this.equipos.invitacionPorToken(token);
    if (!invitacion) throw new NotFoundException('Esta invitación ya no es válida');
    return { equipo: invitacion.equipo, invitadoPor: invitacion.lider };
  }

  /**
   * Acepta la invitación del correo. Sirve con la cuenta de Google que sea:
   * el token identifica la invitación, no el correo (docs/05).
   */
  async aceptarInvitacion(token: string, perfilId: string, ip: string | null): Promise<EquipoDto> {
    const invitacion = await this.equipos.invitacionPorToken(token);
    if (!invitacion) throw new NotFoundException('Esta invitación ya no es válida');
    await this.exigirPlazo();

    const otro = await this.equipos.delPerfil(perfilId);
    if (otro && otro.id !== invitacion.equipoId) {
      throw new ConflictException('Ya formás parte de otro equipo');
    }

    await this.equipos.aceptarInvitacion(invitacion, perfilId, await this.versionTerminos(), ip);
    return this.aDto((await this.equipos.delPerfil(perfilId))!, perfilId);
  }

  /**
   * Alta por el enlace que comparte el líder. Es el camino sin fricción: quien
   * lo abre queda inscripto Y adentro del equipo, con la cuenta de Google que
   * use, sin que ningún correo tenga que coincidir.
   */
  async aceptarPorEnlace(token: string, perfilId: string, ip: string | null): Promise<EquipoDto> {
    const equipo = await this.equipos.porToken(token);
    if (!equipo) throw new NotFoundException('Ese enlace de invitación no existe');
    if (!equipo.invitacionActiva) {
      throw new ForbiddenException('El equipo cerró las invitaciones');
    }
    await this.exigirPlazo();

    const otro = await this.equipos.delPerfil(perfilId);
    if (otro && otro.id !== equipo.id) {
      throw new ConflictException('Ya formás parte de otro equipo');
    }
    const yaEsta = equipo.miembros.some((m) => m.perfilId === perfilId);
    if (!yaEsta) await this.exigirCupo(equipo, 1);

    await this.equipos.aceptar(equipo.id, perfilId, await this.versionTerminos(), ip);
    return this.aDto((await this.equipos.delPerfil(perfilId))!, perfilId);
  }

  /**
   * ¿Este token habilita a entrar a alguien que no está en la lista blanca?
   * Lo pregunta el login: es lo que hace que una invitación sirva con
   * cualquier cuenta de Google (docs/05).
   */
  async tokenHabilitaIngreso(tipo: 'invitacion' | 'equipo', token: string): Promise<boolean> {
    const { estado } = await this.edicion.obtener();
    if (estado !== 'inscripcion' && estado !== 'entregas') return false;

    if (tipo === 'invitacion') return (await this.equipos.invitacionPorToken(token)) !== null;
    const equipo = await this.equipos.porToken(token);
    return Boolean(equipo?.invitacionActiva);
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

    const yo = equipo.miembros.find((m) => m.perfilId === perfilId)!;
    const { nuevoLiderId } = await this.equipos.darDeBaja(equipo.id, perfilId);

    // C5: al resto, para que no se enteren en la premiación.
    const quedan = await this.equipos.aceptados(equipo.id);
    const nuevoLider = nuevoLiderId ? quedan.find((m) => m.perfilId === nuevoLiderId) : null;
    const momento = Date.now();
    for (const m of quedan) {
      await this.correos.encolar(
        'c5',
        m.correo,
        {
          quienSeFue: `${yo.nombre} ${yo.apellido}`.trim() || yo.correo,
          nuevoLider: nuevoLider ? `${nuevoLider.nombre} ${nuevoLider.apellido}`.trim() || nuevoLider.correo : null,
          equipo: equipo.nombre,
        },
        { clave: `c5:${equipo.id}:${perfilId}:${momento}:${m.perfilId}`, perfilId: m.perfilId },
      );
    }
  }

  async regenerarEnlace(perfilId: string): Promise<{ enlaceInvitacion: string }> {
    const equipo = await this.exigirEquipo(perfilId);
    this.exigirLider(equipo, perfilId);
    const token = await this.equipos.regenerarEnlace(equipo.id);
    return { enlaceInvitacion: this.enlace(token) };
  }

  async activarEnlace(perfilId: string, activa: boolean): Promise<void> {
    const equipo = await this.exigirEquipo(perfilId);
    this.exigirLider(equipo, perfilId);
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

  /** Sumar gente se cierra junto con las entregas: no se agregan autores después. */
  private async exigirPlazo(): Promise<void> {
    const { estado } = await this.edicion.obtener();
    if (estado !== 'inscripcion' && estado !== 'entregas') {
      throw new ForbiddenException('Ya cerró el plazo para sumarse a un equipo');
    }
  }

  private async exigirCupo(equipo: Equipo, sumando: number): Promise<void> {
    const { maxIntegrantes } = await this.edicion.obtener();
    if (maxIntegrantes === null || sumando === 0) return;

    const actuales = equipo.miembros.length;
    if (actuales + sumando > maxIntegrantes) {
      throw new BadRequestException(
        `El equipo puede tener hasta ${maxIntegrantes} integrantes y ya tiene ${actuales}`,
      );
    }
  }

  /** La versión vigente la pone el servidor, nunca el cliente. */
  private async versionTerminos(): Promise<string> {
    return (await this.edicion.obtener()).terminosVersion ?? VERSION_SIN_DEFINIR;
  }

  private enlace(token: string): string {
    return this.enlaces.sumarmeAlEquipo(token);
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
