import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { environmentValidationSchema } from './config/environment.validation';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CategoriaSitioModule } from './categoria-sitio/categoria-sitio.module';
import { SitioCategoriaModule } from './sitio-categoria/sitio-categoria.module';
import { SitioTuristicoModule } from './sitio-turistico/sitio-turistico.module';
import { ZonaModule } from './zona/zona.module';
import { FavoritoModule } from './favorito/favorito.module';
import { ResenaModule } from './resena/resena.module';
import { VisitaModule } from './visita/visita.module';
import { CategoriaNegocioModule } from './categoria-negocio/categoria-negocio.module';
import { NegocioModule } from './negocio/negocio.module';
import { NegocioCategoriaModule } from './negocio-categoria/negocio-categoria.module';
import { ServicioModule } from './servicio/servicio.module';
import { TarifaModule } from './tarifa/tarifa.module';
import { PublicidadModule } from './publicidad/publicidad.module';
import { MultimediaModule } from './multimedia/multimedia.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Impide que el servidor arranque con credenciales débiles o configuración incompleta.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: environmentValidationSchema,
    }),

    // Limita el uso por dirección IP para reducir abuso sin bloquear clientes normales.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', limit: 100, ttl: 60_000 }],
      errorMessage: 'Has superado el límite de solicitudes; inténtalo de nuevo más tarde',
    }),

    // Las migraciones sustituyen la sincronización automática del esquema en producción.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'mysql',
        host: configService.getOrThrow<string>('DB_HOST'),
        port: configService.getOrThrow<number>('DB_PORT'),
        username: configService.getOrThrow<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.getOrThrow<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize:
          configService.get<boolean>('DB_SYNCHRONIZE', false) &&
          configService.get<string>('NODE_ENV') !== 'production',
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        migrationsRun: configService.get<string>('NODE_ENV') === 'production',
      }),
    }),

    // Los módulos de dominio registran sus controladores y entidades.
    UserModule,
    AuthModule,
    ZonaModule,
    SitioTuristicoModule,
    CategoriaSitioModule,
    SitioCategoriaModule,
    // Interacciones del usuario con el catálogo turístico.
    VisitaModule,
    FavoritoModule,
    ResenaModule,
    CategoriaNegocioModule,
    NegocioModule,
    NegocioCategoriaModule,
    ServicioModule,
    TarifaModule,
    PublicidadModule,
    MultimediaModule,
    HealthModule,
  ],
  // Aplica el límite global y deja que las rutas de autenticación lo reduzcan individualmente.
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}