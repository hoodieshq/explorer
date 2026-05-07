'use client';

// Reuse note: production layouts use shadcn/ui primitives from `@components/shared`.
// This view is intentionally self-contained for the playground.

import { useState } from 'react';

import {
    ACCOUNT_THUMBNAIL_CATEGORIES,
    ACCOUNT_THUMBNAIL_EXAMPLES,
    ACCOUNT_THUMBNAIL_SUBGROUPS,
    type AccountThumbnailCategory,
    type AccountThumbnailExample,
    type AccountThumbnailSubgroupId,
    getSubgroupCoverage,
    type SubgroupCoverageStatus,
} from '../lib/examples';
import { AccountThumbnail } from './AccountThumbnail';

type SubgroupNode = {
    id: AccountThumbnailSubgroupId;
    label: string;
    items: AccountThumbnailExample[];
    coverage: SubgroupCoverageStatus;
};

const TREE = buildTree(ACCOUNT_THUMBNAIL_EXAMPLES);

export function AccountThumbnailIndexView() {
    const [selected, setSelected] = useState<AccountThumbnailExample>(ACCOUNT_THUMBNAIL_EXAMPLES[0]);

    return (
        <div className="e-grid e-grid-cols-1 e-gap-8 lg:e-grid-cols-[1fr_24rem]">
            <div className="e-flex e-flex-col e-gap-6">
                {ACCOUNT_THUMBNAIL_CATEGORIES.map(category => {
                    const subgroups = TREE[category.id] ?? [];
                    if (subgroups.length === 0) return null;
                    return (
                        <Section key={category.id} category={category} subgroups={subgroups}>
                            <ul className="e-m-0 e-flex e-list-none e-flex-col e-p-0">
                                {subgroups.map((subgroup, sgIdx) => (
                                    <SubgroupNodeView
                                        key={subgroup.id}
                                        subgroup={subgroup}
                                        isLastSubgroup={sgIdx === subgroups.length - 1}
                                        selectedAddress={selected.address}
                                        onSelect={setSelected}
                                    />
                                ))}
                            </ul>
                        </Section>
                    );
                })}
            </div>
            <aside className="e-self-start lg:e-sticky lg:e-top-8">
                <div className="e-flex e-flex-col e-gap-3">
                    <span className="e-text-xs e-uppercase e-tracking-wide e-text-neutral-500">Preview</span>
                    <AccountThumbnail address={selected.address} />
                </div>
            </aside>
        </div>
    );
}

function Section({
    category,
    subgroups,
    children,
}: {
    category: (typeof ACCOUNT_THUMBNAIL_CATEGORIES)[number];
    subgroups: SubgroupNode[];
    children: React.ReactNode;
}) {
    return (
        <section className="e-flex e-flex-col e-gap-3">
            <div className="e-flex e-flex-col e-gap-0.5">
                <div className="e-flex e-items-baseline e-justify-between e-gap-3">
                    <h2 className="e-text-xs e-font-semibold e-uppercase e-leading-none e-tracking-[0.12em] e-text-neutral-400">
                        {category.label}
                    </h2>
                    <SectionCoverageBadge subgroups={subgroups} />
                </div>
                <p className="e-text-xs e-text-neutral-500">{category.blurb}</p>
            </div>
            {children}
        </section>
    );
}

// Aggregate type-coverage across the section's subgroups.
// "complete" = every finite subgroup has every sub-type covered, no endless subgroup.
// "open"     = there is at least one endless subgroup (and all finite ones are covered).
// "N/M"      = N covered out of M expected sub-types across finite subgroups.
function SectionCoverageBadge({ subgroups }: { subgroups: SubgroupNode[] }) {
    let covered = 0;
    let total = 0;
    let hasEndless = false;
    for (const sg of subgroups) {
        if (sg.coverage.kind === 'endless') {
            hasEndless = true;
        } else {
            covered += sg.coverage.covered;
            total += sg.coverage.total;
        }
    }
    const finiteComplete = total === 0 || covered === total;

    let tone: string;
    let text: string;
    if (finiteComplete && !hasEndless) {
        tone = 'e-bg-teal-500/10 e-text-teal-300 e-ring-teal-500/30';
        text = 'complete';
    } else if (finiteComplete && hasEndless) {
        tone = 'e-bg-sky-500/10 e-text-sky-300 e-ring-sky-500/30';
        text = 'open-ended';
    } else {
        const missing = total - covered;
        tone = 'e-bg-amber-500/10 e-text-amber-300 e-ring-amber-500/30';
        text = `${covered}/${total} types · ${missing} missing`;
    }

    return (
        <span
            className={`e-flex e-items-center e-gap-1.5 e-rounded-full e-px-2 e-py-0.5 e-text-[10px] e-uppercase e-tracking-wide e-ring-1 e-ring-inset ${tone}`}
        >
            <span className="e-h-1.5 e-w-1.5 e-rounded-full e-bg-current" />
            {text}
        </span>
    );
}

