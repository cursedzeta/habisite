import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CorreoService } from '../correo/correo.service.js';
import { Enlaces } from '../correo/enlaces.js';
import { EdicionRepository } from '../edicion/edicion.repository.js';
import type {
  DatosParaCompletarDto,
  DatosPersonalesDto,
  InscripcionDto,
  RespuestaInscripcionDto,
} from './dto/inscripcion.dto.js';
import type { YoDto } from './dto/yo.dto.js';
import { LimitadorInscripcion } from './limitador.js';
import { type Perfil, perfilCompleto } from './perfil.entity.js';
import { type DatosFormulario, PerfilesRepository } from './perfiles.repository.js';
import { TurnstileService } from './turnstile.service.js';

/** Lo que se graba como versión mientras la organización no cargue la real. */
const VERSION_SIN_DEFINIR = 'sin-definir';

@Injectable()
export class PerfilesService {
  constructor(
    private readonly perfiles: PerfilesRepository,
    private readonly edicion: EdicionRepository,
    private readonly correos: CorreoService,
    private readonly enlaces: Enlaces,
    private readonly turnstile: TurnstileService,
    private readonly limitador: LimitadorInscripcion,
  ) {}

  /**
   * El formulario único de la landing (docs/09).
   *
   * Habilita en el acto, sin aprobación manual. Se guarda aunque venga solo
   * el correo: perder a alguien porque no quiso escribir su universidad es
   * peor que tenerlo incompleto. Según cómo quede:
   *
   *   completo   → C1, la confirmación con el enlace al grupo.
   *   incompleto → C2, la alerta con «Completar» y el grupo; y a los 2 días,
   *                si no hizo clic, el recordatorio único (lo manda la tarea).
   *
   * La respuesta es la misma para un correo nuevo y uno que ya estaba: decir
   * «ya estás inscripto» dejaría averiguar quién se anotó. Por la misma razón,
   * `estado` depende solo de lo que vino en ESTE envío, no de lo que había.
   */
  async inscribir(datos: InscripcionDto, ip: string | null): Promise<RespuestaInscripcionDto> {
    // Primero el límite: no gastar una consulta a Cloudflare en quien ya se pasó.
    this.limitador.exigir(ip);
    await this.turnstile.verificar(datos.turnstileToken, ip);

    const { terminosVersion } = await this.edicion.obtener();
    const aceptacion = { version: terminosVersion ?? VERSION_SIN_DEFINIR, ip };
    const enviados = this.datosPersonales(datos);
    const origen = datos.origen ?? null;

    // Con el token del correo de alerta se completa ESA inscripción, aunque
    // el correo del formulario diga otra cosa (el front lo muestra bloqueado).
    const porToken = datos.tokenCompletar
      ? await this.perfiles.porTokenCompletar(datos.tokenCompletar)
      : null;
    const existente = porToken ?? (await this.perfiles.porCorreo(datos.correo));

    let perfil: Perfil;
    if (!existente) {
      perfil = await this.perfiles.crearDesdeFormulario(datos.correo, enviados, origen, aceptacion);
    } else if (existente.rol !== 'participante') {
      // Un jurado o un admin que llena el formulario: no se le toca nada ni se
      // le manda nada, pero la respuesta es la misma que para cualquiera.
      perfil = { ...existente, tokenGrupo: await this.perfiles.asegurarTokenGrupo(existente.id) };
    } else {
      perfil = await this.perfiles.completarDesdeFormulario(
        existente.id,
        enviados,
        origen,
        aceptacion,
        Boolean(porToken),
      );
    }

    if (perfil.rol === 'participante') await this.seguir(perfil);

    return {
      estado: perfilCompleto(this.comoPerfil(enviados)) ? 'completa' : 'incompleta',
      whatsapp: this.enlaces.grupo(perfil.tokenGrupo!),
    };
  }

  /** Lo que precarga el formulario cuando se abre desde «Completar mi inscripción». */
  async paraCompletar(token: string): Promise<DatosParaCompletarDto> {
    const perfil = await this.perfiles.porTokenCompletar(token);
    if (!perfil) throw new NotFoundException('Ese enlace ya no es válido');
    return {
      correo: perfil.correo,
      nombre: perfil.nombre,
      apellido: perfil.apellido,
      telefono: perfil.telefono,
      tipoInstitucion: perfil.tipoInstitucion,
      institucion: perfil.institucion,
      pais: perfil.pais,
    };
  }

  /** Completar o corregir los datos desde el panel, con sesión. */
  async actualizarDatos(perfilId: string, datos: DatosPersonalesDto): Promise<YoDto> {
    const perfil = await this.perfiles.actualizarDatos(perfilId, this.datosPersonales(datos));
    if (perfil.rol === 'participante') await this.seguir(perfil);
    return this.yo(perfilId);
  }

  /** El clic en el enlace al grupo. Devuelve a dónde redirigir. */
  async clicAlGrupo(token: string): Promise<string> {
    await this.perfiles.registrarClicGrupo(token);
    return this.enlaces.destinoGrupo();
  }

