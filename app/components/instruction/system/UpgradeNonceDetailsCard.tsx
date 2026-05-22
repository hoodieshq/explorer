import { Address } from '@components/common/Address';
import { ParsedInstruction, SignatureResult, SystemProgram } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { UpgradeNonceInfo } from './types';

export function UpgradeNonceDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: UpgradeNonceInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="System Program: Upgrade Nonce"
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
        </InstructionCard>
    );
}