function SubgroupNodeView({
    subgroup,
    isLastSubgroup,
    selectedAddress,
    onSelect,
}: {
    subgroup: SubgroupNode;
    isLastSubgroup: boolean;
    selectedAddress: string;
    onSelect: (example: AccountThumbnailExample) => void;
}) {
    return (
        <li className="e-m-0 e-list-none e-p-0">
            <SubgroupHeader label={subgroup.label} coverage={subgroup.coverage} isLast={isLastSubgroup} />
            <ul className="e-m-0 e-flex e-list-none e-flex-col e-p-0">
                {subgroup.items.map((example, i) => (
                    <ExampleRow
                        // Skipped rows have empty address but unique subtype; otherwise prefer address.
                        key={example.address || example.subtype}
                        example={example}
                        selected={selectedAddress === example.address}
                        onSelect={() => onSelect(example)}
                        isLastItem={i === subgroup.items.length - 1}
                        parentHasMore={!isLastSubgroup}
                    />
                ))}
            </ul>
        </li>
    );
}

// Subgroup header sits at depth 0 with its own elbow (├── / └──).
function SubgroupHeader({
    label,
    coverage,
    isLast,
}: {
    label: string;
    coverage: SubgroupCoverageStatus;
    isLast: boolean;
}) {
    return (
        <div className="e-relative e-py-1.5 e-pl-7">
            <TrunkSegment side="top" />
            {!isLast && <TrunkSegment side="bottom" />}
            <BranchSegment />
            <div className="e-flex e-items-center e-gap-2">
                <span className="e-text-[11px] e-font-semibold e-uppercase e-tracking-wide e-text-neutral-300">
                    {label}
                </span>
                <SubgroupCoverageTag coverage={coverage} />
            </div>
        </div>
    );
}

function SubgroupCoverageTag({ coverage }: { coverage: SubgroupCoverageStatus }) {
    if (coverage.kind === 'endless') {
        const noun = coverage.representatives === 1 ? 'example' : 'examples';
        return (
            <span
                title="Population is open-ended (every wallet, every mint, …); enumeration of types is meaningless."
                className="e-text-[10px] e-text-sky-400"
            >
                (endless · {coverage.representatives} {noun})
            </span>
        );
    }
    const { covered, total, missing } = coverage;
    const tone = covered === total ? 'e-text-teal-400' : 'e-text-amber-400';
    const hover = covered === total ? 'all sub-types covered' : `missing: ${missing.join(', ')}`;
    return (
        <span title={hover} className={`e-text-[10px] ${tone}`}>
            ({covered}/{total} types)
        </span>
    );
}

function ExampleRow({
    example,
    selected,
    onSelect,
    isLastItem,
    parentHasMore,
}: {
    example: AccountThumbnailExample;
    selected: boolean;
    onSelect: () => void;
    isLastItem: boolean;
    parentHasMore: boolean;
}) {
    return (
        <li className="e-relative e-m-0 e-pl-14">
            {/* Ancestor (depth 0 / subgroup) trunk: drawn only if the subgroup has more siblings after it. */}
            {parentHasMore && (
                <span
                    aria-hidden
                    className="e-pointer-events-none e-absolute e-bottom-0 e-left-3 e-top-0 e-w-px e-bg-neutral-700"
                />
            )}
            {/* Self trunk: top→middle always, middle→bottom only if not the last item. */}
            <TrunkSegment side="top" left="e-left-10" />
            {!isLastItem && <TrunkSegment side="bottom" left="e-left-10" />}
            <BranchSegment left="e-left-10" />
            {example.skipped ? (
                <SkippedRow example={example} />
            ) : (
                <SelectableRow example={example} selected={selected} onSelect={onSelect} />
            )}
        </li>
    );
}

function SelectableRow({
    example,
    selected,
    onSelect,
}: {
    example: AccountThumbnailExample;
    selected: boolean;
    onSelect: () => void;
}) {
    // Reset native <button> chrome (background, border, system color) so the
    // row inherits its own styling and doesn't render as a chunky beveled card.
    const reset = 'e-m-0 e-appearance-none e-border-0 e-bg-transparent e-p-0 e-text-inherit';
    const row =
        'e-flex e-w-full e-cursor-pointer e-items-center e-justify-between e-gap-4 e-rounded-md e-px-3 e-py-2 e-text-left e-transition hover:e-bg-neutral-900';
    const selectedClasses = selected
        ? 'e-bg-teal-500/10 hover:e-bg-teal-500/10 e-ring-1 e-ring-inset e-ring-teal-500/30'
        : '';

    return (
        <button type="button" onClick={onSelect} className={`${reset} ${row} ${selectedClasses}`}>
            <div className="e-flex e-min-w-0 e-items-center e-gap-2">
                <VerifiedDot verified={example.verified} />
                <div className="e-flex e-min-w-0 e-flex-col e-gap-0.5">
                    <span
                        className={`e-text-sm e-font-medium ${
                            example.deprecated
                                ? 'e-text-neutral-500 e-line-through'
                                : selected
                                  ? 'e-text-teal-200'
                                  : 'e-text-neutral-100'
                        }`}
                    >
                        {example.label}
                    </span>
                    <span
                        className={`e-truncate e-font-mono e-text-[11px] ${
                            example.deprecated ? 'e-text-neutral-600 e-line-through' : 'e-text-neutral-500'
                        }`}
                    >
                        {example.address}
                    </span>
                </div>
            </div>
            <div className="e-flex e-shrink-0 e-items-center e-gap-1.5">
                {example.deprecated && <DeprecatedPill />}
                <span className="e-shrink-0 e-rounded e-bg-neutral-800/60 e-px-2 e-py-0.5 e-text-[10px] e-uppercase e-tracking-wide e-text-neutral-400">
                    {example.note ?? example.type}
                </span>
            </div>
        </button>
    );
}

