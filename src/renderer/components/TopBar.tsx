import { useState, useCallback, type ChangeEvent, type DragEvent } from 'react';
import { FolderOpen, RefreshCw, CheckSquare, Square, Download } from 'lucide-react';
import { useAppState, useAppDispatch, type ActiveTab } from '@renderer/store/app-state';
import { cn } from '@renderer/lib/utils';

interface TopBarProps {
  onClip: () => void;
  onRefreshGallery: () => void;
  onOpenBulkConvert: () => void;
  onToggleSelectAll: () => void;
  isAllSelected: boolean;
}

export function TopBar({
  onClip,
  onRefreshGallery,
  onOpenBulkConvert,
  onToggleSelectAll,
  isAllSelected,
}: TopBarProps) {
  const { activeTab, clipLength, currentVideo } = useAppState();
  const dispatch = useAppDispatch();
  const [clipLengthInput, setClipLengthInput] = useState(String(clipLength));

  const handleTabChange = useCallback(
    (tab: ActiveTab) => {
      dispatch({ type: 'SET_TAB', payload: tab });
    },
    [dispatch],
  );

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

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeTab !== 'clip') return;

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const path = (file as File & { path?: string }).path ?? '';
      if (!path) return;

      const result = await window.electronAPI.handleDragDrop(path);
      if (result.success) {
        const info = await window.electronAPI.getVideoInfo(path);
        dispatch({
          type: 'SET_VIDEO',
          payload: { path, ...info },
        });
      }
    },
    [activeTab, dispatch],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      className="border-border/50 bg-background/80 flex items-center justify-between border-b px-4 py-2 backdrop-blur-sm"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* Left: Tabs */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleTabChange('clip')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'clip'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
        >
          Clip
        </button>
        <button
          onClick={() => handleTabChange('gallery')}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === 'gallery'
              ? 'bg-primary/20 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
          )}
        >
          Gallery
        </button>
      </div>

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
                disabled={!currentVideo}
              />
              <span className="text-muted-foreground text-xs">s</span>
            </div>

            <button
              onClick={onClip}
              disabled={!currentVideo}
              className={cn(
                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                currentVideo
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted/50 text-muted-foreground cursor-not-allowed',
              )}
              title="Save Clip (C)"
            >
              Save Clip
            </button>
          </>
        )}

        {activeTab === 'gallery' && (
          <>
            <button
              onClick={onToggleSelectAll}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
            >
              {isAllSelected ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </span>
            </button>

            <button
              onClick={onOpenBulkConvert}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/50 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors"
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
