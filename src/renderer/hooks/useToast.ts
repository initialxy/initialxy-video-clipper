import { useCallback, useEffect, useRef } from 'react';
import { toast as sonnerToast } from 'sonner';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  action?: {
    label: string;
    handler: () => void;
  };
}

let nextId = 0;

export function useToast() {
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (
      message: string,
      _type: Toast['type'] = 'info',
      action?: Toast['action'],
      duration = 3000,
    ): string => {
      const id = `toast-${++nextId}`;

      if (action) {
        const toastId = sonnerToast(message, {
          duration,
          action: {
            label: action.label,
            onClick: () => {
              action.handler();
              sonnerToast.dismiss(toastId);
            },
          },
        });
        timersRef.current.set(
          id,
          window.setTimeout(() => {
            sonnerToast.dismiss(toastId);
            timersRef.current.delete(id);
          }, duration + 1000),
        );
      } else {
        sonnerToast(message, { duration });
        const timer = window.setTimeout(() => {
          timersRef.current.delete(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    [],
  );

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);
  const warning = useCallback((message: string) => addToast(message, 'warning'), [addToast]);
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);

  return { addToast, removeToast, success, error, warning, info };
}
