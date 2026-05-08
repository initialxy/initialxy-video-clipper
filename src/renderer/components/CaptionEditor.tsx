import { Button } from '@renderer/components/ui/button';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@renderer/components/ui/card';
import { ChevronDown, ChevronUp, ScanText, Trash2 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { Textarea } from '@renderer/components/ui/textarea';
import { useState, useCallback } from 'react';

interface CaptionEditorProps {
  caption: string;
  onChange: (caption: string) => void;
  isAutoCaptioning: boolean;
  onAutoCaption: () => void;
  onDelete: () => void;
}

export function CaptionEditor({
  caption,
  onChange,
  isAutoCaptioning,
  onAutoCaption,
  onDelete,
}: CaptionEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = useCallback(() => {
    setIsExpanded(true);
  }, []);

  const handleCollapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Button
            variant="secondary"
            title="Auto-caption this video"
            className="mt-0.5 shrink-0"
            onClick={() => onAutoCaption()}
            disabled={isAutoCaptioning}
          >
            <ScanText className="h-4 w-4" />
            <span>Auto-caption</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            title="Delete clip"
            className="mt-0.5 text-red-400 hover:text-red-300"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            onClick={isExpanded ? handleCollapse : handleExpand}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown /> : <ChevronUp />}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Textarea
          value={caption}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'resize-none text-justify transition-[height]',
            isExpanded ? 'h-100' : 'h-50',
          )}
          placeholder="Enter caption text..."
        />
      </CardContent>
    </Card>
  );
}
