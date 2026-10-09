'use client';

import { Button } from '@components/shared/ui/button';
import { inputVariants } from '@components/shared/ui/input';
import { Label } from '@components/shared/ui/label';
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, FileText, Upload, X } from 'react-feather';

import { cn } from '@/app/components/shared/utils';

import { type CustomIdlWriteResult } from '../model/custom-idl/custom-idl-store';
import { parseCustomIdl } from '../model/custom-idl/parse-custom-idl';
import { customIdlHighlight } from './custom-idl-highlight';

export type CustomIdlUploadRequest = { text: string; fileName?: string };

/** What a custom IDL is for, shared by the upload dialog and the catalog page. */
export function CustomIdlIntro() {
    return (
        <>
            Decode this program with your IDL. It is saved in this browser only, and everything it decodes is{' '}
            <span className={customIdlHighlight({ active: true })}>marked yellow</span>.
        </>
    );
}

/**
 * Takes an IDL as a file (picked, or dropped anywhere in the window) or as pasted JSON. The drop hint covers
 * the nearest positioned ancestor, so the host decides what it frames. Starts from `initialText` and
 * `initialFileName`; give the form a `key` to start it over for another program.
 */
export function CustomIdlForm({
    programAddress,
    initialText = '',
    initialFileName,
    submitLabel,
    onSubmit,
    onSubmitted,
    secondaryActions,
    afterText,
    actionsTarget,
    textRows = 6,
}: {
    /** The program the IDL is for, when the host knows it: the form then rejects an IDL as soon as it is loaded. */
    programAddress?: string;
    initialText?: string;
    initialFileName?: string;
    submitLabel: string;
    onSubmit: (request: CustomIdlUploadRequest) => CustomIdlWriteResult;
    /** Called after a successful submit. */
    onSubmitted?: () => void;
    /** Buttons after the submit button, e.g. Cancel or Remove. */
    secondaryActions?: ReactNode;
    /** Fields that depend on the IDL text, shown right below it. */
    afterText?: (text: string) => ReactNode;
    /**
     * A drawer footer to render the actions into, as tile buttons; without it they sit below the fields. The
     * secondary actions are the host's, so it styles them for the same place.
     */
    actionsTarget?: HTMLElement;
    /** The JSON field's height in rows, where the host has no fixed height for it to fill. */
    textRows?: number;
}) {
    const [text, setText] = useState(initialText);
    const [fileName, setFileName] = useState<string | undefined>(initialFileName);
    const [error, setError] = useState<string>();
    const ids = { file: useId(), paste: useId() };
    const fileInputRef = useRef<HTMLInputElement>(null);

    const checkError = useMemo(
        () => checkIdlText(text, programAddress, Boolean(fileName)),
        [text, programAddress, fileName],
    );
    const shownError = error ?? checkError;

    const reset = () => {
        setText('');
        setFileName(undefined);
        setError(undefined);
        // Cleared, so choosing the same file again still fires `change`.
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleFile = async (file: File | undefined) => {
        setError(undefined);
        if (!file) return;
        try {
            setText(await file.text());
            setFileName(file.name);
        } catch {
            setError('The file could not be read.');
        }
    };

    const isDraggingFile = useWindowFileDrop(true, file => void handleFile(file));

    const handleSubmit = () => {
        const result = onSubmit({ fileName, text });
        if (result.ok) {
            onSubmitted?.();
        } else {
            setError(result.error);
        }
    };

    return (
        <>
            {isDraggingFile && (
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-dark-accent bg-dark-background/90 text-dark-accent"
                >
                    <Upload size={24} />
                    <span className="text-sm font-medium">Drop the IDL file</span>
                </div>
            )}
            {/* In a fixed-height column the JSON field takes the free height and gives it back when the
                address field or an error appears; in a dialog that grows with its content, it keeps its rows. */}
            <div className="mb-2 flex min-h-0 flex-1 flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                    <Label className="text-neutral-200" htmlFor={ids.file}>
                        Anchor or Codama IDL
                    </Label>
                    {/* The native input stays for the label; the drop area below is what is seen. */}
                    <input
                        ref={fileInputRef}
                        id={ids.file}
                        type="file"
                        accept="application/json,.json"
                        onChange={e => void handleFile(e.target.files?.[0])}
                        className="sr-only"
                    />
                    {fileName ? (
                        <div
                            className={cn(
                                FILE_BOX,
                                'flex min-w-0 items-center gap-2 border-solid border-outer-space-800 pl-3 pr-1.5',
                            )}
                        >
                            <FileText size={14} className="shrink-0 text-outer-space-300" />
                            <span className="min-w-0 flex-1 break-all py-2 text-xs text-white">{fileName}</span>
                            <button
                                type="button"
                                aria-label="Remove file"
                                onClick={reset}
                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded border-0 bg-transparent p-0 text-outer-space-300 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ) : (
                        // Only an illustration of the drop: the drop itself is taken anywhere in the window (see
                        // `useWindowFileDrop`). A click opens the file picker.
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                FILE_BOX,
                                'flex w-full items-center justify-center border-dashed border-outer-space-700 bg-transparent px-4 text-outer-space-300 transition-colors hover:border-outer-space-500 hover:text-white',
                            )}
                        >
                            <span className="text-xs">
                                <span className="text-white">Choose a file</span> or drag it anywhere
                            </span>
                        </button>
                    )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                    <Label className="text-neutral-200" htmlFor={ids.paste}>
                        Or paste JSON
                    </Label>
                    <textarea
                        id={ids.paste}
                        value={text}
                        onChange={e => {
                            setText(e.target.value);
                            setFileName(undefined);
                            setError(undefined);
                        }}
                        rows={textRows}
                        spellCheck={false}
                        placeholder='{ "address": "…", "instructions": [ … ] }'
                        className={cn(
                            inputVariants({ variant: 'dark' }),
                            'h-auto min-h-16 flex-1 resize-y font-mono',
                            FIELD_BORDER,
                        )}
                    />
                </div>
                {afterText?.(text)}
            </div>

            {shownError && (
                <div className="flex items-center gap-3">
                    <p role="alert" className="m-0 flex min-w-0 flex-1 items-start gap-2 text-xs text-destructive">
                        <AlertCircle size={14} className="mt-px shrink-0" />
                        <span className="break-all">{shownError}</span>
                    </p>
                    {text && (
                        <Button size="sm" variant="outline" className="shrink-0" onClick={reset}>
                            Reset
                        </Button>
                    )}
                </div>
            )}
            {actionsTarget ? (
                createPortal(
                    <>
                        {secondaryActions}
                        <Button
                            size="tile"
                            variant="accent"
                            className="flex-1"
                            disabled={!text.trim() || Boolean(checkError)}
                            onClick={handleSubmit}
                        >
                            <Check size={18} />
                            {submitLabel}
                        </Button>
                    </>,
                    actionsTarget,
                )
            ) : (
                // `mt-auto`: in a column taller than the form, the actions sit at its bottom.
                <div className="mt-auto flex items-center gap-2">
                    <Button
                        size="lg"
                        variant="accent"
                        disabled={!text.trim() || Boolean(checkError)}
                        onClick={handleSubmit}
                    >
                        {submitLabel}
                    </Button>
                    {secondaryActions}
                </div>
            )}
        </>
    );
}

