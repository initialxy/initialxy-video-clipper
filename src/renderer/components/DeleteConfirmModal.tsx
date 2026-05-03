interface DeleteConfirmModalProps {
  fileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ fileName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="border-border/50 bg-background w-full max-w-sm rounded-xl border p-6 shadow-2xl">
        <h2 className="text-foreground text-lg font-semibold">Delete Clip</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Are you sure you want to delete{' '}
          <span className="text-foreground font-medium">&quot;{fileName}&quot;</span>? This will
          also remove the caption file.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
