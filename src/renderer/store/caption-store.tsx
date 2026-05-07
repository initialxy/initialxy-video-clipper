import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface CaptionCacheValue {
  content: string;
  lastModified: number;
}

interface CaptionStoreContextValue {
  getCaption: (filePath: string) => string | undefined;
  setCaption: (filePath: string, content: string) => void;
  invalidateCaption: (filePath: string) => void;
  refreshCaption: (filePath: string) => Promise<string>;
  getCachedCount: () => number;
}

const CaptionStoreContext = createContext<CaptionStoreContextValue | null>(null);

export function CaptionStoreProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Map<string, CaptionCacheValue>>(new Map());
  const cleanupRef = useRef<(() => void) | null>(null);

  const getCaption = useCallback(
    (filePath: string): string | undefined => {
      return cache.get(filePath)?.content;
    },
    [cache],
  );

  const setCaption = useCallback((filePath: string, content: string) => {
    setCache((prev) => {
      const next = new Map(prev);
      next.set(filePath, { content, lastModified: Date.now() });
      return next;
    });
  }, []);

  const invalidateCaption = useCallback((filePath: string) => {
    setCache((prev) => {
      const next = new Map(prev);
      next.delete(filePath);
      return next;
    });
  }, []);

  const refreshCaption = useCallback(async (filePath: string): Promise<string> => {
    try {
      const result = await window.electronAPI.readCaption(filePath);
      const content = result.content ?? '';
      setCache((prev) => {
        const next = new Map(prev);
        next.set(filePath, { content, lastModified: Date.now() });
        return next;
      });
      return content;
    } catch {
      return '';
    }
  }, []);

  const getCachedCount = useCallback(() => cache.size, [cache]);

  // Listen for caption:changed events from main process
  useEffect(() => {
    const cleanup = window.electronAPI.onCaptionChanged((data) => {
      setCache((prev) => {
        const next = new Map(prev);
        next.set(data.filePath, { content: data.content, lastModified: Date.now() });
        return next;
      });
    });
    cleanupRef.current = cleanup;
    return cleanup;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <CaptionStoreContext.Provider
      value={{ getCaption, setCaption, invalidateCaption, refreshCaption, getCachedCount }}
    >
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
