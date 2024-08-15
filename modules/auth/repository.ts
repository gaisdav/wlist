import { type IAuthRepository, type IGoogleTokenInfo, type IGoogleUserinfo } from './types';
import { type ParsedQs } from 'hyper-express';
import axios, { type AxiosResponse } from 'axios';

export class AuthRepository implements IAuthRepository {
  constructor(
    private readonly CLIENT_ID: string,
    private readonly CLIENT_SECRET: string,
    private readonly REDIRECT_URI: string,
  ) {}

  getGoogleTokens = async (code: ParsedQs['code']): Promise<AxiosResponse<IGoogleTokenInfo>> => {
    return await axios.post<IGoogleTokenInfo>('https://oauth2.googleapis.com/token', {
      client_id: this.CLIENT_ID,
      client_secret: this.CLIENT_SECRET,
      code,
      redirect_uri: this.REDIRECT_URI,
      grant_type: 'authorization_code',
    });
  };

  getGoogleUserInfo = async (tokenType: string, token: string): Promise<AxiosResponse<IGoogleUserinfo>> => {
    return await axios.get<IGoogleUserinfo>('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `${tokenType} ${token}`,
      },
    });
  };
}
