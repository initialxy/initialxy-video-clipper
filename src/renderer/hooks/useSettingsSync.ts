import { useEffect, useRef, type Dispatch } from 'react';

export interface SettingDefinition<State> {
  /** Settings key (from SETTINGS_KEYS) */
  key: string;
  /** Reducer action type to dispatch when loaded */
  actionType: string;
  /** Parse raw string value from settings into the proper type */
  parse: (raw: string | undefined) => unknown;
  /** Serialize value back to string for settings storage */
  serialize: (value: unknown) => string;
  /** Extract the current value from app state */
  getValue: (state: State) => unknown;
}

/**
 * Synchronizes app state values with persistent settings.
 *
 * Loads all settings on mount, dispatches actions to update state.
 * Saves changed values back to settings on subsequent renders.
 *
 * @example
 *   useSettingsSync(state, dispatch as Dispatch<{ type: string; payload?: unknown }>, [
 *     {
 *       key: SETTINGS_KEYS.CLIP_LENGTH,
 *       actionType: 'SET_CLIP_LENGTH',
 *       parse: (raw) => parseFloat(raw ?? '10'),
 *       serialize: (v) => String(v),
 *       getValue: (s) => s.clipLength,
 *     },
 *   ]);
 */
export function useSettingsSync<State>(
  state: State,
  dispatch: Dispatch<{ type: string; payload?: unknown }>,
  defs: readonly SettingDefinition<State>[],
) {
  const loadedRef = useRef(false);
  const prevRef = useRef<Record<string, unknown>>({});

  // Load all settings on mount
  useEffect(() => {
    Promise.all(defs.map((d) => window.electronAPI.getSetting(d.key))).then((results) => {
      results.forEach((res, i) => {
        dispatch({ type: defs[i].actionType, payload: defs[i].parse(res.value) });
      });
      loadedRef.current = true;
    });
    // defs and dispatch are stable (defined outside component or memoized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save changed settings on state updates
  useEffect(() => {
    if (!loadedRef.current) return;

    let changed = false;
    const current: Record<string, unknown> = {};

    for (const def of defs) {
      const val = def.getValue(state);
      current[def.key] = val;
      if (prevRef.current[def.key] !== val) {
        changed = true;
      }
    }

    if (changed) {
      prevRef.current = current;
      for (const def of defs) {
        window.electronAPI.setSetting(def.key, def.serialize(current[def.key]));
      }
    }
  }, [state, defs]);
}
