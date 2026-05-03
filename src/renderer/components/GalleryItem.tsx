import { useState, useCallback, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { CaptionOverlay } from './CaptionOverlay';

interface GalleryItemProps {
  file: { path: string; name: string; size: number; modified: string };
  isSelected: boolean;
  onSelect: () => void;
  onOpenExpanded: () => void;
  onDelete: () => void;
}

export function GalleryItem({
  file,
  isSelected,
  onSelect,
  onOpenExpanded,
  onDelete,
}: GalleryItemProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const thumbRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    // Load caption
    window.electronAPI.readCaption(file.path).then((result) => {
      setCaption(result.content ?? '');
    });

    // Try cached thumbnail first
    const checkThumb = async () => {
      const thumbPath = file.path + '.thumb.jpg';
      // Try to load cached thumb
      const img = new Image();
      img.onload = () => setThumbnail(img.src);
      img.onerror = async () => {
        // Generate thumbnail
        const result = await window.electronAPI.extractThumbnail({
          filePath: file.path,
          outputPath: thumbPath,
        });
        if (result.success) {
          img.src = `file://${thumbPath}`;
        }
      };
      img.src = `file://${thumbPath}`;
    };

    checkThumb();
  }, [file.path]);

  const handleCaptionSave = useCallback(
    (newCaption: string) => {
      setCaption(newCaption);
      window.electronAPI.writeCaption({ filePath: file.path, content: newCaption });
    },
    [file.path],
  );

  const handleDelete = useCallback(() => {
    if (deleteConfirm) {
      onDelete();
    } else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  }, [deleteConfirm, onDelete]);

  return (
    <div
      className={cn(
        'group relative aspect-square overflow-hidden rounded-lg border transition-all',
        isSelected
          ? 'border-primary ring-primary/30 ring-2'
          : 'border-border/50 hover:border-border',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* Delete button */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className={cn(
            'absolute top-2 right-2 z-10 rounded-md p-1.5 transition-all',
            deleteConfirm
              ? 'bg-red-500 text-white'
              : 'bg-background/80 text-red-400 opacity-0 group-hover:opacity-100',
          )}
          title={deleteConfirm ? 'Click again to confirm' : 'Delete clip'}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="bg-primary/80 absolute top-2 left-2 z-10 rounded-full p-1">
          <div className="h-2 w-2 rounded-full bg-white" />
        </div>
      )}

      {/* Upper half: Thumbnail (click to expand) */}
      <div
        className="h-1/2 w-full cursor-pointer overflow-hidden bg-black"
        onClick={(e) => {
          e.stopPropagation();
          onOpenExpanded();
        }}
      >
        {thumbnail ? (
          <img
            ref={thumbRef}
            src={thumbnail}
            alt={file.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground/50 flex h-full items-center justify-center">
            <div className="border-muted-foreground/30 border-t-muted-foreground h-8 w-8 animate-spin rounded-full border-2" />
          </div>
        )}
      </div>

      {/* Lower half: Caption overlay */}
      <CaptionOverlay
        caption={caption}
        onSave={handleCaptionSave}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
