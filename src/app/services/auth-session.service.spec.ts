import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from './auth-session.service';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

describe('AuthSessionService', () => {
  let storage: MemoryStorage;
  let service: AuthSessionService;

  beforeEach(() => {
    storage = new MemoryStorage();
    vi.stubGlobal('sessionStorage', storage);
    service = new AuthSessionService();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores and reads the token and user', () => {
    const user = { username: 'student', displayName: 'Student' };
    service.saveSession('token-123', user);

    expect(service.getToken()).toBe('token-123');
    expect(service.getUser()).toEqual(user);
  });

  it('returns empty session values when nothing is stored', () => {
    expect(service.getToken()).toBeNull();
    expect(service.getUser()).toEqual({});
  });

  it('clears token and user without changing unrelated storage entries', () => {
    storage.setItem('workshop_preferences', '{"theme":"light"}');
    service.saveSession('token-123', { username: 'student' });

    service.clearSession();

    expect(service.getToken()).toBeNull();
    expect(storage.getItem('workshop_user')).toBeNull();
    expect(storage.getItem('workshop_preferences')).toBe('{"theme":"light"}');
  });
});