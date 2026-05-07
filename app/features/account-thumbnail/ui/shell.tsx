'use client';

// Reuse note: in production this kind of card primitive lives in
// `@components/shared` (shadcn/ui Card, etc.). Inlined here so the feature has
// zero external coupling for the playground.

import { useState } from 'react';
import { Check, Copy } from 'react-feather';

type Tone = 'default' | 'warning' | 'danger';
export type BadgeTone = 'parsed' | 'raw' | 'neutral';

const toneClasses: Record<Tone, string> = {
    danger: 'e-border-rose-500/40',
    default: 'e-border-neutral-700',
    warning: 'e-border-amber-500/40',
};

// Badge palette: `parsed` = teal (full fidelity), `raw` = amber (bytes only,
// lower fidelity), `neutral` = gray (program-name labels and similar).
const badgeToneClasses: Record<BadgeTone, string> = {
    neutral: 'e-bg-neutral-700/40 e-text-neutral-300 e-ring-neutral-600/50',
    parsed: 'e-bg-teal-500/15 e-text-teal-300 e-ring-teal-500/30',
    raw: 'e-bg-amber-500/15 e-text-amber-300 e-ring-amber-500/40',
};

export function ThumbnailShell({
    title,
    badge,
    badgeTone = 'parsed',
    tone = 'default',
    children,
}: {
    title: string;
    badge?: string;
    badgeTone?: BadgeTone;
    tone?: Tone;
    children: React.ReactNode;
}) {
    return (
        <div
            className={`e-w-96 e-rounded-lg e-border ${toneClasses[tone]} e-flex e-flex-col e-gap-3 e-bg-neutral-900 e-p-4 e-text-neutral-100`}
        >
            <div className="e-flex e-items-center e-justify-between">
                <span className="e-text-sm e-font-semibold e-uppercase e-tracking-wide e-text-neutral-300">
                    {title}
                </span>
                {badge ? (
                    <span
                        className={`e-rounded e-px-2 e-py-0.5 e-text-xs e-font-medium e-uppercase e-tracking-wide e-ring-1 e-ring-inset ${badgeToneClasses[badgeTone]}`}
                    >
                        {badge}
                    </span>
                ) : null}
            </div>
            <div className="e-flex e-flex-col e-gap-2 e-text-xs">{children}</div>
        </div>
    );
}

export function ThumbnailField({
    label,
    labelBadge,
    value,
    title,
    mono,
}: {
    label: string;
    // Optional inline badge rendered next to the label (e.g. "PDA" pill).
    labelBadge?: React.ReactNode;
    value: string;
    // Full value shown on hover via the native `title` tooltip and copied to
    // clipboard via the copy button. Defaults to `value` when not provided.
    title?: string;
    mono?: boolean;
}) {
    const fullValue = title ?? value;
    const isTruncated = fullValue !== value;
    return (
        <div className="e-flex e-flex-col e-gap-0.5">
            <span className="e-flex e-items-center e-gap-1.5 e-text-[10px] e-uppercase e-tracking-wide e-text-neutral-500">
                {label}
                {labelBadge}
            </span>
            <div className="e-flex e-min-w-0 e-items-center e-gap-1.5">
                <span
                    title={fullValue}
                    className={`e-min-w-0 e-flex-1 e-truncate e-text-neutral-100 ${mono ? 'e-font-mono' : ''} ${
                        isTruncated ? 'e-cursor-help' : ''
                    }`}
                >
                    {value}
                </span>
                <CopyButton value={fullValue} />
            </div>
        </div>
    );
}

function CopyButton({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1200);
        } catch {
            // Clipboard write can fail in insecure contexts — silently no-op for the playground.
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            title={copied ? 'Copied' : 'Copy'}
            aria-label={copied ? 'Copied' : 'Copy value'}
            className="e-m-0 e-flex e-h-5 e-w-5 e-shrink-0 e-cursor-pointer e-appearance-none e-items-center e-justify-center e-rounded e-border-0 e-bg-transparent e-p-0 e-text-neutral-500 e-transition hover:e-bg-neutral-800 hover:e-text-neutral-200"
        >
            {copied ? <Check size={12} className="e-text-teal-400" /> : <Copy size={12} />}
        </button>
    );
}

export function shortAddress(value: string) {
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}…${value.slice(-6)}`;
}
