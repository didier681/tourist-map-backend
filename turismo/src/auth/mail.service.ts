import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class AuthMailService {
  private readonly logger = new Logger(AuthMailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.getOrThrow<string>('FRONTEND_URL');
    const resetUrl = new URL('/reset-password', frontendUrl);
    resetUrl.searchParams.set('token', token);

    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const password = this.configService.get<string>('SMTP_PASS');
    const port = this.configService.get<number>('SMTP_PORT');
    const from = this.configService.get<string>('MAIL_FROM');

    if (!host || !user || !password || !port || !from) {
      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        this.logger.log(`Enlace de recuperación: ${resetUrl.toString()}`);
      } else {
        this.logger.error(
          'No se pudo enviar la recuperación de contraseña: SMTP no está configurado',
        );
      }
      return;
    }

    const transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    });
    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Recuperación de contraseña',
        text: `Para restablecer tu contraseña, abre este enlace (válido por 30 minutos): ${resetUrl.toString()}`,
      });
    } catch (error) {
      this.logger.error(
        'No se pudo enviar el correo de recuperación',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
