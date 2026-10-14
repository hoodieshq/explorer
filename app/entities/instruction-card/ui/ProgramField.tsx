import { Address } from '@components/common/Address';
import { AddressWithContext, programValidator } from '@components/inspector/AddressWithContext';
import { PublicKey } from '@solana/web3.js';

import { MarkedValue } from '@/app/shared/lib/marked-value';
import { BaseTable } from '@/app/shared/ui/Table';

type ProgramFieldProps = {
    programId: PublicKey;
    showExtendedInfo?: boolean;
    /** For a card whose table is wider than two columns, so the row still reaches the right edge. */
    colSpan?: number;
    name?: string;
};

export function ProgramField({ programId, showExtendedInfo = false, colSpan, name }: ProgramFieldProps) {
    return (
        <BaseTable.Row>
            <BaseTable.Cell>Program</BaseTable.Cell>
            <BaseTable.Cell className="text-right" colSpan={colSpan}>
                {showExtendedInfo ? (
                    <AddressWithContext pubkey={programId} validator={programValidator} />
                ) : name ? (
                    // A given name comes from the program's IDL, so it carries the IDL's mark; the address alone does not.
                    <MarkedValue>
                        <Address pubkey={programId} alignRight link overrideText={name} />
                    </MarkedValue>
                ) : (
                    <Address pubkey={programId} alignRight link />
                )}
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
