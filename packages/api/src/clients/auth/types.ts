export interface AuthSession {
  userId: string;
  /** Unix seconds. `null` if the backend doesn't expose expiry. */
  expiresAt: number | null;
}

export interface SignInWithTelegramResult {
  session: AuthSession;
  /**
   * `true` only on the very first call for this user. UI can show a welcome
   * screen / nudge to fill out the profile.
   */
  isNewUser: boolean;
}

export interface AuthApi {
  signInWithTelegram(initData: string): Promise<SignInWithTelegramResult>;
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(callback: (session: AuthSession | null) => void): {
    unsubscribe(): void;
  };
  signOut(): Promise<void>;
}
