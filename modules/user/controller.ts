import { type Server } from 'hyper-express';
import { type IRequest, type TRequestBody, type IResponse } from '../../common/types';
import { type IUserService } from './types';
import { EEndpoint } from '../../common/endpoints';

export class UserController {
  constructor(
    server: Server,
    private readonly service: IUserService,
  ) {
    server.post(EEndpoint.USERS, this.create);
    server.get(EEndpoint.USERS, this.getList);
    server.get(EEndpoint.USERS_ID, this.getUser);
  }

  create = async (req: IRequest, res: IResponse): Promise<void> => {
    const body: TRequestBody = await req.json();

    const user = await this.service.create(body);
    res.json(user);
  };

  getList = async (req: IRequest, res: IResponse): Promise<void> => {
    const list = await this.service.findAll(req.query);

    res.json(list);
  };

  getUser = async (req: IRequest, res: IResponse): Promise<void> => {
    const { username } = req.params;
    const user = await this.service.findOneByUsername(username);

    res.json(user);
  };
}
