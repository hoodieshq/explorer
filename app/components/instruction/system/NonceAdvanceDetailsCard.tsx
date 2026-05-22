import { Address } from '@components/common/Address';
import { ParsedInstruction, SignatureResult, SystemProgram } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { AdvanceNonceInfo } from './types';

export function NonceAdvanceDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: AdvanceNonceInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="System Program: Advance Nonce"
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
        </InstructionCard>
    );
}
