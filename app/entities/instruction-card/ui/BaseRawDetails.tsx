import { Address } from '@components/common/Address';
import { HexData } from '@components/shared/HexData';
import { TransactionInstruction } from '@solana/web3.js';

import { BaseTable } from '@/app/shared/ui/Table';

import { AccountRoleBadges } from './AccountRoleBadges';

/** Component that displays accounts from any Instruction. */
export function BaseRawDetails({ ix }: { ix: TransactionInstruction }) {
    return (
        <>
            {ix.keys.map(({ pubkey, isSigner, isWritable }, keyIndex) => (
                <BaseTable.Row key={keyIndex}>
                    <BaseTable.Cell>
                        <div className="mr-1.5 md:inline">Account #{keyIndex + 1}</div>
                        <AccountRoleBadges isWritable={isWritable} isSigner={isSigner} />
                    </BaseTable.Cell>
                    <BaseTable.Cell>
                        <Address pubkey={pubkey} link wrapLabel />
                    </BaseTable.Cell>
                </BaseTable.Row>
            ))}

            <HexDataRow label="Instruction Data" data={ix.data} />
        </>
    );
}

export function HexDataRow({ label, data }: { label: string; data: Uint8Array }) {
    return (
        <BaseTable.Row>
            <BaseTable.Cell>
                {label} <span>(Hex)</span>
            </BaseTable.Cell>
            <BaseTable.Cell>
                <HexData raw={data} align="start" className="-my-1.5" />
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
