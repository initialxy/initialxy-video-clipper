import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
  useEffect,
  useRef,
} from 'react';
import type { GalleryFile, VideoInfo } from '@shared/types';

export type ActiveTab = 'video' | 'gallery';

export interface VideoState extends VideoInfo {
  path: string;
}

export interface AppState {
  activeTab: ActiveTab;
  currentVideo: VideoState | null;
  clipLength: number;
  convertCodec: string;
  convertWidth: number;
  convertHeight: number;
  convertFps: number;
  convertBitrate: string;
  galleryFiles: GalleryFile[];
  selectedFiles: Set<string>;
  expandedFile: string | null;
  isConverting: boolean;
  convertProgress: number;
  isConvertDrawerOpen: boolean;
  isBulkEditDrawerOpen: boolean;
  isAutoCaptionDrawerOpen: boolean;
  isAutoCaptioning: boolean;
  currentTime: number;
}

type AppAction =
  | { type: 'SET_TAB'; payload: ActiveTab }
  | { type: 'SET_VIDEO'; payload: VideoState | null }
  | { type: 'SET_CLIP_LENGTH'; payload: number }
  | { type: 'SET_CONVERT_CODEC'; payload: string }
  | { type: 'SET_CONVERT_WIDTH'; payload: number }
  | { type: 'SET_CONVERT_HEIGHT'; payload: number }
  | { type: 'SET_CONVERT_FPS'; payload: number }
  | { type: 'SET_CONVERT_BITRATE'; payload: string }
  | { type: 'SET_GALLERY_FILES'; payload: AppState['galleryFiles'] }
  | { type: 'TOGGLE_FILE_SELECTION'; payload: string }
  | { type: 'SELECT_ALL_FILES'; payload: boolean }
  | { type: 'SET_EXPANDED_FILE'; payload: string | null }
  | { type: 'SET_CONVERTING'; payload: boolean }
  | { type: 'SET_CONVERT_PROGRESS'; payload: number }
  | { type: 'SET_CONVERT_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_BULK_EDIT_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_AUTO_CAPTION_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_AUTO_CAPTIONING'; payload: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number };

const CLIP_LENGTH_KEY = 'clip_length';

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.payload, expandedFile: null };
    case 'SET_VIDEO':
      return { ...state, currentVideo: action.payload, currentTime: 0 };
    case 'SET_CLIP_LENGTH':
      return { ...state, clipLength: action.payload };
    case 'SET_CONVERT_CODEC':
      return { ...state, convertCodec: action.payload };
    case 'SET_CONVERT_WIDTH':
      return { ...state, convertWidth: action.payload };
    case 'SET_CONVERT_HEIGHT':
      return { ...state, convertHeight: action.payload };
    case 'SET_CONVERT_FPS':
      return { ...state, convertFps: action.payload };
    case 'SET_CONVERT_BITRATE':
      return { ...state, convertBitrate: action.payload };
    case 'SET_GALLERY_FILES':
      return { ...state, galleryFiles: action.payload };
    case 'TOGGLE_FILE_SELECTION': {
      const next = new Set(state.selectedFiles);
      if (next.has(action.payload)) {
        next.delete(action.payload);
      } else {
        next.add(action.payload);
      }
      return { ...state, selectedFiles: next };
    }
    case 'SELECT_ALL_FILES':
      return {
        ...state,
        selectedFiles: action.payload ? new Set(state.galleryFiles.map((f) => f.path)) : new Set(),
      };
    case 'SET_EXPANDED_FILE':
      return { ...state, expandedFile: action.payload };
    case 'SET_CONVERTING':
      return { ...state, isConverting: action.payload };
    case 'SET_CONVERT_PROGRESS':
      return { ...state, convertProgress: action.payload };
    case 'SET_CONVERT_DRAWER_OPEN':
      return { ...state, isConvertDrawerOpen: action.payload };
    case 'SET_BULK_EDIT_DRAWER_OPEN':
      return { ...state, isBulkEditDrawerOpen: action.payload };
    case 'SET_AUTO_CAPTION_DRAWER_OPEN':
      return { ...state, isAutoCaptionDrawerOpen: action.payload };
    case 'SET_AUTO_CAPTIONING':
      return { ...state, isAutoCaptioning: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: action.payload };
    default:
      return state;
  }
}

