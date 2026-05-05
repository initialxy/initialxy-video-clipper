import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Textarea } from '@renderer/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardAction, CardContent } from '@renderer/components/ui/card';

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
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>{label}</CardTitle>
          <CardAction>
            <Button variant="ghost" size="icon" onClick={handleCollapse} title="Collapse">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <Textarea
            value={caption}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[200px] resize-none"
            placeholder="Enter caption text..."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon" onClick={handleExpand} title="Expand">
            <ChevronUp className="h-4 w-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <Textarea
          value={caption}
          onChange={(e) => onChange(e.target.value)}
          className="max-h-[200px] min-h-[100px] resize-none"
          placeholder="Enter caption text..."
        />
      </CardContent>
    </Card>
  );
}
