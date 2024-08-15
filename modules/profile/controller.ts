import { type Server } from 'hyper-express';
import { EEndpoint } from '../../common/endpoints';
import { authGuard } from '../../middleware';
import { type IProfileController, type IProfileService } from './types';
import { type IRequest, type IResponse } from '../../common/types';

export class ProfileController implements IProfileController {
  constructor(
    server: Server,
    private readonly service: IProfileService,
  ) {
    server.get(EEndpoint.PROFILE, [authGuard], this.getProfile);
    server.patch(EEndpoint.PROFILE, [authGuard], this.updateProfile);
  }

  getProfile = async (req: IRequest, res: IResponse): Promise<void> => {
    const id = res.locals.userId;
    const profile = await this.service.getProfile(Number(id));

    res.json(profile);
  };

  updateProfile = async (req: IRequest, res: IResponse): Promise<void> => {
    const id = res.locals.userId;
    const body = await req.json();

    const profile = await this.service.updateProfile(Number(id), body);

    res.locals.user = profile;

    res.json(profile);
  };
}
