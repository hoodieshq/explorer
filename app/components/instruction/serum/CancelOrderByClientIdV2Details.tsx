import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { CancelOrderByClientIdV2, SerumIxDetailsProps } from './types';

export function CancelOrderByClientIdV2DetailsCard(props: SerumIxDetailsProps<CancelOrderByClientIdV2>) {
    const { ix, index, result, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Serum Program: Cancel Order By Client Id v2"
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
                <td>Bids</td>
                <td>
                    <Address pubkey={info.accounts.bids} link />
                </td>
            </tr>

            <tr>
                <td>Asks</td>
                <td>
                    <Address pubkey={info.accounts.asks} link />
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
                <td>Event Queue</td>
                <td>
                    <Address pubkey={info.accounts.eventQueue} link />
                </td>
            </tr>

            <tr>
                <td>Client Id</td>
                <td>{info.data.clientId.toString(10)}</td>
            </tr>
        </InstructionCard>
    );
}
