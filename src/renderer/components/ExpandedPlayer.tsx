import { useEffect } from 'react';
import { useCaption } from '@renderer/hooks/useCaption';
import { CaptionEditor } from './CaptionEditor';
import { VideoPlayer } from './VideoPlayer';

interface ExpandedPlayerProps {
  filePath: string;
  onClose: () => void;
}

export function ExpandedPlayer({ filePath, onClose }: ExpandedPlayerProps) {
  const { caption, updateCaption } = useCaption(filePath);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
      {/* Video player - same component as video tab */}
      <VideoPlayer filePath={filePath} onClose={onClose} />

      {/* Caption editor below video */}
      <CaptionEditor caption={caption} onChange={updateCaption} label="Caption" />
    </div>
  );
}
