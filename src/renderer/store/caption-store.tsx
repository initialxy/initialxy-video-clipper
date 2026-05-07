import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface CaptionStoreContextValue {
  getCaption: (filePath: string) => string;
  setCaption: (filePath: string, content: string) => void;
  ensureLoaded: (filePath: string) => Promise<void>;
  getCachedCount: () => number;
}

const CaptionStoreContext = createContext<CaptionStoreContextValue | null>(null);

export function CaptionStoreProvider({ children }: { children: React.ReactNode }) {
  const [captions, setCaptions] = useState<Map<string, string>>(new Map());
  const saveTimerRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const getCaption = useCallback(
    (filePath: string): string => {
      return captions.get(filePath) ?? '';
    },
    [captions],
  );

  const setCaption = useCallback((filePath: string, content: string) => {
    // Update store immediately for reactive UI
    setCaptions((prev) => {
      const next = new Map(prev);
      next.set(filePath, content);
      return next;
    });

    // Debounced write to disk (2s)
    const existingTimer = saveTimerRef.current.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    const timer = setTimeout(async () => {
      try {
        await window.electronAPI.writeCaption({ filePath, content });
      } catch {
        // Silently fail — user can retry
      }
    }, 500);
    saveTimerRef.current.set(filePath, timer);
  }, []);

  const ensureLoaded = useCallback(
    async (filePath: string) => {
      if (captions.has(filePath)) return;
      try {
        const result = await window.electronAPI.readCaption(filePath);
        const content = result.content ?? '';
        setCaptions((prev) => {
          const next = new Map(prev);
          next.set(filePath, content);
          return next;
        });
      } catch {
        // Silently fail — caption file may not exist yet
      }
    },
    [captions],
  );

  const getCachedCount = useCallback(() => captions.size, [captions]);

  // Listen for caption:changed events from main process (auto-caption, other tabs)
  useEffect(() => {
    const cleanup = window.electronAPI.onCaptionChanged((data) => {
      setCaptions((prev) => {
        const next = new Map(prev);
        next.set(data.filePath, data.content);
        return next;
      });
    });
    return cleanup;
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = saveTimerRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return (
    <CaptionStoreContext.Provider value={{ getCaption, setCaption, ensureLoaded, getCachedCount }}>
      {children}
    </CaptionStoreContext.Provider>
  );
}

export function useCaptionStore() {
  const context = useContext(CaptionStoreContext);
  if (!context) {
    throw new Error('useCaptionStore must be used within CaptionStoreProvider');
  }
  return context;
}
