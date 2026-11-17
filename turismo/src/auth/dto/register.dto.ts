import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '../../user/dto/create-user.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsBoolean } from 'class-validator';

// El registro público no permite asignar roles ni datos de identidad documental.
// Hereda la política de contraseña para impedir claves débiles desde el registro.
export class RegisterDto extends OmitType(
  CreateUserDto,
  ['role', 'documentoIdentidad', 'soporteUrl'] as const,
) {
  @ApiProperty({
    description: 'Consentimiento obligatorio para el tratamiento de datos.',
    example: true,
  })
  @IsBoolean()
  @Equals(true, { message: 'Debes aceptar los términos y condiciones' })
  aceptaTerminos: true;
}
