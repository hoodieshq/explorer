import { Address } from '@components/common/Address';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { AddProductParams } from './program';

export default function AddProductDetailsCard({
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
    info: AddProductParams;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Pyth: Add Product"
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
                <td>Mapping Account</td>
                <td>
                    <Address pubkey={info.mappingPubkey} link />
                </td>
            </tr>

            <tr>
                <td>Product Account</td>
                <td>
                    <Address pubkey={info.productPubkey} link />
                </td>
            </tr>
        </InstructionCard>
    );
}
