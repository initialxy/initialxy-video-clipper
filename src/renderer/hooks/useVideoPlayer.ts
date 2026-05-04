import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppState } from '@renderer/store/app-state';

export function useVideoPlayer() {
  const { currentVideo } = useAppState();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const duration = currentVideo?.duration ?? 0;

  // Load video when path changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;

    video.src = `file://${currentVideo.path}`;
    video.load();
    setCurrentTime(0);
    setIsPlaying(false);

    const onLoadedMetadata = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', onLoadedMetadata);
  }, [currentVideo, currentVideo?.path]);

  // Track time updates
  const onTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  }, []);

  const onPlay = useCallback(() => setIsPlaying(true), []);
  const onPause = useCallback(() => setIsPlaying(false), []);

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
      video.currentTime = Math.max(0, Math.min(time, duration));
      setCurrentTime(video.currentTime);
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
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

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
