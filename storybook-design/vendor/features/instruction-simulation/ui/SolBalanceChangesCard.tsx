import { Address } from '@components/common/Address';
import { BalanceDelta } from '@components/common/BalanceDelta';
import { SolBalance } from '@components/common/SolBalance';
import { cn } from '@components/shared/utils';

import type { SolBalanceChange } from '@/app/features/instruction-simulation/lib/types';

import { Section } from '../../../shared/ui/Section';

// Column geometry mirrors the Account List grid so the two blocks reflow identically on mobile.
// Mobile keeps `change` / `post balance` stacked in a trailing column (the address cell spans both
// rows); desktop lays everything out in a single 4-column row.
const ROW_GRID = cn(
    'px-3 py-2.5',
    'grid items-start gap-x-0 gap-y-0.5 whitespace-nowrap text-sm md:gap-y-0 lg:gap-x-5 landscape:gap-x-5',
    'grid-cols-[minmax(auto,1.75rem)_1fr_auto]',
    'lg:grid-cols-[minmax(auto,1.25rem)_1fr_minmax(auto,160px)_minmax(auto,160px)]',
    'landscape:grid-cols-[minmax(auto,1.25rem)_1fr_minmax(auto,160px)_minmax(auto,160px)]',
    "[grid-template-areas:'number_address_change'_'number_address_postbalance']",
    "lg:[grid-template-areas:'number_address_change_postbalance']",
    "landscape:[grid-template-areas:'number_address_change_postbalance']",
);

// 12px horizontal / 8px vertical padding, matching the DENSE_ROW_PADDING headers used by the other
// tables on the inspector page (Signatures, Account List, Address Table Lookups).
const HEADER_GRID = cn(
    'hidden px-3 py-2 lg:grid landscape:grid',
    'grid-cols-[minmax(auto,1.25rem)_1fr_minmax(auto,160px)_minmax(auto,160px)] gap-5',
    'text-xs uppercase tracking-[0.08em] text-outer-space-300',
    'border-1 border-b border-white/10 [border-bottom-style:solid]',
);

export function SolBalanceChangesCard({ balanceChanges }: { balanceChanges: SolBalanceChange[] }) {
    return (
        <Section title="SOL Balance Changes">
            <div className={HEADER_GRID}>
                <div>#</div>
                <div>Address</div>
                <div className="text-right">Change (SOL)</div>
                <div className="text-right">Post Balance (SOL)</div>
            </div>
            {balanceChanges.map((change, i) => (
                <div
                    key={change.pubkey.toBase58()}
                    className="border-1 border-b border-white/10 [border-bottom-style:solid] last:border-b-0"
                >
                    <div className={ROW_GRID}>
                        <div className="mr-2 text-outer-space-300 [grid-area:number] lg:mr-0">{i + 1}</div>
                        <div className="min-w-0 [grid-area:address]">
                            <Address pubkey={change.pubkey} link fetchTokenLabelInfo />
                        </div>
                        <div className="justify-self-end [grid-area:change]">
                            <BalanceDelta delta={change.delta} isSol />
                        </div>
                        <div className="justify-self-end [grid-area:postbalance]">
                            <SolBalance lamports={BigInt(change.postBalance.toString())} />
                        </div>
                    </div>
                </div>
            ))}
        </Section>
    );
}
