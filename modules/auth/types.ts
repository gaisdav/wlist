import { type IRequest, type IResponse } from '../../common/types';
import { type IUserCreateDTO, type IUserEntity } from '../user/types';
import { type ParsedQs } from 'hyper-express';
import { type AxiosResponse } from 'axios';

export interface IAuthController {
  authGoogleCallback: (req: IRequest, res: IResponse) => Promise<void>;
  refreshToken: (req: IRequest, res: IResponse) => Promise<void>;
}

export interface IGoogleTokenInfo {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token: string;
}

export interface IGoogleUserinfo {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
}

export interface ITokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthServices {
  createUserByGoogle: (user: IUserCreateDTO) => Promise<IUserEntity>;

  getGoogleTokens: (code: ParsedQs['code']) => Promise<IGoogleTokenInfo>;
  getGoogleUser: (tokenType: string, token: string) => Promise<IUserEntity>;
}

export interface IAuthRepository {
  getGoogleTokens: (code: ParsedQs['code']) => Promise<AxiosResponse<IGoogleTokenInfo>>;
  getGoogleUserInfo: (tokenType: string, token: string) => Promise<AxiosResponse<IGoogleUserinfo>>;
}
