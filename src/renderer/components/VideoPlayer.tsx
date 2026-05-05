import { Play, Pause, X } from 'lucide-react';
import { useRef, useEffect, type MutableRefObject } from 'react';
import { useVideoPlayer } from '@renderer/hooks/useVideoPlayer';
import { VolumeControl } from './VolumeControl';
import { formatTime } from '@shared/utils';
import { cn } from '@renderer/lib/utils';
import { useAppState, useAppDispatch } from '@renderer/store/app-state';
import { Button } from '@renderer/components/ui/button';
import { Slider } from '@renderer/components/ui/slider';
import { Card, CardContent } from '@renderer/components/ui/card';

interface VideoPlayerProps {
  className?: string;
  onClose?: () => void;
  currentTimeRef?: MutableRefObject<number>;
}

export function VideoPlayer({ className, onClose, currentTimeRef }: VideoPlayerProps) {
  const { savedTime } = useAppState();
  const dispatch = useAppDispatch();
  const lastDispatchedTime = useRef(0);
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
    onTimeUpdate,
    onPlay,
    onPause,
  } = useVideoPlayer(savedTime);

  useEffect(() => {
    if (currentTimeRef) {
      currentTimeRef.current = currentTime;
    }
  }, [currentTime, currentTimeRef]);

  useEffect(() => {
    const diff = Math.abs(currentTime - lastDispatchedTime.current);
    if (diff > 0.1 || currentTime < lastDispatchedTime.current) {
      dispatch({ type: 'SET_CURRENT_TIME', payload: currentTime });
      lastDispatchedTime.current = currentTime;
    }
  }, [currentTime, dispatch]);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardContent className="flex flex-1 flex-col gap-3 p-0">
        {/* Video area */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="max-h-full max-w-full object-contain"
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
              className="absolute top-2 right-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Controls bar */}
        <div className="flex items-center gap-3 px-1">
          {/* Play/Pause */}
          <Button
            onClick={togglePlay}
            variant="ghost"
            size="icon"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          {/* Volume */}
          <VolumeControl
            isMuted={isMuted}
            toggleMute={toggleMute}
            setVolumeLevel={setVolumeLevel}
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
      </CardContent>
    </Card>
  );
}
