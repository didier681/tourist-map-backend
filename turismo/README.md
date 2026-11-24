# Tourist Map

[![CI](https://github.com/didier681/turismo_backend/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/didier681/turismo_backend/actions/workflows/ci.yml)

Tourist Map es una API de turismo para descubrir sitios, negocios y guías cercanos en el departamento de Córdoba, Colombia. Permite consultar y administrar sitios turísticos, negocios y servicios, y ofrece funciones para que las personas visitantes interactúen con el catálogo.

## Tecnologías

- NestJS y TypeScript
- TypeORM
- MySQL o MariaDB
- JWT para autenticación
- Swagger para la documentación interactiva

## Requisitos

- Node.js y npm
- MySQL o MariaDB en ejecución
- Una base de datos llamada `turismo`

## Instalación y ejecución

1. Clona el repositorio y entra al directorio del proyecto:

   ```bash
   git clone https://github.com/didier681/turismo_backend.git
   cd turismo_backend/turismo
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Copia `.env.example` como `.env` y configura las credenciales de la base de datos, el secreto JWT y, si vas a ejecutar el seed, los datos del administrador inicial.

   ```bash
   cp .env.example .env
   ```

   En Windows puedes usar `Copy-Item .env.example .env` desde PowerShell.

4. Crea la base de datos en MySQL o MariaDB:

   ```sql
   CREATE DATABASE turismo;
   ```

5. Ejecuta las migraciones para crear todas las tablas. En producción, la aplicación también las ejecuta al arrancar:

   ```bash
   npm run migration:run
   ```

6. Crea el usuario administrador inicial. El comando no duplica el usuario si el correo ya existe:

   ```bash
   npm run seed
   ```

7. Inicia el servidor en modo desarrollo:

   ```bash
   npm run start:dev
   ```

La API estará disponible en `http://localhost:3000` (o en el puerto definido por `PORT`). El seed se debe ejecutar después de las migraciones.

## Documentación y autenticación

Swagger solo está disponible cuando `SWAGGER_ENABLED=true`; con el servidor en ejecución, abre [http://localhost:3000/api/docs](http://localhost:3000/api/docs). Para probar rutas protegidas:

1. Regístrate o inicia sesión en los endpoints de autenticación.
2. Copia `token` (access token, recomendado 15 minutos) y conserva `refreshToken` de forma segura.
3. Pulsa **Authorize** en Swagger y pega solo el token, sin escribir el prefijo `Bearer`; Swagger lo añade automáticamente.
4. Pulsa **Authorize** y cierra el diálogo. Swagger enviará el token en las solicitudes protegidas.

El access token se renueva con `POST /auth/refresh` enviando `{ "refreshToken": "..." }`. Cada refresh token es de un solo uso: la respuesta entrega un nuevo par y su reutilización revoca todas las sesiones de la cuenta. Para cerrar sesión, llama `POST /auth/logout` con el refresh token vigente.

Para recuperar el acceso, llama `POST /auth/forgot-password` con `{ "email": "usuario@ejemplo.com" }`. La respuesta es siempre genérica. El enlace recibido conduce a `POST /auth/reset-password` con `{ "token": "...", "nuevaPassword": "ClaveSegura123" }`; el cambio invalida las sesiones existentes. `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y `MAIL_FROM` permiten enviar el correo. Sin SMTP, en desarrollo el enlace se registra en el log; en producción no se expone el enlace.

El titular puede editar nombre e idioma en `PATCH /auth/me`, cambiar contraseña en `PATCH /auth/me/password` y eliminar su cuenta en `DELETE /auth/me` (requiere contraseña actual; los negocios deben transferirse o eliminarse primero). Las reseñas permanecen con autor “Usuario eliminado”. Aceptar los términos con `aceptaTerminos: true` es requisito para registrarse; se guarda `TERMS_VERSION`.

El personal administrador puede suspender o reactivar usuarios con `PATCH /users/:id/estado` y `{ "isActive": false, "motivo": "..." }`. Un administrador no puede suspender su propia cuenta; las sesiones renovables se revocan al suspender.

## Roles

| Rol | Permisos principales |
| --- | --- |
| `admin` | Administra usuarios, zonas y categorías; gestiona sitios turísticos y los recursos de negocios. |
| `gestor` | Gestiona sitios turísticos y sus categorías dentro de las zonas asignadas. |
| `negocio` | Administra su negocio, categorías, servicios, tarifas, multimedia y publicidad. |
| `usuario` | Consulta el catálogo y registra favoritos, visitas y reseñas. |

Las rutas de escritura requieren autenticación y aplican permisos por rol y, cuando corresponde, validaciones de propiedad o asignación.

## Endpoints personales y administrativos

- `GET /visitas/mias`: lista las visitas del usuario autenticado. `GET /visitas` y `GET /visitas/:id` son exclusivos de administradores.
- `GET /favoritos/mios`: lista los favoritos del usuario autenticado. `GET /favoritos` y `GET /favoritos/:idUsuario/:idSitio` son exclusivos de administradores.
- `PATCH /negocios/:id/membresia`: permite a un administrador cambiar la membresía (`gratis`, `basico` o `premium`). Los negocios nuevos siempre comienzan con membresía gratis.

## Verificación y ficha de negocios

Los negocios nuevos quedan `pendiente`; solo los `verificado` aparecen en `GET /negocios`, `GET /negocios/cercanos` y `GET /publicidades/activas`. El administrador consulta los pendientes en `GET /negocios/pendientes` y actualiza su estado en `PATCH /negocios/:id/verificacion`:

```json
{ "estado": "rechazado", "motivo": "No se pudo validar la documentación" }
```

El motivo es obligatorio para `rechazado` y `suspendido`. El propietario puede revisar todos sus negocios en `GET /negocios/mios`. Un usuario con rol `usuario` presenta una solicitud con `POST /solicitudes-negocio` (campos de `CreateNegocioDto` y `soporteUrl` HTTPS opcional); se permiten varias solicitudes históricas pero solo una pendiente por usuario. El admin usa `GET /solicitudes-negocio?estado=pendiente&page=1&limit=20`, `PATCH /solicitudes-negocio/:id/aprobar` o `PATCH /solicitudes-negocio/:id/rechazar` con `{ "motivo": "..." }`. La aprobación crea en una transacción el negocio verificado y actualiza el rol. `GET /solicitudes-negocio/mias` muestra el historial propio.

La ficha admite `descripcion` (máximo 1000 caracteres), `direccion`, enlaces HTTPS `sitioWeb` y `logoUrl`, además de `instagram` y `facebook`. Reemplaza horarios usando `PUT /negocios/:id/horarios`:

```json
{
  "horarios": [
    { "diaSemana": 2, "horaApertura": "09:00", "horaCierre": "18:00" }
  ]
}
```

`diaSemana` usa 0 para domingo y 6 para sábado. `GET /negocios/cercanos` admite `abiertoAhora=true`; evalúa el horario con la hora de `America/Bogota`. `GET /negocios/:id/calificacion` devuelve `{ "promedio": 4.5, "total": 12 }` contando solo reseñas visibles.

## Reseñas, auditoría y publicidad

Una reseña debe incluir exactamente uno de `idSitio` o `idNegocio`. Los dueños no pueden reseñar su propio negocio. `GET /resenas` y las calificaciones excluyen estados distintos de `visible`. Un usuario autenticado puede reportar con `POST /resenas/:id/reportar` y `{ "motivo": "ofensiva" }` (también `falsa` o `spam`). Al tercer reporte, la reseña pasa a `en_revision`; el admin revisa `GET /resenas/en-revision` y decide mediante `PATCH /resenas/:id/moderar` con `{ "estado": "visible" }` o `{ "estado": "oculta" }`.

El endpoint administrativo paginado `GET /auditoria` acepta `accion`, `entidad`, `idUsuario`, `desde` y `hasta`; conserva quién realizó cada operación, la entidad, el detalle JSON, la IP disponible y la fecha, nunca contraseñas ni tokens.

Cada campaña incluida en `GET /publicidades/activas` suma una impresión. El endpoint público `POST /publicidades/:id/clic` registra clics y limita a 10 solicitudes por minuto por IP. El dueño de la campaña o un admin consulta `GET /publicidades/:id/metricas`, que devuelve `impresiones`, `clics` y `ctr` (clics / impresiones × 100; cero si no hay impresiones).

## Búsqueda y paginación

Los listados de zonas, sitios, categorías, negocios, servicios, tarifas, reseñas y publicidades devuelven `{ data, total, page, limit, totalPages }`. `page` inicia en 1, `limit` en 20 y el máximo permitido es 100. Sitios y negocios aceptan `idZona` y `q`; las reseñas aceptan `idSitio`. Las publicidades activas conservan el filtro de vigencia.

Los endpoints públicos de proximidad exigen latitud y longitud válidas, limitan el radio a 50 km y ordenan por distancia ascendente:

```http
GET /sitios-turisticos/cercanos?lat=8.7500&lng=-75.8833&radioM=5000&page=1&limit=20
GET /negocios/cercanos?lat=8.7500&lng=-75.8833&radioM=5000&idCategoria=2&page=1&limit=20
```

También aceptan `idZona` y `q`. Cada elemento incluye `distanciaM`; los negocios cercanos omiten `nitDocumento` e `idUsuario`. La búsqueda acota primero los candidatos por caja delimitadora en SQL y luego calcula la distancia precisa con Haversine.

## Módulos

- **Autenticación y usuarios:** `auth` y `user` para registro, inicio de sesión, perfiles y administración de cuentas.
- **Zonas y sitios turísticos:** `zona`, `sitio-turistico`, `categoria-sitio` y `sitio-categoria`.
- **Interacciones:** `favorito`, `resena` y `visita`.
- **Negocios:** `categoria-negocio`, `negocio`, `negocio-categoria`, `servicio`, `tarifa`, `publicidad` y `multimedia`.

## Reglas de negocio principales

- El registro público siempre crea usuarios con rol `usuario`; no permite asignar un rol privilegiado.
- Las contraseñas nuevas deben tener al menos 10 caracteres, mayúscula, minúscula y número, y se almacenan cifradas con bcrypt. Esta regla no se aplica al login para conservar el acceso de cuentas existentes.
- El correo y el documento de identidad deben ser únicos. Los gestores se crean inactivos y requieren aprobación; sus zonas se asignan explícitamente.
- Una persona usuaria solo puede publicar una reseña por sitio.
- Las coordenadas de los negocios deben estar dentro de los rangos geográficos válidos.
- No se permiten tarifas del mismo nombre con períodos de vigencia superpuestos para un servicio.
- La publicidad no se habilita para negocios con membresía gratuita.
- Cada entidad admite como máximo diez registros multimedia.

## Pruebas y calidad

```bash
npm test          # Pruebas unitarias
npm run test:e2e  # Pruebas de extremo a extremo
npm run lint      # Análisis estático
npm run build     # Compilación
```

## Variables de entorno y despliegue

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `NODE_ENV` | No | `development`, `production` o `test`; por defecto `development`. |
| `PORT` | No | Puerto HTTP; por defecto `3000`. |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Sí | Conexión a MySQL/MariaDB. Se admite una contraseña de base de datos vacía. |
| `DB_SYNCHRONIZE` | No | Habilita sincronización fuera de producción; por defecto `false` y siempre se rechaza en producción. |
| `JWT_SECRET` | Sí | Secreto de firma JWT de al menos 32 caracteres. |
| `JWT_EXPIRATION` | No | Vigencia del access token; por defecto `15m`. |
| `JWT_REFRESH_SECRET` | Sí | Secreto independiente, de al menos 32 caracteres, para refresh tokens. |
| `JWT_REFRESH_EXPIRATION` | No | Vigencia del refresh token; por defecto `7d`. |
| `TERMS_VERSION` | No | Versión vigente de términos; por defecto `1.0`. |
| `FRONTEND_URL` | No | URL base del frontend para construir enlaces de recuperación. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | No | Deben configurarse juntos para el envío de correos de recuperación. |
| `CORS_ORIGINS` | No | Orígenes HTTP/HTTPS separados por comas. Vacío permite localhost solo en desarrollo. |
| `SWAGGER_ENABLED` | No | Publica Swagger solo con `true`; por defecto `false`. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NOMBRE` | Solo para seed | Datos del administrador inicial; la contraseña requiere 10 caracteres, mayúscula, minúscula y número. |
| `MYSQL_ROOT_PASSWORD` | Solo para Docker Compose | Contraseña de root para inicializar MySQL 8.4; usa un secreto largo y exclusivo. |

En desarrollo, las migraciones se ejecutan manualmente y `DB_SYNCHRONIZE` es `false` por defecto. Si se activa la sincronización local, nunca debe usarse con `NODE_ENV=production`. En producción, configure `NODE_ENV=production`, `DB_SYNCHRONIZE=false` y orígenes CORS explícitos; el servidor ejecutará las migraciones pendientes al iniciar y Swagger permanecerá oculto salvo habilitación explícita.

Para crear una migración después de cambiar entidades, indique un nombre:

```bash
npm run migration:generate -- src/database/migrations/NombreDelCambio
```

Use `npm run migration:run` para aplicarlas y `npm run migration:revert` para revertir la última migración aplicada.

## Despliegue con Docker

Docker Compose inicia MySQL 8.4 con almacenamiento persistente. El contenedor de la API espera a que la base de datos esté sana, aplica las migraciones compiladas y luego inicia NestJS:

```bash
cp .env.example .env
# Edita .env con secretos y credenciales únicos antes de desplegar.
docker compose up -d
docker compose logs -f api
```

El seed es una operación explícita y se ejecuta después de las migraciones:

```bash
docker compose exec api npm run seed:prod
```

Compose lee la configuración de `.env`; `DB_HOST` se establece internamente en `db`. El volumen `mysql_data` conserva la base al recrear los contenedores. Para aplicar manualmente migraciones nuevas en un contenedor ya iniciado, usa `docker compose exec api npm run migration:run:prod`.

## Checklist de producción

- [ ] `NODE_ENV=production` y `DB_SYNCHRONIZE=false`.
- [ ] `SWAGGER_ENABLED=false` o Swagger protegido por el proxy/control de acceso.
- [ ] `CORS_ORIGINS` contiene únicamente el dominio HTTPS real del frontend.
- [ ] `JWT_SECRET`, `JWT_REFRESH_SECRET`, claves de base de datos y `MYSQL_ROOT_PASSWORD` son largos, únicos y no reutilizados.
- [ ] SMTP está configurado con credenciales de producción para recuperación de contraseña.
- [ ] El tráfico HTTPS termina en un proxy inverso correctamente configurado.
- [ ] Hay backups automatizados de MySQL y se ha probado su restauración.
- [ ] Se revisan los logs y el healthcheck de `/health` después del despliegue.

## Pruebas e2e

Las pruebas e2e usan una base MySQL real llamada `turismo_test`: compilan el proyecto, ejecutan las migraciones compiladas y limpian las tablas antes de la suite. No apuntes esta variable a una base con datos que quieras conservar.

Primero crea la base y concede acceso al usuario de pruebas en MySQL:

```sql
CREATE DATABASE turismo_test;
GRANT ALL PRIVILEGES ON turismo_test.* TO 'turismo'@'%';
```

```bash
DB_HOST=127.0.0.1 DB_PORT=3306 DB_USERNAME=turismo DB_PASSWORD=turismo_ci_password npm run test:e2e
```

En Windows PowerShell, define esas variables en la sesión antes de ejecutar `npm run test:e2e`. El workflow de GitHub Actions prepara MySQL 8.4 y ejecuta lint, build, pruebas unitarias, migraciones y e2e en cada push o pull request a `main`.
