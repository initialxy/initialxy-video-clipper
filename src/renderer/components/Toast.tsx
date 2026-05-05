import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import type { Toast as ToastType } from '@renderer/hooks/useToast';
import { cn } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';

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
        <Button
          onClick={() => {
            toast.action?.handler();
            onDismiss(toast.id);
          }}
          className="shrink-0"
          style={{
            background:
              toast.type === 'success'
                ? 'rgba(16, 185, 129, 0.2)'
                : toast.type === 'error'
                  ? 'rgba(239, 68, 68, 0.2)'
                  : toast.type === 'warning'
                    ? 'rgba(245, 158, 11, 0.2)'
                    : 'rgba(59, 130, 246, 0.2)',
            color:
              toast.type === 'success'
                ? '#a7f3d0'
                : toast.type === 'error'
                  ? '#fca5a5'
                  : toast.type === 'warning'
                    ? '#fcd34d'
                    : '#93c5fd',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          {toast.action.label}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
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
