/**
 * Toast Notification Service
 *
 * Lightweight notification system for success/error/info messages.
 * Features:
 * - Queue management
 * - Auto-dismiss with customizable duration
 * - Toast type variants (success, error, info, warning)
 * - Callback support
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  dismissed?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

interface ToastListener {
  (toast: Toast): void;
}

class ToastService {
  private listeners: Set<ToastListener> = new Set();
  private toasts: Map<string, Toast> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Subscribe to toast events
   */
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notify(toast: Toast) {
    this.listeners.forEach((listener) => listener(toast));
  }

  /**
   * Show a toast
   */
  show(
    message: string,
    type: ToastType = 'info',
    duration: number = 5000,
    action?: Toast['action']
  ): string {
    const id = `toast_${Date.now()}_${Math.random()}`;

    const toast: Toast = {
      id,
      message,
      type,
      duration,
      action,
    };

    this.toasts.set(id, toast);
    this.notify(toast);

    // Auto-dismiss
    if (duration > 0) {
      const timeout = setTimeout(() => {
        this.dismiss(id);
      }, duration);

      this.timeouts.set(id, timeout);
    }

    return id;
  }

  /**
   * Show success toast
   */
  success(
    message: string,
    options?: { duration?: number; action?: Toast['action'] }
  ): string {
    return this.show(message, 'success', options?.duration ?? 4000, options?.action);
  }

  /**
   * Show error toast
   */
  error(
    message: string,
    options?: { duration?: number; action?: Toast['action'] }
  ): string {
    return this.show(message, 'error', options?.duration ?? 6000, options?.action);
  }

  /**
   * Show info toast
   */
  info(
    message: string,
    options?: { duration?: number; action?: Toast['action'] }
  ): string {
    return this.show(message, 'info', options?.duration ?? 4000, options?.action);
  }

  /**
   * Show warning toast
   */
  warning(
    message: string,
    options?: { duration?: number; action?: Toast['action'] }
  ): string {
    return this.show(message, 'warning', options?.duration ?? 5000, options?.action);
  }

  /**
   * Dismiss a toast
   */
  dismiss(id: string): void {
    const toast = this.toasts.get(id);
    if (!toast) return;

    // Clear timeout
    const timeout = this.timeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(id);
    }

    // Notify listeners of dismissal
    toast.onDismiss?.();

    // Remove from map
    this.toasts.delete(id);

    // Notify dismissal while preserving the original ID so subscribers can
    // remove the correct toast from local UI state.
    this.notify({ ...toast, dismissed: true });
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    const ids = Array.from(this.toasts.keys());
    ids.forEach((id) => this.dismiss(id));
  }

  /**
   * Get all active toasts
   */
  getAll(): Toast[] {
    return Array.from(this.toasts.values());
  }
}

// Singleton instance
export const toastService = new ToastService();

export default toastService;
