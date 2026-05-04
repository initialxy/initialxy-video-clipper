import { useState, useCallback } from 'react';
import { ChevronsDownUp, ChevronUp } from 'lucide-react';

interface CaptionEditorProps {
  caption: string;
  onChange: (caption: string) => void;
  label?: string;
}

export function CaptionEditor({ caption, onChange, label }: CaptionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  if (isExpanded) {
    return (
      <div className="border-border/50 bg-muted/20 relative rounded-lg border">
        <button
          onClick={handleCollapse}
          className="text-muted-foreground hover:text-foreground absolute top-2 right-2 rounded-md p-1"
          title="Collapse"
        >
          <ChevronsDownUp className="h-4 w-4" />
        </button>
        {label && (
          <div className="border-border/50 border-b px-4 py-2">
            <span className="text-muted-foreground text-sm font-medium">{label}</span>
          </div>
        )}
        <textarea
          value={caption}
          onChange={(e) => onChange(e.target.value)}
          className="text-foreground min-h-[200px] w-full resize-none bg-transparent p-4 text-sm outline-none"
          placeholder="Enter caption text..."
        />
      </div>
    );
  }

  return (
    <div className="border-border/50 bg-muted/20 relative rounded-lg border">
      <button
        onClick={handleExpand}
        className="text-muted-foreground hover:text-foreground absolute top-2 right-2 rounded-md p-1"
        title="Expand"
      >
        <ChevronUp className="h-4 w-4" />
      </button>
      {label && (
        <div className="border-border/50 border-b px-4 py-2">
          <span className="text-muted-foreground text-sm font-medium">{label}</span>
        </div>
      )}
      <textarea
        value={caption}
        onChange={(e) => onChange(e.target.value)}
        className="text-foreground max-h-[200px] min-h-[100px] w-full resize-none bg-transparent p-4 text-sm outline-none"
        placeholder="Enter caption text..."
      />
    </div>
  );
}
