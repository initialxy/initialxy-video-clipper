import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { useCaption } from '@renderer/hooks/useCaption';
import { CaptionEditor } from './CaptionEditor';
import { VideoPlayer } from './VideoPlayer';
import { isInputFocused } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';
import { useAppState } from '@renderer/store/app-state';

interface ExpandedPlayerProps {
  filePath: string;
  onClose: () => void;
  onAutoCaption: (filePath: string) => void;
}

export function ExpandedPlayer({ filePath, onClose, onAutoCaption }: ExpandedPlayerProps) {
  const { caption, updateCaption } = useCaption(filePath);
  const togglePlayRef = useRef<(() => void) | undefined>(undefined);
  const { isAutoCaptioning } = useAppState();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (isInputFocused()) return;

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
        <div className="flex items-center gap-2">
          <div className="min-h-0 flex-1">
            <CaptionEditor caption={caption} onChange={updateCaption} label="Caption" />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onAutoCaption(filePath)}
            disabled={isAutoCaptioning}
            title="Auto-caption this video"
            className="mt-0.5 shrink-0"
          >
            <MessageSquare className="h-4 w-4" />
            <span>Auto-caption</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
