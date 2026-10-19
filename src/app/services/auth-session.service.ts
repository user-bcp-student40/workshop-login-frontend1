import { Injectable } from '@angular/core';

export interface SessionUser {
  username?: string;
  displayName?: string;
}

const TOKEN_KEY = 'workshop_token';
const USER_KEY = 'workshop_user';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  getUser(): SessionUser {
    const storedUser = sessionStorage.getItem(USER_KEY);
    return storedUser ? JSON.parse(storedUser) as SessionUser : {};
  }

  saveSession(token: string, user: SessionUser): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clearSession(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }
}