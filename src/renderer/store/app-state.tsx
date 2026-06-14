import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';
import type { GalleryFile, VideoInfo } from '@shared/types';
import { SETTINGS_KEYS } from '@shared/constants';
import { useSettingsSync } from '@renderer/hooks/useSettingsSync';

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
  convertFlipped: boolean;
  galleryFiles: GalleryFile[];
  selectedFiles: Set<string>;
  expandedFile: string | null;
  isConverting: boolean;
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
  | { type: 'SET_CONVERT_FLIPPED'; payload: boolean }
  | { type: 'SET_GALLERY_FILES'; payload: AppState['galleryFiles'] }
  | { type: 'TOGGLE_FILE_SELECTION'; payload: string }
  | { type: 'SELECT_ALL_FILES'; payload: boolean }
  | { type: 'SET_EXPANDED_FILE'; payload: string | null }
  | { type: 'SET_CONVERTING'; payload: boolean }
  | { type: 'SET_CONVERT_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_BULK_EDIT_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_AUTO_CAPTION_DRAWER_OPEN'; payload: boolean }
  | { type: 'SET_AUTO_CAPTIONING'; payload: boolean }
  | { type: 'SET_CURRENT_TIME'; payload: number };

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
    case 'SET_CONVERT_FLIPPED':
      return { ...state, convertFlipped: action.payload };
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
  convertFlipped: false,
  galleryFiles: [],
  selectedFiles: new Set(),
  expandedFile: null,
  isConverting: false,
  isConvertDrawerOpen: false,
  isBulkEditDrawerOpen: false,
  isAutoCaptionDrawerOpen: false,
  isAutoCaptioning: false,
  currentTime: 0,
};

const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {});

// Stable setting definitions — defined outside component to avoid recreation
const SETTINGS_DEFS = [
  {
    key: SETTINGS_KEYS.CLIP_LENGTH,
    actionType: 'SET_CLIP_LENGTH' as const,
    parse: (raw: string | undefined) => {
      const val = parseFloat(raw ?? '10');
      return isNaN(val) || val <= 0 ? 10 : val;
    },
    serialize: (v: unknown) => String(v),
    getValue: (s: AppState) => s.clipLength,
  },
  {
    key: SETTINGS_KEYS.CONVERT_CODEC,
    actionType: 'SET_CONVERT_CODEC' as const,
    parse: (raw: string | undefined) => raw ?? '',
    serialize: (v: unknown) => v as string,
    getValue: (s: AppState) => s.convertCodec,
  },
  {
    key: SETTINGS_KEYS.CONVERT_WIDTH,
    actionType: 'SET_CONVERT_WIDTH' as const,
    parse: (raw: string | undefined) => {
      const w = parseInt(raw ?? '', 10);
      return isNaN(w) || w <= 0 ? 0 : w;
    },
    serialize: (v: unknown) => ((v as number) ? String(v) : ''),
    getValue: (s: AppState) => s.convertWidth,
  },
  {
    key: SETTINGS_KEYS.CONVERT_HEIGHT,
    actionType: 'SET_CONVERT_HEIGHT' as const,
    parse: (raw: string | undefined) => {
      const h = parseInt(raw ?? '', 10);
      return isNaN(h) || h <= 0 ? 0 : h;
    },
    serialize: (v: unknown) => ((v as number) ? String(v) : ''),
    getValue: (s: AppState) => s.convertHeight,
  },
  {
    key: SETTINGS_KEYS.CONVERT_FPS,
    actionType: 'SET_CONVERT_FPS' as const,
    parse: (raw: string | undefined) => parseFloat(raw ?? '0') || 0,
    serialize: (v: unknown) => String(v),
    getValue: (s: AppState) => s.convertFps,
  },
  {
    key: SETTINGS_KEYS.CONVERT_BITRATE,
    actionType: 'SET_CONVERT_BITRATE' as const,
    parse: (raw: string | undefined) => raw ?? '',
    serialize: (v: unknown) => v as string,
    getValue: (s: AppState) => s.convertBitrate,
  },
  {
    key: SETTINGS_KEYS.CONVERT_FLIPPED,
    actionType: 'SET_CONVERT_FLIPPED' as const,
    parse: (raw: string | undefined) => raw === 'true',
    serialize: (v: unknown) => String(v),
    getValue: (s: AppState) => s.convertFlipped,
  },
] as const;

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Synchronize settings: load on mount, save on change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useSettingsSync(state, dispatch as any, SETTINGS_DEFS);

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
