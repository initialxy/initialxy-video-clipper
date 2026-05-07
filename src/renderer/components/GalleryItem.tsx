import { useState, useCallback, useEffect, useRef } from 'react';
import { Trash2, CheckSquare, Square } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { CaptionOverlay } from './CaptionOverlay';
import { useAppState } from '@renderer/store/app-state';
import { useCaptionStore } from '@renderer/store/caption-store';
import { useDebouncedCaptionSave } from '@renderer/hooks/useDebouncedCaptionSave';
import { Button } from '@renderer/components/ui/button';

interface GalleryItemProps {
  file: { path: string; name: string; size: number; modified: string; caption?: string };
  onOpenExpanded: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
}

export function GalleryItem({ file, onOpenExpanded, onDelete, onToggleSelect }: GalleryItemProps) {
  const { selectedFiles } = useAppState();
  const isSelected = selectedFiles.has(file.path);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [caption, setCaption] = useState(file.caption ?? '');
  const [isHovered, setIsHovered] = useState(false);
  const thumbRef = useRef<HTMLImageElement>(null);
  const captionRef = useRef(file.caption);
  const store = useCaptionStore();
  const { saveCaption, resetDirty } = useDebouncedCaptionSave(file.path);

  // Sync when file.caption prop changes (gallery refresh)
  useEffect(() => {
    if (captionRef.current !== file.caption) {
      captionRef.current = file.caption;
      setCaption(file.caption ?? '');
      resetDirty(file.caption ?? '');
    }
  }, [file.caption, resetDirty]);

  // Listen for caption changes from other sources (auto-caption, other tabs)
  useEffect(() => {
    const cleanup = window.electronAPI.onCaptionChanged((data) => {
      if (data.filePath === file.path) {
        setCaption(data.content);
        resetDirty(data.content);
      }
    });
    return cleanup;
  }, [file.path, resetDirty]);

  useEffect(() => {
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
      store.setCaption(file.path, newCaption);
      saveCaption(newCaption);
    },
    [file.path, store, saveCaption],
  );

  return (
    <div
      className="group border-border/50 hover:border-border relative aspect-square overflow-hidden rounded-lg border"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className={cn(
          'bg-background/80 hover:bg-background absolute top-3 right-3 z-10 text-red-400 transition-opacity duration-100 ease-in',
          isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        title="Delete clip"
      >
        <Trash2 className="h-5 w-5" />
      </Button>

      {/* Selection checkbox - always visible when selected, visible on hover when not selected */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className={cn(
          'bg-background/80 hover:bg-background absolute top-3 left-3 z-10 transition-opacity duration-100 ease-in',
          isSelected || isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        title={isSelected ? 'Deselect' : 'Select'}
      >
        {isSelected ? (
          <CheckSquare className="text-primary h-5 w-5" />
        ) : (
          <Square className="h-5 w-5" />
        )}
      </Button>

      {/* Thumbnail covering whole cell */}
      <div
        className="absolute inset-0 cursor-pointer bg-black"
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
          <div className="flex h-full w-full items-center justify-center">
            <div className="border-muted-foreground/30 border-t-muted-foreground h-8 w-8 animate-spin border-2" />
          </div>
        )}
      </div>

      {/* Caption overlay on bottom half */}
      <div className="absolute inset-x-0 bottom-0 h-1/2">
        <CaptionOverlay
          caption={caption}
          onSave={handleCaptionSave}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