/**
 * The upload check, run before submit when the program is known. A file is complete as it is; pasted JSON is
 * checked once it parses, so a paste typed by hand shows no error halfway.
 */
function checkIdlText(text: string, programAddress: string | undefined, isFile: boolean): string | undefined {
    if (!programAddress || !text.trim()) return undefined;
    if (!isFile && !isJson(text)) return undefined;
    const result = parseCustomIdl(text, programAddress);
    return result.ok ? undefined : result.error;
}

function isJson(text: string): boolean {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

/**
 * While `enabled`, a file dropped anywhere in the browser window goes to `onFile`, so the drop target is the
 * whole window rather than one field, and a missed drop never makes the browser open the file instead of the
 * page. Returns whether a file is being dragged over the window, for the drop hint.
 */
function useWindowFileDrop(enabled: boolean, onFile: (file: File | undefined) => void): boolean {
    const [isDragging, setIsDragging] = useState(false);
    const onFileRef = useRef(onFile);
    onFileRef.current = onFile;

    useEffect(() => {
        if (!enabled) return;
        // dragenter and dragleave fire for every element crossed, so a depth count tells "left the window"
        // apart from "moved onto a child".
        let depth = 0;
        const carriesFiles = (event: DragEvent) => Boolean(event.dataTransfer?.types.includes('Files'));
        const onDragEnter = (event: DragEvent) => {
            if (!carriesFiles(event)) return;
            depth += 1;
            setIsDragging(true);
        };
        const onDragLeave = (event: DragEvent) => {
            if (!carriesFiles(event)) return;
            depth = Math.max(0, depth - 1);
            if (depth === 0) setIsDragging(false);
        };
        const onDragOver = (event: DragEvent) => {
            if (!carriesFiles(event)) return;
            // Without this the browser refuses the drop, and opens the file on release.
            event.preventDefault();
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        };
        const onDrop = (event: DragEvent) => {
            if (!carriesFiles(event)) return;
            event.preventDefault();
            depth = 0;
            setIsDragging(false);
            onFileRef.current(event.dataTransfer?.files[0]);
        };
        window.addEventListener('dragenter', onDragEnter);
        window.addEventListener('dragleave', onDragLeave);
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('drop', onDrop);
        return () => {
            window.removeEventListener('dragenter', onDragEnter);
            window.removeEventListener('dragleave', onDragLeave);
            window.removeEventListener('dragover', onDragOver);
            window.removeEventListener('drop', onDrop);
            setIsDragging(false);
        };
    }, [enabled]);

    return isDragging;
}

// The drop area and the chosen-file row take turns in one place, so they share a height and nothing below moves;
// only a file name too long for two lines makes its row taller.
const FILE_BOX = 'min-h-14 rounded border';

// The feedback popup's field edge, so the fields sit on the box's ground the same way.
const FIELD_BORDER = '!border-outer-space-800';
