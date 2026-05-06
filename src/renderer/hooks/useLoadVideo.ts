import { useCallback } from 'react';
import { useAppDispatch } from '@renderer/store/app-state';

export function useLoadVideo() {
  const dispatch = useAppDispatch();

  const loadVideo = useCallback(
    async (filePath: string) => {
      const info = await window.electronAPI.getVideoInfo(filePath);
      dispatch({
        type: 'SET_VIDEO',
        payload: { path: filePath, ...info },
      });
      dispatch({ type: 'SET_TAB', payload: 'video' });
    },
    [dispatch],
  );

  return loadVideo;
}
