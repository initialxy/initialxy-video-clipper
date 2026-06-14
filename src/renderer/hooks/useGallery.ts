import { useCallback, useEffect } from 'react';
import { useAppState, useAppDispatch } from '@renderer/store/app-state';

export function useGallery() {
  const { galleryFiles, selectedFiles, activeTab } = useAppState();
  const dispatch = useAppDispatch();

  const refreshGallery = useCallback(async () => {
    const result = await window.electronAPI.scanOutputs();
    dispatch({ type: 'SET_GALLERY_FILES', payload: result.files });
  }, [dispatch]);

  // Auto-refresh on mount and when switching to gallery tab
  useEffect(() => {
    refreshGallery();
  }, [refreshGallery, activeTab]);

  const toggleFileSelection = useCallback(
    (path: string) => {
      dispatch({ type: 'TOGGLE_FILE_SELECTION', payload: path });
    },
    [dispatch],
  );

  const selectAll = useCallback(
    (selected: boolean) => {
      dispatch({ type: 'SELECT_ALL_FILES', payload: selected });
    },
    [dispatch],
  );

  const isAllSelected = galleryFiles.length > 0 && selectedFiles.size === galleryFiles.length;

  const deleteFile = useCallback(
    async (path: string) => {
      await window.electronAPI.deleteClip(path);
      refreshGallery();
    },
    [refreshGallery],
  );

  return {
    galleryFiles,
    selectedFiles,
    refreshGallery,
    toggleFileSelection,
    selectAll,
    isAllSelected,
    deleteFile,
  };
}
