import { environmentValidationSchema } from './environment.validation';

const requiredEnvironment = {
  DB_HOST: 'localhost',
  DB_PORT: '3306',
  DB_USERNAME: 'turismo',
  DB_PASSWORD: '',
  DB_DATABASE: 'turismo',
  JWT_SECRET: 'secreto-de-prueba-con-32-caracteres-minimo',
};

describe('environmentValidationSchema', () => {
  it('aplica valores predeterminados y acepta variables de configuración válidas', () => {
    const { error, value } =
      environmentValidationSchema.validate(requiredEnvironment);

    expect(error).toBeUndefined();
    expect(value.NODE_ENV).toBe('development');
    expect(value.DB_SYNCHRONIZE).toBe(false);
    expect(value.SWAGGER_ENABLED).toBe(false);
  });

  it('rechaza secretos JWT menores de 32 caracteres', () => {
    const { error } = environmentValidationSchema.validate({
      ...requiredEnvironment,
      JWT_SECRET: 'demasiado-corto',
    });

    expect(error).toBeDefined();
  });

  it('rechaza sincronización de esquema en producción', () => {
    const { error } = environmentValidationSchema.validate({
      ...requiredEnvironment,
      NODE_ENV: 'production',
      DB_SYNCHRONIZE: 'true',
    });

    expect(error?.message).toContain(
      'DB_SYNCHRONIZE debe ser false en producción',
    );
  });

  it('rechaza orígenes CORS que no sean orígenes HTTP o HTTPS completos', () => {
    const { error } = environmentValidationSchema.validate({
      ...requiredEnvironment,
      CORS_ORIGINS: 'https://ejemplo.com/ruta',
    });

    expect(error).toBeDefined();
  });
});
