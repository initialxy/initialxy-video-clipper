import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Toast as ToastType } from '@renderer/hooks/useToast';
import { cn } from '@renderer/lib/utils';

interface ToastProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

const typeStyles: Record<ToastType['type'], string> = {
  success: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-300',
  error: 'border-red-500/40 bg-red-950/80 text-red-300',
  warning: 'border-amber-500/40 bg-amber-950/80 text-amber-300',
  info: 'border-blue-500/40 bg-blue-950/80 text-blue-300',
};

const typeIcons: Record<ToastType['type'], typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = typeIcons[toast.type];

  useEffect(() => {
    if (!toast.action) {
      const timer = setTimeout(() => onDismiss(toast.id), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.action, onDismiss]);

  return (
    <div
      className={cn(
        'flex max-w-[400px] min-w-[280px] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-md',
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
          className={cn(
            'shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors',
            toast.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
              : toast.type === 'error'
                ? 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                : toast.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                  : 'bg-blue-500/20 text-blue-200 hover:bg-blue-500/30',
          )}
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
