import { X } from 'lucide-react';
import { useAppState } from '@renderer/store/app-state';
import { useAppDispatch } from '@renderer/store/app-state';
import { cn } from '@renderer/lib/utils';
import { useConvertSettings } from '@renderer/hooks/useConvertSettings';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@renderer/components/ui/sheet';

interface BulkConvertDrawerProps {
  onClose: () => void;
}

export function BulkConvertDrawer({ onClose }: BulkConvertDrawerProps) {
  const { selectedFiles, galleryFiles, isConverting, convertProgress, isConvertDrawerOpen } =
    useAppState();
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
      <SheetContent side="right" className="w-80 sm:w-[320px]">
        <SheetHeader className="border-border/50 border-b px-4 py-3">
          <SheetTitle>Bulk Convert</SheetTitle>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Settings */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {/* Codec */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-muted-foreground text-xs font-medium">Codec</label>
              {codec && (
                <button
                  onClick={() => setCodec('')}
                  className="text-muted-foreground/50 hover:text-foreground"
                  title="Reset to same as source"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={codec}
              onChange={(e) => setCodec(e.target.value)}
              className="border-border/50 bg-muted/30 focus:ring-primary/50 w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1"
            >
              <option value="">Same as source</option>
              <option value="libx264">H.264 (libx264)</option>
              <option value="libx265">H.265 (libx265)</option>
              <option value="libsvtav1">AV1 (SVT-AV1)</option>
              <option value="mpeg4">MPEG-4</option>
            </select>
          </div>

          {/* Resolution */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-muted-foreground text-xs font-medium">Resolution</label>
              {(width || height) && (
                <button
                  onClick={() => {
                    setWidth(0);
                    setHeight(0);
                  }}
                  className="text-muted-foreground/50 hover:text-foreground"
                  title="Reset to same as source"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="W"
                value={width || ''}
                onChange={(e) => setWidth(parseInt(e.target.value) || 0)}
                className="border-border/50 bg-muted/30 focus:ring-primary/50 w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1"
              />
              <span className="text-muted-foreground">×</span>
              <input
                type="number"
                placeholder="H"
                value={height || ''}
                onChange={(e) => setHeight(parseInt(e.target.value) || 0)}
                className="border-border/50 bg-muted/30 focus:ring-primary/50 w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1"
              />
            </div>
          </div>

          {/* FPS */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-muted-foreground text-xs font-medium">Frame Rate</label>
              {fps > 0 && (
                <button
                  onClick={() => setFps(0)}
                  className="text-muted-foreground/50 hover:text-foreground"
                  title="Reset to same as source"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <input
              type="number"
              placeholder="Same as source"
              value={fps || ''}
              onChange={(e) => setFps(parseInt(e.target.value) || 0)}
              className="border-border/50 bg-muted/30 focus:ring-primary/50 w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1"
            />
          </div>

          {/* Bitrate */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-muted-foreground text-xs font-medium">Bitrate</label>
              {bitrate && (
                <button
                  onClick={() => setBitrate('')}
                  className="text-muted-foreground/50 hover:text-foreground"
                  title="Reset to same as source"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. 5000k, 10M"
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
              className="border-border/50 bg-muted/30 focus:ring-primary/50 w-full rounded-md border px-3 py-1.5 text-sm outline-none focus:ring-1"
            />
          </div>

          {/* Selected files count */}
          <div className="border-border/50 bg-muted/20 rounded-md border p-3">
            <p className="text-muted-foreground text-xs">
              {selectedFiles.size} of {galleryFiles.length} files selected
            </p>
          </div>

          {/* Progress */}
          {isConverting && (
            <div className="space-y-2">
              <div className="bg-muted/50 h-2 w-full overflow-hidden rounded-full">
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
          <button
            onClick={handleConvert}
            disabled={selectedFiles.size === 0 || isConverting}
            className={cn(
              'w-full rounded-md py-2 text-sm font-medium transition-colors',
              selectedFiles.size > 0 && !isConverting
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-muted/50 text-muted-foreground cursor-not-allowed',
            )}
          >
            {isConverting ? 'Converting...' : `Convert ${selectedFiles.size} files`}
          </button>
          <button
            onClick={reset}
            className="text-muted-foreground hover:text-foreground hover:bg-muted/50 w-full rounded-md py-2 text-sm transition-colors"
          >
            Reset All
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
