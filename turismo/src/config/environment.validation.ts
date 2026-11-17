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
  JWT_EXPIRATION: Joi.string().default('1h'),
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

      return invalidOrigin === undefined
        ? value
        : helpers.error('string.uri');
    }),
  SWAGGER_ENABLED: Joi.boolean().default(false),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  ADMIN_EMAIL: Joi.string().email(),
  ADMIN_PASSWORD: Joi.string().pattern(passwordPattern).min(10).max(72),
  ADMIN_NOMBRE: Joi.string(),
})
  .unknown(true)
  .custom((value: Record<string, unknown>, helpers: Joi.CustomHelpers) => {
    if (value.NODE_ENV === 'production' && value.DB_SYNCHRONIZE === true) {
      return helpers.error('any.invalid');
    }
    return value;
  })
  .messages({
    'any.invalid': 'DB_SYNCHRONIZE debe ser false en producción',
  });
