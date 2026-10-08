import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { fechaLegible } from '../comun/fechas.js';
import { CorreoService } from '../correo/correo.service.js';
import { Enlaces } from '../correo/enlaces.js';
import { EdicionRepository } from '../edicion/edicion.repository.js';
import { EquiposRepository } from '../equipos/equipos.repository.js';
import { PerfilesService } from '../perfiles/perfiles.service.js';
import { ArchivoService } from './archivo.service.js';
import type { PropuestaDto } from './dto/propuestas.dto.js';
import type { Propuesta } from './propuesta.entity.js';
import { PropuestasRepository } from './propuestas.repository.js';

@Injectable()
export class PropuestasService {
  constructor(
    private readonly propuestas: PropuestasRepository,
    private readonly equipos: EquiposRepository,
    private readonly edicion: EdicionRepository,
    private readonly archivos: ArchivoService,
    private readonly perfiles: PerfilesService,
    private readonly correos: CorreoService,
    private readonly enlaces: Enlaces,
  ) {}

  async mia(perfilId: string): Promise<PropuestaDto | null> {
    const propuesta = await this.dePerfil(perfilId);
    return propuesta ? this.aDto(propuesta) : null;
  }

  async actualizar(perfilId: string, titulo: string, memoria?: string): Promise<PropuestaDto> {
    const propuesta = await this.exigirEditable(perfilId);
    await this.propuestas.actualizarTexto(propuesta.id, titulo, memoria ?? null);
    return this.aDto((await this.propuestas.porId(propuesta.id))!);
  }

  async subirArchivo(
    perfilId: string,
    rutaTemporal: string,
    nombreOriginal: string,
    tamano: number,
  ): Promise<PropuestaDto> {
    const propuesta = await this.exigirEditable(perfilId);
    const { maxBytes, maxPaginas } = await this.edicion.obtener();

    const validado = await this.archivos.validar(rutaTemporal, tamano, maxBytes, maxPaginas);
    await this.propuestas.guardarArchivo(propuesta.id, nombreOriginal, validado);

    const actualizada = (await this.propuestas.porId(propuesta.id))!;
    // Ya estaba entregada: el comprobante anterior quedó viejo, sale uno nuevo.
    if (propuesta.estado === 'entregada') await this.avisarEntrega(actualizada, true);
    return this.aDto(actualizada);
  }

  async entregar(perfilId: string): Promise<PropuestaDto> {
    const propuesta = await this.exigirEditable(perfilId);

    if (!propuesta.archivo) {
      throw new BadRequestException('Todavía no subiste el PDF de la propuesta');
    }
    if (propuesta.estado === 'borrador') {
      await this.propuestas.entregar(propuesta.id);
      await this.avisarEntrega((await this.propuestas.porId(propuesta.id))!, false);
    }
    return this.aDto((await this.propuestas.porId(propuesta.id))!);
  }

  /**
   * Sirve el PDF con soporte de `Range`.
   *
   * Sin esto, el visor descarga los 30 MB antes de dibujar la primera página.
   * Con rangos, abre en cuanto tiene el índice y va pidiendo el resto a medida
   * que el jurado navega — que es exactamente lo que la plataforma existe para
   * que no haga falta descargar nada.
   */
  async servirArchivo(propuestaId: string, cabeceraRange: string | undefined, respuesta: Response): Promise<void> {
    const meta = await this.propuestas.metadatosArchivo(propuestaId);
    if (!meta) throw new NotFoundException('Esta propuesta todavía no tiene archivo');

    respuesta.setHeader('Content-Type', 'application/pdf');
    respuesta.setHeader('Accept-Ranges', 'bytes');
    respuesta.setHeader('Content-Disposition', `inline; filename="${this.nombreSeguro(meta.nombre)}"`);
    // Es material de un concurso sin publicar: que no quede en ninguna caché.
    respuesta.setHeader('Cache-Control', 'private, no-store');

    const rango = this.interpretarRango(cabeceraRange, meta.bytes);

    if (!rango) {
      respuesta.setHeader('Content-Length', String(meta.bytes));
      respuesta.status(HttpStatus.OK).send(await this.propuestas.trozo(propuestaId, 0, meta.bytes));
      return;
    }
    if (rango === 'invalido') {
      respuesta.setHeader('Content-Range', `bytes */${meta.bytes}`);
      respuesta.status(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE).end();
      return;
    }

    const { desde, hasta } = rango;
    const largo = hasta - desde + 1;
    respuesta.setHeader('Content-Range', `bytes ${desde}-${hasta}/${meta.bytes}`);
    respuesta.setHeader('Content-Length', String(largo));
    respuesta
      .status(HttpStatus.PARTIAL_CONTENT)
      .send(await this.propuestas.trozo(propuestaId, desde, largo));
  }

