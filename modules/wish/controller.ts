import { type Server } from 'hyper-express';
import { type IRequest, type TRequestBody, type IResponse } from '../../common/types';
import { type IWishController, type IWishService } from './types';
import { EEndpoint } from '../../common/endpoints';
import { authGuard } from '../../middleware';

export class WishController implements IWishController {
  constructor(
    server: Server,
    private readonly service: IWishService,
  ) {
    server.get(EEndpoint.WISHES, [authGuard], this.getList);
    server.get(EEndpoint.WISHES_PROFILE, [authGuard], this.getProfileList);
    server.get(EEndpoint.WISHES_ID, this.getWish);
    server.post(EEndpoint.WISHES, [authGuard], this.create);
    server.patch(EEndpoint.WISHES_ID, this.update);
    server.delete(EEndpoint.WISHES_ID, this.remove);
  }

  create = async (req: IRequest, res: IResponse): Promise<void> => {
    const body: TRequestBody = await req.json();
    const authorId: number = res.locals.userId;

    const wish = await this.service.create(body, authorId);
    res.json(wish);
  };

  getList = async (req: IRequest, res: IResponse): Promise<void> => {
    const query = req.query;

    const list = await this.service.findByUsername(query);
    res.json(list);
  };

  getWish = async (req: IRequest, res: IResponse): Promise<void> => {
    const { id } = req.params;

    const wish = await this.service.findOne(Number(id));
    res.json(wish);
  };

  getProfileList = async (_: IRequest, res: IResponse): Promise<void> => {
    const profileId: number = res.locals.userId;

    const list = await this.service.findByUserId(profileId);
    res.json(list);
  };

  update = async (req: IRequest, res: IResponse): Promise<void> => {
    const { id } = req.params;
    const body = await req.json();

    const wish = await this.service.update(Number(id), body);
    res.json(wish);
  };

  remove = async (req: IRequest, res: IResponse): Promise<void> => {
    const { id } = req.params;

    await this.service.remove(Number(id));
    res.json({});
  };
}
