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
  MessageSquare,
  MoreVertical,
} from 'lucide-react';
import { Video, Images } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { useAppState, useAppDispatch, type ActiveTab } from '@renderer/store/app-state';
import { useLoadVideo } from '@renderer/hooks/useLoadVideo';
import { Button } from '@renderer/components/ui/button';
import { ButtonGroup, ButtonGroupSeparator } from '@renderer/components/ui/button-group';
import { InputGroup, InputGroupInput, InputGroupAddon } from '@renderer/components/ui/input-group';

interface TopBarProps {
  onClip: () => void;
  onRefreshGallery: () => void;
  onTabChange: (tab: 'video' | 'gallery') => void;
  onOpenBulkConvert: () => void;
  onToggleSelectAll: () => void;
  onBulkDelete: () => void;
  onAutoCaption: () => void;
  onOpenAutoCaptionSettings: () => void;
  isAllSelected: boolean;
  isAutoCaptioning: boolean;
}

export function TopBar({
  onClip,
  onRefreshGallery,
  onTabChange,
  onOpenBulkConvert,
  onToggleSelectAll,
  onBulkDelete,
  onAutoCaption,
  onOpenAutoCaptionSettings,
  isAllSelected,
  isAutoCaptioning,
}: TopBarProps) {
  const { activeTab, clipLength, currentVideo, selectedFiles } = useAppState();
  const selectedFilesCount = selectedFiles.size;
  const dispatch = useAppDispatch();
  const loadVideo = useLoadVideo();
  const [clipLengthInput, setClipLengthInput] = useState(String(clipLength));
  const prevClipLength = useRef(clipLength);

  // Sync local input with global state
  useEffect(() => {
    if (prevClipLength.current !== clipLength) {
      prevClipLength.current = clipLength;
      setClipLengthInput(String(clipLength));
    }
  }, [clipLength]);

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
      await loadVideo(result.filePath);
    }
  }, [loadVideo]);

  return (
    <div className="bg-background flex items-center justify-between px-4 pt-4">
      {/* Left: Tabs */}
      <Tabs value={activeTab} onValueChange={(v: string) => onTabChange(v as ActiveTab)}>
        <TabsList>
          <TabsTrigger value="video">
            <Video className="h-4 w-4" />
            Video
          </TabsTrigger>
          <TabsTrigger value="gallery">
            <Images className="h-4 w-4" />
            Gallery
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Right: Action buttons */}
      <div className="flex items-center gap-2">
        {activeTab === 'video' && (
          <>
            <Button onClick={handleOpenFile} variant="ghost" title="Open File">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Open</span>
            </Button>

            {/* Clip length input */}
            <InputGroup className="h-8">
              <InputGroupInput
                type="number"
                step="0.1"
                min="0.1"
                value={clipLengthInput}
                onChange={handleClipLengthChange}
                className="max-w-16 [appearance:textfield] text-center tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <InputGroupAddon>
                <RulerDimensionLine className="h-4 w-4" />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">Seconds</InputGroupAddon>
            </InputGroup>

            <Button onClick={onClip} disabled={!currentVideo} title="Save Clip (C)">
              <Scissors className="h-4 w-4" />
              <span>Clip</span>
            </Button>
          </>
        )}

        {activeTab === 'gallery' && (
          <>
            <Button onClick={onRefreshGallery} variant="ghost" size="icon" title="Refresh Gallery">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button onClick={onToggleSelectAll} variant="ghost">
              {isAllSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              <span className="hidden sm:inline">
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </span>
            </Button>

            <ButtonGroup>
              <Button
                onClick={onAutoCaption}
                variant="secondary"
                disabled={selectedFilesCount === 0 || isAutoCaptioning}
                title="Auto-caption Selected"
                className="shrink-0"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Auto-caption</span>
              </Button>
              <ButtonGroupSeparator />
              <Button
                onClick={onOpenAutoCaptionSettings}
                variant="secondary"
                disabled={selectedFilesCount === 0 || isAutoCaptioning}
                size="icon"
                className="border-border/50 -ml-px rounded-l-none border-l"
                title="LLM API Settings"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </ButtonGroup>

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
          </>
        )}
      </div>
    </div>
  );
}
