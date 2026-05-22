import { Address } from '@components/common/Address';
import { ProgramField } from '@entities/instruction-card';
import { ParsedInstruction, SignatureResult } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { CreateIdempotentInfo } from './types';

export function CreateIdempotentDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: CreateIdempotentInfo;
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
            title="Associated Token Program: Create Idempotent"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <ProgramField programId={ix.programId} />
            <tr>
                <td>Source</td>
                <td>
                    <Address pubkey={info.source} link />
                </td>
            </tr>

            <tr>
                <td>Account</td>
                <td>
                    <Address pubkey={info.account} link />
                </td>
            </tr>

            <tr>
                <td>Wallet</td>
                <td>
                    <Address pubkey={info.wallet} link />
                </td>
            </tr>

            <tr>
                <td>Mint</td>
                <td>
                    <Address pubkey={info.mint} link />
                </td>
            </tr>

            <tr>
                <td>System Program</td>
                <td>
                    <Address pubkey={info.systemProgram} link />
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
