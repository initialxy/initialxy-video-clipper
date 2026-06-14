import { useCallback, useEffect, useState, useRef, type DragEvent } from 'react';
import { toast } from 'sonner';
import { useAppState, useAppDispatch } from '@renderer/store/app-state';
import { CaptionStoreProvider } from '@renderer/store/caption-store';
import { useGallery } from '@renderer/hooks/useGallery';
import { useLoadVideo } from '@renderer/hooks/useLoadVideo';
import { useClipAction } from '@renderer/hooks/useClipAction';
import { useAutoCaption } from '@renderer/hooks/useAutoCaption';
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
import { CircleStop } from 'lucide-react';

const BULK_CONVERT_TOAST_ID = 'bulk-convert-progress';

function AppContent() {
  const { activeTab, currentVideo, expandedFile, selectedFiles, currentTime, isAutoCaptioning } =
    useAppState();
  const dispatch = useAppDispatch();
  const { galleryFiles, refreshGallery, selectAll, isAllSelected, deleteFile } = useGallery();
  const loadVideo = useLoadVideo();

  // Extracted hooks
  const { handleClip, videoTimeRef } = useClipAction();
  const { runAutoCaption } = useAutoCaption(selectedFiles);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [expandedDeleteTarget, setExpandedDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteCount, setBulkDeleteCount] = useState<number | null>(null);

  // Drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);

  // Bulk convert progress tracking
  const convertTotalRef = useRef(0);
  const convertDoneRef = useRef(0);

  const handleTabChange = useCallback(
    (tab: 'video' | 'gallery') => {
      dispatch({ type: 'SET_TAB', payload: tab });
    },
    [dispatch],
  );

  // --- Drag & Drop ---

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

  // --- Progress Toasts ---

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
          id: 'auto-caption-progress',
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
          toast.dismiss('auto-caption-progress');
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

  // --- Keyboard Shortcuts ---

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
        handleClip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, handleClip]);

  // --- Selection ---

  const handleToggleSelectAll = useCallback(() => {
    selectAll(!isAllSelected);
  }, [selectAll, isAllSelected]);

  // --- Delete Handlers ---

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteFile(deleteTarget);
    setDeleteTarget(null);
  }, [deleteTarget, deleteFile]);

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

  const handleDeleteExpandedFile = useCallback(async () => {
    if (!expandedDeleteTarget) return;
    await deleteFile(expandedDeleteTarget);
    setExpandedDeleteTarget(null);
    dispatch({ type: 'SET_EXPANDED_FILE', payload: null });
    refreshGallery();
  }, [expandedDeleteTarget, deleteFile, dispatch, refreshGallery]);

  // --- Closers ---

  const handleCloseExpanded = useCallback(() => {
    dispatch({ type: 'SET_EXPANDED_FILE', payload: null });
  }, [dispatch]);

  const handleCloseVideo = useCallback(() => {
    dispatch({ type: 'SET_VIDEO', payload: null });
  }, [dispatch]);

  return (
    <CaptionStoreProvider>
      <div className="dark bg-background text-foreground flex h-screen flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          onClip={handleClip}
          onRefreshGallery={refreshGallery}
          onTabChange={handleTabChange}
          onOpenBulkConvert={() => {
            dispatch({ type: 'SET_CONVERT_DRAWER_OPEN', payload: true });
          }}
          onOpenBulkEdit={() => dispatch({ type: 'SET_BULK_EDIT_DRAWER_OPEN', payload: true })}
          onToggleSelectAll={handleToggleSelectAll}
          onBulkDelete={handleBulkDelete}
          onAutoCaption={() => runAutoCaption()}
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
              onAutoCaption={() => runAutoCaption(expandedFile)}
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

        {/* Drawers */}
        <AutoCaptionDrawer
          onClose={() => dispatch({ type: 'SET_AUTO_CAPTION_DRAWER_OPEN', payload: false })}
        />
        <BulkConvertDrawer
          onClose={() => {}}
          onConvertStart={(total) => {
            convertTotalRef.current = total;
            convertDoneRef.current = 0;
          }}
        />
        <BulkEditDrawer onClose={() => {}} />

        {/* Delete Confirmation Modal (single file from gallery) */}
        {deleteTarget && (
          <DeleteConfirmModal
            fileName={galleryFiles.find((f) => f.path === deleteTarget)?.name ?? 'Unknown'}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}

        {/* Delete Confirmation Modal (from expanded player) */}
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
