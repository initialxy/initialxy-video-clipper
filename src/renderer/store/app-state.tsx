import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react';

export type ActiveTab = 'clip' | 'gallery';

export interface VideoState {
  path: string;
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
}

export interface AppState {
  activeTab: ActiveTab;
  currentVideo: VideoState | null;
  clipLength: number;
  galleryFiles: Array<{ path: string; name: string; size: number; modified: string }>;
  selectedFiles: Set<string>;
  expandedFile: string | null;
  isConverting: boolean;
  convertProgress: number;
}

type AppAction =
  | { type: 'SET_TAB'; payload: ActiveTab }
  | { type: 'SET_VIDEO'; payload: VideoState | null }
  | { type: 'SET_CLIP_LENGTH'; payload: number }
  | { type: 'SET_GALLERY_FILES'; payload: AppState['galleryFiles'] }
  | { type: 'TOGGLE_FILE_SELECTION'; payload: string }
  | { type: 'SELECT_ALL_FILES'; payload: boolean }
  | { type: 'SET_EXPANDED_FILE'; payload: string | null }
  | { type: 'SET_CONVERTING'; payload: boolean }
  | { type: 'SET_CONVERT_PROGRESS'; payload: number };

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, activeTab: action.payload };
    case 'SET_VIDEO':
      return { ...state, currentVideo: action.payload };
    case 'SET_CLIP_LENGTH':
      return { ...state, clipLength: action.payload };
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
    default:
      return state;
  }
}

const initialState: AppState = {
  activeTab: 'clip',
  currentVideo: null,
  clipLength: 10.0,
  galleryFiles: [],
  selectedFiles: new Set(),
  expandedFile: null,
  isConverting: false,
  convertProgress: 0,
};

const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<Dispatch<AppAction>>(() => {});

export function AppProvider({ children }: { children: ReactNode }) {
  // Use a function to serialize/deserialize Set for useReducer
  const [state, dispatch] = useReducer(appReducer, initialState);

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
