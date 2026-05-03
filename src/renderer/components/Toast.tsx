import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Toast as ToastType } from '@renderer/hooks/useToast';
import { cn } from '@renderer/lib/utils';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const typeStyles = {
  success: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  error: 'border-red-500/50 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
};

const typeIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = typeIcons[toast.type];

  useEffect(() => {
    // Auto-dismiss after 3s only if no action
    if (!toast.action) {
      const timer = setTimeout(() => onDismiss(toast.id), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.action, onDismiss]);

  return (
    <div
      className={cn(
        'flex max-w-[400px] min-w-[280px] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm',
        typeStyles[toast.type],
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1 text-sm">{toast.message}</div>
      {toast.action && (
        <button
          onClick={() => {
            toast.action?.handler();
            onDismiss(toast.id);
          }}
          className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs font-medium transition-colors hover:bg-white/20"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
