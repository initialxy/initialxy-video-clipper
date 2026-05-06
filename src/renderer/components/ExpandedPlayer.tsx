import { useCaption } from '@renderer/hooks/useCaption';
import { CaptionEditor } from './CaptionEditor';
import { VideoPlayer } from './VideoPlayer';
import { useAppState } from '@renderer/store/app-state';

interface ExpandedPlayerProps {
  filePath: string;
  onClose: () => void;
  onAutoCaption: (filePath: string) => void;
}

export function ExpandedPlayer({ filePath, onClose, onAutoCaption }: ExpandedPlayerProps) {
  const { caption, updateCaption } = useCaption(filePath);
  const { isAutoCaptioning } = useAppState();

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      {/* Video player - takes remaining vertical space */}
      <VideoPlayer className="min-h-0 flex-1" filePath={filePath} onClose={onClose} autoPlay />

      {/* Caption editor - fixed height */}
      <div className="mt-4 shrink-0">
        <div className="min-h-0 flex-1">
          <CaptionEditor
            caption={caption}
            onChange={updateCaption}
            isAutoCaptioning={isAutoCaptioning}
            onAutoCaption={() => onAutoCaption(filePath)}
          />
        </div>
      </div>
    </div>
  );
}
