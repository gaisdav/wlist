import type { DeleteResult, UpdateResult } from 'typeorm';
import { type IRequest, type TRequestBody } from '../../common/types';

export interface IUserEntity {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  googleId?: string;
  bio?: string;
  avatarSrc?: string;
  birthdate?: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreateDTO extends Omit<IUserEntity, 'id' | 'createdAt' | 'updatedAt'> {}

export interface IUserRepository {
  create: (createUserDto: IUserCreateDTO) => Promise<IUserEntity>;
  findAll: (search: string) => Promise<IUserEntity[]>;
  findOneByUsername: (username: string) => Promise<IUserEntity | null>;
  findOneByEmail: (email: string) => Promise<IUserEntity | null>;
  findOneById: (id: number) => Promise<IUserEntity | null>;
  update: (id: number, updateUserDto: Partial<IUserEntity>) => Promise<UpdateResult>;
  remove: (id: number) => Promise<DeleteResult>;
}

export interface IUserService {
  create: (body: TRequestBody) => Promise<IUserEntity>;
  findAll: (query?: IRequest['query']) => Promise<IUserEntity[]>;
  findOneByUsername: (username: string) => Promise<IUserEntity>;
  findOneByEmail: (email: string) => Promise<IUserEntity>;
  findOneById: (id: number) => Promise<IUserEntity>;
  update: (id: number, updateUserDto: Partial<IUserEntity>) => Promise<UpdateResult>;
  remove: (id: number) => Promise<DeleteResult>;
}
