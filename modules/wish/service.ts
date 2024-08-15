import { type IWishEntity, type IWishRepository, type IWishService } from './types';
import { plainToInstance } from 'class-transformer';
import { CreateWishDTO } from './dto/create';
import { type IRequest, type TRequestBody } from '../../common/types';
import { AbstractService } from '../../AbstractService';
import { UpdateWishDTO } from './dto/update';
import { NotFoundException } from '../../exceptions/NotFoundException';
import { type IUserService } from '../user/types';
import { ValidationException } from '../../exceptions/ValidationException';
import { isString } from 'class-validator';

export class WishService extends AbstractService implements IWishService {
  constructor(
    private readonly wishRepository: IWishRepository,
    private readonly userService: IUserService,
  ) {
    super();
  }

  async create(body: TRequestBody, authorId: number): Promise<IWishEntity> {
    const wishDTO = plainToInstance(CreateWishDTO, body);
    const authorEntity = await this.userService.findOneById(authorId);

    await this.validate(wishDTO);

    return await this.wishRepository.create(wishDTO, authorEntity);
  }

  async findAll(): Promise<IWishEntity[]> {
    return await this.wishRepository.findAll();
  }

  async findByUsername(query?: IRequest['query']): Promise<IWishEntity[]> {
    const username = query?.username;

    if (!isString(username)) {
      throw new ValidationException('Username query should be a string');
    }
    return await this.wishRepository.findByUsername(username);
  }

  async findByUserId(id: number): Promise<IWishEntity[]> {
    return await this.wishRepository.findByUserId(id);
  }

  async findOne(id: number): Promise<IWishEntity> {
    const wish = await this.wishRepository.findOne(id);

    if (!wish) {
      throw new NotFoundException('Wish not found');
    }

    return wish;
  }

  async update(id: number, body: TRequestBody): Promise<IWishEntity> {
    const wishDTO = plainToInstance(UpdateWishDTO, body);
    await this.validate(wishDTO);

    const updateResult = await this.wishRepository.update(id, wishDTO);
    if (updateResult.affected === 0) {
      throw new NotFoundException('Wish not found');
    }

    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const deleteResult = await this.wishRepository.remove(id);

    if (deleteResult.affected === 0) {
      throw new NotFoundException('Wish not found');
    }
  }
}
