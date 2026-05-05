import { X } from 'lucide-react';
import { useAppState } from '@renderer/store/app-state';
import { useAppDispatch } from '@renderer/store/app-state';
import { useConvertSettings } from '@renderer/hooks/useConvertSettings';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@renderer/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Input } from '@renderer/components/ui/input';
import { Button } from '@renderer/components/ui/button';
import { Label } from '@renderer/components/ui/label';

interface BulkConvertDrawerProps {
  onClose: () => void;
}

export function BulkConvertDrawer({ onClose }: BulkConvertDrawerProps) {
  const { selectedFiles, isConverting, convertProgress, isConvertDrawerOpen } = useAppState();
  const dispatch = useAppDispatch();
  const {
    codec,
    setCodec,
    width,
    setWidth,
    height,
    setHeight,
    fps,
    setFps,
    bitrate,
    setBitrate,
    saveSettings,
    reset,
  } = useConvertSettings();

  const handleConvert = async () => {
    if (selectedFiles.size === 0) return;

    await saveSettings();

    const files = Array.from(selectedFiles);
    dispatch({ type: 'SET_CONVERTING', payload: true });

    const result = await window.electronAPI.bulkConvert({
      files,
      settings: { codec, width, height, fps, bitrate },
      outputDir: '',
    });

    dispatch({ type: 'SET_CONVERTING', payload: false });
    dispatch({ type: 'SET_CONVERT_PROGRESS', payload: 0 });

    if (result.success) {
      onClose();
    }
  };

  return (
    <Sheet
      open={isConvertDrawerOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          dispatch({ type: 'SET_CONVERT_DRAWER_OPEN', payload: false });
          onClose();
        }
      }}
    >
      <SheetContent side="right" className="flex flex-col sm:w-[340px]">
        <SheetHeader className="border-border/50 border-b px-4 pt-4 pb-3">
          <SheetTitle className="text-base">Bulk Convert</SheetTitle>
        </SheetHeader>

        {/* Settings */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* Codec */}
          <div className="space-y-2">
            <Label htmlFor="codec">Codec</Label>
            <Select value={codec} onValueChange={(v) => setCodec(v || '')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Same as source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Same as source</SelectItem>
                <SelectItem value="libx264">H.264 (libx264)</SelectItem>
                <SelectItem value="libx265">H.265 (libx265)</SelectItem>
                <SelectItem value="libsvtav1">AV1 (SVT-AV1)</SelectItem>
                <SelectItem value="mpeg4">MPEG-4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="resolution">Resolution</Label>
              {width || height ? (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setWidth(0);
                    setHeight(0);
                  }}
                  title="Reset to same as source"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="width"
                type="number"
                placeholder="W"
                value={width ? width : ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setWidth(isNaN(v) ? 0 : v);
                }}
              />
              <span className="text-muted-foreground/40 text-xs">×</span>
              <Input
                id="height"
                type="number"
                placeholder="H"
                value={height ? height : ''}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setHeight(isNaN(v) ? 0 : v);
                }}
              />
            </div>
          </div>

          {/* FPS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fps">Frame Rate</Label>
              {fps > 0 && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setFps(0)}
                  title="Reset to same as source"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Input
              id="fps"
              type="number"
              placeholder="Same as source"
              value={fps > 0 ? fps : ''}
              onChange={(e) => setFps(parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Bitrate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="bitrate">Bitrate</Label>
              {bitrate && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => setBitrate('')}
                  title="Reset to same as source"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Input
              id="bitrate"
              type="text"
              placeholder="e.g. 5000k, 10M"
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
            />
          </div>

          {/* Progress */}
          {isConverting && (
            <div className="space-y-2">
              <div className="bg-muted/50 h-2 w-full overflow-hidden rounded-sm">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${convertProgress}%` }}
                />
              </div>
              <p className="text-muted-foreground text-center text-xs">
                Converting... {convertProgress}%
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border/50 space-y-2 border-t p-4">
          <Button
            onClick={handleConvert}
            disabled={selectedFiles.size === 0 || isConverting}
            className="w-full"
          >
            {isConverting ? 'Converting...' : `Convert ${selectedFiles.size} files`}
          </Button>
          <Button onClick={reset} variant="outline" className="w-full">
            Reset All
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
