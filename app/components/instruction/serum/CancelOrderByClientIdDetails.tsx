import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { CancelOrderByClientId, SerumIxDetailsProps } from './types';

export function CancelOrderByClientIdDetailsCard(props: SerumIxDetailsProps<CancelOrderByClientId>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Cancel Order By Client Id`}
            innerCards={innerCards}
            childIndex={childIndex}
        >
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
                <td>Request Queue</td>
                <td>
                    <Address pubkey={info.accounts.requestQueue} link />
                </td>
            </tr>

            <tr>
                <td>Open Orders Owner</td>
                <td>
                    <Address pubkey={info.accounts.openOrdersOwner} link />
                </td>
            </tr>

            <tr>
                <td>Client Id</td>
                <td>{info.data.clientId.toString(10)}</td>
            </tr>
        </InstructionCard>
    );
}
