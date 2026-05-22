import { Address } from '@components/common/Address';
import { ParsedInstruction, SignatureResult, StakeProgram } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { DelegateInfo } from './types';

export function DelegateDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: DelegateInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Stake Program: Delegate Stake"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Program</td>
                <td>
                    <Address pubkey={StakeProgram.programId} link />
                </td>
            </tr>

            <tr>
                <td>Stake Address</td>
                <td>
                    <Address pubkey={info.stakeAccount} link />
                </td>
            </tr>

            <tr>
                <td>Delegated Vote Address</td>
                <td>
                    <Address pubkey={info.voteAccount} link />
                </td>
            </tr>

            <tr>
                <td>Authority Address</td>
                <td>
                    <Address pubkey={info.stakeAuthority} link />
                </td>
            </tr>
        </InstructionCard>
    );
}
