import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { NewOrder, SerumIxDetailsProps } from './types';

export function NewOrderDetailsCard(props: SerumIxDetailsProps<NewOrder>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: New Order`}
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
                <td>Request Queue</td>
                <td>
                    <Address pubkey={info.accounts.requestQueue} link />
                </td>
            </tr>

            <tr>
                <td>Payer</td>
                <td>
                    <Address pubkey={info.accounts.payer} link />
                </td>
            </tr>

            <tr>
                <td>Open Orders Owner</td>
                <td>
                    <Address pubkey={info.accounts.openOrdersOwner} link />
                </td>
            </tr>

            <tr>
                <td>Base Vault</td>
                <td>
                    <Address pubkey={info.accounts.baseVault} link />
                </td>
            </tr>

            <tr>
                <td>Quote Vault</td>
                <td>
                    <Address pubkey={info.accounts.quoteVault} link />
                </td>
            </tr>

            <tr>
                <td>Side</td>
                <td>{info.data.side}</td>
            </tr>

            <tr>
                <td>Order Type</td>
                <td>{info.data.orderType}</td>
            </tr>

            <tr>
                <td>Limit Price</td>
                <td>{info.data.limitPrice.toString(10)}</td>
            </tr>

            <tr>
                <td>Max Quantity</td>
                <td>{info.data.maxQuantity.toString(10)}</td>
            </tr>

            <tr>
                <td>Client Id</td>
                <td>{info.data.clientId.toString(10)}</td>
            </tr>
        </InstructionCard>
    );
}
