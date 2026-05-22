import { Address } from '@components/common/Address';
import { Copyable } from '@components/common/Copyable';
import { SolBalance } from '@components/common/SolBalance';
import { ParsedInstruction, SignatureResult, SystemProgram } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { TransferWithSeedInfo } from './types';

export function TransferWithSeedDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: TransferWithSeedInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="System Program: Transfer w/ Seed"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Program</td>
                <td>
                    <Address pubkey={SystemProgram.programId} link />
                </td>
            </tr>

            <tr>
                <td>From Address</td>
                <td>
                    <Address pubkey={info.source} link />
                </td>
            </tr>

            <tr>
                <td>Destination Address</td>
                <td>
                    <Address pubkey={info.destination} link />
                </td>
            </tr>

            <tr>
                <td>Base Address</td>
                <td>
                    <Address pubkey={info.sourceBase} link />
                </td>
            </tr>

            <tr>
                <td>Transfer Amount (SOL)</td>
                <td>
                    <SolBalance lamports={info.lamports} />
                </td>
            </tr>

            <tr>
                <td>Seed</td>
                <td>
                    <Copyable text={info.sourceSeed}>
                        <code>{info.sourceSeed}</code>
                    </Copyable>
                </td>
            </tr>

            <tr>
                <td>Source Owner</td>
                <td>
                    <Address pubkey={info.sourceOwner} link />
                </td>
            </tr>
        </InstructionCard>
    );
}
