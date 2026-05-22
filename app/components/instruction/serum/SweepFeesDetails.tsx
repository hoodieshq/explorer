import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { SerumIxDetailsProps, SweepFees } from './types';

export function SweepFeesDetailsCard(props: SerumIxDetailsProps<SweepFees>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Sweep Fees`}
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Program</td>
                <td>
                    <Address pubkey={info.programId} link />
                </td>
            </tr>

            <tr>
                <td>Market</td>
                <td>
                    <Address pubkey={info.accounts.market} link />
                </td>
            </tr>

            <tr>
                <td>Quote Vault</td>
                <td>
                    <Address pubkey={info.accounts.quoteVault} link />
                </td>
            </tr>

            <tr>
                <td>Fee Sweeping Authority</td>
                <td>
                    <Address pubkey={info.accounts.feeSweepingAuthority} link />
                </td>
            </tr>

            <tr>
                <td>Fee Receiver</td>
                <td>
                    <Address pubkey={info.accounts.quoteFeeReceiver} link />
                </td>
            </tr>

            <tr>
                <td>Vault Signer</td>
                <td>
                    <Address pubkey={info.accounts.vaultSigner} link />
                </td>
            </tr>
        </InstructionCard>
    );
}
