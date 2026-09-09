import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Min,
  MinLength,
  registerDecorator,
  validateSync,
  type ValidationOptions,
} from 'class-validator';

/*
 * Todo lo que el backend necesita del entorno, validado al arrancar.
 *
 * Si falta una variable o tiene una forma imposible, el proceso no levanta y
 * dice exactamente cuál está mal. La alternativa es enterarse en el primer
 * login, con un `invalid_client` de Google que no explica nada.
 */

const aNumero = ({ value }: { value: unknown }) =>
  value === '' || value === undefined ? undefined : Number(value);

const aBooleano = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

const vacioAIndefinido = ({ value }: { value: unknown }) =>
  value === '' ? undefined : value;

/** Vale si Intl la reconoce: cubre el catálogo IANA completo sin lista propia. */
function EsZonaHoraria(opciones?: ValidationOptions) {
  return (objeto: object, propiedad: string) =>
    registerDecorator({
      name: 'esZonaHoraria',
      target: objeto.constructor,
      propertyName: propiedad,
      options: opciones,
      validator: {
        validate(valor: unknown) {
          try {
            new Intl.DateTimeFormat('es', { timeZone: String(valor) });
            return true;
          } catch {
            return false;
          }
        },
      },
    });
}

export class Entorno {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: 'development' | 'production' | 'test' = 'development';

  @Transform(aNumero)
  @IsInt()
  @Min(1)
  PORT = 3000;

  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL tiene que empezar con postgresql://',
  })
  DATABASE_URL: string;

  @Matches(/\.apps\.googleusercontent\.com$/, {
    message: 'GOOGLE_CLIENT_ID no tiene la forma de un client ID de Google',
  })
  GOOGLE_CLIENT_ID: string;

  // La consola de Google muestra el secret enmascarado (****ABC0) después de
  // crearlo. Ese valor no sirve, y sin este chequeo se descubre en el canje.
  @Matches(/^GOCSPX-/, {
    message:
      'GOOGLE_CLIENT_SECRET no empieza con GOCSPX-: probablemente sea el valor enmascarado de la consola',
  })
  GOOGLE_CLIENT_SECRET: string;

  // Tiene que coincidir carácter por carácter con la URI registrada en Google.
  @IsUrl({ require_tld: false, require_protocol: true })
  GOOGLE_CALLBACK_URL: string;

  @MinLength(32, {
    message:
      'JWT_SECRET tiene que tener al menos 32 caracteres (openssl rand -base64 48)',
  })
  JWT_SECRET: string;

  @IsNotEmpty()
  JWT_EXPIRACION = '7d';

  // Vacío en local: el navegador usa el host tal cual.
  @Transform(vacioAIndefinido)
  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @Transform(aBooleano)
  @IsBoolean()
  COOKIE_SEGURA = false;

  // El único origen al que se le habilita CORS con credenciales.
  @IsUrl({ require_tld: false, require_protocol: true })
  FRONTEND_URL: string;

  @EsZonaHoraria({
    message:
      'ZONA_HORARIA no es una zona IANA válida (ej. America/Argentina/Buenos_Aires)',
  })
  ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

  // Freno de emergencia antes de leer el archivo. El tope real vive en `edicion`.
  @Transform(aNumero)
  @IsInt()
  @Min(1)
  MAX_BYTES_ARCHIVO = 31_457_280;
}

/** Lo llama ConfigModule con el .env ya mezclado con process.env. */
export function validarEntorno(config: Record<string, unknown>): Entorno {
  const entorno = plainToInstance(Entorno, config);
  const errores = validateSync(entorno);

  if (errores.length > 0) {
    const lineas = errores.map(
      (e) =>
        `  · ${e.property}: ${Object.values(e.constraints ?? {}).join('; ')}`,
    );
    throw new Error(`El entorno tiene errores:\n${lineas.join('\n')}`);
  }
  return entorno;
}
