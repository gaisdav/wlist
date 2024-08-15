import { type IWishCreateDTO } from '../types';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateWishDTO implements IWishCreateDTO {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  description: string;

  @IsOptional()
  @IsUrl()
  imageSrc: string;
}
