'use client';

import type { ComponentType } from 'react';

import { type ResourcesPreview, useResourcesPreview } from '@/app/shared/ui/resources-layout';

import {
    ACCENT,
    BACKGROUND,
    Cells,
    CoreConceptsPreview,
    DeveloperToolsPreview,
    ink,
    JobsPreview,
    Label,
    PreviewFrame,
    QuickStartPreview,
    Square,
    Step,
    TransactionsPreview,
} from './DeveloperResourcePreviews';

// REVIEW(home-key-value-cards): two lighter takes on the resource previews, switched from the design menu. Keep the
// chosen set, move it into DeveloperResourcePreviews and delete this module with the menu.

export type ResourcePreviewName = 'coreConcepts' | 'developerTools' | 'jobs' | 'quickStart' | 'transactions';

/** The preview for one resource, drawn in the style picked in the design menu. */
export function ResourcePreview({ name }: { name: ResourcePreviewName }) {
    const style = useResourcesPreview();
    const Preview = PREVIEWS[name][style];
    return <Preview />;
}

// Simple: the same diagrams with only their main parts and names; Jobs uses the detailed one.

export function SimpleTransactionsPreview() {
    return (
        <PreviewFrame>
            <g transform="translate(38 0)">
                <Label x={16} y={28.5}>
                    signatures
                </Label>
                <Cells x={96} y={26} count={2} accent={2} />
                <Label x={16} y={44.5}>
                    message
                </Label>
                <path d="M 19 48 V 92 M 19 60 H 25 M 19 76 H 25 M 19 92 H 25" stroke={ink(0.25)} strokeWidth={0.75} />
                <Label x={29} y={62.5}>
                    account keys
                </Label>
                <Cells x={96} y={60} count={4} accent={2} />
                <Label x={29} y={78.5}>
                    blockhash
                </Label>
                <rect x={96} y={73.5} width={46} height={5} fill={ink(0.3)} />
                <Label x={29} y={94.5}>
                    instructions
                </Label>
                <Cells x={96} y={92} count={3} />
            </g>
        </PreviewFrame>
    );
}

export function SimpleCoreConceptsPreview() {
    const accounts = [44, 76];
    return (
        <PreviewFrame>
            <rect x={30} y={22} width={70} height={76} rx={3} stroke={ink(0.25)} strokeWidth={0.75} />
            <Label x={36} y={33}>
                transaction
            </Label>
            {[44, 60, 76].map(y => (
                <rect key={y} x={36} y={y} width={58} height={10} rx={2} stroke={ink(0.35)} strokeWidth={0.75} />
            ))}

            <line x1={100} x2={138} y1={60} y2={60} stroke={ink(0.3)} strokeWidth={0.75} />
            {accounts.map(y => (
                <path key={y} d={`M 162 60 C 180 60, 184 ${y}, 201 ${y}`} stroke={ink(0.3)} strokeWidth={0.75} />
            ))}
            <circle cx={150} cy={60} r={12} fill={BACKGROUND} stroke={ACCENT} strokeWidth={1} />
            <circle cx={150} cy={60} r={2.5} fill={ACCENT} />
            <Label x={150} y={40} anchor="middle">
                program
            </Label>

            <Label x={206} y={30} anchor="middle">
                accounts
            </Label>
            {accounts.map(y => (
                <Square key={y} x={206} y={y} />
            ))}
        </PreviewFrame>
    );
}

export function SimpleDeveloperToolsPreview() {
    return (
        <PreviewFrame>
            <rect x={50} y={18} width={150} height={84} rx={3} stroke={ink(0.35)} strokeWidth={0.75} />
            <line x1={50} x2={200} y1={29} y2={29} stroke={ink(0.35)} strokeWidth={0.75} />
            {[56, 62, 68].map(cx => (
                <circle key={cx} cx={cx} cy={23.5} r={1.4} stroke={ink(0.45)} strokeWidth={0.75} />
            ))}
            <Label x={60} y={48} opacity={0.7}>
                $ solana --version
            </Label>
            <Label x={60} y={61} opacity={0.4}>
                solana-cli 2.2.0
            </Label>
            <Label x={60} y={87} opacity={0.7}>
                $
            </Label>
            <rect x={68} y={81} width={4} height={7} fill={ACCENT} />
        </PreviewFrame>
    );
}

export function SimpleQuickStartPreview() {
    return (
        <PreviewFrame>
            <line x1={125} x2={190} y1={52} y2={52} stroke={ink(0.25)} strokeWidth={0.75} strokeDasharray="3 2" />
            <line x1={60} x2={125} y1={52} y2={52} stroke={ACCENT} strokeWidth={1} />
            <Step x={60} y={52} number="1" label="write" done />
            <Step x={125} y={52} number="2" label="build" done />
            <Step x={190} y={52} number="3" label="deploy" />
        </PreviewFrame>
    );
}

