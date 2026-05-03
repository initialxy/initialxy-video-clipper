import { useState, useCallback } from 'react';

const SETTINGS = {
  CODEC: 'convert_codec',
  WIDTH: 'convert_width',
  HEIGHT: 'convert_height',
  FPS: 'convert_fps',
  BITRATE: 'convert_bitrate',
} as const;

export function useConvertSettings() {
  const [codec, setCodec] = useState('');
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [fps, setFps] = useState(0);
  const [bitrate, setBitrate] = useState('');

  const [isOpen, setIsOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    const [codecRes, widthRes, heightRes, fpsRes, bitrateRes] = await Promise.all([
      window.electronAPI.getSetting(SETTINGS.CODEC),
      window.electronAPI.getSetting(SETTINGS.WIDTH),
      window.electronAPI.getSetting(SETTINGS.HEIGHT),
      window.electronAPI.getSetting(SETTINGS.FPS),
      window.electronAPI.getSetting(SETTINGS.BITRATE),
    ]);
    setCodec(codecRes.value ?? '');
    setWidth(parseInt(widthRes.value ?? '0', 10) || 0);
    setHeight(parseInt(heightRes.value ?? '0', 10) || 0);
    setFps(parseInt(fpsRes.value ?? '0', 10) || 0);
    setBitrate(bitrateRes.value ?? '');
  }, []);

  const open = useCallback(async () => {
    setIsOpen(true);
    await loadSettings();
  }, [loadSettings]);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const saveSettings = useCallback(async () => {
    await Promise.all([
      window.electronAPI.setSetting(SETTINGS.CODEC, codec),
      window.electronAPI.setSetting(SETTINGS.WIDTH, String(width)),
      window.electronAPI.setSetting(SETTINGS.HEIGHT, String(height)),
      window.electronAPI.setSetting(SETTINGS.FPS, String(fps)),
      window.electronAPI.setSetting(SETTINGS.BITRATE, bitrate),
    ]);
  }, [codec, width, height, fps, bitrate]);

  const reset = useCallback(() => {
    setCodec('');
    setWidth(0);
    setHeight(0);
    setFps(0);
    setBitrate('');
  }, []);

  return {
    isOpen,
    open,
    close,
    codec,
    setCodec,
    width,
    setWidth,
    height,
    setHeight,
    fps,
    setFps,
    bitrate,
    setBitrate,
    saveSettings,
    reset,
  };
}
