import { useCallback, useEffect, useState, useRef, type DragEvent } from 'react';
import { toast } from 'sonner';
import { useAppState, useAppDispatch } from '@renderer/store/app-state';
import { CaptionStoreProvider } from '@renderer/store/caption-store';
import { useGallery } from '@renderer/hooks/useGallery';
import { useLoadVideo } from '@renderer/hooks/useLoadVideo';
import { TopBar } from '@renderer/components/TopBar';
import { VideoPlayer } from '@renderer/components/VideoPlayer';
import { GalleryView } from '@renderer/components/GalleryView';
import { ExpandedPlayer } from '@renderer/components/ExpandedPlayer';
import { BulkConvertDrawer } from '@renderer/components/BulkConvertDrawer';
import { BulkEditDrawer } from '@renderer/components/BulkEditDrawer';
import { DeleteConfirmModal } from '@renderer/components/DeleteConfirmModal';
import { AutoCaptionDrawer } from '@renderer/components/AutoCaptionDrawer';
import { Toaster } from '@renderer/components/ui/sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { cn } from '@renderer/lib/utils';
import { SETTINGS_KEYS } from '@shared/constants';
import type { AutoCaptionResult } from '@shared/types';
import { CircleStop } from 'lucide-react';

const AUTO_CAPTION_TOAST_ID = 'auto-caption-progress';
const BULK_CONVERT_TOAST_ID = 'bulk-convert-progress';

