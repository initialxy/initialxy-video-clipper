import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppState } from '@renderer/store/app-state';

export function useVideoPlayer(savedTime?: number) {
  const { currentVideo } = useAppState();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const animFrameRef = useRef<number | null>(null);
  const isSeekingRef = useRef(false);
  const savedTimeRef = useRef(savedTime);

  useEffect(() => {
    savedTimeRef.current = savedTime;
  }, [savedTime]);

  const duration = currentVideo?.duration ?? 0;

  // Load video when path changes
  const prevVideoPathRef = useRef<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;

    const isNewVideo = prevVideoPathRef.current !== currentVideo.path;
    prevVideoPathRef.current = currentVideo.path;

    video.src = `file://${currentVideo.path}`;
    video.load();
    setCurrentTime(0);
    setIsPlaying(false);

    if (isNewVideo) {
      savedTimeRef.current = 0;
    }

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

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
  }, [currentVideo, currentVideo?.path]);

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
    startAnimationLoop();
  }, [startAnimationLoop]);

  const onPause = useCallback(() => {
    setIsPlaying(false);
    stopAnimationLoop();
  }, [stopAnimationLoop]);

  const onTimeUpdate = useCallback(() => {
    // Only update during seeking (not during playback animation loop)
    if (isSeekingRef.current) {
      const video = videoRef.current;
      if (video) {
        setCurrentTime(video.currentTime);
      }
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
      isSeekingRef.current = true;
      video.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(video.currentTime);
      // Reset seeking flag after a short delay to allow timeupdate to fire
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 100);
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
