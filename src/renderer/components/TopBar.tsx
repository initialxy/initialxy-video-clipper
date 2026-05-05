import { useState, useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import {
  FolderOpen,
  RefreshCw,
  Square,
  CheckSquare,
  Download,
  Scissors,
  RulerDimensionLine,
  Trash2,
} from 'lucide-react';
import { Video, Images } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { useAppState, useAppDispatch, type ActiveTab } from '@renderer/store/app-state';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';

const CLIP_LENGTH_KEY = 'clip_length';

interface TopBarProps {
  onClip: () => void;
  onRefreshGallery: () => void;
  onTabChange: (tab: 'video' | 'gallery') => void;
  onOpenBulkConvert: () => void;
  onToggleSelectAll: () => void;
  onBulkDelete: () => void;
  isAllSelected: boolean;
}

export function TopBar({
  onClip,
  onRefreshGallery,
  onTabChange,
  onOpenBulkConvert,
  onToggleSelectAll,
  onBulkDelete,
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
      dispatch({ type: 'SET_TAB', payload: 'video' });
    }
  }, [dispatch]);

  return (
    <div className="border-border/50 bg-background/80 flex items-center justify-between border-b px-4 py-2 backdrop-blur-sm">
      {/* Left: Tabs */}
      <Tabs value={activeTab} onValueChange={(v: string) => onTabChange(v as ActiveTab)}>
        <TabsList className="h-8">
          <TabsTrigger value="video" className="gap-1.5">
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
        {activeTab === 'video' && (
          <>
            <Button onClick={handleOpenFile} variant="ghost" size="sm" title="Open File">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Open</span>
            </Button>

            {/* Clip length input */}
            <div className="border-border/50 bg-muted/30 flex items-center gap-1.5 rounded-md border px-2 py-1">
              <RulerDimensionLine className="text-muted-foreground h-4 w-4" />
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={clipLengthInput}
                onChange={handleClipLengthChange}
                className="w-14 bg-transparent text-center text-sm tabular-nums outline-none"
              />
              <span className="text-muted-foreground text-sm">s</span>
            </div>

            <Button onClick={onClip} disabled={!currentVideo} title="Save Clip (C)">
              <Scissors className="h-4 w-4" />
              <span>Clip</span>
            </Button>
          </>
        )}

        {activeTab === 'gallery' && (
          <>
            <Button onClick={onToggleSelectAll} variant="ghost" size="sm">
              {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </span>
            </Button>

            <Button
              onClick={onBulkDelete}
              variant="destructive"
              disabled={selectedFilesCount === 0}
              title="Delete Selected"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>

            <Button
              onClick={onOpenBulkConvert}
              variant="default"
              disabled={selectedFilesCount === 0}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Convert</span>
            </Button>

            <Button onClick={onRefreshGallery} variant="ghost" size="icon" title="Refresh Gallery">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
