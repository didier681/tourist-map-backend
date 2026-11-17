import { MigrationInterface, QueryRunner } from "typeorm";

// Crea el esquema inicial completo para que los entornos nuevos no dependan de synchronize.
export class InitialSchema1794895700363 implements MigrationInterface {
    name = 'InitialSchema1794895700363'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`categorias_sitio\` (\`id_categoria\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`icono\` varchar(255) NOT NULL, PRIMARY KEY (\`id_categoria\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sitio_categoria\` (\`id_sitio\` int NOT NULL, \`id_categoria\` int NOT NULL, PRIMARY KEY (\`id_sitio\`, \`id_categoria\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`gestor_zona\` (\`id_usuario\` int NOT NULL, \`id_zona\` int NOT NULL, PRIMARY KEY (\`id_usuario\`, \`id_zona\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`zonas\` (\`id_zona\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, \`tipo\` enum ('pais', 'depto', 'ciudad', 'barrio') NOT NULL, \`latitud\` decimal(10,7) NOT NULL, \`longitud\` decimal(10,7) NOT NULL, \`radio_cobertura_m\` int NOT NULL, PRIMARY KEY (\`id_zona\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`favoritos\` (\`id_usuario\` int NOT NULL, \`id_sitio\` int NOT NULL, \`fecha\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id_usuario\`, \`id_sitio\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`resenas\` (\`id_resena\` int NOT NULL AUTO_INCREMENT, \`id_usuario\` int NOT NULL, \`id_sitio\` int NOT NULL, \`calificacion\` int NOT NULL, \`comentario\` text NOT NULL, UNIQUE INDEX \`IDX_f20bc493740a6de0158da8eba9\` (\`id_usuario\`, \`id_sitio\`), PRIMARY KEY (\`id_resena\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`confirmaciones_sitio\` (\`id_usuario\` int NOT NULL, \`id_sitio\` int NOT NULL, PRIMARY KEY (\`id_usuario\`, \`id_sitio\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`sitios_turisticos\` (\`id_sitio\` int NOT NULL AUTO_INCREMENT, \`id_zona\` int NOT NULL, \`nombre\` varchar(255) NOT NULL, \`descripcion\` text NOT NULL, \`latitud\` decimal(10,7) NOT NULL, \`longitud\` decimal(10,7) NOT NULL, \`horario_apertura\` time NOT NULL, \`horario_cierre\` time NOT NULL, \`estado\` enum ('activo', 'inactivo') NOT NULL DEFAULT 'activo', \`estado_revision\` enum ('pendiente', 'aprobado', 'rechazado') NOT NULL DEFAULT 'aprobado', \`id_usuario_sugiere\` int NULL, \`motivo_rechazo\` text NULL, \`confirmaciones\` int NOT NULL DEFAULT '0', \`fecha_creacion\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id_sitio\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`visitas\` (\`id_visita\` int NOT NULL AUTO_INCREMENT, \`id_usuario\` int NOT NULL, \`id_zona\` int NOT NULL, \`id_sitio\` int NOT NULL, \`latitud\` decimal(10,7) NOT NULL, \`longitud\` decimal(10,7) NOT NULL, \`fecha_hora\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (\`id_visita\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`categorias_negocio\` (\`id_categoria_neg\` int NOT NULL AUTO_INCREMENT, \`nombre\` varchar(255) NOT NULL, PRIMARY KEY (\`id_categoria_neg\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`negocio_categoria\` (\`id_negocio\` int NOT NULL, \`id_categoria_neg\` int NOT NULL, PRIMARY KEY (\`id_negocio\`, \`id_categoria_neg\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tarifas\` (\`id_tarifa\` int NOT NULL AUTO_INCREMENT, \`id_servicio\` int NOT NULL, \`nombre_tarifa\` varchar(255) NOT NULL, \`precio\` decimal(10,2) NOT NULL, \`moneda\` varchar(3) NOT NULL DEFAULT 'COP', \`unidad\` enum ('persona', 'hora', 'paquete') NOT NULL, \`vigencia_ini\` date NOT NULL, \`vigencia_fin\` date NOT NULL, PRIMARY KEY (\`id_tarifa\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`servicios\` (\`id_servicio\` int NOT NULL AUTO_INCREMENT, \`id_negocio\` int NOT NULL, \`nombre\` varchar(255) NOT NULL, \`descripcion\` text NOT NULL, \`disponibilidad\` varchar(255) NOT NULL, PRIMARY KEY (\`id_servicio\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`negocios\` (\`id_negocio\` int NOT NULL AUTO_INCREMENT, \`id_usuario\` int NOT NULL, \`id_zona\` int NOT NULL, \`id_sitio\` int NULL, \`nombre_comercial\` varchar(255) NOT NULL, \`nit_documento\` varchar(50) NOT NULL, \`latitud\` decimal(10,7) NOT NULL, \`longitud\` decimal(10,7) NOT NULL, \`telefono\` varchar(30) NOT NULL, \`email\` varchar(255) NOT NULL, \`estado_membresia\` enum ('gratis', 'basico', 'premium') NOT NULL DEFAULT 'gratis', UNIQUE INDEX \`IDX_f1d4fc020a6f116cbcb2c464e8\` (\`nit_documento\`), PRIMARY KEY (\`id_negocio\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id_usuario\` int NOT NULL AUTO_INCREMENT, \`email\` varchar(255) NOT NULL, \`documento_identidad\` varchar(20) NULL, \`soporte_url\` varchar(255) NULL, \`password_hash\` varchar(255) NOT NULL, \`nombre\` varchar(255) NOT NULL, \`idioma_pref\` varchar(10) NOT NULL DEFAULT 'es', \`fecha_registro\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`is_active\` tinyint NOT NULL DEFAULT 1, \`rol\` enum ('admin', 'usuario', 'negocio', 'gestor') NOT NULL DEFAULT 'usuario', UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), UNIQUE INDEX \`IDX_16947d83c18bf94700be826270\` (\`documento_identidad\`), PRIMARY KEY (\`id_usuario\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`publicidades\` (\`id_publicidad\` int NOT NULL AUTO_INCREMENT, \`id_negocio\` int NOT NULL, \`id_sitio_asociado\` int NULL, \`tipo_plan\` enum ('basico', 'premium', 'destacado') NOT NULL, \`presupuesto\` decimal(10,2) NOT NULL, \`fecha_ini\` date NOT NULL, \`fecha_fin\` date NOT NULL, \`estado\` enum ('activo', 'pausado', 'vencido') NOT NULL DEFAULT 'activo', PRIMARY KEY (\`id_publicidad\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`multimedia\` (\`id_multimedia\` int NOT NULL AUTO_INCREMENT, \`tipo_entidad\` enum ('sitio', 'negocio') NOT NULL, \`id_entidad\` int NOT NULL, \`tipo_contenido\` enum ('texto', 'imagen', 'video') NOT NULL, \`url_contenido\` varchar(2048) NULL, \`texto_contenido\` text NULL, \`orden\` int NOT NULL, PRIMARY KEY (\`id_multimedia\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`sitio_categoria\` ADD CONSTRAINT \`FK_e7574d3e29e14fb74864a40bdfa\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sitio_categoria\` ADD CONSTRAINT \`FK_e376c863ce1907d18ffc10d99e6\` FOREIGN KEY (\`id_categoria\`) REFERENCES \`categorias_sitio\`(\`id_categoria\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`gestor_zona\` ADD CONSTRAINT \`FK_0351834bad745600e4e6dcf93fb\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`gestor_zona\` ADD CONSTRAINT \`FK_ad4cd31dd16d2c68ca39f3e166e\` FOREIGN KEY (\`id_zona\`) REFERENCES \`zonas\`(\`id_zona\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`favoritos\` ADD CONSTRAINT \`FK_650ec9435c315478e12c82cd96d\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`favoritos\` ADD CONSTRAINT \`FK_d990f28a936dc20fefc0cbc6883\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_59f818e2c1a021702892576c6ee\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`resenas\` ADD CONSTRAINT \`FK_f9bb3e53bc1f3004d3bf1a8a9d2\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`confirmaciones_sitio\` ADD CONSTRAINT \`FK_f95e3861af3732e769fcf287738\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`confirmaciones_sitio\` ADD CONSTRAINT \`FK_49e937c383b4a12ecb104e48b30\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sitios_turisticos\` ADD CONSTRAINT \`FK_b89c245711715baca46c8a83a74\` FOREIGN KEY (\`id_zona\`) REFERENCES \`zonas\`(\`id_zona\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`sitios_turisticos\` ADD CONSTRAINT \`FK_3f164b1bf344c80fedfc18c3d17\` FOREIGN KEY (\`id_usuario_sugiere\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`visitas\` ADD CONSTRAINT \`FK_70692c561890bc8bc1fe48806c7\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`visitas\` ADD CONSTRAINT \`FK_0a8eae9e9fda7ddebd9b2df8d58\` FOREIGN KEY (\`id_zona\`) REFERENCES \`zonas\`(\`id_zona\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`visitas\` ADD CONSTRAINT \`FK_2c31d5d460fbfcdc658d0ff54d9\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`negocio_categoria\` ADD CONSTRAINT \`FK_dd1b1032b78b65c0c586ecef830\` FOREIGN KEY (\`id_negocio\`) REFERENCES \`negocios\`(\`id_negocio\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`negocio_categoria\` ADD CONSTRAINT \`FK_5f8c6773b8dbd1a8e50973bf47d\` FOREIGN KEY (\`id_categoria_neg\`) REFERENCES \`categorias_negocio\`(\`id_categoria_neg\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`tarifas\` ADD CONSTRAINT \`FK_dce49943d86dd11e3273ac808bd\` FOREIGN KEY (\`id_servicio\`) REFERENCES \`servicios\`(\`id_servicio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`servicios\` ADD CONSTRAINT \`FK_65460f69f8ff62c5c87b3a16d49\` FOREIGN KEY (\`id_negocio\`) REFERENCES \`negocios\`(\`id_negocio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`negocios\` ADD CONSTRAINT \`FK_c8d6b17c830585190362b3505dc\` FOREIGN KEY (\`id_usuario\`) REFERENCES \`users\`(\`id_usuario\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`negocios\` ADD CONSTRAINT \`FK_5fc6615e9a99f9e3717acc759c2\` FOREIGN KEY (\`id_zona\`) REFERENCES \`zonas\`(\`id_zona\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`negocios\` ADD CONSTRAINT \`FK_911cf70338dd65860c67ef2f41a\` FOREIGN KEY (\`id_sitio\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`publicidades\` ADD CONSTRAINT \`FK_fd93cd0d8ee591d207f776e8a8f\` FOREIGN KEY (\`id_negocio\`) REFERENCES \`negocios\`(\`id_negocio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`publicidades\` ADD CONSTRAINT \`FK_90627cf0bfc8b5323914ca4538a\` FOREIGN KEY (\`id_sitio_asociado\`) REFERENCES \`sitios_turisticos\`(\`id_sitio\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`publicidades\` DROP FOREIGN KEY \`FK_90627cf0bfc8b5323914ca4538a\``);
        await queryRunner.query(`ALTER TABLE \`publicidades\` DROP FOREIGN KEY \`FK_fd93cd0d8ee591d207f776e8a8f\``);
        await queryRunner.query(`ALTER TABLE \`negocios\` DROP FOREIGN KEY \`FK_911cf70338dd65860c67ef2f41a\``);
        await queryRunner.query(`ALTER TABLE \`negocios\` DROP FOREIGN KEY \`FK_5fc6615e9a99f9e3717acc759c2\``);
        await queryRunner.query(`ALTER TABLE \`negocios\` DROP FOREIGN KEY \`FK_c8d6b17c830585190362b3505dc\``);
        await queryRunner.query(`ALTER TABLE \`servicios\` DROP FOREIGN KEY \`FK_65460f69f8ff62c5c87b3a16d49\``);
        await queryRunner.query(`ALTER TABLE \`tarifas\` DROP FOREIGN KEY \`FK_dce49943d86dd11e3273ac808bd\``);
        await queryRunner.query(`ALTER TABLE \`negocio_categoria\` DROP FOREIGN KEY \`FK_5f8c6773b8dbd1a8e50973bf47d\``);
        await queryRunner.query(`ALTER TABLE \`negocio_categoria\` DROP FOREIGN KEY \`FK_dd1b1032b78b65c0c586ecef830\``);
        await queryRunner.query(`ALTER TABLE \`visitas\` DROP FOREIGN KEY \`FK_2c31d5d460fbfcdc658d0ff54d9\``);
        await queryRunner.query(`ALTER TABLE \`visitas\` DROP FOREIGN KEY \`FK_0a8eae9e9fda7ddebd9b2df8d58\``);
        await queryRunner.query(`ALTER TABLE \`visitas\` DROP FOREIGN KEY \`FK_70692c561890bc8bc1fe48806c7\``);
        await queryRunner.query(`ALTER TABLE \`sitios_turisticos\` DROP FOREIGN KEY \`FK_3f164b1bf344c80fedfc18c3d17\``);
        await queryRunner.query(`ALTER TABLE \`sitios_turisticos\` DROP FOREIGN KEY \`FK_b89c245711715baca46c8a83a74\``);
        await queryRunner.query(`ALTER TABLE \`confirmaciones_sitio\` DROP FOREIGN KEY \`FK_49e937c383b4a12ecb104e48b30\``);
        await queryRunner.query(`ALTER TABLE \`confirmaciones_sitio\` DROP FOREIGN KEY \`FK_f95e3861af3732e769fcf287738\``);
        await queryRunner.query(`ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_f9bb3e53bc1f3004d3bf1a8a9d2\``);
        await queryRunner.query(`ALTER TABLE \`resenas\` DROP FOREIGN KEY \`FK_59f818e2c1a021702892576c6ee\``);
        await queryRunner.query(`ALTER TABLE \`favoritos\` DROP FOREIGN KEY \`FK_d990f28a936dc20fefc0cbc6883\``);
        await queryRunner.query(`ALTER TABLE \`favoritos\` DROP FOREIGN KEY \`FK_650ec9435c315478e12c82cd96d\``);
        await queryRunner.query(`ALTER TABLE \`gestor_zona\` DROP FOREIGN KEY \`FK_ad4cd31dd16d2c68ca39f3e166e\``);
        await queryRunner.query(`ALTER TABLE \`gestor_zona\` DROP FOREIGN KEY \`FK_0351834bad745600e4e6dcf93fb\``);
        await queryRunner.query(`ALTER TABLE \`sitio_categoria\` DROP FOREIGN KEY \`FK_e376c863ce1907d18ffc10d99e6\``);
        await queryRunner.query(`ALTER TABLE \`sitio_categoria\` DROP FOREIGN KEY \`FK_e7574d3e29e14fb74864a40bdfa\``);
        await queryRunner.query(`DROP TABLE \`multimedia\``);
        await queryRunner.query(`DROP TABLE \`publicidades\``);
        await queryRunner.query(`DROP INDEX \`IDX_16947d83c18bf94700be826270\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_f1d4fc020a6f116cbcb2c464e8\` ON \`negocios\``);
        await queryRunner.query(`DROP TABLE \`negocios\``);
        await queryRunner.query(`DROP TABLE \`servicios\``);
        await queryRunner.query(`DROP TABLE \`tarifas\``);
        await queryRunner.query(`DROP TABLE \`negocio_categoria\``);
        await queryRunner.query(`DROP TABLE \`categorias_negocio\``);
        await queryRunner.query(`DROP TABLE \`visitas\``);
        await queryRunner.query(`DROP TABLE \`sitios_turisticos\``);
        await queryRunner.query(`DROP TABLE \`confirmaciones_sitio\``);
        await queryRunner.query(`DROP INDEX \`IDX_f20bc493740a6de0158da8eba9\` ON \`resenas\``);
        await queryRunner.query(`DROP TABLE \`resenas\``);
        await queryRunner.query(`DROP TABLE \`favoritos\``);
        await queryRunner.query(`DROP TABLE \`zonas\``);
        await queryRunner.query(`DROP TABLE \`gestor_zona\``);
        await queryRunner.query(`DROP TABLE \`sitio_categoria\``);
        await queryRunner.query(`DROP TABLE \`categorias_sitio\``);
    }

}
