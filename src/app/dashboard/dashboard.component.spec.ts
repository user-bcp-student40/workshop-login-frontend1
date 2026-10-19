import '@angular/compiler';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import axios from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '../services/auth-session.service';
import { DashboardComponent } from './dashboard.component';

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

describe('DashboardComponent characterization', () => {
  let storage: MemoryStorage;
  let sessionStorage: MemoryStorage;
  let router: Router;
  let component: DashboardComponent;

  beforeEach(() => {
    storage = new MemoryStorage();
    sessionStorage = new MemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('sessionStorage', sessionStorage);
    router = { navigate: vi.fn().mockResolvedValue(true) } as unknown as Router;
    const changeDetector = { detectChanges: vi.fn() } as unknown as ChangeDetectorRef;
    const zone = { run: (action: () => void) => action() } as unknown as NgZone;
    component = new DashboardComponent(router, changeDetector, zone, new AuthSessionService());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps known statuses and preserves unknown status labels', () => {
    expect(component.statusLabel('TODO')).toBe('Por hacer');
    expect(component.statusLabel('CUSTOM')).toBe('CUSTOM');
  });

  it('requests tasks with the stored owner and bearer token, then logs out locally', async () => {
    sessionStorage.setItem('workshop_token', 'token-123');
    sessionStorage.setItem('workshop_user', JSON.stringify({ username: 'student' }));
    vi.mocked(axios.get).mockResolvedValueOnce({ data: [
      { title: 'Review requirements', status: 'TODO', priority: 'HIGH', owner: 'student' },
      { title: 'Write tests', status: 'IN_PROGRESS', priority: 'LOW', owner: 'student' },
      { title: 'Update the plan', status: 'TODO', priority: 'MEDIUM', owner: 'student' },
      { title: 'Review archived item', status: 'ARCHIVED', priority: 'MEDIUM', owner: 'student' }
    ] } as never);

    await component.ngOnInit();

    expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
      headers: { Authorization: 'Bearer token-123' }
    });
    expect(component.visibleTasks).toHaveLength(3);
    expect(component.loading).toBe(false);

    await component.logout();

    expect(sessionStorage.getItem('workshop_token')).toBeNull();
    expect(sessionStorage.getItem('workshop_user')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('redirects to login without requesting tasks when there is no token', async () => {
    await component.ngOnInit();

    expect(axios.get).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('records task request errors and stops loading', async () => {
    sessionStorage.setItem('workshop_token', 'token-123');
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('tasks unavailable'));

    await component.ngOnInit();

    expect(component.error).toBe('tasks unavailable');
    expect(component.loading).toBe(false);
  });

  it('uses the backend detail when the task request fails', async () => {
    sessionStorage.setItem('workshop_token', 'token-123');
    vi.mocked(axios.get).mockRejectedValueOnce({ response: { data: { detail: 'Session expired' } } });

    await component.ngOnInit();

    expect(component.error).toBe('Session expired');
  });

  it('uses a fallback when the task error has no detail or message', async () => {
    sessionStorage.setItem('workshop_token', 'token-123');
    vi.mocked(axios.get).mockRejectedValueOnce({});

    await component.ngOnInit();

    expect(component.error).toBe('No se pudo cargar el dashboard');
  });
});