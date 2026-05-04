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

  const loadSettings = useCallback(async () => {
    const [codecRes, widthRes, heightRes, fpsRes, bitrateRes] = await Promise.all([
      window.electronAPI.getSetting(SETTINGS.CODEC),
      window.electronAPI.getSetting(SETTINGS.WIDTH),
      window.electronAPI.getSetting(SETTINGS.HEIGHT),
      window.electronAPI.getSetting(SETTINGS.FPS),
      window.electronAPI.getSetting(SETTINGS.BITRATE),
    ]);
    setCodec(codecRes.value ?? '');
    const w = parseInt(widthRes.value ?? '', 10);
    setWidth(isNaN(w) || w <= 0 ? 0 : w);
    const h = parseInt(heightRes.value ?? '', 10);
    setHeight(isNaN(h) || h <= 0 ? 0 : h);
    setFps(parseInt(fpsRes.value ?? '0', 10) || 0);
    setBitrate(bitrateRes.value ?? '');
  }, []);

  const open = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  const close = useCallback(() => {
    // no-op, controlled by app state
  }, []);

  const saveSettings = useCallback(async () => {
    await Promise.all([
      window.electronAPI.setSetting(SETTINGS.CODEC, codec),
      window.electronAPI.setSetting(SETTINGS.WIDTH, width ? String(width) : ''),
      window.electronAPI.setSetting(SETTINGS.HEIGHT, height ? String(height) : ''),
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
