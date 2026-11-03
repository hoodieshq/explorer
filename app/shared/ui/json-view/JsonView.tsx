import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';

import { cn } from '@/app/components/shared/utils';
import { withStringsInsteadOfBigInts } from '@/app/shared/lib/bigint-to-string';
import { useCopyToClipboard } from '@/app/shared/lib/useCopyToClipboard';

import { InlineCopyButton } from './InlineCopyButton';

/**
 * JSON as an always-expanded tree: the `v2` body of `JsonViewer`. The copy button in the top-right corner
 * copies the whole block. Every other row shows its own copy button on hover, right after its text: a nested
 * object or array copies itself as indented JSON from the row of its opening or its closing bracket, a value row
 * copies the bare value. A row's text works as its button too: hovering either highlights the text it copies,
 * not the row, and a click on either copies it. The corner button highlights nothing.
 * `blockCopy={false}` drops the corner button, for a host that copies the whole block from its own header.
 */
export function JsonView({ src, blockCopy = true }: { src: object; blockCopy?: boolean }) {
    return (
        <div className="min-w-0 font-mono text-sm leading-5">
            <JsonNode noun="JSON" value={withStringsInsteadOfBigInts(src)} copy={blockCopy ? 'corner' : 'none'} />
        </div>
    );
}

// `none`: the root row without its corner button.
type CopyPlacement = 'corner' | 'inline' | 'none';

// Each piece of text turns accent-coloured on a faint accent background while the copy target of a node that
// copies it (the row's button or its text, both `[data-copy]`) is hovered, or the button is focused. The ancestor selector outranks the `tone` colour.
// `[data-node]` marks every node but the root, so the corner button lights nothing; `>` ties a node to
// its own row's button, not to those of nested rows.
//   node:   any enclosing node copies the text (values, brackets).
//   parent: only a node above the text's own row does (keys and string quotes: a value row copies the
//           bare value, its enclosing object copies them too).
const textVariants = cva('', {
    variants: {
        copiedBy: {
            node: '[[data-node]:has(>[data-row]>[data-copy]:focus-within)_&]:bg-dark-accent/10 [[data-node]:has(>[data-row]>[data-copy]:focus-within)_&]:text-dark-accent [[data-node]:has(>[data-row]>[data-copy]:hover)_&]:bg-dark-accent/10 [[data-node]:has(>[data-row]>[data-copy]:hover)_&]:text-dark-accent',
            parent: '[[data-node]:has(>[data-row]>[data-copy]:focus-within)_[data-node]_&]:bg-dark-accent/10 [[data-node]:has(>[data-row]>[data-copy]:focus-within)_[data-node]_&]:text-dark-accent [[data-node]:has(>[data-row]>[data-copy]:hover)_[data-node]_&]:bg-dark-accent/10 [[data-node]:has(>[data-row]>[data-copy]:hover)_[data-node]_&]:text-dark-accent',
        },
        tone: {
            key: 'text-outer-space-300',
            // Not the accent green: green marks what a copy button copies.
            literal: 'text-blue-300',
            muted: 'text-outer-space-500',
            string: 'text-dark-foreground',
        },
    },
});

const rowVariants = cva('', {
    variants: {
        copy: {
            corner: 'flex items-start gap-2',
            // `relative`: the anchor of the row's indent (see `Row`).
            inline: 'group/row relative break-all py-0.5',
            none: 'flex items-start gap-2',
        },
    },
});

const rowTextVariants = cva('', {
    variants: {
        copy: {
            corner: 'min-w-0 flex-1 break-all py-0.5',
            inline: 'cursor-pointer',
            none: 'min-w-0 flex-1 break-all py-0.5',
        },
    },
});

// An inline button follows the last word of a wrapped value, 6px after it as the address component's glyph is
// from its text. The corner one sits in a box as tall as the first row (its 2px padding plus the 20px line), so
// it centers on that line. Touch screens have no hover, so there the row buttons stay visible (as in the cluster
// switcher's rows).
const copyVariants = cva('', {
    variants: {
        copy: {
            corner: 'flex h-6 shrink-0 items-center',
            inline: 'ml-1.5 opacity-0 transition-opacity focus-within:opacity-100 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:none)]:opacity-100',
            none: '',
        },
    },
});