  /** La propuesta de otro equipo, para el jurado y el admin. */
  async porId(id: string): Promise<Propuesta> {
    const propuesta = await this.propuestas.porId(id);
    if (!propuesta) throw new NotFoundException('No existe esa propuesta');
    return propuesta;
  }

  async descalificar(id: string, motivo: string): Promise<void> {
    await this.porId(id);
    await this.propuestas.descalificar(id, motivo);
  }

  /** El equipo de quien pregunta tiene que ser el dueño. */
  async exigirPropia(perfilId: string, propuestaId: string): Promise<Propuesta> {
    const propuesta = await this.dePerfil(perfilId);
    if (!propuesta || propuesta.id !== propuestaId) {
      throw new NotFoundException('No existe esa propuesta');
    }
    return propuesta;
  }

  // ── auxiliares ───────────────────────────────────────────────────

  private async dePerfil(perfilId: string): Promise<Propuesta | null> {
    const equipo = await this.equipos.delPerfil(perfilId);
    return equipo ? this.propuestas.porEquipo(equipo.id) : null;
  }

  /**
   * C8, el comprobante, a todos los integrantes que aceptaron. La clave lleva
   * la hora de subida del archivo: si reemplazan el PDF, el comprobante nuevo
   * sale; si apretan «entregar» dos veces, no.
   */
  private async avisarEntrega(propuesta: Propuesta, reemplazo: boolean): Promise<void> {
    if (!propuesta.archivo) return;
    const { zonaHoraria } = await this.edicion.obtener();
    const momento = reemplazo ? propuesta.archivo.subidoEn : (propuesta.entregadaEn ?? new Date());
    const version = propuesta.archivo.subidoEn.getTime();

    for (const m of await this.equipos.aceptados(propuesta.equipoId)) {
      await this.correos.encolar(
        'c8',
        m.correo,
        {
          titulo: propuesta.titulo,
          archivo: propuesta.archivo.nombreOriginal,
          fecha: fechaLegible(momento, zonaHoraria),
          reemplazo,
          enlacePanel: this.enlaces.panel(),
        },
        { clave: `c8:${propuesta.id}:${version}:${m.perfilId}`, perfilId: m.perfilId },
      );
    }
  }

  private async exigirEditable(perfilId: string): Promise<Propuesta> {
    // Primero completa sus datos, después sube (docs/09).
    await this.perfiles.exigirCompleto(perfilId);
    const propuesta = await this.dePerfil(perfilId);
    if (!propuesta) throw new NotFoundException('Todavía no formás parte de ningún equipo');

    if (propuesta.estado === 'descalificada') {
      throw new ForbiddenException('La propuesta está descalificada');
    }

    // El cierre se decide acá, con el reloj del servidor. El front esconde el
    // botón *además*, no *en vez*.
    const { entregasAbiertas } = await this.edicion.obtener();
    if (!entregasAbiertas) {
      throw new HttpException('Las entregas están cerradas', HttpStatus.LOCKED);
    }
    return propuesta;
  }

  private async aDto(p: Propuesta): Promise<PropuestaDto> {
    const { entregasAbiertas } = await this.edicion.obtener();
    return {
      id: p.id,
      titulo: p.titulo,
      memoria: p.memoria,
      estado: p.estado,
      formaEntrega: p.formaEntrega,
      entregadaEn: p.entregadaEn?.toISOString() ?? null,
      archivo: p.archivo
        ? {
            nombreOriginal: p.archivo.nombreOriginal,
            bytes: p.archivo.bytes,
            paginas: p.archivo.paginas,
            subidoEn: p.archivo.subidoEn.toISOString(),
          }
        : null,
      editable: entregasAbiertas && p.estado !== 'descalificada',
    };
  }

  /** `bytes=0-65535` → los índices, o null si no vino cabecera. */
  private interpretarRango(
    cabecera: string | undefined,
    total: number,
  ): { desde: number; hasta: number } | 'invalido' | null {
    if (!cabecera) return null;

    const coincidencia = /^bytes=(\d*)-(\d*)$/.exec(cabecera.trim());
    if (!coincidencia) return 'invalido';

    const [, textoDesde, textoHasta] = coincidencia;

    // `bytes=-500`: los últimos 500 bytes.
    if (textoDesde === '') {
      if (textoHasta === '') return 'invalido';
      const ultimos = Math.min(Number(textoHasta), total);
      return ultimos === 0 ? 'invalido' : { desde: total - ultimos, hasta: total - 1 };
    }

    const desde = Number(textoDesde);
    const hasta = textoHasta === '' ? total - 1 : Math.min(Number(textoHasta), total - 1);

    if (desde > hasta || desde >= total) return 'invalido';
    return { desde, hasta };
  }

  /** Sin comillas ni saltos: si no, se puede inyectar en la cabecera. */
  private nombreSeguro(nombre: string): string {
    return nombre.replace(/["\r\n]/g, '').slice(0, 120) || 'propuesta.pdf';
  }
}
