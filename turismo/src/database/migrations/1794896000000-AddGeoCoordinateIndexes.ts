import { MigrationInterface, QueryRunner } from 'typeorm';

// Acelera el prefiltrado por cajas geográficas sin sustituir el cálculo preciso de distancia.
export class AddGeoCoordinateIndexes1794896000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX `IDX_sitios_turisticos_latitud` ON `sitios_turisticos` (`latitud`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_sitios_turisticos_longitud` ON `sitios_turisticos` (`longitud`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_negocios_latitud` ON `negocios` (`latitud`)',
    );
    await queryRunner.query(
      'CREATE INDEX `IDX_negocios_longitud` ON `negocios` (`longitud`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX `IDX_negocios_longitud` ON `negocios`',
    );
    await queryRunner.query('DROP INDEX `IDX_negocios_latitud` ON `negocios`');
    await queryRunner.query(
      'DROP INDEX `IDX_sitios_turisticos_longitud` ON `sitios_turisticos`',
    );
    await queryRunner.query(
      'DROP INDEX `IDX_sitios_turisticos_latitud` ON `sitios_turisticos`',
    );
  }
}
