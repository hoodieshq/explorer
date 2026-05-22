import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { InitializeMarket, SerumIxDetailsProps } from './types';

export function InitializeMarketDetailsCard(props: SerumIxDetailsProps<InitializeMarket>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Initialize Market`}
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
                <td>Request Queue</td>
                <td>
                    <Address pubkey={info.accounts.requestQueue} link />
                </td>
            </tr>

            <tr>
                <td>Event Queue</td>
                <td>
                    <Address pubkey={info.accounts.eventQueue} link />
                </td>
            </tr>

            <tr>
                <td>Bids</td>
                <td>
                    <Address pubkey={info.accounts.bids} link />
                </td>
            </tr>

            <tr>
                <td>Asks</td>
                <td>
                    <Address pubkey={info.accounts.asks} link />
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
                <td>Base Mint</td>
                <td>
                    <Address pubkey={info.accounts.baseMint} link />
                </td>
            </tr>

            <tr>
                <td>Quote Mint</td>
                <td>
                    <Address pubkey={info.accounts.quoteMint} link />
                </td>
            </tr>

            <tr>
                <td>Base Lot Size</td>
                <td>{info.data.baseLotSize.toString(10)}</td>
            </tr>

            <tr>
                <td>Quote Lot Size</td>
                <td>{info.data.quoteLotSize.toString(10)}</td>
            </tr>

            <tr>
                <td>Fee Rate Bps</td>
                <td>{info.data.feeRateBps}</td>
            </tr>

            <tr>
                <td>Quote Dust Threshold</td>
                <td>{info.data.quoteDustThreshold.toString(10)}</td>
            </tr>

            <tr>
                <td>Vault Signer Nonce</td>
                <td>{info.data.vaultSignerNonce.toString(10)}</td>
            </tr>
        </InstructionCard>
    );
}
