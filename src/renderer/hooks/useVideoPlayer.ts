import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppState } from '@renderer/store/app-state';
import { isInputFocused } from '@renderer/lib/utils';

interface UseVideoPlayerOptions {
  useGlobalState?: boolean;
  autoPlay?: boolean;
}

export function useVideoPlayer(filePath?: string, options?: UseVideoPlayerOptions) {
  const { currentTime } = useAppState();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playerTime, setPlayerTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);
  const animFrameRef = useRef<number | null>(null);
  const isPlayingStateRef = useRef(false);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const isWaitingForSeekedRef = useRef(false);
  const useGlobalState = options?.useGlobalState ?? false;

  const currentTimeRef = useRef<number>(0);
  /* eslint-disable-next-line react-hooks/refs */
  currentTimeRef.current = useGlobalState ? currentTime : 0;

  // Load video when path changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !filePath) return;

    const onLoadedMetadata = () => {
      setVideoDuration(video.duration);
      if (useGlobalState) {
        const restoreTime =
          currentTimeRef.current > 0 && currentTimeRef.current < video.duration
            ? currentTimeRef.current
            : 0;
        setPlayerTime(restoreTime);
        video.currentTime = restoreTime;
        if (options?.autoPlay && restoreTime === 0) {
          video.play().catch(() => {});
        }
      } else {
        setPlayerTime(0);
        video.currentTime = 0;
        if (options?.autoPlay) {
          video.play().catch(() => {});
        }
      }
    };

    const onTimeUpdatePlayback = () => {
      setPlayerTime(video.currentTime);
    };

    const onSeeked = () => {
      isWaitingForSeekedRef.current = false;
      if (pendingSeekTimeRef.current !== null) {
        const nextTime = pendingSeekTimeRef.current;
        pendingSeekTimeRef.current = null;
        video.currentTime = nextTime;
        setPlayerTime(nextTime);
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdatePlayback);
    video.addEventListener('seeked', onSeeked);

    video.src = `file://${filePath}`;
    video.load();
    setIsPlaying(false);

    return () => {
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdatePlayback);
      video.removeEventListener('seeked', onSeeked);
    };
  }, [filePath, useGlobalState, options?.autoPlay]);

  const updateTime = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setPlayerTime(video.currentTime);
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
      setPlayerTime(video.currentTime);
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

      const clampedTime = Math.max(0, Math.min(time, videoDuration));

      if (!isWaitingForSeekedRef.current) {
        isWaitingForSeekedRef.current = true;
        video.currentTime = clampedTime;
        setPlayerTime(clampedTime);
      } else {
        pendingSeekTimeRef.current = clampedTime;
      }
    },
    [videoDuration],
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

  // Global keyboard shortcuts (only in global mode)
  useEffect(() => {
    if (!useGlobalState) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;

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
  }, [togglePlay, toggleMute, useGlobalState]);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      stopAnimationLoop();
    };
  }, [stopAnimationLoop]);

  return {
    videoRef,
    currentTime: playerTime,
    duration: videoDuration,
    isPlaying,
    isMuted,
    togglePlay,
    seek,
    setVolumeLevel,
    toggleMute,
    onTimeUpdate,
    onPlay,
    onPause,
  };
}
