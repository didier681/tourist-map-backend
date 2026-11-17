import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, Matches } from 'class-validator';
import {
  PASSWORD_PATTERN,
  PASSWORD_POLICY_MESSAGE,
} from '../../common/password-policy';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  passwordActual: string;

  @ApiProperty({ minLength: 10, maxLength: 72 })
  @IsString()
  @MinLength(10, { message: PASSWORD_POLICY_MESSAGE })
  @MaxLength(72, { message: PASSWORD_POLICY_MESSAGE })
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_POLICY_MESSAGE })
  nuevaPassword: string;
}
