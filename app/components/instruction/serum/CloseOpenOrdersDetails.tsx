import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { CloseOpenOrders, SerumIxDetailsProps } from './types';

export function CloseOpenOrdersDetailsCard(props: SerumIxDetailsProps<CloseOpenOrders>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Close Open Orders`}
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
                <td>Open Orders</td>
                <td>
                    <Address pubkey={info.accounts.openOrders} link />
                </td>
            </tr>

            <tr>
                <td>Open Orders Owner</td>
                <td>
                    <Address pubkey={info.accounts.openOrdersOwner} link />
                </td>
            </tr>

            <tr>
                <td>Rent Receiver</td>
                <td>
                    <Address pubkey={info.accounts.rentReceiver} link />
                </td>
            </tr>

            <tr>
                <td>Market</td>
                <td>
                    <Address pubkey={info.accounts.market} link />
                </td>
            </tr>
        </InstructionCard>
    );
}
