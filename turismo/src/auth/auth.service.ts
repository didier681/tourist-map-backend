import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { DataSource, EntityManager } from 'typeorm';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { User } from '../user/entities/user.entity';
import { Favorito } from '../favorito/entities/favorito.entity';
import { Visita } from '../visita/entities/visita.entity';
import { Resena } from '../resena/entities/resena.entity';
import { Negocio } from '../negocio/entities/negocio.entity';
import { SitioTuristico } from '../sitio-turistico/entities/sitio-turistico.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse, AuthUser } from './interfaces/auth-response.interface';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuthMailService } from './mail.service';
import { assertPasswordPolicy } from '../common/password-policy';
import { AuditoriaService } from '../auditoria/auditoria.service';

type TokenPair = { token: string; refreshToken: string };

@Injectable()
// Coordina autenticación, consentimiento y ciclos de vida de las sesiones.
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly mailService: AuthMailService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  // Registra el consentimiento antes de crear cualquier sesión renovable.
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    if (registerDto.aceptaTerminos !== true) {
      throw new BadRequestException('Debes aceptar los términos y condiciones');
    }
    const user = await this.userService.create(registerDto, {
      fechaAceptacionTerminos: new Date(),
      versionTerminos: this.configService.get<string>('TERMS_VERSION', '1.0'),
    });
    return await this.buildAuthResponse(user);
  }

  // El login conserva compatibilidad con las contraseñas existentes y rechaza cuentas inactivas.
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;
    const user = await this.userService.findOneByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      this.logger.warn(`Intento de login fallido para el email ${email}`);
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.isActive) {
      this.logger.warn(`Intento de login fallido para el email ${email}`);
      throw new UnauthorizedException('Usuario inactivo');
    }
    return await this.buildAuthResponse(user);
  }

  // Valida el JWT y además comprueba el estado actual para que una suspensión sea inmediata.
  async validateToken(token: string): Promise<User> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    const user = await this.userService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Token inválido');
    }
    return user;
  }

  // Rota un refresh token dentro de una transacción para serializar usos simultáneos.
  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: JwtPayload & { tokenUse?: string; exp?: number };
    try {
      payload = await this.jwtService.verifyAsync<
        JwtPayload & { tokenUse?: string; exp?: number }
      >(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.tokenUse !== 'refresh') {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const tokenRepository = manager.getRepository(RefreshToken);
      const tokenHash = this.hash(refreshToken);
      const stored = await tokenRepository.findOne({
        where: { tokenHash },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stored || stored.idUsuario !== payload.sub) {
        return { error: 'invalid' as const };
      }
      if (stored.revocado) {
        // Reutilizar un token antiguo puede indicar robo: se invalidan todas las sesiones.
        await tokenRepository.update(
          { idUsuario: stored.idUsuario },
          { revocado: true },
        );
        return { error: 'reuse' as const };
      }
      if (stored.expiraEn.getTime() <= Date.now()) {
        stored.revocado = true;
        await tokenRepository.save(stored);
        return { error: 'invalid' as const };
      }

      const user = await manager.getRepository(User).findOneBy({ id: payload.sub });
      if (!user || !user.isActive) {
        await tokenRepository.update(
          { idUsuario: stored.idUsuario },
          { revocado: true },
        );
        return { error: 'inactive' as const };
      }
      stored.revocado = true;
      await tokenRepository.save(stored);
      const pair = await this.createTokenPair(user, manager);
      return { user, pair };
    });

    if ('error' in result) {
      throw new UnauthorizedException(
        result.error === 'inactive'
          ? 'Usuario inactivo'
          : 'Refresh token inválido o expirado',
      );
    }
    return this.toAuthResponse(result.user, result.pair);
  }

  // Revoca el token exacto recibido; no requiere que el access token siga vigente.
  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.dataSource.getRepository(RefreshToken).update(
      { tokenHash: this.hash(refreshToken), revocado: false },
      { revocado: true },
    );
    return { message: 'Sesión cerrada correctamente' };
  }

  // Responde igual exista o no el correo para impedir la enumeración de cuentas.
  async forgotPassword(email: string): Promise<{ message: string }> {
    const message =
      'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña';
    const user = await this.userService.findOneByEmail(email);
    if (user?.isActive) {
      const rawToken = randomBytes(32).toString('hex');
      await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(PasswordResetToken).update(
          { idUsuario: user.id, usado: false },
          { usado: true },
        );
        await manager.getRepository(PasswordResetToken).save(
          manager.getRepository(PasswordResetToken).create({
            idUsuario: user.id,
            tokenHash: this.hash(rawToken),
            expiraEn: new Date(Date.now() + 30 * 60 * 1000),
            usado: false,
          }),
        );
      });
      await this.mailService.sendPasswordReset(email, rawToken);
    }
    return { message };
  }

  // Consume el token de un solo uso, cambia la clave y termina las sesiones anteriores.
  async resetPassword(
    token: string,
    nuevaPassword: string,
  ): Promise<{ message: string }> {
    assertPasswordPolicy(nuevaPassword);
    const passwordHash = await bcrypt.hash(nuevaPassword, this.saltRounds);
    const reset = await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(PasswordResetToken);
      const stored = await repository.findOne({
        where: { tokenHash: this.hash(token) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stored || stored.usado || stored.expiraEn.getTime() <= Date.now()) {
        return false;
      }
      await manager.getRepository(User).update(
        { id: stored.idUsuario },
        { passwordHash },
      );
      await manager.getRepository(RefreshToken).update(
        { idUsuario: stored.idUsuario },
        { revocado: true },
      );
      await repository.update(
        { idUsuario: stored.idUsuario, usado: false },
        { usado: true },
      );
      return true;
    });
    if (!reset) {
      throw new BadRequestException('El enlace de recuperación no es válido');
    }
    return { message: 'La contraseña se restableció correctamente' };
  }

  // Actualiza la contraseña tras verificar la actual y revoca todas las sesiones activas.
  async changePassword(
    id: number,
    passwordActual: string,
    nuevaPassword: string,
  ): Promise<{ message: string }> {
    assertPasswordPolicy(nuevaPassword);
    const user = await this.userService.findByIdWithPassword(id);
    if (!user || !(await bcrypt.compare(passwordActual, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }
    const passwordHash = await bcrypt.hash(nuevaPassword, this.saltRounds);
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(User).update({ id }, { passwordHash });
      await manager
        .getRepository(RefreshToken)
        .update({ idUsuario: id }, { revocado: true });
    });
    return { message: 'La contraseña se actualizó correctamente' };
  }

  // Elimina datos personales y conserva únicamente las reseñas anonimizadas.
  async deleteAccount(
    id: number,
    passwordActual: string,
    ip?: string,
  ): Promise<{ message: string }> {
    const user = await this.userService.findByIdWithPassword(id);
    if (!user || !(await bcrypt.compare(passwordActual, user.passwordHash))) {
      throw new BadRequestException('La contraseña actual es incorrecta');
    }

    await this.dataSource.transaction(async (manager) => {
      const businesses = await manager
        .getRepository(Negocio)
        .countBy({ idUsuario: id });
      if (businesses > 0) {
        throw new ConflictException(
          'Transfiere o elimina tus negocios antes de eliminar la cuenta',
        );
      }
      await manager.getRepository(Favorito).delete({ idUsuario: id });
      await manager.getRepository(Visita).delete({ idUsuario: id });
      await manager.getRepository(Resena).update(
        { idUsuario: id },
        { idUsuario: null },
      );
      await manager.getRepository(SitioTuristico).update(
        { idUsuarioSugiere: id },
        { idUsuarioSugiere: null },
      );
      await manager.getRepository(RefreshToken).delete({ idUsuario: id });
      await manager.getRepository(PasswordResetToken).delete({ idUsuario: id });
      await this.auditoriaService.registrar(
        {
          idUsuario: id,
          accion: 'eliminacion_cuenta',
          entidad: 'usuario',
          idEntidad: id,
          ip,
        },
        manager,
      );
      await manager.getRepository(User).delete({ id });
    });

    this.logger.log(`Cuenta eliminada por solicitud del titular: ${id}`);
    return { message: 'La cuenta y sus datos personales fueron eliminados' };
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const pair = await this.createTokenPair(user);
    return this.toAuthResponse(user, pair);
  }

  async updateMyProfile(
    id: number,
    changes: { nombre?: string; idiomaPref?: string },
  ): Promise<User> {
    return await this.userService.updateMyProfile(id, changes);
  }

  private async createTokenPair(
    user: User,
    manager?: EntityManager,
  ): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>(
        'JWT_EXPIRATION',
        '15m',
      ) as JwtSignOptions['expiresIn'],
    });
    const refreshToken = await this.jwtService.signAsync(
      {
        ...payload,
        tokenUse: 'refresh',
        jti: randomBytes(16).toString('hex'),
      },
      {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
          '7d',
        ) as JwtSignOptions['expiresIn'],
      },
    );
    const refreshPayload = this.jwtService.decode(refreshToken) as {
      exp: number;
    };
    const repository = manager
      ? manager.getRepository(RefreshToken)
      : this.dataSource.getRepository(RefreshToken);
    await repository.save(
      repository.create({
        idUsuario: user.id,
        tokenHash: this.hash(refreshToken),
        expiraEn: new Date(refreshPayload.exp * 1000),
        revocado: false,
      }),
    );
    return { token, refreshToken };
  }

  private toAuthResponse(user: User, pair: TokenPair): AuthResponse {
    return {
      user: Object.assign(new AuthUser(), {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        role: user.role,
        documentoIdentidad: user.documentoIdentidad,
        soporteUrl: user.soporteUrl,
      }),
      ...pair,
    };
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
