import { Logger } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { CustomOrigin } from '@nestjs/common/interfaces/external/cors-options.interface';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { QueryFailedFilter } from './common/filters/query-failed.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.useGlobalFilters(new QueryFailedFilter());

  // Configurar ValidationPipe globalmente
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no definidas en el DTO
      forbidNonWhitelisted: true, // Lanza error si hay propiedades no permitidas
      transform: true, // Transforma los datos al tipo definido en el DTO
    }),
  );

  // Aplicar @Exclude() de class-transformer en todas las respuestas
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Helmet establece cabeceras defensivas antes de procesar solicitudes HTTP.
  app.use(helmet());

  // Restringe CORS a los orígenes configurados y solo flexibiliza localhost en desarrollo.
  const configuredOrigins = configService
    .get<string>('CORS_ORIGINS', '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const developmentOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  const allowedOrigins =
    configuredOrigins.length > 0
      ? configuredOrigins
      : configService.get<string>('NODE_ENV') === 'development'
        ? developmentOrigins
        : [];
  const allowDevelopmentLocalhost =
    configuredOrigins.length === 0 &&
    configService.get<string>('NODE_ENV') === 'development';
  const corsOrigin: CustomOrigin = (origin, callback) => {
    const isLocalhost =
      allowDevelopmentLocalhost &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin ?? '');
    callback(null, !origin || allowedOrigins.includes(origin) || isLocalhost);
  };
  app.enableCors({ origin: corsOrigin });

  // Evita exponer rutas y esquemas de la API cuando la documentación está desactivada.
  if (configService.get<boolean>('SWAGGER_ENABLED', false)) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('API Córdoba Cerca - Turismo')
      .setDescription(
        'API para consultar y administrar información turística de Córdoba.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Servidor corriendo en http://localhost:${port}`);
  if (configService.get<boolean>('SWAGGER_ENABLED', false)) {
    logger.log(`Documentación Swagger en http://localhost:${port}/api/docs`);
  }
}
void bootstrap();