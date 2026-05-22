import { Address } from '@components/common/Address';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { AddMappingParams } from './program';

export default function AddMappingDetailsCard({
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
    info: AddMappingParams;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Pyth: Add Mapping Account"
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
                <td>Next Mapping Account</td>
                <td>
                    <Address pubkey={info.nextMappingPubkey} link />
                </td>
            </tr>
        </InstructionCard>
    );
}
