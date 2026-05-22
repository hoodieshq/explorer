import { Address } from '@components/common/Address';
import { ParsedInstruction, SignatureResult } from '@solana/web3.js';
import { wrap } from '@utils/index';
import React from 'react';

import { InstructionCard } from './InstructionCard';

export function MemoDetailsCard({
    ix,
    index,
    result,
    innerCards,
    childIndex,
}: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const data = wrap(ix.parsed, 50);
    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Memo Program: Memo"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Program</td>
                <td>
                    <Address pubkey={ix.programId} link />
                </td>
            </tr>

            <tr>
                <td>Data (UTF-8)</td>
                <td>
                    <pre className="d-inline-block text-start mb-0">{data}</pre>
                </td>
            </tr>
        </InstructionCard>
    );
}
