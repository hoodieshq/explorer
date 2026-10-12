'use client';

import { Badge } from '@components/shared/ui/badge';
import { Button } from '@components/shared/ui/button';
import { DateTimePicker } from '@components/shared/ui/date-time-picker';
import { Input } from '@components/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
import { clusterModalOpenAtom, useCluster } from '@entities/cluster';
// deep imports on purpose: the feature's own card renders this bar, so importing the
// barrel here would close a cycle through ui/TransactionHistoryCard
import { isGtfaDisabled } from '@features/transaction-history/lib/gtfa-disabled-addresses';
import {
    HistoryFilters,
    type HistoryStatus,
    STATUS_LABELS,
    STATUS_PARAM,
    STATUS_VALUES,
} from '@features/transaction-history/lib/history-filters';
import { useHistoryFiltersSupported } from '@features/transaction-history/model/use-account-history';
import { BaseFilterSection, BaseResetButton, BaseToggleChips, focusFirstControl } from '@shared/ui/filters';
import { Cluster } from '@utils/cluster';
import { format } from 'date-fns';
import { useSetAtom } from 'jotai';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';
import { Filter, X } from 'react-feather';

// URL params map one-to-one onto the Triton `getTransactionsForAddress` filter paths.
export const SLOT_GTE_PARAM = 'slot.gte';
export const SLOT_LTE_PARAM = 'slot.lte';
export const BLOCK_TIME_GTE_PARAM = 'blockTime.gte';
export const BLOCK_TIME_LTE_PARAM = 'blockTime.lte';
export { STATUS_PARAM };

function parseSlotParam(raw: string | null | undefined): number | undefined {
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}

function parseEnumParam<T extends string>(raw: string | null | undefined, allowed: readonly T[]): T | undefined {
    return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined;
}

// Collapses an undefined-only range back to `undefined` so consumers can treat a
// present range object as "this filter is active".
function toRange(gte: number | undefined, lte: number | undefined) {
    return gte === undefined && lte === undefined ? undefined : { gte, lte };
}

export function useHistoryFilters(): HistoryFilters {
    const searchParams = useSearchParams();
    return {
        blockTime: toRange(
            parseSlotParam(searchParams?.get(BLOCK_TIME_GTE_PARAM)),
            parseSlotParam(searchParams?.get(BLOCK_TIME_LTE_PARAM)),
        ),
        slot: toRange(
            parseSlotParam(searchParams?.get(SLOT_GTE_PARAM)),
            parseSlotParam(searchParams?.get(SLOT_LTE_PARAM)),
        ),
        status: parseEnumParam(searchParams?.get(STATUS_PARAM), STATUS_VALUES),
    };
}

// Update operates directly on URL param names so callers reference the same gTFA paths.
type ParamUpdate = Record<string, number | string | undefined>;

function useUpdateHistoryFilters() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    return React.useCallback(
        (next: ParamUpdate) => {
            const params = new URLSearchParams(searchParams?.toString() ?? '');
            Object.entries(next).forEach(([key, value]) => {
                if (value === undefined) {
                    params.delete(key);
                } else {
                    params.set(key, String(value));
                }
            });
            const qs = params.toString();
            router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
        },
        [router, pathname, searchParams],
    );
}

// Clears every filter param from the URL in one update.
export function useClearHistoryFilters() {
    const updateFilters = useUpdateHistoryFilters();
    return React.useCallback(
        () =>
            updateFilters({
                [BLOCK_TIME_GTE_PARAM]: undefined,
                [BLOCK_TIME_LTE_PARAM]: undefined,
                [SLOT_GTE_PARAM]: undefined,
                [SLOT_LTE_PARAM]: undefined,
                [STATUS_PARAM]: undefined,
            }),
        [updateFilters],
    );
}

function slotDraftToValue(raw: string): number | undefined | 'invalid' {
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed < 0) return 'invalid';
    return Math.floor(parsed);
}

// datetime-local <-> unix seconds (local time, matching what the input displays).
function unixToLocalInput(sec: number | undefined): string {
    if (sec === undefined) return '';
    const d = new Date(sec * 1000);
    if (Number.isNaN(d.getTime())) return '';
    return format(d, "yyyy-MM-dd'T'HH:mm");
}

function localInputToUnix(raw: string): number | undefined {
    if (!raw) return undefined;
    const ms = new Date(raw).getTime();
    return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
}

