import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { User, UserRole } from '../src/user/entities/user.entity';
import { TipoZona } from '../src/zona/entities/zona.entity';

describe('Flujos de producción (MySQL)', () => {
  let app: Awaited<ReturnType<typeof createApplication>>;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let userRefreshToken: string;
  let userId: number;
  let zoneId: number;
  let managerId: number;
  let firstSiteId: number;
  let businessId: number;
  let serviceId: number;

  async function createApplication() {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const application = moduleRef.createNestApplication();
    application.enableShutdownHooks();
    application.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    application.useGlobalInterceptors(
      new ClassSerializerInterceptor(application.get(Reflector)),
    );
    // Solo se confía en la IP reenviada en esta suite para aislar el caso de throttling.
    application.getHttpAdapter().getInstance().set('trust proxy', true);
    await application.init();
    return application;
  }

  async function clearDatabase() {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables: Array<Record<string, string>> =
      await dataSource.query('SHOW TABLES');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      if (tableName !== 'migrations') {
        await dataSource.query(`TRUNCATE TABLE \`${tableName}\``);
      }
    }
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  beforeAll(async () => {
    app = await createApplication();
    dataSource = app.get(DataSource);
    await clearDatabase();

    const users = dataSource.getRepository(User);
    await users.save(
      users.create({
        email: 'admin@touristmap.co',
        passwordHash: await bcrypt.hash('AdminSeguro123', 10),
        nombre: 'Administración',
        role: UserRole.Admin,
        isActive: true,
        documentoIdentidad: null,
        soporteUrl: null,
        fechaAceptacionTerminos: null,
        versionTerminos: null,
      }),
    );
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@touristmap.co', password: 'AdminSeguro123' });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token as string;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('registra con consentimiento, permite login y protege rutas por autenticación y rol', async () => {
    const registration = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'visitante@example.com',
        password: 'VisitanteSeguro123',
        nombre: 'Visitante',
        aceptaTerminos: true,
      });

    expect(registration.status).toBe(201);
    userId = registration.body.user.id;
    userToken = registration.body.token;
    userRefreshToken = registration.body.refreshToken;
    await dataSource.getRepository(User).update(userId, {
      documentoIdentidad: 'DOC-E2E-001',
    });
    const storedUser = await dataSource
      .getRepository(User)
      .findOneBy({ id: userId });
    expect(storedUser?.fechaAceptacionTerminos).toBeTruthy();
    expect(storedUser?.versionTerminos).toBe('1.0');

    const login = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'visitante@example.com',
      password: 'VisitanteSeguro123',
    });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    expect((await request(app.getHttpServer()).get('/users')).status).toBe(401);
    const forbidden = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${userToken}`);
    expect(forbidden.status).toBe(403);

    const invalidConsent = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'sin-consentimiento@example.com',
        password: 'VisitanteSeguro123',
        nombre: 'Sin consentimiento',
        aceptaTerminos: false,
      });
    expect(invalidConsent.status).toBe(400);
  });

  it('crea y asigna un gestor; permite sitios dentro de su zona y rechaza los externos', async () => {
    const admin = `Bearer ${adminToken}`;
    const zone = await request(app.getHttpServer())
      .post('/zonas')
      .set('Authorization', admin)
      .send({
        nombre: 'Zona E2E',
        tipo: TipoZona.Ciudad,
        latitud: '8.7500',
        longitud: '-75.8833',
        radioCoberturaM: 5000,
      });
    expect(zone.status).toBe(201);
    zoneId = zone.body.idZona;

    const outsideZone = await request(app.getHttpServer())
      .post('/zonas')
      .set('Authorization', admin)
      .send({
        nombre: 'Zona externa E2E',
        tipo: TipoZona.Ciudad,
        latitud: '9.0000',
        longitud: '-75.8833',
        radioCoberturaM: 500,
      });
    expect(outsideZone.status).toBe(201);

    const manager = await request(app.getHttpServer())
      .post('/users/gestores')
      .set('Authorization', admin)
      .send({
        email: 'gestor@example.com',
        password: 'GestorSeguro123',
        nombre: 'Gestor E2E',
        documentoIdentidad: 'DOC-E2E-GESTOR',
      });
    expect(manager.status).toBe(201);
    managerId = manager.body.id;

    const assignment = await request(app.getHttpServer())
      .post(`/users/${managerId}/zonas`)
      .set('Authorization', admin)
      .send({ idZonas: [zoneId] });
    expect(assignment.status).toBe(201);

    const activation = await request(app.getHttpServer())
      .patch(`/users/${managerId}/activar`)
      .set('Authorization', admin);
    expect(activation.status).toBe(200);

    const managerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'gestor@example.com',
        password: 'GestorSeguro123',
      });
    expect(managerLogin.status).toBe(200);
    const managerAuth = `Bearer ${managerLogin.body.token as string}`;
    const siteData = {
      idZona: zoneId,
      nombre: 'Sitio cercano E2E',
      descripcion: 'Descripción de prueba de integración.',
      latitud: '8.7500',
      longitud: '-75.8833',
      horarioApertura: '06:00',
      horarioCierre: '22:00',
    };
    const site = await request(app.getHttpServer())
      .post('/sitios-turisticos')
      .set('Authorization', managerAuth)
      .send(siteData);
    expect(site.status).toBe(201);
    firstSiteId = site.body.idSitio;

    const outOfZone = await request(app.getHttpServer())
      .post('/sitios-turisticos')
      .set('Authorization', managerAuth)
      .send({ ...siteData, idZona: outsideZone.body.idZona });
    expect(outOfZone.status).toBe(403);
  });

  it('permite sugerir y aprobar sitios; búsqueda pública ordena por distancia y protege datos', async () => {
    const suggested = await request(app.getHttpServer())
      .post('/sitios-turisticos/sugerir')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        idZona: zoneId,
        nombre: 'Sitio sugerido E2E',
        descripcion: 'Sugerencia de prueba de integración.',
        latitud: '8.7540',
        longitud: '-75.8833',
        horarioApertura: '08:00',
        horarioCierre: '18:00',
      });
    expect(suggested.status).toBe(201);

    const approval = await request(app.getHttpServer())
      .patch(`/sitios-turisticos/${suggested.body.idSitio}/aprobar`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approval.status).toBe(200);

    const nearby = await request(app.getHttpServer()).get(
      '/sitios-turisticos/cercanos?lat=8.7501&lng=-75.8833&radioM=10000',
    );
    expect(nearby.status).toBe(200);
    expect(nearby.body.data[0].idSitio).toBe(firstSiteId);
    expect(
      nearby.body.data.every(
        (
          site: { distanciaM: number },
          index: number,
          sites: { distanciaM: number }[],
        ) => index === 0 || sites[index - 1].distanciaM <= site.distanciaM,
      ),
    ).toBe(true);
    expect(JSON.stringify(nearby.body)).not.toContain('visitante@example.com');
    expect(JSON.stringify(nearby.body)).not.toContain('DOC-E2E-001');
  });

  it('aprueba una solicitud de negocio, mantiene la privacidad pública y aplica reglas de tarifa y publicidad', async () => {
    const application = await request(app.getHttpServer())
      .post('/solicitudes-negocio')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        idZona: zoneId,
        nombreComercial: 'Negocio de prueba',
        nitDocumento: 'NIT-E2E-001',
        latitud: 8.7502,
        longitud: -75.8833,
        telefono: '6041234567',
        email: 'contacto-negocio@example.com',
      });
    expect(application.status).toBe(201);

    const approved = await request(app.getHttpServer())
      .patch(`/solicitudes-negocio/${application.body.idSolicitud}/aprobar`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approved.status).toBe(200);
    businessId = approved.body.negocio.idNegocio;
    expect(approved.body.negocio.estadoVerificacion).toBe('verificado');

    const businesses = await request(app.getHttpServer()).get(
      '/negocios/cercanos?lat=8.7500&lng=-75.8833&radioM=10000',
    );
    expect(businesses.status).toBe(200);
    expect(businesses.body.data).toHaveLength(1);
    expect(businesses.body.data[0]).not.toHaveProperty('nitDocumento');
    expect(businesses.body.data[0]).not.toHaveProperty('idUsuario');
    expect(JSON.stringify(businesses.body)).not.toContain('NIT-E2E-001');

    const businessLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'visitante@example.com',
        password: 'VisitanteSeguro123',
      });
    expect(businessLogin.status).toBe(200);
    const businessAuth = `Bearer ${businessLogin.body.token as string}`;
    const service = await request(app.getHttpServer())
      .post('/servicios')
      .set('Authorization', businessAuth)
      .send({
        idNegocio: businessId,
        nombre: 'Recorrido E2E',
        descripcion: 'Servicio creado para la prueba.',
        disponibilidad: 'Todos los días',
      });
    expect(service.status).toBe(201);
    serviceId = service.body.idServicio;

    const zeroFare = await request(app.getHttpServer())
      .post('/tarifas')
      .set('Authorization', businessAuth)
      .send({
        idServicio: serviceId,
        nombreTarifa: 'Entrada',
        precio: 0,
        unidad: 'persona',
        vigenciaIni: '2026-01-01',
        vigenciaFin: '2027-01-01',
      });
    expect(zeroFare.status).toBe(400);

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const ad = await request(app.getHttpServer())
      .post('/publicidades')
      .set('Authorization', businessAuth)
      .send({
        idNegocio: businessId,
        tipoPlan: 'basico',
        presupuesto: 200000,
        fechaIni: tomorrow,
        fechaFin: `${Number(tomorrow.slice(0, 4)) + 1}${tomorrow.slice(4)}`,
      });
    expect(ad.status).toBe(403);
  });

  it('rota refresh tokens, revoca el anterior y cierra sesión', async () => {
    const rotation = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: userRefreshToken });
    expect(rotation.status).toBe(200);
    expect(rotation.body.refreshToken).not.toBe(userRefreshToken);

    const logout = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({ refreshToken: rotation.body.refreshToken });
    expect(logout.status).toBe(200);
    const afterLogout = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: rotation.body.refreshToken });
    expect(afterLogout.status).toBe(401);
    const rotatedOldToken = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: userRefreshToken });
    expect(rotatedOldToken.status).toBe(401);
    expect(userId).toBeGreaterThan(0);
  });

  it('responde 429 al superar el límite de intentos de login por IP', async () => {
    const responses = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      responses.push(
        await request(app.getHttpServer())
          .post('/auth/login')
          .set('X-Forwarded-For', '203.0.113.245')
          .send({
            email: 'no-existe@example.com',
            password: 'incorrecta',
          }),
      );
    }
    expect(responses.map(({ status }) => status)).toContain(429);
  });
});
