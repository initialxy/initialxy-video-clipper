import { useState, useMemo, useRef, useLayoutEffect } from 'react';
import { useAppState } from '@renderer/store/app-state';
import { GalleryItem } from './GalleryItem';
import { cn } from '@renderer/lib/utils';

interface GalleryViewProps {
  onSelectFile: (path: string) => void;
  onOpenExpanded: (path: string) => void;
  onDeleteFile: (path: string) => void;
}

export function GalleryView({ onSelectFile, onOpenExpanded, onDeleteFile }: GalleryViewProps) {
  const { galleryFiles, selectedFiles } = useAppState();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Calculate grid layout
  const cellSize = useMemo(() => {
    if (containerWidth === 0) return 500;
    const minCellSize = 250;
    const maxCols = Math.max(1, Math.floor(containerWidth / minCellSize));
    const actualCellSize = Math.floor(containerWidth / maxCols);
    return Math.max(minCellSize, actualCellSize);
  }, [containerWidth]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      setContainerWidth(el.clientWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (galleryFiles.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-muted-foreground text-center">
          <p className="text-lg">No clips yet</p>
          <p className="mt-1 text-sm">Switch to Clip mode to create your first clip</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} id="gallery-container" className="flex-1 overflow-y-auto p-4">
      <div
        className={cn(
          'mx-auto grid gap-3',
          `grid-cols-[repeat(auto-fill,minmax(${cellSize}px,1fr))]`,
        )}
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cellSize}px, 1fr))` }}
      >
        {galleryFiles.map((file) => (
          <GalleryItem
            key={file.path}
            file={file}
            isSelected={selectedFiles.has(file.path)}
            onSelect={() => onSelectFile(file.path)}
            onOpenExpanded={() => onOpenExpanded(file.path)}
            onDelete={() => onDeleteFile(file.path)}
          />
        ))}
      </div>
    </div>
  );
}
