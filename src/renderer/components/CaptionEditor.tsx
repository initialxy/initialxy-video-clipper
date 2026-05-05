import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Textarea } from '@renderer/components/ui/textarea';

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
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCollapse}
          className="absolute top-2 right-2"
          title="Collapse"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        {label && (
          <div className="border-border/50 border-b px-4 py-2">
            <span className="text-muted-foreground text-sm font-medium">{label}</span>
          </div>
        )}
        <Textarea
          value={caption}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[200px] resize-none"
          placeholder="Enter caption text..."
        />
      </div>
    );
  }

  return (
    <div className="border-border/50 bg-muted/20 relative rounded-lg border">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleExpand}
        className="absolute top-2 right-2"
        title="Expand"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      {label && (
        <div className="border-border/50 border-b px-4 py-2">
          <span className="text-muted-foreground text-sm font-medium">{label}</span>
        </div>
      )}
      <Textarea
        value={caption}
        onChange={(e) => onChange(e.target.value)}
        className="max-h-[200px] min-h-[100px] resize-none"
        placeholder="Enter caption text..."
      />
    </div>
  );
}
