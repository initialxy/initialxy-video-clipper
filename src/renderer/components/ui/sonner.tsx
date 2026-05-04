import { Toaster as SonnerToaster } from 'sonner';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  duration?: number;
}

function toast(message: string, type?: ToastType, options?: ToastOptions) {
  return { message, type, options };
}

function success(message: string, options?: ToastOptions) {
  return { message, type: 'success' as const, options };
}

function error(message: string, options?: ToastOptions) {
  return { message, type: 'error' as const, options };
}

function warning(message: string, options?: ToastOptions) {
  return { message, type: 'warning' as const, options };
}

function info(message: string, options?: ToastOptions) {
  return { message, type: 'info' as const, options };
}

export { toast, success, error, warning, info, SonnerToaster as Toaster };
export type { ToastType };
