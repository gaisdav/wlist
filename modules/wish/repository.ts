import { type Repository } from 'typeorm/repository/Repository';
import { type DeleteResult, IsNull, Not, type UpdateResult } from 'typeorm';
import { type IWishCreateDTO, type IWishEntity, type IWishRepository, type IWishUpdateDTO } from './types';
import { type IUserEntity } from '../user/types';

export class WishRepository implements IWishRepository {
  constructor(private readonly repository: Repository<IWishEntity>) {}

  async create(createWishDto: IWishCreateDTO, author: IUserEntity): Promise<IWishEntity> {
    return await this.repository.save({ ...createWishDto, author });
  }

  async findAll(): Promise<IWishEntity[]> {
    return await this.repository.find({
      relations: ['author'],
    });
  }

  async findByUsername(username: string): Promise<IWishEntity[]> {
    return await this.repository.find({
      where: { author: { username } },
      relations: ['author'],
    });
  }

  async findByUserId(id: number): Promise<IWishEntity[]> {
    return await this.repository.find({
      where: { author: { id } },
      relations: ['author'],
    });
  }

  async findOne(id: number): Promise<IWishEntity | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['author'],
    });
  }

  async findOneDeleted(id: number): Promise<IWishEntity | null> {
    return await this.repository.findOne({ where: { id, deletedAt: Not(IsNull()) }, withDeleted: true });
  }

  async update(id: number, updateWishDto: IWishUpdateDTO): Promise<UpdateResult> {
    return await this.repository.update({ id }, updateWishDto);
  }

  async remove(id: number): Promise<DeleteResult> {
    return await this.repository.softDelete(id);
  }
}
