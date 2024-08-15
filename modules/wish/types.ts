import type { DeleteResult, UpdateResult } from 'typeorm';
import { type IArchivedBaseEntity, type IRequest, type TRequestBody, type IResponse } from '../../common/types';
import type { IUserEntity } from '../user/types';

export interface IWishEntity extends IArchivedBaseEntity {
  title: string;
  imageSrc?: string;
  description?: string;
  author: IUserEntity;
}

export interface IWishCreateDTO
  extends Omit<IWishEntity, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'deletedAt' | 'author'> {}

export interface IWishUpdateDTO
  extends Omit<Partial<IWishEntity>, 'id' | 'createdAt' | 'updatedAt' | 'archivedAt' | 'deletedAt'> {}

export interface IWishController {
  create: (req: IRequest, res: IResponse) => Promise<void>;
  getList: (req: IRequest, res: IResponse) => Promise<void>;
  getWish: (req: IRequest, res: IResponse) => Promise<void>;
  getProfileList: (req: IRequest, res: IResponse) => Promise<void>;
  update: (req: IRequest, res: IResponse) => Promise<void>;
  remove: (req: IRequest, res: IResponse) => Promise<void>;
}

export interface IWishRepository {
  create: (createWishDto: IWishCreateDTO, author: IUserEntity) => Promise<IWishEntity>;
  findAll: () => Promise<IWishEntity[]>;
  findByUsername: (username: string) => Promise<IWishEntity[]>;
  findByUserId: (id: number) => Promise<IWishEntity[]>;
  findOne: (id: number) => Promise<IWishEntity | null>;
  findOneDeleted: (id: number) => Promise<IWishEntity | null>;
  update: (id: number, updateWishDto: Partial<IWishEntity>) => Promise<UpdateResult>;
  remove: (id: number) => Promise<DeleteResult>;
}

export interface IWishServiceFindOneOptions {
  withDeleted?: boolean;
}

export interface IWishService {
  create: (body: TRequestBody, authorId: number) => Promise<IWishEntity>;
  findAll: () => Promise<IWishEntity[]>;
  findByUsername: (query?: IRequest['query']) => Promise<IWishEntity[]>;
  findByUserId: (id: number) => Promise<IWishEntity[]>;
  findOne: (id: number, options?: IWishServiceFindOneOptions) => Promise<IWishEntity>;
  update: (id: number, updateWishDto: TRequestBody) => Promise<IWishEntity>;
  remove: (id: number) => Promise<void>;
}
