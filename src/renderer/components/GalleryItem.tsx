import { useState, useCallback, useEffect, useRef } from 'react';
import { CheckSquare, Square, Trash2 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { CaptionOverlay } from './CaptionOverlay';
import { useAppState } from '@renderer/store/app-state';
import { useCaptionStore } from '@renderer/store/caption-store';
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
  const [isHovered, setIsHovered] = useState(false);
  const showSelection = isSelected || isHovered;
  const thumbRef = useRef<HTMLImageElement>(null);
  const store = useCaptionStore();

  // Load caption from disk on mount
  useEffect(() => {
    store.ensureLoaded(file.path);
  }, [file.path, store]);

  // Listen for caption changes from other sources (auto-caption, other tabs)
  useEffect(() => {
    const cleanup = window.electronAPI.onCaptionChanged((data) => {
      if (data.filePath === file.path) {
        // Store is updated automatically via the event listener
      }
    });
    return cleanup;
  }, [file.path]);

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
      store.setCaption(file.path, newCaption);
    },
    [file.path, store],
  );

  return (
    <div
      className="group border-border/50 hover:border-border relative aspect-square overflow-hidden rounded-lg border"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top container: checkbox + filename + delete */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-black/70 px-3 py-3 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          className={cn(
            'h-6 w-6 shrink-0 transition-opacity duration-100 ease-in',
            showSelection ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          title={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? (
            <CheckSquare className="text-primary h-3.5 w-3.5" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </Button>

        <p className="flex-1 truncate text-center text-xs font-medium text-white/90">{file.name}</p>

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            'h-6 w-6 shrink-0 text-red-400 transition-opacity duration-100 ease-in',
            isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
          )}
          title="Delete clip"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

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
          caption={store.getCaption(file.path)}
          onSave={handleCaptionSave}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