// Abstract: one shape per topic, no text, one accent.

/** A message as a run of bytes; the first two, the signatures, in the accent. */
export function AbstractTransactionsPreview() {
    const cells: { x: number; y: number; opacity: number; accent: boolean }[] = [];
    for (let row = 0; row < 5; row++) {
        // The last row stops short: a message has a length, not a fixed block size.
        const columns = row === 4 ? 9 : 14;
        for (let column = 0; column < columns; column++) {
            cells.push({
                accent: row === 0 && column < 2,
                opacity: 0.12 + ((column * 7 + row * 3) % 5) * 0.05,
                x: 54 + column * 10,
                y: 37 + row * 10,
            });
        }
    }
    return (
        <PreviewFrame>
            {cells.map(({ x, y, opacity, accent }) => (
                <rect key={`${x}-${y}`} x={x} y={y} width={6} height={6} fill={accent ? ACCENT : ink(opacity)} />
            ))}
        </PreviewFrame>
    );
}

/** A program in the middle, the accounts it reads and writes around it. */
export function AbstractCoreConceptsPreview() {
    const nodes = Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2 + Math.PI / 6;
        return [125 + Math.cos(angle) * 72, 60 + Math.sin(angle) * 36];
    });
    return (
        <PreviewFrame>
            {nodes.map(([x, y]) => (
                <line key={`${x}-${y}`} x1={125} x2={x} y1={60} y2={y} stroke={ink(0.25)} strokeWidth={0.75} />
            ))}
            {nodes.map(([x, y]) => (
                <Square key={`${x}-${y}`} x={x} y={y} />
            ))}
            <circle cx={125} cy={60} r={12} fill={BACKGROUND} stroke={ACCENT} strokeWidth={1} />
            <circle cx={125} cy={60} r={2.5} fill={ACCENT} />
        </PreviewFrame>
    );
}

/** A prompt and its cursor. */
export function AbstractDeveloperToolsPreview() {
    return (
        <PreviewFrame>
            <path
                d="M 100 44 L 116 60 L 100 76"
                stroke={ink(0.6)}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <rect x={124} y={72} width={26} height={4} fill={ACCENT} />
        </PreviewFrame>
    );
}

/** Steps up to a first program. */
export function AbstractQuickStartPreview() {
    return (
        <PreviewFrame>
            <path d="M 45 90 H 85 V 70 H 125 V 50 H 165 V 30" stroke={ink(0.35)} strokeWidth={0.75} />
            <line x1={165} x2={205} y1={30} y2={30} stroke={ACCENT} strokeWidth={1} />
            <circle cx={205} cy={30} r={2.5} fill={ACCENT} />
        </PreviewFrame>
    );
}

/** Openings spread across the globe. */
export function AbstractJobsPreview() {
    return (
        <PreviewFrame>
            <Globe />
            {[
                [61, 44],
                [93, 76],
                [141, 28],
                [165, 68],
                [197, 52],
                [117, 92],
            ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={2} fill={ACCENT} />
            ))}
        </PreviewFrame>
    );
}

const PREVIEWS: Record<ResourcePreviewName, Record<ResourcesPreview, ComponentType>> = {
    coreConcepts: {
        abstract: AbstractCoreConceptsPreview,
        detailed: CoreConceptsPreview,
        simple: SimpleCoreConceptsPreview,
    },
    developerTools: {
        abstract: AbstractDeveloperToolsPreview,
        detailed: DeveloperToolsPreview,
        simple: SimpleDeveloperToolsPreview,
    },
    // Simple keeps the detailed globe: its six pins read better than three.
    jobs: { abstract: AbstractJobsPreview, detailed: JobsPreview, simple: JobsPreview },
    quickStart: { abstract: AbstractQuickStartPreview, detailed: QuickStartPreview, simple: SimpleQuickStartPreview },
    transactions: {
        abstract: AbstractTransactionsPreview,
        detailed: TransactionsPreview,
        simple: SimpleTransactionsPreview,
    },
};

/** The dotted ellipse of the Jobs preview, for the abstract one. */
function Globe() {
    const dots: [number, number][] = [];
    for (let x = 13; x <= 237; x += 8) {
        for (let y = 12; y <= 108; y += 8) {
            if (((x - 125) / 112) ** 2 + ((y - 60) / 52) ** 2 <= 1) dots.push([x, y]);
        }
    }
    return (
        <>
            {dots.map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r={0.8} fill={ink(0.2)} />
            ))}
        </>
    );
}