function FilterChip({ label, value, onClear }: { label: string; value: string; onClear: () => void }) {
    return (
        <Badge ui="tw" variant="info">
            <span>
                {label}: {value}
            </span>
            <button
                type="button"
                onClick={onClear}
                aria-label={`Clear ${label.toLowerCase()} filter`}
                className="flex items-center justify-center border-none bg-transparent p-0 text-current opacity-70 hover:opacity-100"
            >
                <X size={12} />
            </button>
        </Badge>
    );
}

export function HistoryFilterChips(filters: HistoryFilters) {
    const { slot, blockTime, status } = filters;
    const updateFilters = useUpdateHistoryFilters();
    const hasAny = slot !== undefined || blockTime !== undefined || status !== undefined;
    if (!hasAny) return undefined;
    return (
        <>
            {slot?.gte !== undefined && (
                <FilterChip
                    label="Slot ≥"
                    value={slot.gte.toLocaleString()}
                    onClear={() => updateFilters({ [SLOT_GTE_PARAM]: undefined })}
                />
            )}
            {slot?.lte !== undefined && (
                <FilterChip
                    label="Slot ≤"
                    value={slot.lte.toLocaleString()}
                    onClear={() => updateFilters({ [SLOT_LTE_PARAM]: undefined })}
                />
            )}
            {status !== undefined && (
                <FilterChip
                    label="Status"
                    value={STATUS_LABELS[status]}
                    onClear={() => updateFilters({ [STATUS_PARAM]: undefined })}
                />
            )}
            {blockTime?.gte !== undefined && (
                <FilterChip
                    label="Block time ≥"
                    value={new Date(blockTime.gte * 1000).toLocaleString()}
                    onClear={() => updateFilters({ [BLOCK_TIME_GTE_PARAM]: undefined })}
                />
            )}
            {blockTime?.lte !== undefined && (
                <FilterChip
                    label="Block time ≤"
                    value={new Date(blockTime.lte * 1000).toLocaleString()}
                    onClear={() => updateFilters({ [BLOCK_TIME_LTE_PARAM]: undefined })}
                />
            )}
        </>
    );
}

