/** Format time as MM:SS.xx */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${secs.toFixed(2).padStart(5, '0')}`;
}

/** Format a clip counter number as zero-padded 3-digit string */
export function formatCounter(n: number): string {
  return String(n).padStart(3, '0');
}

/** Get the base name of a file without extension */
export function getBaseName(filePath: string): string {
  const basename = filePath.split('/').pop() ?? filePath;
  const dotIndex = basename.lastIndexOf('.');
  return dotIndex > 0 ? basename.slice(0, dotIndex) : basename;
}

/** Get the extension of a file (with leading dot) */
export function getExtension(filePath: string): string {
  const basename = filePath.split('/').pop() ?? filePath;
  const dotIndex = basename.lastIndexOf('.');
  return dotIndex > 0 ? basename.slice(dotIndex) : '';
}

/** Get the directory of a file path */
export function getDirectory(filePath: string): string {
  const parts = filePath.split('/');
  return parts.slice(0, -1).join('/');
}

/** Get the caption file path for a video (<base_name>.txt in same directory) */
export function getCaptionPath(videoPath: string): string {
  return videoPath.replace(/\.[^.]+$/, '.txt');
}

/** Get the thumbnail file path for a video (<path>.thumb.jpg) */
export function getThumbnailPath(videoPath: string): string {
  return `${videoPath}.thumb.jpg`;
}

export type DebouncedFunction<T extends (...args: never[]) => void> = {
  (...args: Parameters<T>): void;
  cancel: () => void;
  flush: () => void;
};

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): DebouncedFunction<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, ms);
  }) as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer);
      fn();
      timer = null;
    }
  };

  return debounced;
}
