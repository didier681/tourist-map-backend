import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '../../user/dto/create-user.dto';

// El registro público no permite asignar roles ni datos de identidad documental.
// Hereda la política de contraseña para impedir claves débiles desde el registro.
export class RegisterDto extends OmitType(
  CreateUserDto,
  ['role', 'documentoIdentidad', 'soporteUrl'] as const,
) {}
