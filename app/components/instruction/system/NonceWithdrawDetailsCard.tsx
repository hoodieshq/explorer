import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { ParsedInstruction, SignatureResult, SystemProgram } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { WithdrawNonceInfo } from './types';

export function NonceWithdrawDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: WithdrawNonceInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="System Program: Withdraw Nonce"
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
                <td>Nonce Address</td>
                <td>
                    <Address pubkey={info.nonceAccount} link />
                </td>
            </tr>

            <tr>
                <td>Authority Address</td>
                <td>
                    <Address pubkey={info.nonceAuthority} link />
                </td>
            </tr>

            <tr>
                <td>To Address</td>
                <td>
                    <Address pubkey={info.destination} link />
                </td>
            </tr>

            <tr>
                <td>Withdraw Amount (SOL)</td>
                <td>
                    <SolBalance lamports={info.lamports} />
                </td>
            </tr>
        </InstructionCard>
    );
}
