'use client';

// Shared collapsible JSON dump of `parsed.info`. Reused by both the generic
// thumbnail (sole content) and the upgradeable-program thumbnail (extra detail
// underneath the structured fields). The `key` from the caller controls
// whether the <details> auto-closes on selection change.

export function ParsedInfoDetails({ info }: { info: unknown }) {
    return (
        <details className="e-mt-1 e-text-[11px]">
            <summary className="e-cursor-pointer e-text-neutral-400 hover:e-text-neutral-200">parsed.info</summary>
            <pre className="e-mt-1 e-overflow-x-auto e-rounded e-bg-neutral-950 e-p-2 e-text-[10px] e-leading-snug e-text-neutral-300">
                {JSON.stringify(info, null, 2)}
            </pre>
        </details>
    );
}
