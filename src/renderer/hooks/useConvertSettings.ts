import { useState, useCallback } from 'react';
import { SETTINGS_KEYS } from '@shared/constants';

export function useConvertSettings() {
  const [codec, setCodec] = useState('');
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [fps, setFps] = useState(0);
  const [bitrate, setBitrate] = useState('');

  const loadSettings = useCallback(async () => {
    const [codecRes, widthRes, heightRes, fpsRes, bitrateRes] = await Promise.all([
      window.electronAPI.getSetting(SETTINGS_KEYS.CONVERT_CODEC),
      window.electronAPI.getSetting(SETTINGS_KEYS.CONVERT_WIDTH),
      window.electronAPI.getSetting(SETTINGS_KEYS.CONVERT_HEIGHT),
      window.electronAPI.getSetting(SETTINGS_KEYS.CONVERT_FPS),
      window.electronAPI.getSetting(SETTINGS_KEYS.CONVERT_BITRATE),
    ]);
    setCodec(codecRes.value ?? '');
    const w = parseInt(widthRes.value ?? '', 10);
    setWidth(isNaN(w) || w <= 0 ? 0 : w);
    const h = parseInt(heightRes.value ?? '', 10);
    setHeight(isNaN(h) || h <= 0 ? 0 : h);
    setFps(parseFloat(fpsRes.value ?? '0') || 0);
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
      window.electronAPI.setSetting(SETTINGS_KEYS.CONVERT_CODEC, codec),
      window.electronAPI.setSetting(SETTINGS_KEYS.CONVERT_WIDTH, width ? String(width) : ''),
      window.electronAPI.setSetting(SETTINGS_KEYS.CONVERT_HEIGHT, height ? String(height) : ''),
      window.electronAPI.setSetting(SETTINGS_KEYS.CONVERT_FPS, String(fps)),
      window.electronAPI.setSetting(SETTINGS_KEYS.CONVERT_BITRATE, bitrate),
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