  /**
   * Corta las acciones del panel a quien todavía no completó sus datos
   * (docs/09): primero completa, después arma equipo o sube.
   */
  async exigirCompleto(perfilId: string): Promise<void> {
    const perfil = await this.perfiles.porId(perfilId);
    if (perfil && perfil.rol === 'participante' && !perfilCompleto(perfil)) {
      throw new ForbiddenException('Completá tus datos antes de seguir');
    }
  }

  /** Lo que devuelve `GET /yo`, con el estado del concurso incluido. */
  async yo(perfilId: string): Promise<YoDto> {
    const [perfil, edicion] = await Promise.all([
      this.perfiles.porId(perfilId),
      this.edicion.obtener(),
    ]);

    return {
      id: perfil!.id,
      correo: perfil!.correo,
      nombre: perfil!.nombre,
      apellido: perfil!.apellido,
      telefono: perfil!.telefono,
      tipoInstitucion: perfil!.tipoInstitucion,
      institucion: perfil!.institucion,
      pais: perfil!.pais,
      rol: perfil!.rol,
      perfilCompleto: perfil!.rol !== 'participante' || perfilCompleto(perfil!),
      edicion: {
        estado: edicion.estado,
        cierreEntregas: edicion.cierreEntregas?.toISOString() ?? null,
        margenGraciaMinutos: edicion.margenGraciaMinutos,
        entregasAbiertas: edicion.entregasAbiertas,
        maxBytes: edicion.maxBytes,
        maxIntegrantes: edicion.maxIntegrantes,
        maxPaginas: edicion.maxPaginas,
        zonaHoraria: edicion.zonaHoraria,
        terminosUrl: edicion.terminosUrl,
      },
    };
  }

  /**
   * Suma un jurado. Se invita uno por uno (req-jurado §1): deja el perfil con
   * rol `jurado` y le manda el C7 con el enlace para entrar.
   */
  async invitarJurado(correo: string, nombre?: string, apellido?: string): Promise<Perfil> {
    const existente = await this.perfiles.porCorreo(correo);
    if (existente?.rol === 'admin') {
      throw new ConflictException('Ese correo es de un administrador');
    }
    if (
      existente?.rol === 'participante' &&
      (existente.nombre !== '' || (await this.perfiles.tieneEquipo(existente.id)))
    ) {
      // Ya se inscribió o está en un equipo: no puede evaluar su propio concurso.
      throw new ConflictException('Ese correo ya está inscripto como concursante');
    }

    const base = existente ?? (await this.perfiles.asegurarPorCorreo(correo, 'jurado'));
    const jurado = await this.perfiles.hacerJurado(base.id, nombre, apellido);

    await this.correos.encolar(
      'c7',
      jurado.correo,
      { nombre: jurado.nombre || null, enlaceIngreso: this.enlaces.ingreso() },
      { clave: `c7:${jurado.id}`, perfilId: jurado.id },
    );
    return jurado;
  }

  // ── auxiliares ───────────────────────────────────────────────────

  /**
   * Los correos y el seguimiento según cómo quedó el perfil. Las claves de los
   * correos hacen que repetir el formulario no los vuelva a mandar.
   */
  private async seguir(perfil: Perfil): Promise<void> {
    const { terminosUrl } = await this.edicion.obtener();

    if (perfilCompleto(perfil)) {
      if (perfil.tokenCompletar) await this.perfiles.cerrarSeguimiento(perfil.id);
      await this.correos.encolar(
        'c1',
        perfil.correo,
        {
          nombre: perfil.nombre || null,
          enlaceGrupo: this.enlaces.grupo(perfil.tokenGrupo!),
          terminosUrl,
        },
        { clave: `c1:${perfil.id}`, perfilId: perfil.id },
      );
      return;
    }

    const conSeguimiento = await this.perfiles.prepararSeguimiento(perfil.id);
    await this.correos.encolar(
      'c2',
      perfil.correo,
      {
        enlaceGrupo: this.enlaces.grupo(conSeguimiento.tokenGrupo!),
        enlaceCompletar: this.enlaces.completar(conSeguimiento.tokenCompletar!),
      },
      { clave: `c2:${perfil.id}`, perfilId: perfil.id },
    );
  }

  private datosPersonales(datos: DatosPersonalesDto): DatosFormulario {
    return {
      nombre: datos.nombre,
      apellido: datos.apellido,
      telefono: datos.telefono,
      tipoInstitucion: datos.tipoInstitucion,
      institucion: datos.institucion,
      pais: datos.pais,
    };
  }

  private comoPerfil(datos: DatosFormulario) {
    return {
      nombre: datos.nombre ?? '',
      apellido: datos.apellido ?? '',
      tipoInstitucion: datos.tipoInstitucion ?? null,
      institucion: datos.institucion ?? null,
      pais: datos.pais ?? null,
    };
  }
}
