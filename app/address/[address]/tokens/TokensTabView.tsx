'use client';

import { OwnedTokensCard } from '@components/account/OwnedTokensCard';
import { TokenHistoryCard, type TokenHistoryVariant } from '@components/account/TokenHistoryCard';
import { useState } from 'react';

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
};

const VARIANTS: VariantDef[] = [
    { history: 'default', key: '1' },
    { history: 'tx-history', key: '2.1' },
    { history: 'tx-history-compact', key: '2.2' },
    { holdingsExpandable: true, key: '3' },
];

// Design-exploration wrapper for the tokens tab. The switcher sits top-left, above both tables.
export function TokensTabView({ address }: { address: string }) {
    const [selected, setSelected] = useState('1');
    const current = VARIANTS.find(v => v.key === selected) ?? VARIANTS[0];

    return (
        <div>
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

            <div className={DSCOMMON_BETWEEN_BLOCKS.className}>
                <OwnedTokensCard address={address} layout="grid" expandable={current.holdingsExpandable} />
                {current.history && <TokenHistoryCard address={address} layout="grid" variant={current.history} />}
            </div>
        </div>
    );
}
