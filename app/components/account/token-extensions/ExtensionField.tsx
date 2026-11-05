import { cva } from 'class-variance-authority';
import type React from 'react';

import { KeyValue } from '@/app/shared/ui/key-value';

import { useExtensionFieldsLook } from './design-variant';

// One label/value pair of an extension's state: the transaction Accounts card's flat KeyValue (`DetailRow`), with its
// default label column, so both expandable lists read alike. REVIEW(HOO-935): the design-menu configurator
// (`useExtensionFieldsLook`) spaces the pairs, divides them and frames them. Half the gap pads each pair above and
// below, so a divider falls in the middle of the gap; a framed pair gets 12px of side padding inside the frame. The
// values are picked at runtime, hence the inline style.
export function ExtensionField({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
    const { border, dividers, gap } = useExtensionFieldsLook();
    return (
        <KeyValue
            label={label}
            density="flat"
            divider={dividers}
            className={pairVariants({ framed: border === 'all' })}
            style={{ paddingBottom: Number(gap) / 2, paddingTop: Number(gap) / 2 }}
        >
            {children}
        </KeyValue>
    );
}

// A heading inside an extension's fields that starts a group of free-form pairs, e.g. the
// "Additional Metadata" of Token Metadata. It is spaced, divided and framed like a pair, with 8px more above it.
export function ExtensionFieldGroup({ children }: { children: React.ReactNode }) {
    const { border, dividers, gap } = useExtensionFieldsLook();
    return (
        <div
            className={groupVariants({ dividers, framed: border === 'all' })}
            style={{ paddingBottom: Number(gap) / 2, paddingTop: Number(gap) / 2 + 8 }}
        >
            {children}
        </div>
    );
}

// The container of an extension's pairs. The inner stack pulls back the half gap the first and last pairs carry, so
// the pairs start and end on their text; framed, the outer box draws the rounded border, with the `inner` padding
// above and below the pairs.
export function ExtensionFields({ children }: { children: React.ReactNode }) {
    const { border, gap, inner } = useExtensionFieldsLook();
    const framed = border === 'all';
    const pullBack = -Number(gap) / 2;
    return (
        <div
            className={fieldsVariants({ framed })}
            style={framed ? { paddingBottom: Number(inner), paddingTop: Number(inner) } : undefined}
        >
            <div className="flex flex-col" style={{ marginBottom: pullBack, marginTop: pullBack }}>
                {children}
            </div>
        </div>
    );
}

const pairVariants = cva('', {
    variants: { framed: { false: '', true: 'px-3' } },
});

const groupVariants = cva('text-xs uppercase tracking-wider text-outer-space-300', {
    variants: {
        dividers: { false: '', true: 'border-0 border-b border-solid border-outer-space-850' },
        framed: { false: '', true: 'px-3' },
    },
});

const fieldsVariants = cva('', {
    variants: {
        framed: { false: '', true: 'overflow-hidden rounded-lg border border-solid border-outer-space-800' },
    },
});
