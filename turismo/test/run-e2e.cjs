const { spawnSync } = require('node:child_process');
const { config: loadEnvironment } = require('dotenv');
const mysql = require('mysql2/promise');

// Reutiliza las credenciales locales, pero siempre apunta a la base aislada de pruebas.
loadEnvironment();

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: process.env.DB_PORT || '3306',
  DB_USERNAME: process.env.DB_USERNAME || 'turismo',
  DB_PASSWORD: process.env.DB_PASSWORD || 'turismo_ci_password',
  DB_DATABASE: 'turismo_test',
  DB_SYNCHRONIZE: 'false',
  JWT_SECRET:
    process.env.JWT_SECRET || 'test-access-secret-at-least-32-characters',
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-characters',
  JWT_EXPIRATION: process.env.JWT_EXPIRATION || '15m',
  JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION || '7d',
  TERMS_VERSION: process.env.TERMS_VERSION || '1.0',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  CORS_ORIGINS: process.env.CORS_ORIGINS || '',
  SWAGGER_ENABLED: 'false',
};

async function prepareTestDatabase() {
  const credentials = {
    host: env.DB_HOST,
    port: Number(env.DB_PORT),
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
  };
  try {
    const existing = await mysql.createConnection({
      ...credentials,
      database: 'turismo_test',
    });
    await existing.end();
    return;
  } catch (error) {
    if (error.code !== 'ER_BAD_DB_ERROR') {
      throw error;
    }
  }

  const connection = await mysql.createConnection(credentials);
  try {
    // Crea únicamente la base dedicada y nunca elimina otras bases del servidor.
    await connection.query(
      'CREATE DATABASE IF NOT EXISTS `turismo_test` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci',
    );
  } finally {
    await connection.end();
  }
}

// Compila antes de invocar el CLI JavaScript para que las migraciones usen dist/.
const commands = [
  ['run', 'build'],
  ['run', 'migration:run:prod'],
  ['exec', '--', 'vitest', 'run', '--config', './vitest.config.e2e.ts'],
];
async function run() {
  for (const args of commands) {
    if (args[1] === 'migration:run:prod') {
      try {
        await prepareTestDatabase();
      } catch (error) {
        console.error('No fue posible preparar la base turismo_test:', error);
        process.exitCode = 1;
        return;
      }
    }
    const result = spawnSync(npm, args, {
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.error) {
      console.error(
        `No fue posible ejecutar ${npm} ${args.join(' ')}:`,
        result.error,
      );
      process.exitCode = 1;
      return;
    }
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
      return;
    }
  }
}

void run();
