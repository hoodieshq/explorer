import { Address } from '@components/common/Address';
import { BalanceDelta } from '@components/common/BalanceDelta';
import { SolBalance } from '@components/common/SolBalance';
import { Badge } from '@components/shared/ui/badge';
import React from 'react';

import { SolBalanceChange } from '../lib/types';

export function SolBalanceChangesCard({ balanceChanges }: { balanceChanges: SolBalanceChange[] }) {
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
                                    <Address pubkey={change.pubkey} link fetchTokenLabelInfo />
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

