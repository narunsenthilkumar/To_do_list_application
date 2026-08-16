import { SecureStorage } from '../security/SecureStorage';
import { DeviceIdService } from '../sync/DeviceIdService';
import { SessionState, UserAccount, GUEST_USER_ID } from './AccountModel';

export class SessionService {
  private static readonly SESSION_KEY = 'active_session';
  private static currentSession: SessionState | null = null;

  /**
   * Initializes or loads the active session
   */
  public static async getActiveSession(): Promise<SessionState> {
    if (this.currentSession) return this.currentSession;

    try {
      const raw = await SecureStorage.getItem(this.SESSION_KEY);
      if (raw) {
        const parsed: SessionState = JSON.parse(raw);
        this.currentSession = parsed;
        return parsed;
      }
    } catch (e) {
      console.warn('[SessionService] Failed to parse stored session, falling back to guest:', e);
    }

    // Default to Offline / Guest session
    const deviceId = await DeviceIdService.getDeviceId();
    const guestSession: SessionState = {
      isAuthenticated: false,
      isGuest: true,
      userId: GUEST_USER_ID,
      username: 'offline_user',
      displayName: 'Offline User',
      email: '',
      deviceId,
      sessionToken: `guest-${Date.now()}`,
      lastActiveAt: new Date().toISOString(),
    };

    this.currentSession = guestSession;
    return guestSession;
  }

  /**
   * Saves a user account as the active session
   */
  public static async createSession(account: UserAccount): Promise<SessionState> {
    const deviceId = await DeviceIdService.getDeviceId();
    const session: SessionState = {
      isAuthenticated: true,
      isGuest: false,
      userId: account.userId,
      username: account.username,
      displayName: account.displayName,
      email: account.email,
      deviceId,
      sessionToken: `tok-${account.userId}-${Date.now()}`,
      lastActiveAt: new Date().toISOString(),
    };

    this.currentSession = session;
    await SecureStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    return session;
  }

  /**
   * Switches to offline guest session
   */
  public static async startGuestSession(): Promise<SessionState> {
    const deviceId = await DeviceIdService.getDeviceId();
    const guestSession: SessionState = {
      isAuthenticated: false,
      isGuest: true,
      userId: GUEST_USER_ID,
      username: 'offline_user',
      displayName: 'Offline User',
      email: '',
      deviceId,
      sessionToken: `guest-${Date.now()}`,
      lastActiveAt: new Date().toISOString(),
    };

    this.currentSession = guestSession;
    await SecureStorage.setItem(this.SESSION_KEY, JSON.stringify(guestSession));
    return guestSession;
  }

  /**
   * Clears the active session
   */
  public static async clearSession(): Promise<void> {
    this.currentSession = null;
    await SecureStorage.removeItem(this.SESSION_KEY);
  }

  /**
   * Logs out active session and resets to guest
   */
  public static async logout(): Promise<void> {
    await this.clearSession();
    await this.startGuestSession();
  }
}
