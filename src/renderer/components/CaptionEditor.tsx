interface CaptionEditorProps {
  caption: string;
  onChange: (caption: string) => void;
  label?: string;
}

export function CaptionEditor({ caption, onChange, label }: CaptionEditorProps) {
  return (
    <div className="border-border/50 bg-muted/20 rounded-lg border">
      {label && (
        <div className="border-border/50 border-b px-4 py-2">
          <span className="text-muted-foreground text-sm font-medium">{label}</span>
        </div>
      )}
      <textarea
        value={caption}
        onChange={(e) => onChange(e.target.value)}
        className="text-foreground scrollbar-thin max-h-[200px] min-h-[100px] w-full resize-y bg-transparent p-4 text-sm outline-none"
        placeholder="Enter caption text..."
      />
    </div>
  );
}
