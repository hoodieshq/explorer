import { Address } from '@components/common/Address';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { AddPriceParams, PriceType } from './program';

export default function AddPriceDetailsCard({
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
    info: AddPriceParams;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Pyth: Add Price Account"
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
                <td>Funding Account</td>
                <td>
                    <Address pubkey={info.fundingPubkey} link />
                </td>
            </tr>

            <tr>
                <td>Product Account</td>
                <td>
                    <Address pubkey={info.productPubkey} link />
                </td>
            </tr>

            <tr>
                <td>Price Account</td>
                <td>
                    <Address pubkey={info.pricePubkey} link />
                </td>
            </tr>

            <tr>
                <td>Exponent</td>
                <td>{info.exponent}</td>
            </tr>

            <tr>
                <td>Price Type</td>
                <td>{PriceType[info.priceType]}</td>
            </tr>
        </InstructionCard>
    );
}
