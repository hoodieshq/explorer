import { Address } from '@components/common/Address';
import { Copyable } from '@components/common/Copyable';
import { ParsedInstruction, SignatureResult, SystemProgram } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { AssignWithSeedInfo } from './types';

export function AssignWithSeedDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: AssignWithSeedInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="System Program: Assign Account w/ Seed"
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
                <td>Account Address</td>
                <td>
                    <Address pubkey={info.account} link />
                </td>
            </tr>

            <tr>
                <td>Base Address</td>
                <td>
                    <Address pubkey={info.base} link />
                </td>
            </tr>

            <tr>
                <td>Seed</td>
                <td>
                    <Copyable text={info.seed}>
                        <code>{info.seed}</code>
                    </Copyable>
                </td>
            </tr>

            <tr>
                <td>Assigned Program Id</td>
                <td>
                    <Address pubkey={info.owner} link />
                </td>
            </tr>
        </InstructionCard>
    );
}
