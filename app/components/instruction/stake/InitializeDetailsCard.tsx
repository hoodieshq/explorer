import { Address } from '@components/common/Address';
import { Epoch } from '@components/common/Epoch';
import { ParsedInstruction, SignatureResult, StakeProgram, SystemProgram } from '@solana/web3.js';
import { displayTimestampUtc } from '@utils/date';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { InitializeInfo } from './types';

export function InitializeDetailsCard(props: {
    ix: ParsedInstruction;
    index: number;
    result: SignatureResult;
    info: InitializeInfo;
    innerCards?: JSX.Element[];
    childIndex?: number;
}) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Stake Program: Initialize Stake"
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
                <td>Stake Authority Address</td>
                <td>
                    <Address pubkey={info.authorized.staker} link />
                </td>
            </tr>

            <tr>
                <td>Withdraw Authority Address</td>
                <td>
                    <Address pubkey={info.authorized.withdrawer} link />
                </td>
            </tr>

            {info.lockup.epoch > 0 && (
                <tr>
                    <td>Lockup Expiry Epoch</td>
                    <td>
                        <Epoch epoch={info.lockup.epoch} link />
                    </td>
                </tr>
            )}

            {info.lockup.unixTimestamp > 0 && (
                <tr>
                    <td>Lockup Expiry Timestamp</td>
                    <td className="font-monospace">
                        {displayTimestampUtc(info.lockup.unixTimestamp * 1000)}
                    </td>
                </tr>
            )}

            {!info.lockup.custodian.equals(SystemProgram.programId) && (
                <tr>
                    <td>Lockup Custodian Address</td>
                    <td>
                        <Address pubkey={info.lockup.custodian} link />
                    </td>
                </tr>
            )}
        </InstructionCard>
    );
}
