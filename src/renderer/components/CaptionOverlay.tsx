import { useState, useCallback, useRef, useEffect, type MouseEvent, type ChangeEvent } from 'react';
import { Textarea } from '@renderer/components/ui/textarea';

interface CaptionOverlayProps {
  caption: string;
  onSave: (caption: string) => void;
  onClick?: (e: MouseEvent) => void;
}

export function CaptionOverlay({ caption, onSave, onClick }: CaptionOverlayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(caption);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (onClick) onClick(e);
      setIsEditing(true);
      setEditText(caption);
    },
    [caption, onClick],
  );

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editText !== caption) {
      onSave(editText);
    }
  }, [editText, caption, onSave]);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setEditText(newText);
  }, []);

  // Focus at end when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="bg-background/80 h-full w-full" onBlur={handleBlur}>
        <Textarea
          ref={textareaRef}
          value={editText}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          className="h-full w-full resize-none bg-transparent p-3 text-sm leading-relaxed outline-none"
          placeholder="Enter caption..."
        />
      </div>
    );
  }

  return (
    <div className="bg-background/60 h-full w-full cursor-text p-3" onClick={handleClick}>
      <p className="text-foreground/80 relative h-full overflow-hidden text-justify text-sm leading-relaxed">
        {caption || <span className="text-muted-foreground/80 italic">Click to add caption</span>}
        <div className="from-background/70 absolute bottom-0 h-4 w-full bg-gradient-to-t to-transparent" />
      </p>
    </div>
  );
}
