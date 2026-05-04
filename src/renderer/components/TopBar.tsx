import { useState, useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import { FolderOpen, RefreshCw, Square, CheckSquare, Download, Scissors } from 'lucide-react';
import { Video, Images } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { useAppState, useAppDispatch, type ActiveTab } from '@renderer/store/app-state';
import { cn } from '@renderer/lib/utils';

const CLIP_LENGTH_KEY = 'clip_length';

interface TopBarProps {
  onClip: () => void;
  onRefreshGallery: () => void;
  onTabChange: (tab: 'clip' | 'gallery') => void;
  onOpenBulkConvert: () => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
}

export function TopBar({
  onClip,
  onRefreshGallery,
  onTabChange,
  onOpenBulkConvert,
  onToggleSelectAll,
  isAllSelected,
}: TopBarProps) {
  const { activeTab, clipLength, currentVideo, selectedFiles } = useAppState();
  const selectedFilesCount = selectedFiles.size;
  const dispatch = useAppDispatch();
  const [clipLengthInput, setClipLengthInput] = useState(String(clipLength));
  const prevClipLength = useRef(clipLength);

  // Sync local input with global state
  useEffect(() => {
    if (prevClipLength.current !== clipLength) {
      prevClipLength.current = clipLength;
      setClipLengthInput(String(clipLength));
    }
  }, [clipLength]);

  // Persist clip length to settings
  const prevInputRef = useRef(clipLengthInput);
  useEffect(() => {
    if (prevInputRef.current !== clipLengthInput) {
      prevInputRef.current = clipLengthInput;
      const val = parseFloat(clipLengthInput);
      if (!isNaN(val) && val > 0) {
        window.electronAPI.setSetting(CLIP_LENGTH_KEY, String(val));
      }
    }
  }, [clipLengthInput]);

  const handleClipLengthChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setClipLengthInput(e.target.value);
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val > 0) {
        dispatch({ type: 'SET_CLIP_LENGTH', payload: val });
      }
    },
    [dispatch],
  );

  const handleOpenFile = useCallback(async () => {
    const result = await window.electronAPI.openFile();
    if (!result.cancelled && result.filePath) {
      const info = await window.electronAPI.getVideoInfo(result.filePath);
      dispatch({
        type: 'SET_VIDEO',
        payload: { path: result.filePath, ...info },
      });
      dispatch({ type: 'SET_TAB', payload: 'clip' });
    }
  }, [dispatch]);

  return (
    <div className="border-border/50 bg-background/80 flex items-center justify-between border-b px-4 py-2 backdrop-blur-sm">
      {/* Left: Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as ActiveTab)}>
        <TabsList className="h-8">
          <TabsTrigger value="clip" className="gap-1.5">
            <Video className="h-4 w-4" />
            <span>Video</span>
          </TabsTrigger>
          <TabsTrigger value="gallery" className="gap-1.5">
            <Images className="h-4 w-4" />
            <span>Gallery</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {activeTab === 'clip' && (
          <>
            <button
              onClick={handleOpenFile}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
              title="Open File"
            >
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Open</span>
            </button>

            {/* Clip length input */}
            <div className="border-border/50 bg-muted/30 flex items-center gap-1.5 rounded-md border px-2 py-1">
              <label className="text-muted-foreground text-xs">Length:</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={clipLengthInput}
                onChange={handleClipLengthChange}
                className="w-14 bg-transparent text-center text-sm tabular-nums outline-none"
              />
              <span className="text-muted-foreground text-xs">s</span>
            </div>

            <button
              onClick={onClip}
              disabled={!currentVideo}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                currentVideo
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted/50 text-muted-foreground cursor-not-allowed',
              )}
              title="Save Clip (C)"
            >
              <Scissors className="h-4 w-4" />
              <span>Clip</span>
            </button>
          </>
        )}

        {activeTab === 'gallery' && (
          <>
            <button
              onClick={onToggleSelectAll}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
            >
              {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </span>
            </button>

            <button
              onClick={onOpenBulkConvert}
              disabled={selectedFilesCount === 0}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                selectedFilesCount > 0
                  ? 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  : 'text-muted-foreground/30 cursor-not-allowed',
              )}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Bulk Convert</span>
            </button>

            <button
              onClick={onRefreshGallery}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
              title="Refresh Gallery"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
