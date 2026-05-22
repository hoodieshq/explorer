import { Address } from '@components/common/Address';
import { ProgramField } from '@entities/instruction-card';
import { ParsedInstruction, SignatureResult } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { RecoverNestedInfo } from './types';

export function RecoverNestedDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: RecoverNestedInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
    InstructionCardComponent?: React.FC<Parameters<typeof InstructionCard>[0]>;
}) {
    const { ix, index, result, info, innerCards, childIndex, InstructionCardComponent = InstructionCard } = props;

    return (
        <InstructionCardComponent
            ix={ix}
            index={index}
            result={result}
            title="Associated Token Program: Recover Nested"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <ProgramField programId={ix.programId} />
            <tr>
                <td>Destination</td>
                <td>
                    <Address pubkey={info.destination} link />
                </td>
            </tr>

            <tr>
                <td>Nested Mint</td>
                <td>
                    <Address pubkey={info.nestedMint} link />
                </td>
            </tr>

            <tr>
                <td>Nested Owner</td>
                <td>
                    <Address pubkey={info.nestedOwner} link />
                </td>
            </tr>

            <tr>
                <td>Nested Source</td>
                <td>
                    <Address pubkey={info.nestedSource} link />
                </td>
            </tr>

            <tr>
                <td>Owner Mint</td>
                <td>
                    <Address pubkey={info.ownerMint} link />
                </td>
            </tr>

            <tr>
                <td>Owner</td>
                <td>
                    <Address pubkey={info.wallet} link />
                </td>
            </tr>

            <tr>
                <td>Token Program</td>
                <td>
                    <Address pubkey={info.tokenProgram} link />
                </td>
            </tr>
        </InstructionCardComponent>
    );
}
