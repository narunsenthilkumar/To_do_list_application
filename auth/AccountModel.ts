export interface UserAccount {
  userId: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string;
  isGuest?: boolean;
}

export interface SessionState {
  isAuthenticated: boolean;
  isGuest: boolean;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  deviceId: string;
  sessionToken: string;
  lastActiveAt: string;
}

export interface CreateAccountInput {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

export interface AuthCredentials {
  identifier: string; // username or email
  password: string;
}

export const GUEST_USER_ID = 'local-offline-user';
