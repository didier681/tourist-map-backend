import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { UserService } from '../user/user.service';
import { User, UserRole } from '../user/entities/user.entity';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { GestorZona } from '../gestor-zona/entities/gestor-zona.entity';
import { Zona } from '../zona/entities/zona.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthMailService } from './mail.service';
import { Favorito } from '../favorito/entities/favorito.entity';
import { Visita } from '../visita/entities/visita.entity';
import { Resena } from '../resena/entities/resena.entity';
import { Negocio } from '../negocio/entities/negocio.entity';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { AuditoriaService } from '../auditoria/auditoria.service';

describe('User registration and authentication', () => {
  let authService: AuthService;
  let storedUser: User | null;
  let storedRefresh: Partial<RefreshToken> | null;
  let storedReset: Partial<PasswordResetToken> | null;
  const repository = {
    existsBy: vi.fn(),
    create: vi.fn((values: Partial<User>) => values),
    save: vi.fn(async (user: Partial<User>) => {
      storedUser = {
        ...user,
        id: 1,
        isActive: true,
        fechaRegistro: new Date(),
      } as User;
      return storedUser;
    }),
    findOne: vi.fn(async () => storedUser),
    findOneBy: vi.fn(async () => storedUser),
    update: vi.fn(),
    delete: vi.fn(),
    merge: vi.fn((user: object, changes: object) => Object.assign(user, changes)),
    countBy: vi.fn().mockResolvedValue(0),
  };
  const refreshRepository = {
    create: vi.fn((values: Partial<RefreshToken>) => values),
    save: vi.fn(async (value: Partial<RefreshToken>) => value),
    findOne: vi.fn(async () => storedRefresh),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const resetRepository = {
    create: vi.fn((values: Partial<PasswordResetToken>) => values),
    save: vi.fn(async (value: Partial<PasswordResetToken>) => value),
    findOne: vi.fn(async () => storedReset),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const jwtService = {
    signAsync: vi.fn(async (payload: { tokenUse?: string }) =>
      payload.tokenUse ? 'refresh-signed-token' : 'access-signed-token',
    ),
    decode: vi.fn(() => ({ exp: Math.floor(Date.now() / 1000) + 3600 })),
    verifyAsync: vi.fn(async () => ({ sub: 1, tokenUse: 'refresh' })),
  };
  const repositories = new Map([
    [User, repository],
    [RefreshToken, refreshRepository],
    [PasswordResetToken, resetRepository],
    [Favorito, { delete: vi.fn() }],
    [Visita, { delete: vi.fn() }],
    [Resena, { update: vi.fn() }],
    [Negocio, { countBy: vi.fn().mockResolvedValue(0) }],
    [SitioTuristico, { update: vi.fn() }],
  ]);
  const manager = {
    getRepository: vi.fn((entity: unknown) => repositories.get(entity as never)),
  };
  const dataSource = {
    getRepository: manager.getRepository,
    transaction: vi.fn(async (callback: (value: typeof manager) => unknown) =>
      await callback(manager),
    ),
  };
  const configService = {
    get: vi.fn((key: string, defaultValue?: string) =>
      key === 'TERMS_VERSION' ? '1.0' : defaultValue,
    ),
    getOrThrow: vi.fn(() => 'refresh-secret-of-at-least-thirty-two-characters'),
  };

  beforeEach(async () => {
    storedUser = null;
    storedRefresh = null;
    storedReset = null;
    vi.clearAllMocks();
    repository.existsBy.mockImplementation(
      async ({ email }: { email: string }) => storedUser?.email === email,
    );

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: repository,
        },
        {
          provide: getRepositoryToken(GestorZona),
          useValue: repository,
        },
        {
          provide: getRepositoryToken(Zona),
          useValue: repository,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        { provide: ConfigService, useValue: configService },
        { provide: DataSource, useValue: dataSource },
        { provide: AuthMailService, useValue: { sendPasswordReset: vi.fn() } },
        { provide: AuditoriaService, useValue: { registrar: vi.fn() } },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  it('registers with a password hash and logs in using the original password', async () => {
    const credentials: RegisterDto = {
      email: 'viajero@example.com',
      password: 'Clave-segura-123',
      nombre: 'Viajero',
      idiomaPref: 'es',
      aceptaTerminos: true,
    };

    const registration = await authService.register(credentials);

    expect(registration).toEqual({
      user: {
        id: 1,
        email: credentials.email,
        nombre: credentials.nombre,
        role: UserRole.Usuario,
        documentoIdentidad: null,
        soporteUrl: null,
      },
      token: 'access-signed-token',
      refreshToken: 'refresh-signed-token',
    });
    const registeredUser = storedUser;
    expect(registeredUser).not.toBeNull();
    if (!registeredUser) {
      throw new Error('El registro no guardó el usuario');
    }
    expect(registeredUser.passwordHash).not.toBe(credentials.password);
    expect(registeredUser.fechaAceptacionTerminos).toBeInstanceOf(Date);
    expect(registeredUser.versionTerminos).toBe('1.0');
    await expect(
      bcrypt.compare(credentials.password, registeredUser.passwordHash),
    ).resolves.toBe(true);

    const login = await authService.login({
      email: credentials.email,
      password: credentials.password,
    });

    expect(login).toEqual(registration);
    expect(repository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: credentials.email },
        select: expect.objectContaining({ passwordHash: true }),
      }),
    );
  });

  it('rejects role assignment in public registration and validates roles for user creation', async () => {
    for (const fields of [
      { role: UserRole.Admin },
      { role: UserRole.Gestor },
      { documentoIdentidad: '1234567890' },
      { soporteUrl: 'https://example.com/soporte' },
    ]) {
      const registration = plainToInstance(RegisterDto, {
        email: 'viajero@example.com',
        password: 'Clave-segura-123',
        nombre: 'Viajero',
        aceptaTerminos: true,
        ...fields,
      });
      const registrationErrors = await validate(registration, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      expect(registrationErrors.length).toBeGreaterThan(0);
    }

    const termsNotAccepted = plainToInstance(RegisterDto, {
      email: 'viajero@example.com',
      password: 'Clave-segura-123',
      nombre: 'Viajero',
      aceptaTerminos: false,
    });
    expect(await validate(termsNotAccepted)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'aceptaTerminos' }),
      ]),
    );

    const invalidUser = plainToInstance(CreateUserDto, {
      email: 'viajero@example.com',
      password: 'Clave-segura-123',
      nombre: 'Viajero',
      role: 'superadmin',
    });
    const userErrors = await validate(invalidUser);
    expect(userErrors.map((error) => error.property)).toContain('role');
  });

  it('rota un refresh token válido y persiste el nuevo hash', async () => {
    storedRefresh = {
      idUsuario: 1,
      revocado: false,
      expiraEn: new Date(Date.now() + 60_000),
    };
    const user = {
      id: 1,
      email: 'viajero@example.com',
      nombre: 'Viajero',
      role: UserRole.Usuario,
      isActive: true,
    } as User;
    repositories.set(User, {
      ...repository,
      findOneBy: vi.fn().mockResolvedValue(user),
    });

    const response = await authService.refresh('refresh-signed-token');

    expect(response.token).toBe('access-signed-token');
    expect(response.refreshToken).toBe('refresh-signed-token');
    expect(refreshRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ revocado: true }),
    );
    expect(refreshRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ idUsuario: 1, revocado: false }),
    );
  });

  it('detecta la reutilización y revoca todas las sesiones', async () => {
    storedRefresh = { idUsuario: 1, revocado: true };
    await expect(
      authService.refresh('refresh-signed-token'),
    ).rejects.toThrow('Refresh token inválido o expirado');
    expect(refreshRepository.update).toHaveBeenCalledWith(
      { idUsuario: 1 },
      { revocado: true },
    );
  });

  it('revoca el refresh token recibido al cerrar sesión', async () => {
    await expect(
      authService.logout('refresh-signed-token'),
    ).resolves.toEqual({ message: 'Sesión cerrada correctamente' });
    expect(refreshRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ revocado: false }),
      { revocado: true },
    );
  });

  it('elimina la cuenta y anonimizá sus reseñas conservadas', async () => {
    const passwordHash = await bcrypt.hash('Clave-segura-123', 4);
    storedUser = {
      id: 1,
      email: 'viajero@example.com',
      passwordHash,
    } as User;
    await authService.deleteAccount(1, 'Clave-segura-123');
    expect(repositories.get(Resena)?.update).toHaveBeenCalledWith(
      { idUsuario: 1 },
      { idUsuario: null },
    );
    expect(repository.delete).toHaveBeenCalledWith({ id: 1 });
  });

  it('restablece la contraseña con token de un solo uso e invalida sesiones', async () => {
    storedReset = {
      idUsuario: 1,
      usado: false,
      expiraEn: new Date(Date.now() + 60_000),
    };
    await expect(
      authService.resetPassword('single-use-token', 'NuevaClave123'),
    ).resolves.toEqual({ message: 'La contraseña se restableció correctamente' });
    expect(repository.update).toHaveBeenCalledWith(
      { id: 1 },
      expect.objectContaining({ passwordHash: expect.any(String) }),
    );
    expect(refreshRepository.update).toHaveBeenCalledWith(
      { idUsuario: 1 },
      { revocado: true },
    );
    expect(resetRepository.update).toHaveBeenCalledWith(
      { idUsuario: 1, usado: false },
      { usado: true },
    );
  });
});
