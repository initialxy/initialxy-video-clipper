import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useCaption } from '@renderer/hooks/useCaption';
import { CaptionEditor } from './CaptionEditor';

interface ExpandedPlayerProps {
  filePath: string;
  onClose: () => void;
}

export function ExpandedPlayer({ filePath, onClose }: ExpandedPlayerProps) {
  const { caption, updateCaption } = useCaption(filePath);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Stop video on close
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
    };
  }, [onClose]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      {/* Close button */}
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md p-2 transition-colors"
          title="Close (Escape)"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Video player */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            src={`file://${filePath}`}
            className="max-h-full max-w-full"
            controls
            autoPlay
            playsInline
          />
        </div>
      </div>

      {/* Caption editor below video */}
      <CaptionEditor caption={caption} onChange={updateCaption} label="Caption" />
    </div>
  );
}
