import { Play, Pause, X } from 'lucide-react';
import { useVideoPlayer } from '@renderer/hooks/useVideoPlayer';
import { VolumeControl } from './VolumeControl';
import { formatTime } from '@shared/utils';
import { cn } from '@renderer/lib/utils';
import { useAppState } from '@renderer/store/app-state';

interface VideoPlayerProps {
  className?: string;
  onClose?: () => void;
}

export function VideoPlayer({ className, onClose }: VideoPlayerProps) {
  const { savedTime } = useAppState();
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

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Video area */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-muted-foreground/80 hover:text-foreground hover:bg-muted/50 absolute top-2 right-2 rounded-md p-1.5 transition-colors"
            title="Remove video"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Controls bar */}
      <div className="mt-3 flex items-center gap-3 px-1">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="text-foreground hover:bg-muted/50 rounded-md p-2 transition-colors"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>

        {/* Volume */}
        <VolumeControl isMuted={isMuted} toggleMute={toggleMute} setVolumeLevel={setVolumeLevel} />

        {/* Seek slider */}
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.01}
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="accent-primary h-1 flex-1 pl-2"
        />

        {/* Time display */}
        <div className="text-muted-foreground shrink-0 text-xs whitespace-nowrap tabular-nums">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
