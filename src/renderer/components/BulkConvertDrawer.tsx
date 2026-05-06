import { X } from 'lucide-react';
import { useAppState } from '@renderer/store/app-state';
import { useAppDispatch } from '@renderer/store/app-state';
import { useConvertSettings } from '@renderer/hooks/useConvertSettings';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@renderer/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';
import { Input } from '@renderer/components/ui/input';
import { Button } from '@renderer/components/ui/button';
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldGroup,
  FieldSet,
  FieldSeparator,
} from '@renderer/components/ui/field';
import { Progress } from '@renderer/components/ui/progress';

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
      <SheetContent side="right" className="flex flex-col sm:max-w-[340px]">
        <SheetHeader>
          <SheetTitle>Bulk Convert</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <FieldGroup>
            <FieldSet>
              <Field>
                <FieldLabel>Codec</FieldLabel>
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
              </Field>

              <Field>
                <FieldLabel>Resolution</FieldLabel>
                <FieldContent>
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
                    {(width || height) && (
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
                    )}
                  </div>
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Frame Rate</FieldLabel>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <Input
                      id="fps"
                      type="number"
                      placeholder="Same as source"
                      value={fps > 0 ? fps : ''}
                      onChange={(e) => setFps(parseInt(e.target.value) || 0)}
                    />
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
                </FieldContent>
              </Field>

              <FieldSeparator />

              <Field>
                <FieldLabel>Bitrate</FieldLabel>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <Input
                      id="bitrate"
                      type="text"
                      placeholder="e.g. 5000k, 10M"
                      value={bitrate}
                      onChange={(e) => setBitrate(e.target.value)}
                    />
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
                </FieldContent>
              </Field>

              {isConverting && (
                <Field>
                  <Progress value={convertProgress} className="h-2" />
                  <p className="text-muted-foreground text-center text-xs">
                    Converting... {convertProgress}%
                  </p>
                </Field>
              )}
            </FieldSet>
          </FieldGroup>
        </div>

        <SheetFooter className="gap-2">
          <Button onClick={() => reset()} variant="secondary" className="w-full">
            Reset
          </Button>
          <Button
            onClick={handleConvert}
            disabled={selectedFiles.size === 0 || isConverting}
            className="w-full"
          >
            {isConverting ? 'Converting...' : `Convert ${selectedFiles.size} files`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
