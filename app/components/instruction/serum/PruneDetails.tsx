import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { Prune, SerumIxDetailsProps } from './types';

export function PruneDetailsCard(props: SerumIxDetailsProps<Prune>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Prune`}
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
                <td>Prune Authority</td>
                <td>
                    <Address pubkey={info.accounts.pruneAuthority} link />
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
                <td>Iteration Limit</td>
                <td>{info.data.limit}</td>
            </tr>
        </InstructionCard>
    );
}
