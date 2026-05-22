import { Address } from '@components/common/Address';
import React from 'react';

import { InstructionCard } from '../InstructionCard';
import { DisableMarket, SerumIxDetailsProps } from './types';

export function DisableMarketDetailsCard(props: SerumIxDetailsProps<DisableMarket>) {
    const { ix, index, result, programName, info, innerCards, childIndex } = props;

    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title={`${programName} Program: Disable Market`}
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
                <td>Disable Authority</td>
                <td>
                    <Address pubkey={info.accounts.disableAuthority} link />
                </td>
            </tr>
        </InstructionCard>
    );
}
