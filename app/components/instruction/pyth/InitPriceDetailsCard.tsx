import { Address } from '@components/common/Address';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { InitPriceParams, PriceType } from './program';

export default function InitPriceDetailsCard({
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
    info: InitPriceParams;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Pyth: Init Price Account"
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
