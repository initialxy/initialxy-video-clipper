import { Button } from '@renderer/components/ui/button';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@renderer/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { Textarea } from '@renderer/components/ui/textarea';
import { useState, useCallback } from 'react';

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

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="border-x border-transparent">{label}</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-xs"
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
