import { useState, useCallback, useRef, useEffect } from 'react';

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
  const [toasts, setToasts] = useState<Toast[]>([]);
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
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (
      message: string,
      type: Toast['type'] = 'info',
      action?: Toast['action'],
      duration = 3000,
    ): string => {
      const id = `toast-${++nextId}`;
      const newToast: Toast = { id, message, type, action };
      setToasts((prev) => [...prev, newToast]);

      if (!action) {
        const timer = window.setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
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

  return { toasts, addToast, removeToast, success, error, warning, info };
}
