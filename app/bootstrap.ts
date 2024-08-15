import { dataSource } from "./dataSource";

import { User } from "@/modules/user/entity";
import { UserRepository } from "@/modules/user/repository";
import { Wish } from "@/modules/wish/entity";
import { WishRepository } from "@/modules/wish/repository";
import { AuthRepository } from "@/modules/auth/repository";
import { ProfileRepository } from "@/modules/profile/repository";

export const bootstrap = async (): Promise<void> => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? "";

  /**
   * Initialize database connection
   */
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  /**
   * Repositories
   */
  const authRepository = new AuthRepository(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );
  const userRepository = new UserRepository(dataSource.getRepository(User));
  const wishRepository = new WishRepository(dataSource.getRepository(Wish));
  const profileRepository = new ProfileRepository(
    dataSource.getRepository(User),
  );
};
