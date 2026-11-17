import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  SerializeOptions,
  Patch,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { AuthResponse } from './interfaces/auth-response.interface';
import { User } from '../user/entities/user.entity';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CurrentPasswordDto } from './dto/current-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/register
   * Registrar un nuevo usuario (responde 201 Created)
   */
  @Post('register')
  // Reduce intentos de creación masiva de cuentas por IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  // El grupo propio permite devolver solo los datos sensibles de quien se registra.
  @SerializeOptions({ groups: ['propio'] })
  register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  /**
   * POST /auth/login
   * Iniciar sesión (responde 200 OK, no se crea ningún recurso)
   */
  @Post('login')
  // Reduce intentos automatizados de adivinar credenciales.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  // El grupo propio entrega datos del titular sin habilitar campos en otras rutas.
  @SerializeOptions({ groups: ['propio'] })
  login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  /**
   * GET /auth/profile
   * Obtener perfil del usuario autenticado
   * Ruta protegida con JWT
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  // El titular puede consultar sus datos personales completos.
  @SerializeOptions({ groups: ['propio'] })
  getProfile(@GetUser() user: User): { user: User } {
    return { user };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar nombre e idioma del usuario autenticado' })
  @SerializeOptions({ groups: ['propio'] })
  updateMyProfile(
    @GetUser() user: User,
    @Body() dto: UpdateMyProfileDto,
  ): Promise<User> {
    return this.authService.updateMyProfile(user.id, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña y cerrar las demás sesiones' })
  changePassword(
    @GetUser() user: User,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(
      user.id,
      dto.passwordActual,
      dto.nuevaPassword,
    );
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Eliminar la cuenta, sus datos personales y anonimizar reseñas',
  })
  deleteMyAccount(
    @GetUser() user: User,
    @Body() dto: CurrentPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.deleteAccount(user.id, dto.passwordActual);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotar el refresh token y emitir un nuevo par' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido o reutilizado' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revocar el refresh token enviado' })
  logout(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Solicitar enlace de recuperación sin revelar si el correo existe',
  })
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiOperation({ summary: 'Restablecer contraseña con un token de un solo uso' })
  resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(dto.token, dto.nuevaPassword);
  }
}