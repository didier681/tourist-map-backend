import { MigrationInterface, QueryRunner } from 'typeorm';

export class SchemaAlignment1794903123339 implements MigrationInterface {
  name = 'SchemaAlignment1794903123339';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Alinea restricciones e índices heredados con el metadato de TypeORM sin reemplazar datos JSON de auditoría.
    await queryRunner.query(
      `ALTER TABLE \`horario_negocio\` DROP FOREIGN KEY \`FK_horario_negocio\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporte_resena\` DROP FOREIGN KEY \`FK_reporte_resena_resena\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporte_resena\` DROP FOREIGN KEY \`FK_reporte_resena_usuario\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_resenas_negocio\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_refresh_tokens_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`password_reset_tokens\` DROP FOREIGN KEY \`FK_password_reset_tokens_user\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes_negocio\` DROP FOREIGN KEY \`FK_solicitudes_negocio_usuario\``,
    );
    await queryRunner.query(
      `DROP INDEX \`UQ_resenas_usuario_negocio\` ON \`resenas\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` DROP FOREIGN KEY \`FK_911cf70338dd65860c67ef2f41a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`id_sitio\` \`id_sitio\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`descripcion\` \`descripcion\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`direccion\` \`direccion\` varchar(500) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`sitio_web\` \`sitio_web\` varchar(2048) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`instagram\` \`instagram\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`facebook\` \`facebook\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`logo_url\` \`logo_url\` varchar(2048) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`motivo_rechazo\` \`motivo_rechazo\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_59f818e2c1a021702892576c6ee\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_f9bb3e53bc1f3004d3bf1a8a9d2\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_f20bc493740a6de0158da8eba9\` ON \`resenas\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` CHANGE \`id_usuario\` \`id_usuario\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` CHANGE \`id_sitio\` \`id_sitio\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` CHANGE \`id_negocio\` \`id_negocio\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sitios_turisticos\` DROP FOREIGN KEY \`FK_3f164b1bf344c80fedfc18c3d17\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`sitios_turisticos\` CHANGE \`id_usuario_sugiere\` \`id_usuario_sugiere\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sitios_turisticos\` CHANGE \`motivo_rechazo\` \`motivo_rechazo\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`documento_identidad\` \`documento_identidad\` varchar(20) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`soporte_url\` \`soporte_url\` varchar(255) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`fecha_aceptacion_terminos\` \`fecha_aceptacion_terminos\` datetime NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`version_terminos\` \`version_terminos\` varchar(50) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`publicidades\` DROP FOREIGN KEY \`FK_90627cf0bfc8b5323914ca4538a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`publicidades\` CHANGE \`id_sitio_asociado\` \`id_sitio_asociado\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`multimedia\` CHANGE \`url_contenido\` \`url_contenido\` varchar(2048) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`multimedia\` CHANGE \`texto_contenido\` \`texto_contenido\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes_negocio\` CHANGE \`soporte_url\` \`soporte_url\` varchar(2048) NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes_negocio\` CHANGE \`motivo\` \`motivo\` text NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`auditoria\` CHANGE \`id_usuario\` \`id_usuario\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`auditoria\` CHANGE \`id_entidad\` \`id_entidad\` int NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE \`auditoria\` CHANGE \`ip\` \`ip\` varchar(45) NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_9638fe3e9f2a27d8bfc4d2f2cb\` ON \`resenas\` (\`id_usuario\`, \`id_negocio\`)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_f20bc493740a6de0158da8eba9\` ON \`resenas\` (\`id_usuario\`, \`id_sitio\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`horario_negocio\` ADD CONSTRAINT \`FK_684a54b37f98c7ff703a7260c7a\` FOREIGN KEY (\`id_negocio\`) REFERENCES \`negocios\`(\`id_negocio\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` ADD CONSTRAINT \`FK_911cf70338dd65860c67ef2f41a\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporte_resena\` ADD CONSTRAINT \`FK_12847318120dcd50c7a30cc76bc\` FOREIGN KEY (\`id_resena\`) REFERENCES \`resenas\`(\`id_resena\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporte_resena\` ADD CONSTRAINT \`FK_50c836c8187bb0826f8ea532633\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_59f818e2c1a021702892576c6ee\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_f9bb3e53bc1f3004d3bf1a8a9d2\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_ac83f3434e289e1467bd685b47b\` FOREIGN KEY (\`id_negocio\`) REFERENCES \`negocios\`(\`id_negocio\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sitios_turisticos\` ADD CONSTRAINT \`FK_3f164b1bf344c80fedfc18c3d17\` FOREIGN KEY (\`id_usuario_sugiere\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`publicidades\` ADD CONSTRAINT \`FK_90627cf0bfc8b5323914ca4538a\` FOREIGN KEY (\`id_sitio_asociado\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_8308c861629dbb5bd0ab6a0dac1\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`password_reset_tokens\` ADD CONSTRAINT \`FK_5b99205809b47702beebc85b068\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes_negocio\` ADD CONSTRAINT \`FK_c14d36253567ccbdea77c193513\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`solicitudes_negocio\` DROP FOREIGN KEY \`FK_c14d36253567ccbdea77c193513\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`password_reset_tokens\` DROP FOREIGN KEY \`FK_5b99205809b47702beebc85b068\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` DROP FOREIGN KEY \`FK_8308c861629dbb5bd0ab6a0dac1\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`publicidades\` DROP FOREIGN KEY \`FK_90627cf0bfc8b5323914ca4538a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`sitios_turisticos\` DROP FOREIGN KEY \`FK_3f164b1bf344c80fedfc18c3d17\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_ac83f3434e289e1467bd685b47b\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_f9bb3e53bc1f3004d3bf1a8a9d2\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_59f818e2c1a021702892576c6ee\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporte_resena\` DROP FOREIGN KEY \`FK_50c836c8187bb0826f8ea532633\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporte_resena\` DROP FOREIGN KEY \`FK_12847318120dcd50c7a30cc76bc\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` DROP FOREIGN KEY \`FK_911cf70338dd65860c67ef2f41a\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`horario_negocio\` DROP FOREIGN KEY \`FK_684a54b37f98c7ff703a7260c7a\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_f20bc493740a6de0158da8eba9\` ON \`resenas\``,
    );
    await queryRunner.query(
      `DROP INDEX \`IDX_9638fe3e9f2a27d8bfc4d2f2cb\` ON \`resenas\``,
    );
    await queryRunner.query(
      `ALTER TABLE \`auditoria\` CHANGE \`ip\` \`ip\` varchar(45) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`auditoria\` CHANGE \`id_entidad\` \`id_entidad\` int NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`auditoria\` CHANGE \`id_usuario\` \`id_usuario\` int NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes_negocio\` CHANGE \`motivo\` \`motivo\` text NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes_negocio\` CHANGE \`soporte_url\` \`soporte_url\` varchar(2048) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`multimedia\` CHANGE \`texto_contenido\` \`texto_contenido\` text NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`multimedia\` CHANGE \`url_contenido\` \`url_contenido\` varchar(2048) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`publicidades\` CHANGE \`id_sitio_asociado\` \`id_sitio_asociado\` int NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`publicidades\` ADD CONSTRAINT \`FK_90627cf0bfc8b5323914ca4538a\` FOREIGN KEY (\`id_sitio_asociado\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`version_terminos\` \`version_terminos\` varchar(50) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`fecha_aceptacion_terminos\` \`fecha_aceptacion_terminos\` datetime NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`soporte_url\` \`soporte_url\` varchar(255) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`users\` CHANGE \`documento_identidad\` \`documento_identidad\` varchar(20) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sitios_turisticos\` CHANGE \`motivo_rechazo\` \`motivo_rechazo\` text NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sitios_turisticos\` CHANGE \`id_usuario_sugiere\` \`id_usuario_sugiere\` int NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`sitios_turisticos\` ADD CONSTRAINT \`FK_3f164b1bf344c80fedfc18c3d17\` FOREIGN KEY (\`id_usuario_sugiere\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` CHANGE \`id_negocio\` \`id_negocio\` int NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` CHANGE \`id_sitio\` \`id_sitio\` int NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` CHANGE \`id_usuario\` \`id_usuario\` int NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`IDX_f20bc493740a6de0158da8eba9\` ON \`resenas\` (\`id_usuario\`, \`id_sitio\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_f9bb3e53bc1f3004d3bf1a8a9d2\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_59f818e2c1a021702892576c6ee\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`motivo_rechazo\` \`motivo_rechazo\` text NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`logo_url\` \`logo_url\` varchar(2048) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`facebook\` \`facebook\` varchar(255) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`instagram\` \`instagram\` varchar(255) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`sitio_web\` \`sitio_web\` varchar(2048) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`direccion\` \`direccion\` varchar(500) NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`descripcion\` \`descripcion\` text NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` CHANGE \`id_sitio\` \`id_sitio\` int NULL DEFAULT 'NULL'`,
    );
    await queryRunner.query(
      `ALTER TABLE \`negocios\` ADD CONSTRAINT \`FK_911cf70338dd65860c67ef2f41a\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX \`UQ_resenas_usuario_negocio\` ON \`resenas\` (\`id_usuario\`, \`id_negocio\`)`,
    );
    await queryRunner.query(
      `ALTER TABLE \`solicitudes_negocio\` ADD CONSTRAINT \`FK_solicitudes_negocio_usuario\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`password_reset_tokens\` ADD CONSTRAINT \`FK_password_reset_tokens_user\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`refresh_tokens\` ADD CONSTRAINT \`FK_refresh_tokens_user\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_resenas_negocio\` FOREIGN KEY (\`id_negocio\`) REFERENCES \`negocios\`(\`id_negocio\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporte_resena\` ADD CONSTRAINT \`FK_reporte_resena_usuario\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`reporte_resena\` ADD CONSTRAINT \`FK_reporte_resena_resena\` FOREIGN KEY (\`id_resena\`) REFERENCES \`resenas\`(\`id_resena\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE \`horario_negocio\` ADD CONSTRAINT \`FK_horario_negocio\` FOREIGN KEY (\`id_negocio\`) REFERENCES \`negocios\`(\`id_negocio\`) ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
