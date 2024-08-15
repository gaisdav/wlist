import { DataSource } from "typeorm";

import { User } from "./entity";
// import { Wish } from './modules/wish/entity';

export const isDev = process.env.NODE_ENV === "development";

export const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User],
  logging: true,
  synchronize: true,
  ssl: !isDev,
  subscribers: [],
  migrations: [],
});
