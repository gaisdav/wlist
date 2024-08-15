import { type IWishUpdateDTO } from '../types';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateWishDTO implements IWishUpdateDTO {
  @IsString()
  @MinLength(1)
  @IsOptional()
  title: string;

  @IsOptional()
  description: string;

  @IsOptional()
  @IsUrl()
  imageSrc: string;
}
