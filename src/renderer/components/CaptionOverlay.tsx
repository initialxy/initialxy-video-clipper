import { useState, useCallback, useRef, useEffect, type MouseEvent, type ChangeEvent } from 'react';
import { useDebouncedCallback } from '@renderer/hooks/useDebouncedCallback';
import { Textarea } from '@renderer/components/ui/textarea';

interface CaptionOverlayProps {
  caption: string;
  onSave: (caption: string) => void;
  onClick?: (e: MouseEvent) => void;
}

export function CaptionOverlay({ caption, onSave, onClick }: CaptionOverlayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(caption);
  const lastSavedRef = useRef(caption);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleDebouncedSave = useDebouncedCallback((newText: string) => {
    if (newText !== lastSavedRef.current) {
      onSave(newText);
      lastSavedRef.current = newText;
    }
  }, 2000);

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
    if (editText !== lastSavedRef.current) {
      onSave(editText);
      lastSavedRef.current = editText;
    }
  }, [editText, onSave]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setEditText(newText);
      handleDebouncedSave(newText);
    },
    [handleDebouncedSave],
  );

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
      <p className="text-foreground/80 h-full text-sm leading-relaxed overflow-ellipsis">
        {caption || <span className="text-muted-foreground/80 italic">Click to add caption</span>}
      </p>
    </div>
  );
}
