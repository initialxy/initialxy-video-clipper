import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { useAppState, useAppDispatch } from '@renderer/store/app-state';
import { useClipCounter } from '@renderer/hooks/useClipCounter';
import { useGallery } from '@renderer/hooks/useGallery';
import { useVideoPlayer } from '@renderer/hooks/useVideoPlayer';
import { useConvertSettings } from '@renderer/hooks/useConvertSettings';

import { TopBar } from '@renderer/components/TopBar';
import { VideoPlayer } from '@renderer/components/VideoPlayer';
import { GalleryView } from '@renderer/components/GalleryView';
import { ExpandedPlayer } from '@renderer/components/ExpandedPlayer';
import { BulkConvertDrawer } from '@renderer/components/BulkConvertDrawer';
import { DeleteConfirmModal } from '@renderer/components/DeleteConfirmModal';
import { Toaster } from '@renderer/components/ui/sonner';
import { cn } from '@renderer/lib/utils';

function AppContent() {
  const { activeTab, currentVideo, expandedFile } = useAppState();
  const dispatch = useAppDispatch();
  const { handleClip } = useClipCounter();
  const { galleryFiles, refreshGallery, selectAll, isAllSelected, deleteFile } = useGallery();
  const { getCurrentTime } = useVideoPlayer();
  const convertSettings = useConvertSettings();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    async (filePath: string) => {
      const info = await window.electronAPI.getVideoInfo(filePath);
      dispatch({
        type: 'SET_VIDEO',
        payload: { path: filePath, ...info },
      });
      dispatch({ type: 'SET_TAB', payload: 'clip' });
    },
    [dispatch],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (activeTab === 'clip') {
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
      if (activeTab !== 'clip') return;

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

    const result = await handleClip(getCurrentTime(), (_remaining, requested) => {
      const clipRemaining = currentVideo.duration - getCurrentTime();
      if (clipRemaining > 0 && clipRemaining < requested) {
        window.electronAPI
          .createClip({
            inputPath: currentVideo.path,
            outputPath: '',
            start: getCurrentTime(),
            duration: clipRemaining,
          })
          .then((clipResult) => {
            if (clipResult.success) {
              refreshGallery();
            }
          });
      }
    });

    if (result.success) {
      refreshGallery();
    }
  }, [currentVideo, getCurrentTime, handleClip, refreshGallery]);

  useEffect(() => {
    return window.electronAPI.onConvertProgress((data) => {
      dispatch({ type: 'SET_CONVERT_PROGRESS', payload: data.progress });
    });
  }, [dispatch]);

  useEffect(() => {
    return window.electronAPI.onConvertWarnNoChanges(() => {
      if (!currentVideo) return;
      const clipRemaining = currentVideo.duration - getCurrentTime();
      if (clipRemaining > 0) {
        window.electronAPI
          .createClip({
            inputPath: currentVideo.path,
            outputPath: '',
            start: getCurrentTime(),
            duration: clipRemaining,
          })
          .then((clipResult) => {
            if (clipResult.success) {
              refreshGallery();
            }
          });
      }
    });
  }, [currentVideo, getCurrentTime, refreshGallery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab !== 'clip') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
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

  const handleCloseExpanded = useCallback(() => {
    dispatch({ type: 'SET_EXPANDED_FILE', payload: null });
  }, [dispatch]);

  const handleCloseVideo = useCallback(() => {
    dispatch({ type: 'SET_VIDEO', payload: null });
  }, [dispatch]);

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      {/* Top Bar */}
      <TopBar
        onClip={handleClipAction}
        onRefreshGallery={refreshGallery}
        onOpenBulkConvert={convertSettings.open}
        onToggleSelectAll={handleToggleSelectAll}
        isAllSelected={isAllSelected}
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
          <ExpandedPlayer filePath={expandedFile} onClose={handleCloseExpanded} />
        ) : activeTab === 'clip' ? (
          <div className="flex flex-1 flex-col p-4">
            {currentVideo ? (
              <VideoPlayer className="flex-1" onClose={handleCloseVideo} />
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

      {/* Bulk Convert Drawer */}
      <BulkConvertDrawer onClose={convertSettings.close} />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          fileName={galleryFiles.find((f) => f.path === deleteTarget)?.name ?? 'Unknown'}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <Toaster />
    </div>
  );
}

function App() {
  const dispatch = useAppDispatch();

  // Dev-mode debug hook: window.__loadVideo('/path/to/video.mp4')
  // Allows automated testing without manual file dialogs
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as Record<string, unknown>).__loadVideo = async (filePath: string) => {
        const info = await window.electronAPI.getVideoInfo(filePath);
        dispatch({
          type: 'SET_VIDEO',
          payload: { path: filePath, ...info },
        });
      };
    }
  }, [dispatch]);

  return <AppContent />;
}

export default App;