export function HistoryFilterTrigger({ address, ...filters }: HistoryFilters & { address?: string }) {
    const { slot, blockTime, status } = filters;
    const updateFilters = useUpdateHistoryFilters();
    const clearFilters = useClearHistoryFilters();
    const searchParams = useSearchParams();
    // Filtering needs gTFA. It's unavailable when the endpoint doesn't implement gTFA at all
    // (global `supported` flag) or when gTFA is temporarily disabled for this specific address
    // (the address falls back to getSignaturesForAddress, which can't honour filters).
    const supported = useHistoryFiltersSupported() && !(address !== undefined && isGtfaDisabled(address));
    // The chips can hold both statuses, which `status` (one value or none) can't express, so they read the
    // raw param: both picked stay in the URL as `succeeded,failed`, which the RPC filter reads as no status.
    const statusSelection = parseStatusSelection(searchParams?.get(STATUS_PARAM));

    const activeCount =
        (slot?.gte !== undefined ? 1 : 0) +
        (slot?.lte !== undefined ? 1 : 0) +
        (status !== undefined ? 1 : 0) +
        (blockTime?.gte !== undefined ? 1 : 0) +
        (blockTime?.lte !== undefined ? 1 : 0);
    const triggerLabel = activeCount === 0 ? 'Filters' : 'Edit filters';

    // gTFA is unavailable (endpoint-wide or for this address), so filtering can't be applied
    // server-side; show an unavailable control that explains why on click, not a misleading filter UI.
    if (!supported) {
        return (
            <FiltersUnavailable reason={address !== undefined && isGtfaDisabled(address) ? 'address' : 'endpoint'} />
        );
    }

    // Every change applies at once, as on the block page; the range fields commit on Enter or on leaving the
    // field, so typing a slot doesn't refetch on each digit.
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button size="sm" variant="outline" aria-label={triggerLabel}>
                    <Filter />
                    <span className="hidden md:inline">{triggerLabel}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-7 p-4">
                <BaseFilterSection
                    title="Slot"
                    onReset={
                        slot === undefined
                            ? undefined
                            : () => updateFilters({ [SLOT_GTE_PARAM]: undefined, [SLOT_LTE_PARAM]: undefined })
                    }
                >
                    <SlotRangeFields
                        slot={slot}
                        onCommit={({ gte, lte }) => updateFilters({ [SLOT_GTE_PARAM]: gte, [SLOT_LTE_PARAM]: lte })}
                    />
                </BaseFilterSection>
                <BaseFilterSection
                    title="Status"
                    onReset={
                        statusSelection.length === 0 ? undefined : () => updateFilters({ [STATUS_PARAM]: undefined })
                    }
                >
                    <BaseToggleChips
                        options={STATUS_VALUES.map(value => ({ label: STATUS_LABELS[value], value }))}
                        selected={statusSelection}
                        onChange={next =>
                            updateFilters({ [STATUS_PARAM]: next.length === 0 ? undefined : next.join(',') })
                        }
                    />
                </BaseFilterSection>
                <BaseFilterSection
                    title="Block time"
                    onReset={
                        blockTime === undefined
                            ? undefined
                            : () =>
                                  updateFilters({
                                      [BLOCK_TIME_GTE_PARAM]: undefined,
                                      [BLOCK_TIME_LTE_PARAM]: undefined,
                                  })
                    }
                >
                    <BlockTimeRangeFields
                        blockTime={blockTime}
                        onCommit={({ gte, lte }) =>
                            updateFilters({ [BLOCK_TIME_GTE_PARAM]: gte, [BLOCK_TIME_LTE_PARAM]: lte })
                        }
                    />
                </BaseFilterSection>
                {/* The same control as each section's Reset, so clearing one section and clearing the form read
                    and behave alike: shown only while there's something to clear, applied at once. */}
                {(activeCount > 0 || statusSelection.length > 0) && (
                    <div className="flex justify-end">
                        <BaseResetButton
                            aria-label="Clear all filters"
                            label="Reset all"
                            onClick={event => {
                                // The button disappears once used; focus moves to the popover's first control.
                                focusFirstControl(event.currentTarget.closest('[role="dialog"]'));
                                clearFilters();
                            }}
                        />
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

function parseStatusSelection(raw: string | null | undefined): HistoryStatus[] {
    const picked = raw?.split(',') ?? [];
    return STATUS_VALUES.filter(value => picked.includes(value));
}

type Range = { gte?: number; lte?: number };

// Lower and upper bound side by side. Drafts follow the URL (a chip's × clears a bound from outside) and
// commit only when both parse and the range isn't inverted.
function SlotRangeFields({ onCommit, slot }: { onCommit: (range: Range) => void; slot: Range | undefined }) {
    const [gteDraft, setGteDraft] = React.useState(() => slotToDraft(slot?.gte));
    const [lteDraft, setLteDraft] = React.useState(() => slotToDraft(slot?.lte));
    React.useEffect(() => {
        setGteDraft(slotToDraft(slot?.gte));
        setLteDraft(slotToDraft(slot?.lte));
    }, [slot?.gte, slot?.lte]);

    const gte = slotDraftToValue(gteDraft);
    const lte = slotDraftToValue(lteDraft);
    const rangeInvalid = typeof gte === 'number' && typeof lte === 'number' && gte > lte;

    const commit = () => {
        if (gte === 'invalid' || lte === 'invalid' || rangeInvalid) return;
        if (gte === slot?.gte && lte === slot?.lte) return;
        onCommit({ gte, lte });
    };
    const fieldProps = {
        // The 32px filter control in the UI font, matching the date fields beside them. `!` because `cn`
        // doesn't dedupe the Input's own mono utility.
        className: '![font-family:inherit]',
        inputMode: 'numeric' as const,

        inputSize: 'sm' as const,

        onBlur: commit,

        onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === 'Enter') commit();
        },
        pattern: '[0-9]*',
        variant: 'dark' as const,
    };

    return (
        <>
            {/* From and to with a dash between, the usual way to read a range. */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <Input
                    {...fieldProps}
                    aria-label="Slot lower bound"
                    placeholder="Lower bound"
                    value={gteDraft}
                    aria-invalid={gte === 'invalid' || rangeInvalid}
                    onChange={event => setGteDraft(event.target.value)}
                />
                <RangeDash />
                <Input
                    {...fieldProps}
                    aria-label="Slot upper bound"
                    placeholder="Upper bound"
                    value={lteDraft}
                    aria-invalid={lte === 'invalid' || rangeInvalid}
                    onChange={event => setLteDraft(event.target.value)}
                />
            </div>
            {rangeInvalid && (
                <div className="mt-1.5 text-xs text-destructive">The lower bound must not exceed the upper bound.</div>
            )}
        </>
    );
}

// From and to side by side. A pick commits at once unless it inverts the range, which stays as a draft
// with an error until fixed.
function BlockTimeRangeFields({
    blockTime,
    onCommit,
}: {
    blockTime: Range | undefined;
    onCommit: (range: Range) => void;
}) {
    const [gteDraft, setGteDraft] = React.useState(() => unixToLocalInput(blockTime?.gte));
    const [lteDraft, setLteDraft] = React.useState(() => unixToLocalInput(blockTime?.lte));
    React.useEffect(() => {
        setGteDraft(unixToLocalInput(blockTime?.gte));
        setLteDraft(unixToLocalInput(blockTime?.lte));
    }, [blockTime?.gte, blockTime?.lte]);

    const gte = localInputToUnix(gteDraft);
    const lte = localInputToUnix(lteDraft);
    const rangeInvalid = gte !== undefined && lte !== undefined && gte > lte;

    const change = (bound: keyof Range, raw: string) => {
        const next = { [bound]: localInputToUnix(raw), gte, lte };
        if (bound === 'gte') setGteDraft(raw);
        else setLteDraft(raw);
        if (next.gte !== undefined && next.lte !== undefined && next.gte > next.lte) return;
        onCommit(next);
    };

    return (
        <>
            {/* From and to with a dash between, the usual way to read a range. */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <DateTimePicker
                    size="sm"
                    placeholder="From"
                    value={gteDraft}
                    aria-invalid={rangeInvalid}
                    onChange={raw => change('gte', raw)}
                />
                <RangeDash />
                <DateTimePicker
                    size="sm"
                    placeholder="To"
                    value={lteDraft}
                    aria-invalid={rangeInvalid}
                    onChange={raw => change('lte', raw)}
                />
            </div>
            {rangeInvalid && (
                <div className="mt-1.5 text-xs text-destructive">The start must be on or before the end.</div>
            )}
        </>
    );
}

function RangeDash() {
    return (
        <span aria-hidden className="text-sm text-outer-space-300">
            –
        </span>
    );
}

function slotToDraft(slot: number | undefined): string {
    return slot === undefined ? '' : String(slot);
}

// The two ways filtering goes away, as the user can act on them: the endpoint lacks gTFA (switch the
// RPC), or gTFA is paused for this one account on our side (nothing to do but wait).
function FiltersUnavailable({ reason }: { reason: 'address' | 'endpoint' }) {
    const setClusterModalOpen = useSetAtom(clusterModalOpenAtom);
    const { cluster, name } = useCluster();
    const [open, setOpen] = React.useState(false);
    // The public devnet and testnet endpoints never serve gTFA, and picking another standard cluster changes
    // the data, not the method, so only a custom endpoint for the same cluster brings filters back.
    const isPublicWithoutGtfa = cluster === Cluster.Devnet || cluster === Cluster.Testnet;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {/* Not natively `disabled`: the click has to reach the trigger to open the explanation. */}
                <Button size="sm" variant="outline" aria-label="Filters unavailable" className="opacity-50">
                    <Filter />
                    <span className="hidden md:inline">Filters</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="flex w-72 flex-col gap-2 p-4">
                <p className="m-0 text-sm font-medium text-white">Filtering is unavailable</p>
                {reason === 'endpoint' ? (
                    <>
                        {isPublicWithoutGtfa ? (
                            <>
                                <p className="m-0 text-sm text-neutral-400">
                                    The public {name} endpoint doesn&apos;t support{' '}
                                    <code>getTransactionsForAddress</code>, which filters need, so the history loads
                                    unfiltered.
                                </p>
                                <p className="m-0 text-sm text-neutral-400">
                                    To filter {name} history, connect a custom {name} RPC endpoint that supports this
                                    method.
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="m-0 text-sm text-neutral-400">
                                    Filters need an RPC endpoint that supports <code>getTransactionsForAddress</code>.
                                    The current endpoint doesn&apos;t, so the history loads unfiltered.
                                </p>
                                <p className="m-0 text-sm text-neutral-400">
                                    To filter, switch to an endpoint that supports this method.
                                </p>
                            </>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-1 self-start"
                            onClick={() => {
                                setOpen(false);
                                setClusterModalOpen(true);
                            }}
                        >
                            {isPublicWithoutGtfa ? 'Use a custom RPC endpoint' : 'Change RPC endpoint'}
                        </Button>
                    </>
                ) : (
                    <p className="m-0 text-sm text-neutral-400">
                        Filtering is temporarily off for this account: its history is so large that filtered requests
                        time out, so the history loads unfiltered. There&apos;s nothing to change on your side; check
                        back later.
                    </p>
                )}
            </PopoverContent>
        </Popover>
    );
}

// Combined bar kept for tests / any consumer that wants chips + trigger inline.
export function HistoryFilterBar({ address, ...props }: HistoryFilters & { address?: string }) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <HistoryFilterChips {...props} />
            <HistoryFilterTrigger address={address} {...props} />
        </div>
    );
}
