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
      className="relative h-8 w-8"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Container to help with transition */}
      <div
        className={cn(
          'outline-border absolute bottom-0 flex h-8 flex-col justify-end overflow-hidden rounded-lg transition-all delay-300 duration-200 ease-out [interpolate-size:allow-keywords]',
          showSlider && 'h-auto outline',
        )}
      >
        {/* Inner container that contains slider + icon */}
        <div className="bg-card flex flex-col items-center">
          <Slider
            value={[effectiveVolume]}
            min={0}
            max={1}
            step={0.01}
            orientation="vertical"
            onValueChange={handleVolumeChange}
            className="mx-auto mt-3 mb-2 w-full max-w-xs"
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
    </div>
  );
}
