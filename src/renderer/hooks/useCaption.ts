import { useState, useCallback, useRef, useEffect } from 'react';

export function useCaption(videoPath: string | null) {
  const [caption, setCaption] = useState('');
  const debounceRef = useRef<number | null>(null);
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

  const updateCaption = useCallback(
    (newCaption: string) => {
      setCaption(newCaption);

      // Debounce save
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = window.setTimeout(async () => {
        if (!videoPath) return;
        if (newCaption === lastSavedRef.current) return;

        await window.electronAPI.writeCaption({ filePath: videoPath, content: newCaption });
        lastSavedRef.current = newCaption;
        debounceRef.current = null;
      }, 2000);
    },
    [videoPath],
  );

  // Flush on unmount
  useEffect(() => {
    const savedDebounce = debounceRef.current;
    return () => {
      if (savedDebounce !== null) {
        clearTimeout(savedDebounce);
      }
    };
  }, []);

  return { caption, updateCaption };
}
