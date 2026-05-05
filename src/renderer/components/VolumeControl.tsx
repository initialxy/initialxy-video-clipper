import { useState, useCallback, useRef, type MouseEvent } from 'react';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import { Button } from '@renderer/components/ui/button';
import { Slider } from '@renderer/components/ui/slider';

interface VolumeControlProps {
  isMuted: boolean;
  toggleMute: () => void;
  setVolumeLevel: (vol: number) => void;
}

export function VolumeControl({ isMuted, toggleMute, setVolumeLevel }: VolumeControlProps) {
  const [showSlider, setShowSlider] = useState(false);
  const [volume, setVolume] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const effectiveVolume = isMuted ? 0 : volume;

  const handleVolumeChange = useCallback(
    (_value: number | readonly number[]) => {
      const vol = Array.isArray(_value) ? _value[0] : _value;
      setVolume(vol);
      setVolumeLevel(vol);
    },
    [setVolumeLevel],
  );

  const handleToggleMute = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      toggleMute();
    },
    [toggleMute],
  );

  const handleMouseEnter = useCallback(() => {
    setShowSlider(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setShowSlider(false);
  }, []);

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      ref={containerRef}
      className="relative flex h-9 w-9 flex-col items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Inner container — absolute, contains slider + icon */}
      <div
        className={cn(
          'bg-background absolute bottom-0 flex flex-col items-center rounded-lg',
          showSlider && 'outline-border pt-3 outline',
        )}
      >
        <Slider
          value={[effectiveVolume]}
          min={0}
          max={1}
          step={0.01}
          onValueChange={handleVolumeChange}
          className={cn(
            'data-vertical:h-full data-vertical:w-auto data-vertical:flex-col',
            showSlider ? 'h-20' : 'h-0',
          )}
          style={{ overflow: showSlider ? 'visible' : 'hidden' }}
        />
        <Button
          onClick={handleToggleMute}
          variant="ghost"
          size="icon"
          title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
        >
          <VolumeIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
