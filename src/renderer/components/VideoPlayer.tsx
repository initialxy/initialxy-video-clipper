import { Play, Pause, X } from 'lucide-react';
import { useRef, useEffect, type MutableRefObject, type ReactNode } from 'react';
import { useVideoPlayer } from '@renderer/hooks/useVideoPlayer';
import { useVideoKeyboardShortcuts } from '@renderer/hooks/useVideoKeyboardShortcuts';
import { VolumeControl } from './VolumeControl';
import { formatTime } from '@shared/utils';
import { cn } from '@renderer/lib/utils';
import { useAppState, useAppDispatch } from '@renderer/store/app-state';
import { Button } from '@renderer/components/ui/button';
import { Slider } from '@renderer/components/ui/slider';

interface VideoPlayerProps {
  className?: string;
  onClose?: () => void;
  currentTimeRef?: MutableRefObject<number>;
  autoPlay?: boolean;
  filePath?: string;
  onReloadReady?: (reload: () => void) => void;
  children?: ReactNode; // Rendered in overlay wrapper (e.g. CropOverlay)
}

export function VideoPlayer({
  className,
  onClose,
  currentTimeRef,
  autoPlay,
  filePath,
  onReloadReady,
  children,
}: VideoPlayerProps) {
  const { currentVideo } = useAppState();
  const dispatch = useAppDispatch();
  const lastDispatchedTime = useRef(0);

  const videoPath = filePath || currentVideo?.path;
  const isGlobalMode = !filePath;

  const player = useVideoPlayer(videoPath, { useGlobalState: isGlobalMode, autoPlay });
  const {
    videoRef,
    currentTime,
    duration,
    isPlaying,
    isMuted,
    togglePlay,
    seek,
    setVolumeLevel,
    toggleMute,
    getVolume,
    getCurrentTime,
    onTimeUpdate,
    onPlay,
    onPause,
    reload: reloadVideo,
    videoWidth,
    videoHeight,
  } = player;

  // Expose reload function to parent
  useEffect(() => {
    onReloadReady?.(reloadVideo);
  }, [onReloadReady, reloadVideo]);

  useVideoKeyboardShortcuts({
    togglePlay,
    toggleMute,
    seek,
    setVolumeLevel,
    getCurrentTime,
    getDuration: () => duration,
    onClose,
  });

  useEffect(() => {
    if (currentTimeRef) {
      currentTimeRef.current = currentTime;
    }
  }, [currentTime, currentTimeRef]);

  useEffect(() => {
    if (!isGlobalMode) return;
    const diff = Math.abs(currentTime - lastDispatchedTime.current);
    if (diff > 0.1 || currentTime < lastDispatchedTime.current) {
      dispatch({ type: 'SET_CURRENT_TIME', payload: currentTime });
      lastDispatchedTime.current = currentTime;
    }
  }, [currentTime, dispatch, isGlobalMode]);

  // Aspect ratio from video intrinsic dimensions (fallback 16:9)
  const aspectRatio = videoWidth > 0 && videoHeight > 0 ? `${videoWidth}/${videoHeight}` : '16/9';

  return (
    <div className={cn('bg-card ring-foreground/10 flex flex-col rounded-lg ring-1', className)}>
      {/* Video area — no overflow:hidden */}
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        style={{ containerType: 'size' }}
      >
        {/* Inner clipper — 100% w/h, rounded corners, overflow:hidden contains video */}
        <div className="absolute inset-0 overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            onClick={togglePlay}
            onTimeUpdate={onTimeUpdate}
            onPlay={onPlay}
            onPause={onPause}
            onEnded={onPause}
            playsInline
          />
        </div>

        {/* Overlay — same container context as video area, flex-centered to match video size */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 10,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            containerType: 'size',
          }}
        >
          <div
            className="relative"
            style={{
              width: `min(100cqw, 100cqh * ${aspectRatio})`,
              maxHeight: '100cqh',
              aspectRatio: aspectRatio,
            }}
          >
            {children}
          </div>
        </div>

        {/* Close button — positioned in video area, above overlay */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Remove video"
            className="text-muted-foreground hover:text-foreground absolute top-2 right-2 z-50"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Controls bar */}
      <div className="bg-card border-foreground/10 flex h-16 items-center gap-2 border-t px-3">
        {/* Play/Pause */}
        <Button
          onClick={togglePlay}
          variant="ghost"
          size="icon"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          className="h-8 w-8 shrink-0"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        {/* Volume */}
        <VolumeControl
          isMuted={isMuted}
          toggleMute={toggleMute}
          setVolumeLevel={setVolumeLevel}
          volume={getVolume()}
        />

        {/* Seek slider */}
        <Slider
          value={[currentTime]}
          min={0}
          max={duration || 1}
          step={0.01}
          onValueChange={(value) => {
            const val = Array.isArray(value) ? value[0] : value;
            seek(val);
          }}
          className="flex-1"
        />

        {/* Time display */}
        <div className="text-muted-foreground shrink-0 text-xs whitespace-nowrap tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
