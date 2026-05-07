interface AutoCaptionProgressToastProps {
  current: number;
  total: number;
}

export function AutoCaptionProgressToast({ current, total }: AutoCaptionProgressToastProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">Auto-captioning...</span>
        <span className="text-muted-foreground text-sm tabular-nums">
          {current} / {total}
        </span>
      </div>
      <div className="bg-border/50 h-1 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
