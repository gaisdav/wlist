import { type IUserCreateDTO } from '../types';
import { IsOptional, IsString, IsEmail, IsDateString, IsUrl, MinLength } from 'class-validator';

export class CreateUserDTO implements IUserCreateDTO {
  @IsString()
  @MinLength(1)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  firstName: string;

  @MinLength(1)
  @IsString()
  lastName: string;

  @IsDateString()
  @IsOptional()
  birthdate?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  @IsUrl()
  avatarSrc?: string;

  @IsString()
  @IsOptional()
  googleId?: string;
}
