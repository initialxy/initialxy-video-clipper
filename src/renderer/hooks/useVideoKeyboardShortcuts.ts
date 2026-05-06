import { useEffect, useCallback, useRef } from 'react';
import { isInputFocused } from '@renderer/lib/utils';

const SEEK_PERCENT = 0.02;
const VOLUME_STEP = 0.1;

interface UseVideoKeyboardShortcutsOptions {
  togglePlay: () => void;
  toggleMute: () => void;
  seek: (time: number) => void;
  setVolumeLevel: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  onClose?: () => void;
}

export function useVideoKeyboardShortcuts(options: UseVideoKeyboardShortcutsOptions) {
  const { togglePlay, toggleMute, seek, setVolumeLevel, getCurrentTime, getDuration, onClose } =
    options;

  const volumeRef = useRef(1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isInputFocused()) return;

      switch (e.code) {
        case 'Space': {
          e.preventDefault();
          togglePlay();
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const current = getCurrentTime();
          const duration = getDuration();
          seek(Math.max(0, current - duration * SEEK_PERCENT));
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          const current = getCurrentTime();
          const duration = getDuration();
          seek(Math.min(duration, current + duration * SEEK_PERCENT));
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          volumeRef.current = Math.min(1, volumeRef.current + VOLUME_STEP);
          setVolumeLevel(volumeRef.current);
          break;
        }
        case 'ArrowDown': {
          e.preventDefault();
          volumeRef.current = Math.max(0, volumeRef.current - VOLUME_STEP);
          setVolumeLevel(volumeRef.current);
          break;
        }
        case 'KeyM': {
          e.preventDefault();
          toggleMute();
          break;
        }
        case 'Escape': {
          if (onClose) {
            e.preventDefault();
            onClose();
          }
          break;
        }
      }
    },
    [togglePlay, toggleMute, seek, setVolumeLevel, getCurrentTime, getDuration, onClose],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);
}
