'use client';

import { OwnedTokensCard } from '@components/account/OwnedTokensCard';
import { TokenHistoryCard, type TokenHistoryVariant } from '@components/account/TokenHistoryCard';
import { useCallback, useState } from 'react';

import { Button } from '@/app/components/shared/ui/button';
import { DSCOMMON_BETWEEN_BLOCKS } from '@/app/shared/ui/page-spacing/spacing';

// Each design variant decides how the tokens tab is composed. Variant 1 is the current tab as-is; 2.1 and
// 2.2 swap Token History for the Transaction History grid (2.2 is the trimmed "Time / Block" cut). Variant
// 3 drops Token History entirely and makes Token Holdings expandable (each holding spoilers open to its
// recent transactions). `history: null` means "don't render the Token History block".
type VariantDef = {
    key: string;
    // Omitted → the Token History block is not rendered (Variant 3).
    history?: TokenHistoryVariant;
    holdingsExpandable?: boolean;
    // Each holding row gets a toggle that filters the Token History grid below to its mint (2.1 / 2.2).
    holdingsFilterable?: boolean;
    // Where the holdings switch to the desktop table. 2.2's Token History cards give way to its table at `md`, so
    // 2.2 moves the holdings there too and the whole tab changes layout at one width.
    holdingsDesktopFrom?: 'sm' | 'md';
};

const VARIANTS: VariantDef[] = [
    { history: 'default', key: '1' },
    { history: 'tx-history', holdingsFilterable: true, key: '2.1' },
    { history: 'tx-history-compact', holdingsDesktopFrom: 'md', holdingsFilterable: true, key: '2.2' },
    { holdingsExpandable: true, key: '3' },
];

// The variant the tab opens on.
const DEFAULT_VARIANT = '2.2';

// Design-exploration wrapper for the tokens tab. The switcher sits top-left, above both tables, and stays
// hidden until three quick clicks/taps on the "Token Holdings" heading (three more hide it again). Hiding it
// keeps the selected variant.
export function TokensTabView({ address }: { address: string }) {
    const [selected, setSelected] = useState(DEFAULT_VARIANT);
    const [switcherVisible, setSwitcherVisible] = useState(false);
    const toggleSwitcher = useCallback(() => setSwitcherVisible(visible => !visible), []);
    const current = VARIANTS.find(v => v.key === selected) ?? VARIANTS[0];

    return (
        <div>
            {switcherVisible && (
                <div className="mb-4 flex items-center gap-2">
                    <span className="mr-1 text-sm text-dk-gray-700">Design variant:</span>
                    {VARIANTS.map(({ key }) => (
                        <Button
                            key={key}
                            ui="dashkit"
                            size="sm"
                            type="button"
                            variant={selected === key ? 'primary' : 'white'}
                            onClick={() => setSelected(key)}
                        >
                            {key}
                        </Button>
                    ))}
                </div>
            )}

            <div className={DSCOMMON_BETWEEN_BLOCKS.className}>
                <OwnedTokensCard
                    address={address}
                    layout="grid"
                    expandable={current.holdingsExpandable}
                    filterable={current.holdingsFilterable}
                    desktopFrom={current.holdingsDesktopFrom}
                    onTitleTripleClick={toggleSwitcher}
                />
                {current.history && <TokenHistoryCard address={address} layout="grid" variant={current.history} />}
            </div>
        </div>
    );
}
