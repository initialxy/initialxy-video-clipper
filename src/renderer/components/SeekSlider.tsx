interface SeekSliderProps {
  currentTime: number;
  duration: number;
  onChange: (time: number) => void;
}

export function SeekSlider({ currentTime, duration, onChange }: SeekSliderProps) {
  return (
    <input
      type="range"
      min={0}
      max={duration || 1}
      step={0.01}
      value={currentTime}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="accent-primary h-1 w-full cursor-pointer"
    />
  );
}
