import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { InitOpenOrders, SerumIxDetailsProps } from './types';

export function InitOpenOrdersDetailsCard(props: SerumIxDetailsProps<InitOpenOrders>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Init Open Orders`}
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
                <td>Market</td>
                <td>
                    <Address pubkey={info.accounts.market} link />
                </td>
            </tr>

            {info.accounts.openOrdersMarketAuthority && (
                <tr>
                    <td>Open Orders Market Authority</td>
                    <td>
                        <Address pubkey={info.accounts.openOrdersMarketAuthority} link />
                    </td>
                </tr>
            )}
        </InstructionCard>
    );
}
