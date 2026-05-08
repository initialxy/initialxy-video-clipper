import { CaptionEditor } from './CaptionEditor';
import { VideoPlayer } from './VideoPlayer';
import { useAppState } from '@renderer/store/app-state';
import { useCaptionStore } from '@renderer/store/caption-store';
import { useEffect } from 'react';

interface ExpandedPlayerProps {
  filePath: string;
  onClose: () => void;
  onAutoCaption: (filePath: string) => void;
  onDelete: () => void;
}

export function ExpandedPlayer({
  filePath,
  onClose,
  onAutoCaption,
  onDelete,
}: ExpandedPlayerProps) {
  const store = useCaptionStore();
  const { isAutoCaptioning } = useAppState();

  // Load caption from disk on mount
  useEffect(() => {
    store.ensureLoaded(filePath);
  }, [filePath, store]);

  const handleCaptionSave = (newCaption: string) => {
    store.setCaption(filePath, newCaption);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      {/* Video player - takes remaining vertical space */}
      <VideoPlayer className="min-h-0 flex-1" filePath={filePath} onClose={onClose} autoPlay />

      {/* Caption editor - fixed height */}
      <div className="mt-4 shrink-0">
        <div className="min-h-0 flex-1">
          <CaptionEditor
            caption={store.getCaption(filePath)}
            onChange={handleCaptionSave}
            isAutoCaptioning={isAutoCaptioning}
            onAutoCaption={() => onAutoCaption(filePath)}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
}
