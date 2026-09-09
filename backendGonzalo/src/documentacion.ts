import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

/*
 * El contrato entre el back y el front.
 *
 * Se arma desde los decoradores de los controladores, así que no puede quedar
 * desactualizado respecto del código. De acá sale `contrato/openapi.yaml`, con
 * el que Tomás genera sus tipos.
 */
export function construirDocumento(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Habisite Design Challenge 2026 — API')
    .setDescription(
      [
        'API del concurso. Tres roles y tres superficies: la inscripción pública, el panel',
        'de concursantes y el panel de jurado.',
        '',
        '## Sesión',
        '',
        'Se entra con Google. El navegador tiene que **navegar** a `GET /auth/google`',
        '(un enlace, no un fetch); de ahí en más la sesión viaja en una cookie `HttpOnly`',
        'que el navegador manda sola.',
        '',
        'Todas las llamadas tienen que ir con `credentials: "include"`, o la cookie no viaja.',
        '',
        '## Nadie entra sin estar inscripto',
        '',
        'Los perfiles no nacen del login: nacen del formulario de inscripción o de una',
        'invitación. Una cuenta de Google que no figure recibe `403`.',
        '',
        '## Forma de los errores',
        '',
        '```json',
        '{ "estado": 404, "mensaje": "No existe esa propuesta", "ruta": "/…", "hora": "…" }',
        '```',
        '',
        'Con `detalles: string[]` cuando la validación rechaza campos, un renglón por campo.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addCookieAuth('sesion', { type: 'apiKey', in: 'cookie', name: 'sesion' })
    .addTag('Autenticación', 'Entrar y salir')
    .addTag('Perfil', 'Quién soy e inscripción')
    .addTag('Equipos', 'Armar equipo, invitar, darse de baja')
    .addTag('Propuesta', 'El PDF y su entrega')
    .addTag('Evaluación', 'Lo que usa el panel del jurado')
    .addTag('Resultados', 'Podio y ranking interno')
    .addTag('Edición', 'Configuración y etapas del concurso')
    .build();

  return SwaggerModule.createDocument(app, config);
}

export function documentarApi(app: INestApplication): void {
  SwaggerModule.setup('docs', app, construirDocumento(app), {
    swaggerOptions: { withCredentials: true },
  });
}
