import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppState } from '@renderer/store/app-state';

export function useVideoPlayer(savedTime?: number, filePath?: string) {
  const { currentVideo } = useAppState();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const isPlayingStateRef = useRef(false);
  const savedTimeRef = useRef(savedTime);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const isWaitingForSeekedRef = useRef(false);

  useEffect(() => {
    savedTimeRef.current = savedTime;
  }, [savedTime]);

  const videoPath = filePath || currentVideo?.path;
  const duration = currentVideo?.duration ?? 0;

  // Load video when path changes
  const prevVideoPathRef = useRef<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoPath) return;

    const isNewVideo = prevVideoPathRef.current !== videoPath;
    prevVideoPathRef.current = videoPath;

    const onLoadedMetadata = () => {
      const restoreTime =
        savedTimeRef.current !== undefined &&
        savedTimeRef.current > 0 &&
        savedTimeRef.current < video.duration
          ? savedTimeRef.current
          : 0;
      video.currentTime = restoreTime;
      setCurrentTime(restoreTime);
    };

    const onTimeUpdatePlayback = () => {
      setCurrentTime(video.currentTime);
    };

    const onSeeked = () => {
      isWaitingForSeekedRef.current = false;
      if (pendingSeekTimeRef.current !== null) {
        const nextTime = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
        video.currentTime = nextTime;
        setCurrentTime(nextTime);
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdatePlayback);
    video.addEventListener('seeked', onSeeked);

    video.src = `file://${videoPath}`;
    video.load();
    setIsPlaying(false);

    if (isNewVideo) {
      savedTimeRef.current = 0;
    }

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdatePlayback);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [videoPath]);

  // Smooth time update using requestAnimationFrame during playback
  const updateTime = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  }, []);

  const startAnimationLoop = useCallback(() => {
    const loop = () => {
      updateTime();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  }, [updateTime]);

  const stopAnimationLoop = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  const onPlay = useCallback(() => {
    setIsPlaying(true);
    isPlayingStateRef.current = true;
    startAnimationLoop();
  }, [startAnimationLoop]);

  const onPause = useCallback(() => {
    setIsPlaying(false);
    isPlayingStateRef.current = false;
    stopAnimationLoop();
  }, [stopAnimationLoop]);

  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback(
    (time: number) => {
      const video = videoRef.current;
      if (!video) return;

      const clampedTime = Math.max(0, Math.min(time, duration));

      if (!isWaitingForSeekedRef.current) {
        isWaitingForSeekedRef.current = true;
        video.currentTime = clampedTime;
        setCurrentTime(clampedTime);
      } else {
        pendingSeekTimeRef.current = clampedTime;
      }
    },
    [duration],
  );

  const setVolumeLevel = useCallback((vol: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = vol;
    if (vol > 0 && video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  const getCurrentTime = useCallback(() => {
    const video = videoRef.current;
    if (video) return video.currentTime;
    const slider = document.querySelector('input[type="range"]') as HTMLInputElement | null;
    if (slider) return parseFloat(slider.value) || 0;
    return 0;
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs (except range inputs for seek)
      const target = e.target;
      if (
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLInputElement && target.type !== 'range')
      )
        return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleMute]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      stopAnimationLoop();
    };
  }, [stopAnimationLoop]);

  return {
    videoRef,
    currentTime,
    duration,
    isPlaying,
    isMuted,
    togglePlay,
    seek,
    setVolumeLevel,
    toggleMute,
    getCurrentTime,
    onTimeUpdate,
    onPlay,
    onPause,
  };
}
