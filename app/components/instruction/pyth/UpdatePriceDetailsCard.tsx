import { Address } from '@components/common/Address';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { TradingStatus, UpdatePriceParams } from './program';

export default function UpdatePriceDetailsCard({
    ix,
    index,
    result,
    info,
    innerCards,
    childIndex,
}: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    info: UpdatePriceParams;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Pyth: Update Price"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Program</td>
                <td>
                    <Address pubkey={ix.programId} link />
                </td>
            </tr>

            <tr>
                <td>Publisher</td>
                <td>
                    <Address pubkey={info.publisherPubkey} link />
                </td>
            </tr>

            <tr>
                <td>Price Account</td>
                <td>
                    <Address pubkey={info.pricePubkey} link />
                </td>
            </tr>

            <tr>
                <td>Status</td>
                <td>{TradingStatus[info.status]}</td>
            </tr>

            <tr>
                <td>Price</td>
                <td>{info.price}</td>
            </tr>

            <tr>
                <td>Conf</td>
                <td>{info.conf}</td>
            </tr>

            <tr>
                <td>Publish Slot</td>
                <td>{info.publishSlot}</td>
            </tr>
        </InstructionCard>
    );
}