const initialState: AppState = {
  activeTab: 'video',
  currentVideo: null,
  clipLength: 10.0,
  convertCodec: '',
  convertWidth: 0,
  convertHeight: 0,
  convertFps: 0,
  convertBitrate: '',
  galleryFiles: [],
  selectedFiles: new Set(),
  expandedFile: null,
  isConverting: false,
  convertProgress: 0,
  isConvertDrawerOpen: false,
  isBulkEditDrawerOpen: false,
  isAutoCaptionDrawerOpen: false,
  isAutoCaptioning: false,
  currentTime: 0,
};

const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load clip length from settings on mount
  useEffect(() => {
    window.electronAPI.getSetting(CLIP_LENGTH_KEY).then((res) => {
      const val = parseFloat(res.value ?? '10');
      if (!isNaN(val) && val > 0) {
        dispatch({ type: 'SET_CLIP_LENGTH', payload: val });
      }
    });
  }, []);

  // Save clip length to settings when it changes
  const prevClipLength = useRef(state.clipLength);
  useEffect(() => {
    if (prevClipLength.current !== state.clipLength) {
      prevClipLength.current = state.clipLength;
      window.electronAPI.setSetting(CLIP_LENGTH_KEY, String(state.clipLength));
    }
  }, [state.clipLength]);

  // Load convert settings from settings on mount
  useEffect(() => {
    Promise.all([
      window.electronAPI.getSetting('convert_codec'),
      window.electronAPI.getSetting('convert_width'),
      window.electronAPI.getSetting('convert_height'),
      window.electronAPI.getSetting('convert_fps'),
      window.electronAPI.getSetting('convert_bitrate'),
    ]).then(([codecRes, widthRes, heightRes, fpsRes, bitrateRes]) => {
      const codec = codecRes.value ?? '';
      const w = parseInt(widthRes.value ?? '', 10);
      const h = parseInt(heightRes.value ?? '', 10);
      const fps = parseFloat(fpsRes.value ?? '0') || 0;
      const bitrate = bitrateRes.value ?? '';
      dispatch({ type: 'SET_CONVERT_CODEC', payload: codec });
      dispatch({ type: 'SET_CONVERT_WIDTH', payload: isNaN(w) || w <= 0 ? 0 : w });
      dispatch({ type: 'SET_CONVERT_HEIGHT', payload: isNaN(h) || h <= 0 ? 0 : h });
      dispatch({ type: 'SET_CONVERT_FPS', payload: fps });
      dispatch({ type: 'SET_CONVERT_BITRATE', payload: bitrate });
    });
  }, []);

  // Save convert settings to settings when they change
  const prevConvertCodec = useRef(state.convertCodec);
  const prevConvertWidth = useRef(state.convertWidth);
  const prevConvertHeight = useRef(state.convertHeight);
  const prevConvertFps = useRef(state.convertFps);
  const prevConvertBitrate = useRef(state.convertBitrate);
  useEffect(() => {
    const changed =
      prevConvertCodec.current !== state.convertCodec ||
      prevConvertWidth.current !== state.convertWidth ||
      prevConvertHeight.current !== state.convertHeight ||
      prevConvertFps.current !== state.convertFps ||
      prevConvertBitrate.current !== state.convertBitrate;
    if (changed) {
      prevConvertCodec.current = state.convertCodec;
      prevConvertWidth.current = state.convertWidth;
      prevConvertHeight.current = state.convertHeight;
      prevConvertFps.current = state.convertFps;
      prevConvertBitrate.current = state.convertBitrate;
      window.electronAPI.setSetting('convert_codec', state.convertCodec);
      window.electronAPI.setSetting(
        'convert_width',
        state.convertWidth ? String(state.convertWidth) : '',
      );
      window.electronAPI.setSetting(
        'convert_height',
        state.convertHeight ? String(state.convertHeight) : '',
      );
      window.electronAPI.setSetting('convert_fps', String(state.convertFps));
      window.electronAPI.setSetting('convert_bitrate', state.convertBitrate);
    }
  }, [
    state.convertCodec,
    state.convertWidth,
    state.convertHeight,
    state.convertFps,
    state.convertBitrate,
  ]);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState(): AppState {
  return useContext(AppStateContext);
}

function useAppDispatch(): Dispatch<AppAction> {
  return useContext(AppDispatchContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export { useAppDispatch };
