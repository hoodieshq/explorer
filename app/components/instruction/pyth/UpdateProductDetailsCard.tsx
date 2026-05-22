import { Address } from '@components/common/Address';
import { Copyable } from '@components/common/Copyable';
import { SignatureResult, TransactionInstruction } from '@solana/web3.js';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { UpdateProductParams } from './program';

export default function UpdateProductDetailsCard({
    ix,
    index,
    result,
    info,
    innerCards,
    childIndex,
}: {
    ix: TransactionInstruction;
    index: number;
    result: SignatureResult;
    info: UpdateProductParams;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const attrsJSON = JSON.stringify(Object.fromEntries(info.attributes), null, 2);

    function Content() {
        return (
            <Copyable text={attrsJSON}>
                <pre className="d-inline-block text-start mb-0">{attrsJSON}</pre>
            </Copyable>
        );
    }

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Pyth: Update Product"
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
                <td>Funding Account</td>
                <td>
                    <Address pubkey={info.fundingPubkey} link />
                </td>
            </tr>

            <tr>
                <td>Product Account</td>
                <td>
                    <Address pubkey={info.productPubkey} link />
                </td>
            </tr>

            <tr>
                <td>
                    Attributes <span className="text-muted">(JSON)</span>
                </td>
                <td>
                    <div className="d-none d-lg-flex align-items-center justify-content-end">
                        <Content />
                    </div>
                    <div className="d-flex d-lg-none align-items-center">
                        <Content />
                    </div>
                </td>
            </tr>
        </InstructionCard>
    );
}
