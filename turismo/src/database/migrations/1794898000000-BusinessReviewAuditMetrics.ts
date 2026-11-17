import { MigrationInterface, QueryRunner } from 'typeorm';

// Amplía el catálogo y su trazabilidad para publicar solo negocios verificados.
export class BusinessReviewAuditMetrics1794898000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE `negocios` ADD `estado_verificacion` enum ('pendiente', 'verificado', 'rechazado', 'suspendido') NOT NULL DEFAULT 'pendiente'",
    );
    // Los negocios que ya estaban disponibles no deben desaparecer al actualizar.
    await queryRunner.query(
      "UPDATE `negocios` SET `estado_verificacion` = 'verificado'",
    );
    await queryRunner.query(
      'ALTER TABLE `negocios` ADD `motivo_rechazo` text NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `negocios` ADD `descripcion` text NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `negocios` ADD `direccion` varchar(500) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `negocios` ADD `sitio_web` varchar(2048) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `negocios` ADD `instagram` varchar(255) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `negocios` ADD `facebook` varchar(255) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `negocios` ADD `logo_url` varchar(2048) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `publicidades` ADD `impresiones` int NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE `publicidades` ADD `clics` int NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE `resenas` MODIFY `id_sitio` int NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `resenas` ADD `id_negocio` int NULL',
    );
    await queryRunner.query(
      "ALTER TABLE `resenas` ADD `estado` enum ('visible', 'en_revision', 'oculta') NOT NULL DEFAULT 'visible'",
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `UQ_resenas_usuario_negocio` ON `resenas` (`id_usuario`, `id_negocio`)',
    );
    await queryRunner.query(
      'ALTER TABLE `resenas` ADD CONSTRAINT `FK_resenas_negocio` FOREIGN KEY (`id_negocio`) REFERENCES `negocios`(`id_negocio`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      "CREATE TABLE `horario_negocio` (`id_horario` int NOT NULL AUTO_INCREMENT, `id_negocio` int NOT NULL, `dia_semana` tinyint NOT NULL, `hora_apertura` time NOT NULL, `hora_cierre` time NOT NULL, INDEX `IDX_horario_negocio_dia` (`id_negocio`, `dia_semana`), PRIMARY KEY (`id_horario`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      'ALTER TABLE `horario_negocio` ADD CONSTRAINT `FK_horario_negocio` FOREIGN KEY (`id_negocio`) REFERENCES `negocios`(`id_negocio`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      "CREATE TABLE `solicitudes_negocio` (`id_solicitud` int NOT NULL AUTO_INCREMENT, `id_usuario` int NOT NULL, `datos_negocio` json NOT NULL, `soporte_url` varchar(2048) NULL, `estado` enum ('pendiente', 'aprobada', 'rechazada') NOT NULL DEFAULT 'pendiente', `motivo` text NULL, `fecha_solicitud` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_solicitudes_usuario_estado` (`id_usuario`, `estado`), PRIMARY KEY (`id_solicitud`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      'ALTER TABLE `solicitudes_negocio` ADD CONSTRAINT `FK_solicitudes_negocio_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `users`(`id_usuario`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      "CREATE TABLE `reporte_resena` (`id_reporte` int NOT NULL AUTO_INCREMENT, `id_resena` int NOT NULL, `id_usuario` int NOT NULL, `motivo` enum ('ofensiva', 'falsa', 'spam') NOT NULL, `fecha` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_reporte_resena_usuario` (`id_resena`, `id_usuario`), PRIMARY KEY (`id_reporte`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      'ALTER TABLE `reporte_resena` ADD CONSTRAINT `FK_reporte_resena_resena` FOREIGN KEY (`id_resena`) REFERENCES `resenas`(`id_resena`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `reporte_resena` ADD CONSTRAINT `FK_reporte_resena_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `users`(`id_usuario`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      "CREATE TABLE `auditoria` (`id_auditoria` int NOT NULL AUTO_INCREMENT, `id_usuario` int NULL, `accion` varchar(100) NOT NULL, `entidad` varchar(100) NOT NULL, `id_entidad` int NULL, `detalle` json NULL, `ip` varchar(45) NULL, `fecha` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_auditoria_fecha` (`fecha`), INDEX `IDX_auditoria_usuario` (`id_usuario`), PRIMARY KEY (`id_auditoria`)) ENGINE=InnoDB",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ total }] = await queryRunner.query(
      'SELECT COUNT(*) AS `total` FROM `resenas` WHERE `id_sitio` IS NULL',
    );
    if (Number(total) > 0) {
      throw new Error(
        'No se puede revertir la migración: hay reseñas asociadas a negocios.',
      );
    }
    await queryRunner.query('DROP TABLE `auditoria`');
    await queryRunner.query(
      'ALTER TABLE `reporte_resena` DROP FOREIGN KEY `FK_reporte_resena_usuario`',
    );
    await queryRunner.query(
      'ALTER TABLE `reporte_resena` DROP FOREIGN KEY `FK_reporte_resena_resena`',
    );
    await queryRunner.query('DROP TABLE `reporte_resena`');
    await queryRunner.query(
      'ALTER TABLE `solicitudes_negocio` DROP FOREIGN KEY `FK_solicitudes_negocio_usuario`',
    );
    await queryRunner.query('DROP TABLE `solicitudes_negocio`');
    await queryRunner.query(
      'ALTER TABLE `horario_negocio` DROP FOREIGN KEY `FK_horario_negocio`',
    );
    await queryRunner.query('DROP TABLE `horario_negocio`');
    await queryRunner.query(
      'ALTER TABLE `resenas` DROP FOREIGN KEY `FK_resenas_negocio`',
    );
    await queryRunner.query(
      'DROP INDEX `UQ_resenas_usuario_negocio` ON `resenas`',
    );
    await queryRunner.query('ALTER TABLE `resenas` DROP COLUMN `estado`');
    await queryRunner.query('ALTER TABLE `resenas` DROP COLUMN `id_negocio`');
    await queryRunner.query(
      'ALTER TABLE `resenas` MODIFY `id_sitio` int NOT NULL',
    );
    await queryRunner.query('ALTER TABLE `publicidades` DROP COLUMN `clics`');
    await queryRunner.query(
      'ALTER TABLE `publicidades` DROP COLUMN `impresiones`',
    );
    await queryRunner.query('ALTER TABLE `negocios` DROP COLUMN `logo_url`');
    await queryRunner.query('ALTER TABLE `negocios` DROP COLUMN `facebook`');
    await queryRunner.query('ALTER TABLE `negocios` DROP COLUMN `instagram`');
    await queryRunner.query('ALTER TABLE `negocios` DROP COLUMN `sitio_web`');
    await queryRunner.query('ALTER TABLE `negocios` DROP COLUMN `direccion`');
    await queryRunner.query('ALTER TABLE `negocios` DROP COLUMN `descripcion`');
    await queryRunner.query(
      'ALTER TABLE `negocios` DROP COLUMN `motivo_rechazo`',
    );
    await queryRunner.query(
      'ALTER TABLE `negocios` DROP COLUMN `estado_verificacion`',
    );
  }
}
