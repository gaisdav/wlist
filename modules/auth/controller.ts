import { type Server } from 'hyper-express';
import { type IAuthController, type IAuthServices } from './types';
import { type IRequest, type IResponse } from '../../common/types';
import { EEndpoint } from '../../common/endpoints';
import { generateTokens, restoreTokens } from '../../middleware';

export class AuthController implements IAuthController {
  constructor(
    server: Server,
    private readonly authService: IAuthServices,
  ) {
    server.get(EEndpoint.GOOGLE_CALLBACK, this.authGoogleCallback);
    server.get(EEndpoint.REFRESH_TOKEN, this.refreshToken);
  }

  authGoogleCallback = async (req: IRequest, res: IResponse): Promise<void> => {
    console.log('authGoogleCallback');
    const accessTokenKey = process.env.JWT_ACCESS_KEY;
    const refreshTokenKey = process.env.JWT_REFRESH_KEY;

    if (!accessTokenKey || !refreshTokenKey) {
      throw new Error('Access token or refresh token key is not provided');
    }

    const { code } = req.query;

    const { access_token: googleAccessToken, token_type: tokenType } = await this.authService.getGoogleTokens(code);

    const user = await this.authService.getGoogleUser(tokenType, googleAccessToken);

    console.log(user);

    const { accessToken, refreshToken } = generateTokens(user.id);

    res.cookie(accessTokenKey, accessToken);
    res.cookie(refreshTokenKey, refreshToken);
    res.redirect(process.env.ORIGIN ?? '');
  };

  refreshToken = async (req: IRequest, res: IResponse): Promise<void> => {
    const refreshTokenKey = process.env.JWT_REFRESH_KEY;
    const accessTokenKey = process.env.JWT_ACCESS_KEY;

    if (!refreshTokenKey) {
      throw new Error('Refresh token key is not provided in environment variables');
    }

    if (!accessTokenKey) {
      throw new Error('Access token key is not provided in environment variables');
    }

    const refreshToken = req.cookies[refreshTokenKey];

    if (!refreshToken) {
      throw new Error('Refresh token is not provided in cookies');
    }

    const { accessToken, refreshToken: newRefreshToken } = await restoreTokens(refreshToken);

    res.cookie(refreshTokenKey, newRefreshToken);
    res.cookie(accessTokenKey, accessToken);
    res.status(200);
  };
}