function SkippedRow({ example }: { example: AccountThumbnailExample }) {
    return (
        <div
            title="Listed for documentation only — this sub-type is transient or rare and not worth a thumbnail."
            className="e-flex e-w-full e-cursor-default e-select-none e-items-center e-justify-between e-gap-4 e-rounded-md e-px-3 e-py-2 e-text-left e-opacity-60"
        >
            <div className="e-flex e-min-w-0 e-items-center e-gap-2">
                <span aria-hidden className="e-h-1.5 e-w-1.5 e-shrink-0 e-rounded-full e-bg-neutral-600" />
                <span className="e-text-sm e-italic e-text-neutral-400">{example.label}</span>
            </div>
            <div className="e-flex e-shrink-0 e-items-center e-gap-1.5">
                <span className="e-rounded-full e-bg-neutral-800/60 e-px-2 e-py-0.5 e-text-[10px] e-uppercase e-tracking-wide e-text-neutral-500 e-ring-1 e-ring-inset e-ring-neutral-700">
                    not rendered
                </span>
                <span className="e-rounded e-bg-neutral-800/40 e-px-2 e-py-0.5 e-text-[10px] e-uppercase e-tracking-wide e-text-neutral-500">
                    {example.note ?? example.type}
                </span>
            </div>
        </div>
    );
}

// Tree-line primitives — all render absolutely-positioned 1px lines.
// `left` is parameterised so the same primitives compose at any depth.

function TrunkSegment({ side, left = 'e-left-3' }: { side: 'top' | 'bottom'; left?: string }) {
    const vertical = side === 'top' ? 'e-top-0 e-h-1/2' : 'e-bottom-0 e-top-1/2';
    return (
        <span aria-hidden className={`e-pointer-events-none e-absolute ${left} e-w-px e-bg-neutral-700 ${vertical}`} />
    );
}

function BranchSegment({ left = 'e-left-3' }: { left?: string }) {
    return (
        <span
            aria-hidden
            className={`e-pointer-events-none e-absolute ${left} e-top-1/2 e-h-px e-w-3 e-bg-neutral-700`}
        />
    );
}

function DeprecatedPill() {
    return (
        <span
            title="Deprecated by the Solana runtime — still on-chain but not recommended for use."
            className="e-flex e-items-center e-gap-1 e-rounded-full e-bg-rose-500/15 e-px-2 e-py-0.5 e-text-[10px] e-font-semibold e-uppercase e-tracking-wide e-text-rose-300 e-ring-1 e-ring-inset e-ring-rose-500/30"
        >
            <span className="e-h-1.5 e-w-1.5 e-rounded-full e-bg-current" />
            deprecated
        </span>
    );
}

function VerifiedDot({ verified }: { verified: boolean }) {
    const tone = verified ? 'e-bg-teal-400' : 'e-bg-amber-400';
    const label = verified ? 'verified' : 'placeholder — not yet verified on mainnet';
    return <span title={label} aria-label={label} className={`e-h-1.5 e-w-1.5 e-shrink-0 e-rounded-full ${tone}`} />;
}

// Build a category → subgroups → items tree. Subgroups appear in the declaration
// order of `ACCOUNT_THUMBNAIL_SUBGROUPS`, including any with zero examples — so
// empty subgroups still surface their "missing types" coverage in the UI.
function buildTree(examples: AccountThumbnailExample[]) {
    const out: Partial<Record<AccountThumbnailCategory, SubgroupNode[]>> = {};

    for (const [id, def] of Object.entries(ACCOUNT_THUMBNAIL_SUBGROUPS) as Array<
        [AccountThumbnailSubgroupId, (typeof ACCOUNT_THUMBNAIL_SUBGROUPS)[AccountThumbnailSubgroupId]]
    >) {
        const subgroups = (out[def.category] ??= []);
        subgroups.push({
            // Placeholder coverage; recomputed below once items are populated.
            coverage: { covered: 0, kind: 'finite', missing: [], total: 0 },
            id,
            items: [],
            label: def.label,
        });
    }

    for (const example of examples) {
        const subgroups = out[example.category];
        const subgroup = subgroups?.find(sg => sg.id === example.subgroup);
        if (subgroup) subgroup.items.push(example);
    }

    for (const subgroups of Object.values(out)) {
        if (!subgroups) continue;
        for (const sg of subgroups) {
            sg.coverage = getSubgroupCoverage(sg.id, sg.items);
        }
    }
    return out;
}
