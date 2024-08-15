import { type Repository } from 'typeorm/repository/Repository';
import { type IProfileEntity, type IProfileRepository, type IProfileUpdateDTO } from './types';
import { type UpdateResult } from 'typeorm';

export class ProfileRepository implements IProfileRepository {
  constructor(private readonly repository: Repository<IProfileEntity>) {}

  getProfile = async (id: number): Promise<IProfileEntity | null> => {
    return await this.repository.findOneBy({ id });
  };

  updateProfile = async (id: number, data: IProfileUpdateDTO): Promise<UpdateResult> => {
    return await this.repository.update(id, data);
  };
}
