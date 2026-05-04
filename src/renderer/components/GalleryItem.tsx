import { useState, useCallback, useEffect, useRef } from 'react';
import { Trash2, CheckSquare, Square } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { CaptionOverlay } from './CaptionOverlay';
import { useAppState } from '@renderer/store/app-state';

interface GalleryItemProps {
  file: { path: string; name: string; size: number; modified: string };
  onOpenExpanded: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
}

export function GalleryItem({ file, onOpenExpanded, onDelete, onToggleSelect }: GalleryItemProps) {
  const { selectedFiles } = useAppState();
  const isSelected = selectedFiles.has(file.path);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const thumbRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    window.electronAPI.readCaption(file.path).then((result) => {
      setCaption(result.content ?? '');
    });

    const checkThumb = async () => {
      const thumbPath = file.path + '.thumb.jpg';
      const img = new Image();
      img.onload = () => setThumbnail(img.src);
      img.onerror = async () => {
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
    >
      {/* Delete button */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="bg-background/80 hover:bg-background absolute top-2 right-2 z-10 rounded-md p-1.5 text-red-400 opacity-0 transition-opacity group-hover:opacity-100"
          title="Delete clip"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Selection checkbox */}
      {isHovered && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className="bg-background/80 hover:bg-background absolute top-2 left-2 z-10 rounded-md p-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          title={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? (
            <CheckSquare className="text-primary h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </button>
      )}

      {/* Thumbnail (click to expand) */}
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

      {/* Caption overlay */}
      <CaptionOverlay
        caption={caption}
        onSave={handleCaptionSave}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
