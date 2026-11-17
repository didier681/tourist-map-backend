import { BadRequestException } from '@nestjs/common';

export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
export const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 10 caracteres, una mayúscula, una minúscula y un número';

// Repite la regla en la capa de servicio para proteger también los usos internos sin DTO.
export function assertPasswordPolicy(password: string): void {
  if (
    password.length < 10 ||
    password.length > 72 ||
    !PASSWORD_PATTERN.test(password)
  ) {
    throw new BadRequestException(PASSWORD_POLICY_MESSAGE);
  }
}
