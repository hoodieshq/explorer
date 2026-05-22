import { Address } from '@components/common/Address';
import { ParsedInstruction, SignatureResult, StakeProgram } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { AuthorizeInfo } from './types';

export function AuthorizeDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: AuthorizeInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Stake Program: Authorize"
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
                <td>Old Authority Address</td>
                <td>
                    <Address pubkey={info.authority} link />
                </td>
            </tr>

            <tr>
                <td>New Authority Address</td>
                <td>
                    <Address pubkey={info.newAuthority} link />
                </td>
            </tr>

            <tr>
                <td>Authority Type</td>
                <td>{info.authorityType}</td>
            </tr>
        </InstructionCard>
    );
}
