import { useState, useCallback, useRef, type MouseEvent, type ChangeEvent } from 'react';

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

  // Debounced save on text change
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

  // Cleanup debounce on unmount
  const handleUnmount = useCallback(() => {
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  if (isEditing) {
    return (
      <div className="bg-background/95 h-1/2 w-full p-2" onBlur={handleUnmount}>
        <textarea
          value={editText}
          onChange={handleChange}
          onBlur={handleBlur}
          autoFocus
          className="bg-background/50 text-foreground focus:ring-primary/50 h-full w-full resize-none rounded p-2 text-xs outline-none focus:ring-1"
          placeholder="Enter caption..."
        />
      </div>
    );
  }

  const displayText = caption.length > 100 ? caption.slice(0, 100) + '...' : caption;

  return (
    <div className="h-1/2 w-full cursor-text bg-black/60 p-3" onClick={handleClick}>
      <p className="text-foreground/80 h-full overflow-hidden text-xs leading-relaxed">
        {displayText || (
          <span className="text-muted-foreground/50 italic">Click to add caption</span>
        )}
      </p>
    </div>
  );
}
