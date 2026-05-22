import { InstructionDetailsProps } from '@features/transaction';
import { AddressLookupTableProgram } from '@solana/web3.js';

import { Address } from '@/app/components/common/Address';
import { InstructionCard } from '@/app/components/instruction/InstructionCard';

import { DeactivateLookupTableInfo } from './types';

export function DeactivateLookupTableDetailsCard(props: InstructionDetailsProps & { info: DeactivateLookupTableInfo }) {
    const { ix, index, result, innerCards, childIndex, info } = props;
    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Address Lookup Table: Deactivate Lookup Table"
            innerCards={innerCards}
            childIndex={childIndex}
        >
            <tr>
                <td>Program</td>
                <td>
                    <Address pubkey={AddressLookupTableProgram.programId} link />
                </td>
            </tr>
            <tr>
                <td>Lookup Table</td>
                <td>
                    <Address pubkey={info.lookupTableAccount} link />
                </td>
            </tr>
            <tr>
                <td>Lookup Table Authority</td>
                <td>
                    <Address pubkey={info.lookupTableAuthority} link />
                </td>
            </tr>
        </InstructionCard>
    );
}
