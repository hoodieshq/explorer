import { BalanceDelta } from '@components/common/BalanceDelta';
import { SolBalance } from '@components/common/SolBalance';
import { Badge } from '@components/shared/ui/badge';
import { PublicKey } from '@solana/web3.js';
import type { Meta, StoryObj } from '@storybook/react';
import BN from 'bn.js';
import React from 'react';

import type { SolBalanceChange } from '../../lib/types';

// Локальная версия компонента для Storybook (копия оригинала, но без зависимостей)
function SolBalanceChangesCard({ balanceChanges }: { balanceChanges: SolBalanceChange[] }) {
    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-header-title">SOL Balance Changes</h3>
            </div>
            <div className="e-overflow-x-auto e-mb-0">
                <table className="e-w-full e-text-sm">
                    <thead>
                        <tr>
                            <th className="e-px-4 e-py-3 e-text-left e-border-t-0 e-border-b e-border-[#282d2b] e-text-neutral-500">
                                #
                            </th>
                            <th className="e-px-4 e-py-3 e-text-left e-border-t-0 e-border-b e-border-[#282d2b] e-text-neutral-500">
                                Address
                            </th>
                            <th className="e-px-4 e-py-3 e-text-left e-border-t-0 e-border-b e-border-[#282d2b] e-text-neutral-500">
                                Change (SOL)
                            </th>
                            <th className="e-px-4 e-py-3 e-text-left e-border-t-0 e-border-b e-border-[#282d2b] e-text-neutral-500">
                                Post Balance (SOL)
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {balanceChanges.map((change, i) => (
                            <tr key={change.pubkey.toBase58()}>
                                <td className="e-px-4 e-py-3 e-border-t-0 e-border-b e-border-[#282d2b]">
                                    <Badge variant="secondary" size="xs">
                                        {i + 1}
                                    </Badge>
                                </td>
                                <td className="e-px-4 e-py-3 e-border-t-0 e-border-b e-border-[#282d2b]">
                                    <span className="font-monospace">{change.pubkey.toBase58()}</span>
                                </td>
                                <td className="e-px-4 e-py-3 e-border-t-0 e-border-b e-border-[#282d2b]">
                                    <BalanceDelta delta={change.delta} isSol />
                                </td>
                                <td className="e-px-4 e-py-3 e-border-t-0 e-border-b e-border-[#282d2b]">
                                    <SolBalance lamports={change.postBalance.toNumber()} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const meta = {
    component: SolBalanceChangesCard,
    parameters: {
        backgrounds: {
            default: 'Card',
        },
    },
    tags: ['autodocs'],
    title: 'Features/InstructionSimulation/SolBalanceChangesCard',
} satisfies Meta<typeof SolBalanceChangesCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SinglePositiveChange: Story = {
    args: {
        balanceChanges: [
            {
                delta: new BN(1000000000),
                postBalance: new BN(5000000000),
                preBalance: new BN(4000000000),
                pubkey: new PublicKey('DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL'),
            },
        ],
    },
};

export const SingleNegativeChange: Story = {
    args: {
        balanceChanges: [
            {
                delta: new BN(-500000000),
                postBalance: new BN(3500000000),
                preBalance: new BN(4000000000),
                pubkey: new PublicKey('8FpVqParvVZQWgXw2WU734yQ5GZVUZh3jYWMeD5HRBKV'),
            },
        ],
    },
};

export const MultipleChanges: Story = {
    args: {
        balanceChanges: [
            {
                delta: new BN(1000000000),
                postBalance: new BN(5000000000),
                preBalance: new BN(4000000000),
                pubkey: new PublicKey('DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL'),
            },
            {
                delta: new BN(-500000000),
                postBalance: new BN(3500000000),
                preBalance: new BN(4000000000),
                pubkey: new PublicKey('8FpVqParvVZQWgXw2WU734yQ5GZVUZh3jYWMeD5HRBKV'),
            },
            {
                delta: new BN(250000000),
                postBalance: new BN(2250000000),
                preBalance: new BN(2000000000),
                pubkey: new PublicKey('HgsXLyn8175xEwRfFRN3DeARE2VCeEXrSW8BJmCqvz1o'),
            },
        ],
    },
};
