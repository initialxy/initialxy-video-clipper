import { Button } from '@renderer/components/ui/button';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@renderer/components/ui/card';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { Textarea } from '@renderer/components/ui/textarea';
import { useState, useCallback } from 'react';

interface CaptionEditorProps {
  caption: string;
  onChange: (caption: string) => void;
  isAutoCaptioning: boolean;
  onAutoCaption: () => void;
}

export function CaptionEditor({
  caption,
  onChange,
  isAutoCaptioning,
  onAutoCaption,
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
        <CardTitle>
          <Button
            variant="secondary"
            title="Auto-caption this video"
            className="mt-0.5 shrink-0"
            onClick={() => onAutoCaption()}
            disabled={isAutoCaptioning}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Auto-caption</span>
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
          className={cn('resize-none transition-[height]', isExpanded ? 'h-100' : 'h-50')}
          placeholder="Enter caption text..."
        />
      </CardContent>
    </Card>
  );
}
