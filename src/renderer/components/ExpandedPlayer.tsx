import { CaptionEditor } from './CaptionEditor';
import { VideoPlayer } from './VideoPlayer';
import { CropOverlay, type CropRegion } from './CropOverlay';
import { useAppState } from '@renderer/store/app-state';
import { useCaptionStore } from '@renderer/store/caption-store';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ExpandedPlayerProps {
  filePath: string;
  onClose: () => void;
  onAutoCaption: (filePath: string) => void;
  onDelete: () => void;
  onCrop: (
    filePath: string,
    crop: { x: number; y: number; width: number; height: number },
  ) => Promise<void>;
}

export function ExpandedPlayer({
  filePath,
  onClose,
  onAutoCaption,
  onDelete,
  onCrop,
}: ExpandedPlayerProps) {
  const store = useCaptionStore();
  const { isAutoCaptioning } = useAppState();

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [isCroppingDisabled, setIsCroppingDisabled] = useState(false);
  const [cropRegion, setCropRegion] = useState<CropRegion>({ x1: 0, y1: 0, x2: 1, y2: 1 });
  const reloadRef = useRef<(() => void) | null>(null);

  // Load caption from disk on mount
  useEffect(() => {
    store.ensureLoaded(filePath);
  }, [filePath, store]);

  const handleCaptionSave = (newCaption: string) => {
    store.setCaption(filePath, newCaption);
  };

  const handleReloadReady = useCallback((reload: () => void) => {
    reloadRef.current = reload;
  }, []);

  const handleToggleCrop = useCallback(() => {
    setIsCropping(true);
  }, []);

  const handleCropCancel = useCallback(() => {
    setIsCropping(false);
  }, []);

  const handleRegionChange = useCallback((region: CropRegion) => {
    setCropRegion(region);
  }, []);

  const handleCropSave = useCallback(async () => {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (!video) return;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (videoWidth === 0 || videoHeight === 0) return;

    const crop = {
      x: Math.round(cropRegion.x1 * videoWidth),
      y: Math.round(cropRegion.y1 * videoHeight),
      width: Math.round((cropRegion.x2 - cropRegion.x1) * videoWidth),
      height: Math.round((cropRegion.y2 - cropRegion.y1) * videoHeight),
    };

    // Validate crop is actually smaller
    if (crop.width >= videoWidth && crop.height >= videoHeight) return;
    if (crop.width < 16 || crop.height < 16) return;

    setIsCroppingDisabled(true);
    try {
      await onCrop(filePath, crop);
      reloadRef.current?.();
      setIsCropping(false);
    } finally {
      setIsCroppingDisabled(false);
    }
  }, [filePath, onCrop, cropRegion]);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      {/* Video player — fills available space */}
      <VideoPlayer
        className="min-h-0 flex-1"
        filePath={filePath}
        onClose={onClose}
        autoPlay
        onReloadReady={handleReloadReady}
      >
        {isCropping && (
          <CropOverlay onRegionChange={handleRegionChange} onCancel={handleCropCancel} />
        )}
      </VideoPlayer>

      {/* Caption editor - fixed height */}
      <div className="mt-4 shrink-0">
        <CaptionEditor
          caption={store.getCaption(filePath)}
          onChange={handleCaptionSave}
          isAutoCaptioning={isAutoCaptioning}
          onAutoCaption={() => onAutoCaption(filePath)}
          onDelete={onDelete}
          isCropping={isCropping}
          onToggleCrop={isCropping ? handleCropSave : handleToggleCrop}
          onCancelCrop={handleCropCancel}
          isCroppingDisabled={isCroppingDisabled}
        />
      </div>
    </div>
  );
}
