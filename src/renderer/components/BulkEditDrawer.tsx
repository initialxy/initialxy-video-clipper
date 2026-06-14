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
import { useCaptionStore } from '@renderer/store/caption-store';

interface BulkEditDrawerProps {
  onClose: () => void;
}

export function BulkEditDrawer({ onClose }: BulkEditDrawerProps) {
  const { selectedFiles, isBulkEditDrawerOpen } = useAppState();
  const dispatch = useAppDispatch();
  const store = useCaptionStore();

  const [editText, setEditText] = useState('');
  const [insertOnlyIfNotFound, setInsertOnlyIfNotFound] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  const applyToFiles = (text: string, mode: 'prepend' | 'append', checkExists: boolean) => {
    if (selectedFiles.size === 0 || !text.trim()) return;

    const files = Array.from(selectedFiles);
    const trimmedText = text.trim();
    const lowerText = trimmedText.toLowerCase();

    for (const filePath of files) {
      store.ensureLoaded(filePath);
      let current = store.getCaption(filePath);

      if (checkExists && current.toLowerCase().includes(lowerText)) {
        continue;
      }

      if (mode === 'prepend') {
        current = trimmedText + current;
      } else {
        current = current + trimmedText;
      }

      store.setCaption(filePath, current);
    }
  };

  const handlePrepend = () => {
    applyToFiles(editText, 'prepend', insertOnlyIfNotFound);
    setIsApplying(true);
  };

  const handleAppend = () => {
    applyToFiles(editText, 'append', insertOnlyIfNotFound);
    setIsApplying(true);
  };

  const handleReplaceAll = () => {
    if (selectedFiles.size === 0 || !searchText.trim()) return;

    const files = Array.from(selectedFiles);
    const search = searchText.trim();
    const lowerSearch = search.toLowerCase();

    for (const filePath of files) {
      store.ensureLoaded(filePath);
      let current = store.getCaption(filePath);

      if (current.toLowerCase().includes(lowerSearch)) {
        current = current.split(search).join(replaceText);
        store.setCaption(filePath, current);
      }
    }

    setIsApplying(true);
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
                    disabled={!searchText.trim() || selectedFiles.size === 0}
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
