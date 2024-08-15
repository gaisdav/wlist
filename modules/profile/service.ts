import { type IProfileEntity, type IProfileRepository, type IProfileService } from './types';
import { AbstractService } from '../../AbstractService';
import { type TRequestBody } from '../../common/types';
import { UpdateProfileDTO } from './dto/update';
import { plainToInstance } from 'class-transformer';
import { NotFoundException } from '../../exceptions/NotFoundException';
import { UnauthorizedException } from '../../exceptions/UnauthorizedException';
import { IUserService } from '../user/types';
import { ForbiddenException } from '../../exceptions/ForbiddenException';

export class ProfileService extends AbstractService implements IProfileService {
  constructor(
    private readonly profileRepository: IProfileRepository,
    private readonly userService: IUserService,
  ) {
    super();
  }

  async getProfile(id: number): Promise<IProfileEntity> {
    const profile = await this.profileRepository.getProfile(id);

    if (!profile) {
      throw new UnauthorizedException(`Profile with id ${id} not found`);
    }

    return profile;
  }

  async updateProfile(id: number, data: TRequestBody): Promise<IProfileEntity> {
    const profileDTO = plainToInstance(UpdateProfileDTO, data);
    await this.validate(profileDTO);

    const user = await this.userService.findOneByUsername(profileDTO.username);

    if (user && user.id !== id) {
      throw new ForbiddenException('Username already exists');
    }
    const result = await this.profileRepository.updateProfile(id, profileDTO);
    if (!result.affected) {
      throw new NotFoundException('Profile not found');
    }

    return await this.getProfile(id);
  }
}
