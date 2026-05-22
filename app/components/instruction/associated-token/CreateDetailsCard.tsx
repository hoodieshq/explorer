import { Address } from '@components/common/Address';
import { ProgramField } from '@entities/instruction-card';
import { ParsedInstruction, PublicKey, SignatureResult } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';

export function CreateDetailsCard({
    ix,
    index,
    result,
    innerCards,
    childIndex,
    InstructionCardComponent = InstructionCard,
}: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    innerCards?: JSX.Element[];
    childIndex?: number;
    InstructionCardComponent?: React.FC<Parameters<typeof InstructionCard>[0]>;
}) {
    const info = ix.parsed.info;
    return (
        <InstructionCardComponent
            ix={ix}
            index={index}
            result={result}
            title="Associated Token Program: Create"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <ProgramField programId={ix.programId} />

            <tr>
                <td>Source</td>
                <td>
                    <Address pubkey={new PublicKey(info.source)} link />
                </td>
            </tr>

            <tr>
                <td>Account</td>
                <td>
                    <Address pubkey={new PublicKey(info.account)} link />
                </td>
            </tr>

            <tr>
                <td>Mint</td>
                <td>
                    <Address pubkey={new PublicKey(info.mint)} link />
                </td>
            </tr>

            <tr>
                <td>Wallet</td>
                <td>
                    <Address pubkey={new PublicKey(info.wallet)} link />
                </td>
            </tr>

            <tr>
                <td>System Program</td>
                <td>
                    <Address pubkey={new PublicKey(info.systemProgram)} link />
                </td>
            </tr>

            <tr>
                <td>Token Program</td>
                <td>
                    <Address pubkey={new PublicKey(info.tokenProgram)} link />
                </td>
            </tr>
        </InstructionCardComponent>
    );
}
