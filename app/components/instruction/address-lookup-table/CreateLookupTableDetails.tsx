import { InstructionDetailsProps } from '@features/transaction';
import { AddressLookupTableProgram } from '@solana/web3.js';

import { Address } from '@/app/components/common/Address';
import { Slot } from '@/app/components/common/Slot';
import { InstructionCard } from '@/app/components/instruction/InstructionCard';

import { CreateLookupTableInfo } from './types';

export function CreateLookupTableDetailsCard(props: InstructionDetailsProps & { info: CreateLookupTableInfo }) {
    const { ix, index, result, innerCards, childIndex, info } = props;
    return (
        <InstructionCard
            ix={ix}
            index={index}
            result={result}
            title="Address Lookup Table: Create Lookup Table"
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
            <tr>
                <td>Payer Account</td>
                <td>
                    <Address pubkey={info.payerAccount} link />
                </td>
            </tr>
            <tr>
                <td>Recent Slot</td>
                <td>
                    <Slot slot={info.recentSlot} link />
                </td>
            </tr>
            <tr>
                <td>Bump Seed</td>
                <td>{info.bumpSeed}</td>
            </tr>
        </InstructionCard>
    );
}
