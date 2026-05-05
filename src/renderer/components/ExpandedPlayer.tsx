import { useEffect, useRef } from 'react';
import { useCaption } from '@renderer/hooks/useCaption';
import { CaptionEditor } from './CaptionEditor';
import { VideoPlayer } from './VideoPlayer';

interface ExpandedPlayerProps {
  filePath: string;
  onClose: () => void;
}

export function ExpandedPlayer({ filePath, onClose }: ExpandedPlayerProps) {
  const { caption, updateCaption } = useCaption(filePath);
  const togglePlayRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const target = e.target;
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== 'range')
      )
        return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayRef.current?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      {/* Video player - takes remaining vertical space */}
      <VideoPlayer
        className="min-h-0 flex-1"
        filePath={filePath}
        onClose={onClose}
        togglePlayRef={togglePlayRef}
        autoPlay
      />

      {/* Caption editor - fixed height */}
      <div className="mt-4 shrink-0">
        <CaptionEditor caption={caption} onChange={updateCaption} label="Caption" />
      </div>
    </div>
  );
}
