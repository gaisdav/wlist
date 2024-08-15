import { type IAuthRepository, type IAuthServices, type IGoogleTokenInfo } from './types';
import { type IUserCreateDTO, type IUserEntity, type IUserService } from '../user/types';
import { type ParsedQs } from 'hyper-express';
import { ForbiddenException } from '../../exceptions/ForbiddenException';
import { NotFoundException } from '../../exceptions/NotFoundException';

export class AuthService implements IAuthServices {
  constructor(
    private readonly userService: IUserService,
    private readonly authRepository: IAuthRepository,
  ) {}

  async createUserByGoogle(user: IUserCreateDTO): Promise<IUserEntity> {
    return await this.userService.create(user);
  }

  getGoogleTokens = async (code: ParsedQs['code']): Promise<IGoogleTokenInfo> => {
    const { data } = await this.authRepository.getGoogleTokens(code);

    return data;
  };

  getGoogleUser = async (tokenType: string, token: string): Promise<IUserEntity> => {
    const { data: userinfo } = await this.authRepository.getGoogleUserInfo(tokenType, token);

    if (!userinfo.email_verified) {
      throw new ForbiddenException('Google account is not verified');
    }

    let user: IUserEntity | null = null;
    try {
      user = await this.userService.findOneByEmail(userinfo.email);
    } catch (err) {
      if (err instanceof NotFoundException) {
        if (!user) {
          const createUserParams: IUserCreateDTO = {
            googleId: userinfo.sub,
            username: userinfo.email,
            email: userinfo.email,
            firstName: userinfo.given_name,
            lastName: userinfo.family_name,
            avatarSrc: userinfo.picture,
          };

          user = await this.userService.create(createUserParams);
        }
      } else {
        throw err;
      }
    }

    return user;
  };
}