// `noun` names the row for the copy button's accessible label: the key, "item" inside an array, or
// "JSON" at the root.
function JsonNode({
    name,
    noun,
    value,
    copy = 'inline',
    depth = 0,
}: {
    name?: string;
    noun: string;
    value: unknown;
    copy?: CopyPlacement;
    /** Nesting level: the root is 0, its entries 1. */
    depth?: number;
}) {
    if (value === null || typeof value !== 'object') {
        return (
            <div data-node={copy === 'inline' || undefined}>
                <Row
                    name={name}
                    noun={noun}
                    copy={copy}
                    depth={depth}
                    copyValue={typeof value === 'string' ? value : String(value)}
                >
                    <Primitive value={value} />
                </Row>
            </div>
        );
    }

    const isArray = Array.isArray(value);
    const entries: [string | undefined, unknown][] = isArray
        ? value.map(item => [undefined, item])
        : Object.entries(value);
    const [open, close] = isArray ? ['[', ']'] : ['{', '}'];
    const copyValue = JSON.stringify(value, undefined, 2);

    if (entries.length === 0) {
        return (
            <div data-node={copy === 'inline' || undefined}>
                <Row name={name} noun={noun} copy={copy} depth={depth} copyValue={copyValue}>
                    <span className={textVariants({ copiedBy: 'node', tone: 'muted' })}>{open + close}</span>
                </Row>
            </div>
        );
    }

    return (
        <div data-node={copy === 'inline' || undefined}>
            <Row name={name} noun={noun} copy={copy} depth={depth} copyValue={copyValue}>
                <span className={textVariants({ copiedBy: 'node', tone: 'muted' })}>{open}</span>
            </Row>
            <div className="pl-4">
                {entries.map(([key, item], index) => (
                    // Array items have no identity beyond their position, and the tree is rebuilt, not reordered.
                    <JsonNode key={key ?? index} name={key} noun={key ?? 'item'} value={item} depth={depth + 1} />
                ))}
            </div>
            {/* A nested object or array can be copied from its closing bracket too, with the same highlight. The root's
                closing bracket gets no button: the whole block is copied from the corner or the host's header. */}
            {copy === 'inline' ? (
                <Row noun={noun} copy="inline" depth={depth} copyValue={copyValue}>
                    <span className={textVariants({ copiedBy: 'node', tone: 'muted' })}>{close}</span>
                </Row>
            ) : (
                <div className="py-0.5">
                    <span className={textVariants({ copiedBy: 'node', tone: 'muted' })}>{close}</span>
                </div>
            )}
        </div>
    );
}

function Row({
    name,
    noun,
    copy,
    depth,
    copyValue,
    children,
}: {
    name?: string;
    noun: string;
    copy: CopyPlacement;
    depth: number;
    copyValue: string;
    children: ReactNode;
}) {
    const [copyState, copyToClipboard] = useCopyToClipboard(1000);
    const copyRow = () => copyToClipboard(copyValue);
    // Only a nested row's text copies on click; the root's brackets do not.
    const textCopies = copy === 'inline';
    return (
        <div data-row className={rowVariants({ copy })}>
            <span
                data-copy={textCopies || undefined}
                className={rowTextVariants({ copy })}
                onClick={
                    textCopies
                        ? () => {
                              // A drag that selects text is not a click on the row.
                              if (window.getSelection()?.toString()) return;
                              copyRow();
                          }
                        : undefined
                }
            >
                {/* The indent left of the row, where the copied JSON has its leading spaces: hovering or clicking it
                    acts on the row, and an enclosing object's copy paints it like the key. It reaches back over the
                    ancestors' `pl-4`, one rem per level, and keeps to the 20px line. */}
                {textCopies && depth > 0 && (
                    <span
                        aria-hidden
                        className={cn('absolute inset-y-0.5 right-full', textVariants({ copiedBy: 'parent' }))}
                        style={{ width: `${depth}rem` }}
                    />
                )}
                {name !== undefined && (
                    <>
                        <span className={textVariants({ copiedBy: 'parent', tone: 'key' })}>{name}</span>
                        <span className={textVariants({ copiedBy: 'parent', tone: 'muted' })}>: </span>
                    </>
                )}
                {children}
            </span>
            {copy !== 'none' && (
                <span data-copy className={copyVariants({ copy })}>
                    <InlineCopyButton noun={noun} state={copyState} onCopy={copyRow} />
                </span>
            )}
        </div>
    );
}

function Primitive({ value }: { value: unknown }) {
    if (typeof value === 'string') {
        // The quotes stay outside the value's own highlight: its row copies the bare string.
        const quote = <span className={textVariants({ copiedBy: 'parent', tone: 'string' })}>&quot;</span>;
        return (
            <>
                {quote}
                <span className={textVariants({ copiedBy: 'node', tone: 'string' })}>
                    {JSON.stringify(value).slice(1, -1)}
                </span>
                {quote}
            </>
        );
    }
    const tone = typeof value === 'number' || typeof value === 'boolean' ? 'literal' : 'muted';
    return <span className={textVariants({ copiedBy: 'node', tone })}>{String(value)}</span>;
}
