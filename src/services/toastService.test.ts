import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { toastService, type Toast } from './toastService';

describe('toastService', () => {
  beforeEach(() => {
    toastService.dismissAll();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    toastService.dismissAll();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('publishes shown toasts and dismissal events to subscribers', () => {
    const events: Toast[] = [];
    const unsubscribe = toastService.subscribe((toast) => {
      events.push(toast);
    });

    const id = toastService.success('Saved changes');
    const [activeToast] = toastService.getAll();

    expect(activeToast).toMatchObject({
      id,
      message: 'Saved changes',
      type: 'success',
      duration: 4000,
    });
    expect(events[0]).toMatchObject({
      id,
      message: 'Saved changes',
      type: 'success',
    });

    toastService.dismiss(id);
    unsubscribe();

    expect(toastService.getAll()).toHaveLength(0);
    expect(events.at(-1)).toMatchObject({
      id: '',
      message: 'Saved changes',
      type: 'success',
    });
  });

  it('auto-dismisses toasts after the configured duration', () => {
    vi.useFakeTimers();

    const events: Toast[] = [];
    const unsubscribe = toastService.subscribe((toast) => {
      events.push(toast);
    });

    toastService.info('Queued', { duration: 50 });
    expect(toastService.getAll()).toHaveLength(1);

    vi.advanceTimersByTime(49);
    expect(toastService.getAll()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toastService.getAll()).toHaveLength(0);
    expect(events.some((toast) => toast.id === '')).toBe(true);

    unsubscribe();
  });

  it('dismissAll clears multiple active toasts', () => {
    toastService.show('One', 'info', 0);
    toastService.warning('Two', { duration: 0 });

    expect(toastService.getAll()).toHaveLength(2);

    toastService.dismissAll();

    expect(toastService.getAll()).toHaveLength(0);
  });
});