function AppContent() {
  const {
    activeTab,
    currentVideo,
    expandedFile,
    selectedFiles,
    currentTime,
    clipLength,
    isAutoCaptioning,
  } = useAppState();
  const dispatch = useAppDispatch();
  const { galleryFiles, refreshGallery, selectAll, isAllSelected, deleteFile } = useGallery();
  const loadVideo = useLoadVideo();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedDeleteTarget, setExpandedDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteCount, setBulkDeleteCount] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const convertTotalRef = useRef(0);
  const convertDoneRef = useRef(0);
  const videoTimeRef = useRef(0);

  const handleTabChange = useCallback(
    (tab: 'video' | 'gallery') => {
      dispatch({ type: 'SET_TAB', payload: tab });
    },
    [dispatch],
  );

  const handleDrop = useCallback(
    async (filePath: string) => {
      await loadVideo(filePath);
    },
    [loadVideo],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (activeTab === 'video') {
        setIsDragOver(true);
      }
    },
    [activeTab],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDropMain = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (activeTab !== 'video') return;

      const items = e.dataTransfer.items;
      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            const entry = items[i].webkitGetAsEntry();
            if (entry?.isFile) {
              const file = items[i].getAsFile();
              if (file) {
                const path = window.electronAPI.getPathForFile(file);
                if (path) {
                  await handleDrop(path);
                  return;
                }
              }
            }
          }
        }
      }

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const path = window.electronAPI.getPathForFile(files[0]);
        if (path) {
          await handleDrop(path);
        }
      }
    },
    [activeTab, handleDrop],
  );

  const handleClipAction = useCallback(async () => {
    if (!currentVideo) return;
    const actualTime = videoTimeRef.current;
    const remaining = currentVideo.duration - actualTime;

    // remaining <= 0 falls through here — clips last n seconds with warning
    if (remaining < clipLength) {
      if (currentVideo.duration < clipLength) {
        toast.error(`Cannot save clip — video is only ${currentVideo.duration.toFixed(2)}s long`);
        return;
      }

      const start = currentVideo.duration - clipLength;
      const result = await window.electronAPI.createClip({
        inputPath: currentVideo.path,
        outputPath: '',
        start,
        duration: clipLength,
      });

      if (result.success) {
        refreshGallery();
        toast.warning(`Clipped last ${clipLength}s instead`);
      } else if (result.error) {
        toast.error(result.error);
      }
      return;
    }

    const result = await window.electronAPI.createClip({
      inputPath: currentVideo.path,
      outputPath: '',
      start: actualTime,
      duration: clipLength,
    });

    if (result.success) {
      refreshGallery();
      toast.success('Clip saved');
    } else if (result.error) {
      toast.error(result.error);
    }
  }, [currentVideo, clipLength, refreshGallery]);

  useEffect(() => {
    return window.electronAPI.onConvertProgress((data) => {
      if (data.status === 'converting') {
        toast.loading(`Converting ${data.file}… ${data.current}/${data.total}`, {
          duration: Infinity,
          id: BULK_CONVERT_TOAST_ID,
        });
      } else if (data.status === 'done' || data.status === 'error') {
        convertDoneRef.current++;
        if (convertDoneRef.current === convertTotalRef.current) {
          toast.dismiss(BULK_CONVERT_TOAST_ID);
        }
      }
    });
  }, []);

  useEffect(() => {
    return window.electronAPI.onAutoCaptionProgress((data) => {
      if (data.status === 'processing') {
        toast.loading(`Auto-captioning ${data.current}/${data.total} file(s)`, {
          duration: Infinity,
          id: AUTO_CAPTION_TOAST_ID,
          action: {
            label: <CircleStop className="text-destructive h-4 w-4" />,
            onClick: () => {
              window.electronAPI.autoCaptionInterrupt();
              dispatch({ type: 'SET_AUTO_CAPTIONING', payload: false });
            },
          },
        });
      } else if (data.status === 'done' || data.status === 'error') {
        if (data.current === data.total) {
          toast.dismiss(AUTO_CAPTION_TOAST_ID);
        }
      }
    });
  }, [dispatch]);

  useEffect(() => {
    return window.electronAPI.onConvertWarnNoChanges(() => {
      if (!currentVideo) return;
      const clipRemaining = currentVideo.duration - currentTime;
      if (clipRemaining > 0) {
        window.electronAPI
          .createClip({
            inputPath: currentVideo.path,
            outputPath: '',
            start: currentTime,
            duration: clipRemaining,
          })
          .then((clipResult) => {
            if (clipResult.success) {
              refreshGallery();
            }
          });
      }
    });
  }, [currentVideo, currentTime, refreshGallery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'video') return;
      const target = e.target;
      if (target instanceof HTMLTextAreaElement) return;
      if (
        target instanceof HTMLInputElement &&
        (target.type === 'text' ||
          target.type === 'number' ||
          target.type === 'email' ||
          target.type === 'password' ||
          target.type === 'search')
      )
        return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        handleClipAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleClipAction]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteFile(deleteTarget);
    setDeleteTarget(null);
  }, [deleteTarget, deleteFile]);

  const handleToggleSelectAll = useCallback(() => {
    selectAll(!isAllSelected);
  }, [selectAll, isAllSelected]);

  const handleBulkDelete = useCallback(() => {
    if (selectedFiles.size === 0) return;
    setBulkDeleteCount(selectedFiles.size);
  }, [selectedFiles]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (!bulkDeleteCount) return;
    const paths = Array.from(selectedFiles);
    const result = await window.electronAPI.bulkDelete({ paths });
    setBulkDeleteCount(null);
    if (result.success) {
      dispatch({ type: 'SELECT_ALL_FILES', payload: false });
      refreshGallery();
      toast.success(`${paths.length} file(s) deleted`);
    } else if (result.errors?.length) {
      toast.error(`${result.errors.length} file(s) failed to delete`);
    }
  }, [bulkDeleteCount, selectedFiles, dispatch, refreshGallery]);

  const handleCloseExpanded = useCallback(() => {
    dispatch({ type: 'SET_EXPANDED_FILE', payload: null });
  }, [dispatch]);

  const handleCloseVideo = useCallback(() => {
    dispatch({ type: 'SET_VIDEO', payload: null });
  }, [dispatch]);

  const handleDeleteExpandedFile = useCallback(async () => {
    if (!expandedDeleteTarget) return;
    await deleteFile(expandedDeleteTarget);
    setExpandedDeleteTarget(null);
    dispatch({ type: 'SET_EXPANDED_FILE', payload: null });
    refreshGallery();
  }, [expandedDeleteTarget, deleteFile, dispatch, refreshGallery]);

  const loadAutoCaptionConfig = useCallback(async (): Promise<{
    baseUrl: string;
    model: string;
    apiKey: string;
  }> => {
    const res = await window.electronAPI.getSetting(SETTINGS_KEYS.AUTO_CAPTION_CONFIG);
    if (res.value) {
      try {
        return JSON.parse(res.value) as { baseUrl: string; model: string; apiKey: string };
      } catch {
        // fall through
      }
    }
    return { baseUrl: 'http://localhost:8080', model: 'model', apiKey: 'DUMMY' };
  }, []);

  const handleAutoCaption = useCallback(
    async (filePath?: string) => {
      const files = filePath ? [filePath] : Array.from(selectedFiles);
      if (files.length === 0) return;

      dispatch({ type: 'SET_AUTO_CAPTIONING', payload: true });

      const config = await loadAutoCaptionConfig();

      try {
        const res = await window.electronAPI.autoCaptionRun({ files, config });
        const results = res.results ?? [];
        const succeeded = results.filter((r: AutoCaptionResult) => r.success).length;
        const failed = results.filter((r: AutoCaptionResult) => !r.success).length;

        toast.dismiss(AUTO_CAPTION_TOAST_ID);

        if (failed > 0) {
          toast.error(`Auto-caption failed for ${failed} file(s)`);
        } else {
          toast.info(`Auto-captioned ${succeeded} file(s)`);
        }
        refreshGallery();
      } catch {
        toast.dismiss(AUTO_CAPTION_TOAST_ID);
        toast.error('Auto-caption failed');
      } finally {
        dispatch({ type: 'SET_AUTO_CAPTIONING', payload: false });
      }
    },
    [selectedFiles, dispatch, loadAutoCaptionConfig, refreshGallery],
  );

  return (
    <CaptionStoreProvider>
      <div className="dark bg-background text-foreground flex h-screen flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          onClip={handleClipAction}
          onRefreshGallery={refreshGallery}
          onTabChange={handleTabChange}
          onOpenBulkConvert={() => {
            dispatch({ type: 'SET_CONVERT_DRAWER_OPEN', payload: true });
          }}
          onOpenBulkEdit={() => dispatch({ type: 'SET_BULK_EDIT_DRAWER_OPEN', payload: true })}
          onToggleSelectAll={handleToggleSelectAll}
          onBulkDelete={handleBulkDelete}
          onAutoCaption={() => handleAutoCaption()}
          onOpenAutoCaptionSettings={() =>
            dispatch({ type: 'SET_AUTO_CAPTION_DRAWER_OPEN', payload: true })
          }
          isAllSelected={isAllSelected}
          isAutoCaptioning={isAutoCaptioning}
        />

        {/* Main Content */}
        <div
          className={cn(
            'flex min-h-0 flex-1 transition-colors',
            isDragOver && 'border-primary/50 bg-primary/5',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDropMain}
        >
          {expandedFile ? (
            <ExpandedPlayer
              filePath={expandedFile}
              onClose={handleCloseExpanded}
              onAutoCaption={handleAutoCaption}
              onDelete={() => setExpandedDeleteTarget(expandedFile)}
            />
          ) : activeTab === 'video' ? (
            <div className="flex min-h-0 flex-1 flex-col p-4">
              {currentVideo ? (
                <VideoPlayer
                  className="flex-1"
                  onClose={handleCloseVideo}
                  currentTimeRef={videoTimeRef}
                  autoPlay
                />
              ) : (
                <div className="flex flex-1 items-center justify-center">
                  <div className="text-muted-foreground text-center">
                    <p className="text-lg">No video loaded</p>
                    <p className="mt-1 text-sm">Drag a video file here or click Open</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <GalleryView
                onOpenExpanded={(path) => dispatch({ type: 'SET_EXPANDED_FILE', payload: path })}
                onDeleteFile={(path) => setDeleteTarget(path)}
              />
            </div>
          )}
        </div>

        {/* LLM API Settings Drawer */}
        <AutoCaptionDrawer
          onClose={() => dispatch({ type: 'SET_AUTO_CAPTION_DRAWER_OPEN', payload: false })}
        />

        {/* Bulk Convert Drawer */}
        <BulkConvertDrawer
          onClose={() => {}}
          onConvertStart={(total) => {
            convertTotalRef.current = total;
            convertDoneRef.current = 0;
          }}
        />

        {/* Bulk Edit Drawer */}
        <BulkEditDrawer onClose={() => {}} />

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <DeleteConfirmModal
            fileName={galleryFiles.find((f) => f.path === deleteTarget)?.name ?? 'Unknown'}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}

        {/* Expanded Player Delete Confirmation Modal */}
        {expandedDeleteTarget && (
          <DeleteConfirmModal
            fileName={galleryFiles.find((f) => f.path === expandedDeleteTarget)?.name ?? 'Unknown'}
            onConfirm={handleDeleteExpandedFile}
            onCancel={() => setExpandedDeleteTarget(null)}
          />
        )}

        {/* Bulk Delete Confirmation Modal */}
        {bulkDeleteCount !== null && (
          <Dialog open={true} onOpenChange={(open) => !open && setBulkDeleteCount(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Clips</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete{' '}
                  <span className="text-foreground font-medium">{bulkDeleteCount} file(s)</span>?
                  This will also remove their caption files.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBulkDeleteCount(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleBulkDeleteConfirm}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        <Toaster
          toastOptions={{
            style: {
              background: 'var(--background)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            },
          }}
        />
      </div>
    </CaptionStoreProvider>
  );
}

function App() {
  const dispatch = useAppDispatch();

  // Dev-mode debug hooks: __loadVideo, __setVideoTime, __getVideoTime, __seekAndWait
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__loadVideo = async (filePath: string) => {
      const info = await window.electronAPI.getVideoInfo(filePath);
      dispatch({
        type: 'SET_VIDEO',
        payload: { path: filePath, ...info },
      });
    };
    (window as unknown as Record<string, unknown>).__setVideoTime = (time: number) => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (video) {
        video.currentTime = time;
      }
    };
    (window as unknown as Record<string, unknown>).__getVideoTime = () => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      const slider = document.querySelector('input[type="range"]') as HTMLInputElement | null;
      return {
        videoCurrentTime: video ? video.currentTime : 'no video element',
        sliderValue: slider ? slider.value : 'no slider',
      };
    };
    (window as unknown as Record<string, unknown>).__seekAndWait = async (time: number) => {
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (!video) return { error: 'no video' };
      return new Promise((resolve) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          resolve({ actualTime: video.currentTime, requestedTime: time });
        };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = time;
      });
    };
  }, [dispatch]);

  return <AppContent />;
}

export default App;
