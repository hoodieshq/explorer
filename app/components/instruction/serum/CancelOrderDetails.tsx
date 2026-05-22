import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { CancelOrder, SerumIxDetailsProps } from './types';

export function CancelOrderDetailsCard(props: SerumIxDetailsProps<CancelOrder>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Cancel Order`}
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
                <td>Request Queue</td>
                <td>
                    <Address pubkey={info.accounts.requestQueue} link />
                </td>
            </tr>

            <tr>
                <td>Side</td>
                <td>{info.data.side}</td>
            </tr>

            <tr>
                <td>Open Orders Slot</td>
                <td>{info.data.openOrdersSlot}</td>
            </tr>

            <tr>
                <td>Order Id</td>
                <td>{info.data.orderId.toString(10)}</td>
            </tr>
        </InstructionCard>
    );
}
