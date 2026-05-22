import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { SerumIxDetailsProps, SettleFunds } from './types';

export function SettleFundsDetailsCard(props: SerumIxDetailsProps<SettleFunds>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Settle Funds`}
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
                <td>Open Orders</td>
                <td>
                    <Address pubkey={info.accounts.openOrders} link />
                </td>
            </tr>

            <tr>
                <td>Open Orders Owner</td>
                <td>
                    <Address pubkey={info.accounts.openOrdersOwner} link />
                </td>
            </tr>

            <tr>
                <td>Base Vault</td>
                <td>
                    <Address pubkey={info.accounts.baseVault} link />
                </td>
            </tr>

            <tr>
                <td>Quote Vault</td>
                <td>
                    <Address pubkey={info.accounts.quoteVault} link />
                </td>
            </tr>

            <tr>
                <td>Base Wallet</td>
                <td>
                    <Address pubkey={info.accounts.baseWallet} link />
                </td>
            </tr>

            <tr>
                <td>Quote Wallet</td>
                <td>
                    <Address pubkey={info.accounts.quoteWallet} link />
                </td>
            </tr>

            <tr>
                <td>Vault Signer</td>
                <td>
                    <Address pubkey={info.accounts.vaultSigner} link />
                </td>
            </tr>

            {info.accounts.referrerQuoteWallet && (
                <tr>
                    <td>Referrer Quote Wallet</td>
                    <td>
                        <Address pubkey={info.accounts.referrerQuoteWallet} link />
                    </td>
                </tr>
            )}
        </InstructionCard>
    );
}
