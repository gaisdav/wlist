import type { IUserEntity } from '../user/types';
import { type IRequest, type IResponse, type TRequestBody } from '../../common/types';
import { type UpdateResult } from 'typeorm';

export interface IProfileEntity extends IUserEntity {}

export interface IProfileUpdateDTO
  extends Omit<Partial<IProfileEntity>, 'id' | 'googleId' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'deletedAt'> {}

export interface IProfileController {
  getProfile: (req: IRequest, res: IResponse) => Promise<void>;
  updateProfile: (req: IRequest, res: IResponse) => Promise<void>;
}

export interface IProfileRepository {
  getProfile: (id: number) => Promise<IProfileEntity | null>;
  updateProfile: (id: number, data: IProfileUpdateDTO) => Promise<UpdateResult>;
}

export interface IProfileService {
  getProfile: (id: number) => Promise<IProfileEntity>;
  updateProfile: (id: number, data: TRequestBody) => Promise<IProfileEntity>;
}
