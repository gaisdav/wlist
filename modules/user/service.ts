import { type DeleteResult, type UpdateResult } from 'typeorm';
import { type IUserEntity, type IUserRepository, type IUserService } from './types';
import { plainToInstance } from 'class-transformer';
import { CreateUserDTO } from './dto/create';
import { isString, validate } from 'class-validator';
import { type IRequest, type TRequestBody } from '../../common/types';
import { ValidationException } from '../../exceptions/ValidationException';
import { NotFoundException } from '../../exceptions/NotFoundException';

export class UserService implements IUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async create(body: TRequestBody): Promise<IUserEntity> {
    const userDTO = plainToInstance(CreateUserDTO, body);
    const errors = await validate(userDTO);

    if (errors.length > 0) {
      throw new ValidationException('Validation failed', errors);
    }

    return await this.userRepository.create(userDTO);
  }

  async findAll(query?: IRequest['query']): Promise<IUserEntity[]> {
    const search = query?.search;

    if (!isString(search)) {
      throw new ValidationException('Search query should be a string');
    }

    return await this.userRepository.findAll(search);
  }

  async findOneByUsername(username: string): Promise<IUserEntity> {
    const user = await this.userRepository.findOneByUsername(username);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOneByEmail(email: string): Promise<IUserEntity> {
    const user = await this.userRepository.findOneByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findOneById(id: number): Promise<IUserEntity> {
    const user = await this.userRepository.findOneById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: number, updateUserDto: Partial<IUserEntity>): Promise<UpdateResult> {
    return await this.userRepository.update(id, updateUserDto);
  }

  async remove(id: number): Promise<DeleteResult> {
    return await this.userRepository.remove(id);
  }
}
