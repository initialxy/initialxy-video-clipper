import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface CropRegion {
  x1: number; // 0-1, left
  y1: number; // 0-1, top
  x2: number; // 0-1, right
  y2: number; // 0-1, bottom
}

interface CropOverlayProps {
  /** Called when crop region changes (during drag) */
  onRegionChange: (region: CropRegion) => void;
  /** Called to cancel crop mode without saving */
  onCancel: () => void;
}

const HANDLE_SIZE = 16;

export function CropOverlay({ onRegionChange, onCancel }: CropOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Crop region as proportions (0-1) of video dimensions
  const [region, setRegion] = useState<CropRegion>({ x1: 0, y1: 0, x2: 1, y2: 1 });

  // Drag state
  const isDragging = useRef(false);
  const dragHandle = useRef<'tl' | 'tr' | 'bl' | 'br' | null>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const dragRegionStart = useRef<CropRegion>({ x1: 0, y1: 0, x2: 1, y2: 1 });

  // Notify parent of region changes
  useEffect(() => {
    onRegionChange(region);
  }, [region, onRegionChange]);

  // Global mouse event handlers for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !dragHandle.current) return;

      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const dx = (e.clientX - dragStart.current.x) / rect.width;
      const dy = (e.clientY - dragStart.current.y) / rect.height;
      const start = dragRegionStart.current;

      setRegion((prev) => {
        const next = { ...prev };
        switch (dragHandle.current) {
          case 'tl':
            next.x1 = Math.max(0, Math.min(start.x1 + dx, next.x2 - 0.001));
            next.y1 = Math.max(0, Math.min(start.y1 + dy, next.y2 - 0.001));
            break;
          case 'tr':
            next.x2 = Math.min(1, Math.max(start.x2 + dx, next.x1 + 0.001));
            next.y1 = Math.max(0, Math.min(start.y1 + dy, next.y2 - 0.001));
            break;
          case 'bl':
            next.x1 = Math.max(0, Math.min(start.x1 + dx, next.x2 - 0.001));
            next.y2 = Math.min(1, Math.max(start.y2 + dy, next.y1 + 0.001));
            break;
          case 'br':
            next.x2 = Math.min(1, Math.max(start.x2 + dx, next.x1 + 0.001));
            next.y2 = Math.min(1, Math.max(start.y2 + dy, next.y1 + 0.001));
            break;
        }
        return next;
      });
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      dragHandle.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDrag = useCallback(
    (handle: 'tl' | 'tr' | 'bl' | 'br', e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      isDragging.current = true;
      dragHandle.current = handle;
      dragStart.current = { x: e.clientX, y: e.clientY };
      dragRegionStart.current = { ...region };
    },
    [region],
  );

  const handleCancel = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCancel();
    },
    [onCancel],
  );

  // Keyboard shortcut: Escape to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const x1p = region.x1 * 100;
  const y1p = region.y1 * 100;
  const x2p = region.x2 * 100;
  const y2p = region.y2 * 100;

  const handleStyle: React.CSSProperties = {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: '50%',
    backgroundColor: '#fff',
    transform: 'translate(-50%, -50%)',
    cursor: 'pointer',
    zIndex: 2,
    pointerEvents: 'auto',
  };

  // Dim rectangle base style
  const dimStyle: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    pointerEvents: 'auto',
  };

  return (
    <div ref={containerRef} className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
      {/* Dim rectangles — cover areas outside crop region */}
      {/* Top strip */}
      {y1p > 0 && (
        <div
          style={{ ...dimStyle, left: 0, top: 0, width: '100%', height: `${y1p}%` }}
          onMouseDown={handleCancel}
        />
      )}
      {/* Bottom strip */}
      {y2p < 100 && (
        <div
          style={{ ...dimStyle, left: 0, top: `${y2p}%`, width: '100%', height: `${100 - y2p}%` }}
          onMouseDown={handleCancel}
        />
      )}
      {/* Left strip */}
      {x1p > 0 && (
        <div
          style={{
            ...dimStyle,
            left: 0,
            top: `${y1p}%`,
            width: `${x1p}%`,
            height: `${y2p - y1p}%`,
          }}
          onMouseDown={handleCancel}
        />
      )}
      {/* Right strip */}
      {x2p < 100 && (
        <div
          style={{
            ...dimStyle,
            left: `${x2p}%`,
            top: `${y1p}%`,
            width: `${100 - x2p}%`,
            height: `${y2p - y1p}%`,
          }}
          onMouseDown={handleCancel}
        />
      )}

      {/* Crop region border */}
      <div
        className="pointer-events-none"
        style={{
          position: 'absolute',
          left: `${x1p}%`,
          top: `${y1p}%`,
          width: `${x2p - x1p}%`,
          height: `${y2p - y1p}%`,
          border: '2px solid white',
        }}
      />

      {/* Corner handles */}
      <div
        style={{ ...handleStyle, left: `${x1p}%`, top: `${y1p}%` }}
        onMouseDown={(e) => startDrag('tl', e)}
      />
      <div
        style={{ ...handleStyle, left: `${x2p}%`, top: `${y1p}%` }}
        onMouseDown={(e) => startDrag('tr', e)}
      />
      <div
        style={{ ...handleStyle, left: `${x1p}%`, top: `${y2p}%` }}
        onMouseDown={(e) => startDrag('bl', e)}
      />
      <div
        style={{ ...handleStyle, left: `${x2p}%`, top: `${y2p}%` }}
        onMouseDown={(e) => startDrag('br', e)}
      />
    </div>
  );
}
