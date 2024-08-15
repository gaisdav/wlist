import { type Repository } from "typeorm/repository/Repository";
import { type DeleteResult, Like, type UpdateResult } from "typeorm";

import {
  type IUserCreateDTO,
  type IUserEntity,
  type IUserRepository,
} from "./types";

export class UserRepository implements IUserRepository {
  constructor(private readonly repository: Repository<IUserEntity>) {}

  async create(createUserDto: IUserCreateDTO): Promise<IUserEntity> {
    return await this.repository.save(createUserDto);
  }

  async findAll(search: string): Promise<IUserEntity[]> {
    return await this.repository.find({
      where: [
        {
          username: Like(`%${search}%`),
        },
        {
          firstName: Like(`%${search}%`),
        },
        {
          lastName: Like(`%${search}%`),
        },
      ],
    });
  }

  async findOneByUsername(username: string): Promise<IUserEntity | null> {
    return await this.repository.findOneBy({ username });
  }

  async findOneByEmail(email: string): Promise<IUserEntity | null> {
    return await this.repository.findOneBy({ email });
  }

  async findOneById(id: number): Promise<IUserEntity | null> {
    return await this.repository.findOneBy({ id });
  }

  async update(
    id: number,
    updateUserDto: Partial<IUserEntity>,
  ): Promise<UpdateResult> {
    return await this.repository.update({ id }, updateUserDto);
  }

  async remove(id: number): Promise<DeleteResult> {
    return await this.repository.delete(id);
  }
}
