import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { MatchOrders, SerumIxDetailsProps } from './types';

export function MatchOrdersDetailsCard(props: SerumIxDetailsProps<MatchOrders>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Match Orders`}
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
                <td>Request Queue</td>
                <td>
                    <Address pubkey={info.accounts.requestQueue} link />
                </td>
            </tr>

            <tr>
                <td>Event Queue</td>
                <td>
                    <Address pubkey={info.accounts.eventQueue} link />
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
                <td>Limit</td>
                <td>{info.data.limit}</td>
            </tr>
        </InstructionCard>
    );
}
