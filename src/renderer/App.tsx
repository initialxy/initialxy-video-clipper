import { useState, useCallback, useEffect } from 'react';
import { useAppState, useAppDispatch } from '@renderer/store/app-state';
import { useClipCounter } from '@renderer/hooks/useClipCounter';
import { useGallery } from '@renderer/hooks/useGallery';
import { useToast } from '@renderer/hooks/useToast';
import { useVideoPlayer } from '@renderer/hooks/useVideoPlayer';

import { TopBar } from '@renderer/components/TopBar';
import { VideoPlayer } from '@renderer/components/VideoPlayer';
import { GalleryView } from '@renderer/components/GalleryView';
import { ExpandedPlayer } from '@renderer/components/ExpandedPlayer';
import { BulkConvertDrawer } from '@renderer/components/BulkConvertDrawer';
import { ToastContainer } from '@renderer/components/Toast';
import { DeleteConfirmModal } from '@renderer/components/DeleteConfirmModal';

function AppContent() {
  const { activeTab, currentVideo, expandedFile } = useAppState();
  const dispatch = useAppDispatch();
  const { handleClip, handleClipRemaining } = useClipCounter();
  const {
    galleryFiles,
    refreshGallery,
    toggleFileSelection,
    selectAll,
    isAllSelected,
    deleteFile,
  } = useGallery();
  const { toasts, removeToast, success, error, warning, info } = useToast();
  const { currentTime } = useVideoPlayer();

  const [showBulkConvert, setShowBulkConvert] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Define handleClipAction before it's used in useEffect
  const handleClipAction = useCallback(async () => {
    if (!currentVideo) return;

    const result = await handleClip(currentTime, (remaining, requested) => {
      warning(`Only ${remaining.toFixed(2)}s remaining (requested ${requested.toFixed(2)}s)`);
    });

    if (result.success) {
      success('Clip saved!');
      refreshGallery();
    } else if (result.error && result.error !== 'Insufficient remaining duration') {
      error(result.error);
    }
  }, [currentVideo, currentTime, handleClip, warning, success, error, refreshGallery]);

  // Listen for insufficient duration warning
  useEffect(() => {
    return window.electronAPI.onClipWarnInsufficient((data) => {
      warning(
        `Only ${data.remaining.toFixed(2)}s remaining (requested ${data.requested.toFixed(2)}s)`,
      );
    });
  }, [warning, info, handleClipRemaining, currentTime, success, error, refreshGallery]);

  // Listen for convert progress
  useEffect(() => {
    return window.electronAPI.onConvertProgress((data) => {
      dispatch({ type: 'SET_CONVERT_PROGRESS', payload: data.progress });
    });
  }, [dispatch]);

  // Listen for no-changes warning
  useEffect(() => {
    return window.electronAPI.onConvertWarnNoChanges(() => {
      warning('No conversion settings changed — files will be copied as-is.');
    });
  }, [warning]);

  // Handle clip key shortcut
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
  }, [activeTab, currentTime, handleClipAction]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteFile(deleteTarget);
    setDeleteTarget(null);
    info('Clip deleted');
  }, [deleteTarget, deleteFile, info]);

  const handleToggleSelectAll = useCallback(() => {
    selectAll(!isAllSelected);
  }, [selectAll, isAllSelected]);

  const handleCloseExpanded = useCallback(() => {
    dispatch({ type: 'SET_EXPANDED_FILE', payload: null });
  }, [dispatch]);

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      {/* Top Bar */}
      <TopBar
        onClip={handleClipAction}
        onRefreshGallery={refreshGallery}
        onOpenBulkConvert={() => setShowBulkConvert(true)}
        onToggleSelectAll={handleToggleSelectAll}
        isAllSelected={isAllSelected}
      />

      {/* Main Content */}
      <div className="flex min-h-0 flex-1">
        {expandedFile ? (
          <ExpandedPlayer filePath={expandedFile} onClose={handleCloseExpanded} />
        ) : activeTab === 'clip' ? (
          <div className="flex flex-1 flex-col p-4">
            {currentVideo ? (
              <VideoPlayer className="flex-1" />
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
              onSelectFile={(path) => toggleFileSelection(path)}
              onOpenExpanded={(path) => dispatch({ type: 'SET_EXPANDED_FILE', payload: path })}
              onDeleteFile={(path) => setDeleteTarget(path)}
            />
          </div>
        )}
      </div>

      {/* Bulk Convert Drawer */}
      <BulkConvertDrawer isOpen={showBulkConvert} onClose={() => setShowBulkConvert(false)} />

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          fileName={galleryFiles.find((f) => f.path === deleteTarget)?.name ?? 'Unknown'}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
