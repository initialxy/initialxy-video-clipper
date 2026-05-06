import { Play, Pause, X } from 'lucide-react';
import { useRef, useEffect, type MutableRefObject } from 'react';
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
}

export function VideoPlayer({
  className,
  onClose,
  currentTimeRef,
  autoPlay,
  filePath,
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
  } = player;

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

  return (
    <div
      className={cn(
        'bg-card ring-foreground/10 flex flex-col overflow-hidden rounded-lg ring-1',
        className,
      )}
    >
      {/* Video area */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
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
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            title="Remove video"
            className="text-muted-foreground hover:text-foreground absolute top-2 right-2"
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
