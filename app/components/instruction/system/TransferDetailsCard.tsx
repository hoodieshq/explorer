import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { ParsedInstruction, SignatureResult, SystemProgram } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React, { useContext } from 'react';

import { InstructionCard } from '../InstructionCard';
import { SignatureContext } from '../SignatureContext';
import { TransferInfo } from './types';

export function TransferDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: TransferInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;
    const signature = useContext(SignatureContext);
    const receiptPath = useClusterPath({
        additionalParams: new URLSearchParams({ view: 'receipt' }),
        pathname: `/tx/${signature}`,
    });

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="System Program: Transfer"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Program</td>
                <td className="text-lg-end">
                    <Address pubkey={SystemProgram.programId} alignRight link />
                </td>
            </tr>

            <tr>
                <td>From Address</td>
                <td className="text-lg-end">
                    <Address pubkey={info.source} alignRight link />
                </td>
            </tr>

            <tr>
                <td>To Address</td>
                <td className="text-lg-end">
                    <Address pubkey={info.destination} alignRight link />
                </td>
            </tr>

            <tr>
                <td>Transfer Amount (SOL)</td>
                <td className="text-lg-end">
                    <SolBalance lamports={info.lamports} />
                </td>
            </tr>

            {signature && (
                <tr>
                    <td>Receipt</td>
                    <td className="text-lg-end">
                        <Link href={receiptPath} className="btn btn-sm btn-white">
                            View
                        </Link>
                    </td>
                </tr>
            )}
        </InstructionCard>
    );
}
