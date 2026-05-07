import { useState, useCallback, useEffect, type ChangeEvent } from 'react';
import { useAppState } from '@renderer/store/app-state';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@renderer/components/ui/sheet';
import { Input } from '@renderer/components/ui/input';
import { Button } from '@renderer/components/ui/button';
import { Field, FieldLabel, FieldGroup, FieldSet } from '@renderer/components/ui/field';
import { SETTINGS_KEYS } from '@shared/constants';

interface AutoCaptionConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

interface AutoCaptionDrawerProps {
  onClose: () => void;
}

const DEFAULT_CONFIG: AutoCaptionConfig = {
  baseUrl: 'http://localhost:8080',
  model: 'model',
  apiKey: 'DUMMY',
};

export function AutoCaptionDrawer({ onClose }: AutoCaptionDrawerProps) {
  const { isAutoCaptioning, isAutoCaptionDrawerOpen } = useAppState();
  const [config, setConfig] = useState<AutoCaptionConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      window.electronAPI.getSetting(SETTINGS_KEYS.AUTO_CAPTION_CONFIG).then((res) => {
        if (res.value) {
          try {
            setConfig(JSON.parse(res.value) as AutoCaptionConfig);
          } catch {
            setConfig(DEFAULT_CONFIG);
          }
        }
        setLoaded(true);
      });
    }
  }, [loaded]);

  const handleSave = useCallback(() => {
    window.electronAPI.setSetting(SETTINGS_KEYS.AUTO_CAPTION_CONFIG, JSON.stringify(config));
    onClose();
  }, [config, onClose]);

  const handleChange = useCallback(
    (field: keyof AutoCaptionConfig) => (e: ChangeEvent<HTMLInputElement>) => {
      setConfig((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  return (
    <Sheet
      open={isAutoCaptionDrawerOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="flex flex-col sm:max-w-[340px]">
        <SheetHeader>
          <SheetTitle>Vision Model API Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <FieldGroup>
            <FieldSet>
              <Field>
                <FieldLabel htmlFor="baseUrl">Base URL</FieldLabel>
                <Input
                  id="baseUrl"
                  value={config.baseUrl}
                  onChange={handleChange('baseUrl')}
                  placeholder="http://localhost:8080"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="model">Model</FieldLabel>
                <Input
                  id="model"
                  value={config.model}
                  onChange={handleChange('model')}
                  placeholder="model"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="apiKey">API Key</FieldLabel>
                <Input
                  id="apiKey"
                  value={config.apiKey}
                  onChange={handleChange('apiKey')}
                  placeholder="DUMMY"
                />
              </Field>
            </FieldSet>
          </FieldGroup>
        </div>

        <SheetFooter>
          <Button onClick={handleSave} disabled={isAutoCaptioning}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
