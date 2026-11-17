import 'reflect-metadata';
import { config as loadEnvironment } from 'dotenv';
import { DataSource } from 'typeorm';
import { environmentValidationSchema } from '../config/environment.validation';
import { User } from '../user/entities/user.entity';
import { GestorZona } from '../gestor-zona/entities/gestor-zona.entity';
import { Zona } from '../zona/entities/zona.entity';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { ConfirmacionSitio } from '../sitio-turistico/entities/confirmacion-sitio.entity';
import { CategoriaSitio } from '../categoria-sitio/entities/categoria-sitio.entity';
import { SitioCategoria } from '../sitio-categoria/entities/sitio-categoria.entity';
import { Favorito } from '../favorito/entities/favorito.entity';
import { Resena } from '../resena/entities/resena.entity';
import { Visita } from '../visita/entities/visita.entity';
import { CategoriaNegocio } from '../categoria-negocio/entities/categoria-negocio.entity';
import { Negocio } from '../negocio/entities/negocio.entity';
import { NegocioCategoria } from '../negocio-categoria/entities/negocio-categoria.entity';
import { Servicio } from '../servicio/entities/servicio.entity';
import { Tarifa } from '../tarifa/entities/tarifa.entity';
import { Publicidad } from '../publicidad/entities/publicidad.entity';
import { Multimedia } from '../multimedia/entities/multimedia.entity';

loadEnvironment();

// Valida también las variables al ejecutar el CLI, que no pasa por ConfigModule.
const { error, value } = environmentValidationSchema.validate(process.env, {
  abortEarly: false,
});
if (error) {
  // Evita que el error del CLI incluya el objeto process.env completo con secretos.
  throw new Error(
    `Configuración de entorno inválida: ${error.details.map(({ message }) => message).join('; ')}`,
  );
}
Object.assign(process.env, value);

const isProduction = process.env.NODE_ENV === 'production';
const requestedSynchronization = process.env.DB_SYNCHRONIZE === 'true';

// Enumera las entidades explícitamente porque el CLI no conoce autoLoadEntities de Nest.
const entities = [
  User,
  GestorZona,
  Zona,
  SitioTuristico,
  ConfirmacionSitio,
  CategoriaSitio,
  SitioCategoria,
  Favorito,
  Resena,
  Visita,
  CategoriaNegocio,
  Negocio,
  NegocioCategoria,
  Servicio,
  Tarifa,
  Publicidad,
  Multimedia,
];

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities,
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  // El CLI nunca ejecuta migraciones al abrir una conexión, solo por sus comandos explícitos.
  migrationsRun: false,
  // Evita que una variable mal configurada sincronice tablas de producción.
  synchronize: !isProduction && requestedSynchronization,
});
