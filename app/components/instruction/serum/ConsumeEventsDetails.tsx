import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { ConsumeEvents, SerumIxDetailsProps } from './types';

export function ConsumeEventsDetailsCard(props: SerumIxDetailsProps<ConsumeEvents>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Consume Events`}
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Program</td>
                <td>
                    <Address pubkey={info.programId} link />
                </td>
            </tr>

            <tr>
                <td>Market</td>
                <td>
                    <Address pubkey={info.accounts.market} link />
                </td>
            </tr>

            <tr>
                <td>Event Queue</td>
                <td>
                    <Address pubkey={info.accounts.eventQueue} link />
                </td>
            </tr>

            <tr>
                <td>Open Orders Accounts</td>
                <td>
                    {info.accounts.openOrders.map((account, index) => {
                        return <Address pubkey={account} key={index} link />;
                    })}
                </td>
            </tr>

            <tr>
                <td>Limit</td>
                <td>{info.data.limit}</td>
            </tr>
        </InstructionCard>
    );
}
