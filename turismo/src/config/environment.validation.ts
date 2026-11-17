import * as Joi from 'joi';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

// Centraliza la validación para que el servidor y el CLI compartan los mismos valores seguros.
export const environmentValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow('').required(),
  DB_DATABASE: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRATION: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  TERMS_VERSION: Joi.string().trim().min(1).max(50).default('1.0'),
  FRONTEND_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3000'),
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  MAIL_FROM: Joi.string().email().optional(),
  CORS_ORIGINS: Joi.string()
    .allow('')
    .default('')
    .custom((value: string, helpers: Joi.CustomHelpers) => {
      const origins = value.split(',').map((origin) => origin.trim());
      const invalidOrigin = origins.find((origin) => {
        if (!origin) {
          return value.length > 0;
        }

        try {
          const parsed = new URL(origin);
          return (
            !['http:', 'https:'].includes(parsed.protocol) ||
            parsed.origin !== origin
          );
        } catch {
          return true;
        }
      });

      return invalidOrigin === undefined ? value : helpers.error('string.uri');
    }),
  SWAGGER_ENABLED: Joi.boolean().default(false),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  // El dominio local del ejemplo no debe bloquear el arranque en entornos reales.
  ADMIN_EMAIL: Joi.string().email({ tlds: { allow: false } }),
  ADMIN_PASSWORD: Joi.string().pattern(passwordPattern).min(10).max(72),
  ADMIN_NOMBRE: Joi.string(),
})
  .unknown(true)
  .with('SMTP_HOST', ['SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'])
  .with('SMTP_PORT', ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'])
  .with('SMTP_USER', ['SMTP_HOST', 'SMTP_PORT', 'SMTP_PASS', 'MAIL_FROM'])
  .with('SMTP_PASS', ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'MAIL_FROM'])
  .with('MAIL_FROM', ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'])
  .custom((value: Record<string, unknown>, helpers: Joi.CustomHelpers) => {
    if (value.NODE_ENV === 'production' && value.DB_SYNCHRONIZE === true) {
      return helpers.error('any.invalid');
    }
    if (value.JWT_SECRET === value.JWT_REFRESH_SECRET) {
      return helpers.error('any.custom');
    }
    return value;
  })
  .messages({
    'any.invalid': 'DB_SYNCHRONIZE debe ser false en producción',
    'any.custom': 'JWT_REFRESH_SECRET debe ser distinto de JWT_SECRET',
  });
