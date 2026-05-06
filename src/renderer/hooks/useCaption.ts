import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebouncedCallback } from '@renderer/hooks/useDebouncedCallback';

export function useCaption(videoPath: string | null) {
  const [caption, setCaption] = useState('');
  const lastSavedRef = useRef('');

  // Load caption when video path changes
  useEffect(() => {
    if (!videoPath) {
      // This is safe: reset state when the video path changes to avoid stale data
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCaption('');
      return;
    }

    window.electronAPI.readCaption(videoPath).then((result) => {
      const content = result.content ?? '';
      setCaption(content);
      lastSavedRef.current = content;
    });
  }, [videoPath]);

  const debouncedSave = useDebouncedCallback(async (newCaption: string) => {
    if (!videoPath) return;
    if (newCaption === lastSavedRef.current) return;

    await window.electronAPI.writeCaption({ filePath: videoPath, content: newCaption });
    lastSavedRef.current = newCaption;
  }, 2000);

  const updateCaption = useCallback(
    (newCaption: string) => {
      setCaption(newCaption);
      debouncedSave(newCaption);
    },
    [debouncedSave],
  );

  return { caption, updateCaption };
}
