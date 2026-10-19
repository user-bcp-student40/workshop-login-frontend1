import '@angular/compiler';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../services/auth-session.service';
import { DashboardComponent } from '../dashboard/dashboard.component';
import { LoginComponent } from './login.component';

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn() }
}));

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

describe('LoginComponent characterization', () => {
  let storage: MemoryStorage;
  let sessionStorage: MemoryStorage;
  let router: Router;
  let authSession: AuthSessionService;
  let component: LoginComponent;

  beforeEach(() => {
    storage = new MemoryStorage();
    sessionStorage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('sessionStorage', sessionStorage);
    router = { navigate: vi.fn().mockResolvedValue(true) } as unknown as Router;
    authSession = new AuthSessionService();
    component = new LoginComponent(router, authSession);
    component.username = 'student';
    component.password = 'Workshop123!';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('logs in successfully and loads tasks with the new session', async () => {
    const user = { username: 'student', displayName: 'Student' };
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { token: 'token-123', user } } as never);
    vi.mocked(axios.get).mockResolvedValueOnce({ data: [
      { title: 'Review requirements', status: 'TODO', priority: 'HIGH', owner: 'student' }
    ] } as never);

    await component.login();

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(sessionStorage.getItem('workshop_token')).toBe('token-123');
    expect(sessionStorage.getItem('workshop_user')).toBe(JSON.stringify(user));
    expect(storage.getItem('workshop_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(component.busy).toBe(false);

    const changeDetector = { detectChanges: vi.fn() } as unknown as ChangeDetectorRef;
    const zone = { run: (action: () => void) => action() } as unknown as NgZone;
    const dashboard = new DashboardComponent(router, changeDetector, zone, authSession);
    await dashboard.ngOnInit();

    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer token-123' }
    });
    expect(dashboard.visibleTasks).toHaveLength(1);
    expect(dashboard.loading).toBe(false);
  });

  it('does not navigate when the backend response has no token', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: { user: { username: 'student' } } } as never);

    await component.login();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.message).toContain('sin token');
    expect(component.busy).toBe(false);
  });

  it('rejects a blank username without sending a request', async () => {
    component.username = '  ';

    await component.login();

    expect(axios.post).not.toHaveBeenCalled();
    expect(component.message).toContain('usuario');
  });

  it('rejects a null username without sending a request', async () => {
    component.username = null;

    await component.login();

    expect(axios.post).not.toHaveBeenCalled();
    expect(component.message).toContain('usuario');
  });

  it('rejects a blank password without sending a request', async () => {
    component.password = '  ';

    await component.login();

    expect(axios.post).not.toHaveBeenCalled();
    expect(component.message).toContain('contraseña');
  });

  it('rejects an undefined password without sending a request', async () => {
    component.password = undefined;

    await component.login();

    expect(axios.post).not.toHaveBeenCalled();
    expect(component.message).toContain('contraseña');
  });

  it('handles a response without a data object', async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({ data: undefined } as never);

    await component.login();

    expect(router.navigate).not.toHaveBeenCalled();
    expect(component.message).toContain('sin token');
  });

  it('reports a failed request and clears the busy state', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('network unavailable'));

    await component.login();

    expect(component.message).toContain('network unavailable');
    expect(component.busy).toBe(false);
  });

  it('shows a backend-provided message when the request fails', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce({ response: { data: { message: 'Access denied' } } });

    await component.login();

    expect(component.message).toContain('Access denied');
  });

  it('uses a fallback message when the request error has no message', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce({});

    await component.login();

    expect(component.message).toContain('Error desconocido');
  });

  it('shows the timeout error and clears busy when login exceeds five seconds', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce({
      code: 'ECONNABORTED',
      message: 'timeout of 5000ms exceeded'
    });

    await component.login();

    expect(axios.post).toHaveBeenCalledWith(
      'http://localhost:8080/auth/login',
      { username: 'student', password: 'Workshop123!', client: 'angular-workshop' },
      { timeout: 5000 }
    );
    expect(component.message).toContain('timeout of 5000ms exceeded');
    expect(component.busy).toBe(false);
  });

  it('keeps defaults when saved preferences are invalid JSON', () => {
    storage.setItem('workshop_preferences', '{invalid');
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const loginWithInvalidPreferences = new LoginComponent(router, new AuthSessionService());

    expect(loginWithInvalidPreferences.preferences).toEqual({ theme: 'light', showTips: true, compact: false });
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});