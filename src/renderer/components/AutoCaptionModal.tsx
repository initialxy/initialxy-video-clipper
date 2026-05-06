import { useState, useCallback, useEffect } from 'react';
import type { ChangeEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { SETTINGS_KEYS } from '@shared/constants';

interface AutoCaptionConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

interface AutoCaptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_CONFIG: AutoCaptionConfig = {
  baseUrl: 'http://localhost:8080',
  model: 'model',
  apiKey: 'DUMMY',
};

export function AutoCaptionModal({ open, onOpenChange }: AutoCaptionModalProps) {
  const [config, setConfig] = useState<AutoCaptionConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
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
  }, [open, loaded]);

  const handleSave = useCallback(() => {
    window.electronAPI.setSetting(SETTINGS_KEYS.AUTO_CAPTION_CONFIG, JSON.stringify(config));
    onOpenChange(false);
  }, [config, onOpenChange]);

  const handleChange = useCallback(
    (field: keyof AutoCaptionConfig) => (e: ChangeEvent<HTMLInputElement>) => {
      setConfig((prev) => ({ ...prev, [field]: e.target.value }));
    },
    [],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Auto-caption Settings</DialogTitle>
          <DialogDescription>
            Configure the LLM endpoint for automatic video captioning.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col">
          <div className="flex flex-col">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              value={config.baseUrl}
              onChange={handleChange('baseUrl')}
              placeholder="http://localhost:8080"
            />
          </div>

          <div className="flex flex-col">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={config.model}
              onChange={handleChange('model')}
              placeholder="model"
            />
          </div>

          <div className="flex flex-col">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              value={config.apiKey}
              onChange={handleChange('apiKey')}
              placeholder="DUMMY"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
