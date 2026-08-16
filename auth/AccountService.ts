import { SecureStorage } from '../security/SecureStorage';
import { Encryption } from '../security/Encryption';
import { PasswordService } from './PasswordService';
import { SessionService } from './SessionService';
import { UserAccount, CreateAccountInput, AuthCredentials, SessionState } from './AccountModel';

export class AccountService {
  private static readonly ACCOUNTS_KEY = 'user_accounts_v4';

  /**
   * Loads all locally registered accounts
   */
  private static async loadAccounts(): Promise<UserAccount[]> {
    try {
      const raw = await SecureStorage.getItem(this.ACCOUNTS_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('[AccountService] Error loading accounts:', e);
      return [];
    }
  }

  /**
   * Saves accounts list to secure storage
   */
  private static async saveAccounts(accounts: UserAccount[]): Promise<void> {
    await SecureStorage.setItem(this.ACCOUNTS_KEY, JSON.stringify(accounts));
  }

  /**
   * Checks if any account is registered on this local device
   */
  public static async hasRegisteredAccount(): Promise<boolean> {
    const accounts = await this.loadAccounts();
    return accounts.length > 0;
  }

  /**
   * Registers a new local Taskora account completely offline
   */
  public static async register(input: CreateAccountInput): Promise<{ account: UserAccount; session: SessionState }> {
    const trimmedUsername = input.username.trim().toLowerCase();
    const trimmedEmail = input.email.trim().toLowerCase();
    const trimmedDisplayName = input.displayName.trim();

    if (!trimmedDisplayName) {
      throw new Error('Please provide your name.');
    }
    if (!trimmedUsername && !trimmedEmail) {
      throw new Error('Please provide a username or email.');
    }
    if (!input.password || input.password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const accounts = await this.loadAccounts();

    // Check for duplicates
    const duplicate = accounts.find(
      (a) =>
        (trimmedUsername && a.username.toLowerCase() === trimmedUsername) ||
        (trimmedEmail && a.email.toLowerCase() === trimmedEmail)
    );
    if (duplicate) {
      throw new Error('An account with this username or email already exists on this device.');
    }

    const { hash, salt } = PasswordService.hashPassword(input.password);
    const userId = `usr-${Encryption.generateUUID()}`;
    const now = new Date().toISOString();

    const newAccount: UserAccount = {
      userId,
      username: trimmedUsername || trimmedEmail.split('@')[0],
      displayName: trimmedDisplayName,
      email: trimmedEmail,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    accounts.push(newAccount);
    await this.saveAccounts(accounts);

    const session = await SessionService.createSession(newAccount);
    return { account: newAccount, session };
  }

  /**
   * Authenticates locally offline using username/email and password
   */
  public static async login(credentials: AuthCredentials): Promise<{ account: UserAccount; session: SessionState }> {
    const identifier = credentials.identifier.trim().toLowerCase();
    if (!identifier) {
      throw new Error('Please enter your email or username.');
    }
    if (!credentials.password) {
      throw new Error('Please enter your password.');
    }

    const accounts = await this.loadAccounts();
    const account = accounts.find(
      (a) => a.username.toLowerCase() === identifier || a.email.toLowerCase() === identifier
    );

    if (!account) {
      throw new Error('Account not found on this device. You can create a new account or continue offline.');
    }

    const isValid = PasswordService.verifyPassword(credentials.password, account.passwordHash, account.passwordSalt);
    if (!isValid) {
      throw new Error('Incorrect password. Please try again.');
    }

    account.lastLoginAt = new Date().toISOString();
    await this.saveAccounts(accounts);

    const session = await SessionService.createSession(account);
    return { account, session };
  }

  /**
   * Continues as Offline Guest without creating an account
   */
  public static async continueOffline(): Promise<SessionState> {
    return await SessionService.startGuestSession();
  }

  /**
   * Gets the primary registered user account if one exists
   */
  public static async getPrimaryAccount(): Promise<UserAccount | null> {
    const accounts = await this.loadAccounts();
    return accounts[0] || null;
  }

  /**
   * Restores or updates an account on this device from a validated pairing payload
   */
  public static async restoreOrUpdateAccountFromPairing(account: UserAccount): Promise<SessionState> {
    const accounts = await this.loadAccounts();
    const existingIndex = accounts.findIndex((a) => a.userId === account.userId);

    if (existingIndex >= 0) {
      accounts[existingIndex] = {
        ...accounts[existingIndex],
        ...account,
        lastLoginAt: new Date().toISOString(),
      };
    } else {
      accounts.push({
        ...account,
        lastLoginAt: new Date().toISOString(),
      });
    }

    await this.saveAccounts(accounts);
    return await SessionService.createSession(account);
  }

  /**
   * Logs out the current user and sets active session to guest
   */
  public static async logout(): Promise<SessionState> {
    await SessionService.clearSession();
    return await SessionService.startGuestSession();
  }
}
