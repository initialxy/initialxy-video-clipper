import { useState, useCallback, useRef, useEffect, type MouseEvent, type ChangeEvent } from 'react';

interface CaptionOverlayProps {
  caption: string;
  onSave: (caption: string) => void;
  onClick?: (e: MouseEvent) => void;
}

export function CaptionOverlay({ caption, onSave, onClick }: CaptionOverlayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(caption);
  const debounceRef = useRef<number | null>(null);
  const lastSavedRef = useRef(caption);
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
    if (editText !== lastSavedRef.current) {
      onSave(editText);
      lastSavedRef.current = editText;
    }
  }, [editText, onSave]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setEditText(newText);

      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = window.setTimeout(() => {
        if (newText !== lastSavedRef.current) {
          onSave(newText);
          lastSavedRef.current = newText;
        }
        debounceRef.current = null;
      }, 2000);
    },
    [onSave],
  );

  const handleUnmount = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
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
      <div className="bg-background/95 h-full w-full" onBlur={handleUnmount}>
        <textarea
          ref={textareaRef}
          value={editText}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          className="text-foreground h-full w-full resize-none bg-transparent p-3 text-sm leading-relaxed outline-none"
          placeholder="Enter caption..."
        />
      </div>
    );
  }

  const displayText = caption.length > 100 ? caption.slice(0, 100) + '...' : caption;

  return (
    <div className="h-full w-full cursor-text bg-black/60 p-3" onClick={handleClick}>
      <p className="text-foreground/80 h-full overflow-hidden text-sm leading-relaxed">
        {displayText || (
          <span className="text-muted-foreground/50 italic">Click to add caption</span>
        )}
      </p>
    </div>
  );
}
