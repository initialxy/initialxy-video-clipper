import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@renderer/components/ui/sheet';
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldGroup,
  FieldSet,
} from '@renderer/components/ui/field';
import { Input } from '@renderer/components/ui/input';
import { Button } from '@renderer/components/ui/button';
import { Textarea } from '@renderer/components/ui/textarea';
import { Separator } from '@renderer/components/ui/separator';
import { useAppState, useAppDispatch } from '@renderer/store/app-state';

interface BulkEditDrawerProps {
  onClose: () => void;
}

export function BulkEditDrawer({ onClose }: BulkEditDrawerProps) {
  const { selectedFiles, isBulkEditDrawerOpen } = useAppState();
  const dispatch = useAppDispatch();

  const [editText, setEditText] = useState('');
  const [insertOnlyIfNotFound, setInsertOnlyIfNotFound] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const applyToFiles = async (text: string, mode: 'prepend' | 'append', checkExists: boolean) => {
    if (selectedFiles.size === 0 || !text.trim()) return;
    setIsApplying(true);

    const files = Array.from(selectedFiles);
    const trimmedText = text.trim();
    const lowerText = trimmedText.toLowerCase();

    for (const filePath of files) {
      try {
        const result = await window.electronAPI.readCaption(filePath);
        let current = result.content ?? '';

        if (checkExists && current.toLowerCase().includes(lowerText)) {
          continue;
        }

        if (mode === 'prepend') {
          current = trimmedText + '\n' + current;
        } else {
          current = current + '\n' + trimmedText;
        }

        await window.electronAPI.writeCaption({ filePath, content: current });
      } catch {
        // Silently fail
      }
    }

    setIsApplying(false);
  };

  const handlePrepend = async () => {
    await applyToFiles(editText, 'prepend', insertOnlyIfNotFound);
  };

  const handleAppend = async () => {
    await applyToFiles(editText, 'append', insertOnlyIfNotFound);
  };

  const handleReplaceAll = async () => {
    if (selectedFiles.size === 0 || !searchText.trim()) return;
    setIsApplying(true);

    const files = Array.from(selectedFiles);
    const search = searchText.trim();
    const lowerSearch = search.toLowerCase();

    for (const filePath of files) {
      try {
        const result = await window.electronAPI.readCaption(filePath);
        let current = result.content ?? '';

        if (current.toLowerCase().includes(lowerSearch)) {
          current = current.split(search).join(replaceText);
          await window.electronAPI.writeCaption({ filePath, content: current });
        }
      } catch {
        // Silently fail
      }
    }

    setIsApplying(false);
  };

  const handleClose = () => {
    dispatch({ type: 'SET_BULK_EDIT_DRAWER_OPEN', payload: false });
    onClose();
  };

  return (
    <Sheet
      open={isBulkEditDrawerOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          handleClose();
        }
      }}
    >
      <SheetContent side="right" className="flex flex-col sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>Bulk Edit Captions</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <FieldGroup>
            <FieldSet>
              <Textarea
                placeholder="Enter text to add..."
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="min-h-24"
              />

              <Field>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="insert-only-if-not-found"
                      checked={insertOnlyIfNotFound}
                      onChange={(e) => setInsertOnlyIfNotFound(e.target.checked)}
                      className="border-border accent-foreground size-4 rounded bg-transparent"
                    />
                    <label htmlFor="insert-only-if-not-found" className="text-sm leading-none">
                      Insert only if not found
                    </label>
                  </div>
                </FieldContent>
              </Field>

              <Field>
                <FieldContent>
                  <div className="flex gap-2">
                    <Button
                      onClick={handlePrepend}
                      disabled={isApplying || !editText.trim() || selectedFiles.size === 0}
                      className="flex-1"
                    >
                      Prepend
                    </Button>
                    <Button
                      onClick={handleAppend}
                      disabled={isApplying || !editText.trim() || selectedFiles.size === 0}
                      className="flex-1"
                    >
                      Append
                    </Button>
                  </div>
                </FieldContent>
              </Field>

              <Separator className="my-2" />

              <Field>
                <FieldLabel>Search</FieldLabel>
                <Input
                  placeholder="Text to find..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </Field>

              <Field>
                <FieldLabel>Replace with</FieldLabel>
                <Input
                  placeholder="Replacement text..."
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                />
              </Field>

              <Field>
                <FieldContent>
                  <Button
                    onClick={handleReplaceAll}
                    disabled={isApplying || !searchText.trim() || selectedFiles.size === 0}
                    className="w-full"
                  >
                    Replace All
                  </Button>
                </FieldContent>
              </Field>
            </FieldSet>
          </FieldGroup>
        </div>

        <SheetFooter className="gap-2">
          <Button onClick={handleClose} variant="secondary" className="w-full">
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
