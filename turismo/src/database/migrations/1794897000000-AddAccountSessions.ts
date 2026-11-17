import { MigrationInterface, QueryRunner } from 'typeorm';

// Guarda consentimientos y hashes de credenciales para que ninguna sesión renovable dependa de texto plano.
export class AddAccountSessions1794897000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `users` ADD `fecha_aceptacion_terminos` datetime NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `users` ADD `version_terminos` varchar(50) NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `resenas` DROP FOREIGN KEY `FK_59f818e2c1a021702892576c6ee`',
    );
    await queryRunner.query(
      'ALTER TABLE `resenas` MODIFY `id_usuario` int NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `resenas` ADD CONSTRAINT `FK_59f818e2c1a021702892576c6ee` FOREIGN KEY (`id_usuario`) REFERENCES `users`(`id_usuario`) ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      "CREATE TABLE `refresh_tokens` (`id_refresh_token` int NOT NULL AUTO_INCREMENT, `id_usuario` int NOT NULL, `token_hash` char(64) NOT NULL, `expira_en` datetime NOT NULL, `revocado` tinyint NOT NULL DEFAULT 0, `fecha` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_refresh_tokens_token_hash` (`token_hash`), INDEX `IDX_refresh_tokens_user_revoked` (`id_usuario`, `revocado`), PRIMARY KEY (`id_refresh_token`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      "CREATE TABLE `password_reset_tokens` (`id_password_reset_token` int NOT NULL AUTO_INCREMENT, `id_usuario` int NOT NULL, `token_hash` char(64) NOT NULL, `expira_en` datetime NOT NULL, `usado` tinyint NOT NULL DEFAULT 0, `fecha` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_password_reset_tokens_hash` (`token_hash`), PRIMARY KEY (`id_password_reset_token`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      'ALTER TABLE `refresh_tokens` ADD CONSTRAINT `FK_refresh_tokens_user` FOREIGN KEY (`id_usuario`) REFERENCES `users`(`id_usuario`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `FK_password_reset_tokens_user` FOREIGN KEY (`id_usuario`) REFERENCES `users`(`id_usuario`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ total }] = await queryRunner.query(
      'SELECT COUNT(*) AS `total` FROM `resenas` WHERE `id_usuario` IS NULL',
    );
    if (Number(total) > 0) {
      throw new Error(
        'No se puede revertir la migración: hay reseñas anonimizadas sin autor.',
      );
    }
    await queryRunner.query(
      'ALTER TABLE `password_reset_tokens` DROP FOREIGN KEY `FK_password_reset_tokens_user`',
    );
    await queryRunner.query(
      'ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `FK_refresh_tokens_user`',
    );
    await queryRunner.query('DROP TABLE `password_reset_tokens`');
    await queryRunner.query('DROP TABLE `refresh_tokens`');
    await queryRunner.query(
      'ALTER TABLE `resenas` DROP FOREIGN KEY `FK_59f818e2c1a021702892576c6ee`',
    );
    await queryRunner.query(
      'ALTER TABLE `resenas` MODIFY `id_usuario` int NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `resenas` ADD CONSTRAINT `FK_59f818e2c1a021702892576c6ee` FOREIGN KEY (`id_usuario`) REFERENCES `users`(`id_usuario`) ON DELETE NO ACTION ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `users` DROP COLUMN `version_terminos`',
    );
    await queryRunner.query(
      'ALTER TABLE `users` DROP COLUMN `fecha_aceptacion_terminos`',
    );
  }
}
