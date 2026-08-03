import { Copyable } from '@components/common/Copyable';
import { SolBalance } from '@components/common/SolBalance';
import type { PublicKey } from '@solana/web3.js';
import React from 'react';

import { BaseTable } from '@/app/shared/ui/Table';

import { compactFields, type InstructionField, type InstructionFieldList } from '../model/fields';
import { useInstructionSurface } from '../model/surface';
import { ProgramField } from './ProgramField';

/**
 * Renders field descriptors as card rows. This is the only place that knows the
 * row markup, the right-alignment, and which address renderer the current
 * surface uses.
 */
export function InstructionFields({ fields, programId }: { fields: InstructionFieldList; programId: PublicKey }) {
    const { showProgramField } = useInstructionSurface();

    return (
        <>
            {showProgramField && <ProgramField programId={programId} />}
            {compactFields(fields).map((field, i) => (
                <FieldRow key={`${field.label}-${i}`} field={field} />
            ))}
        </>
    );
}

function FieldRow({ field }: { field: InstructionField }) {
    const { Address } = useInstructionSurface();

    return (
        <BaseTable.Row>
            <BaseTable.Cell>{field.label}</BaseTable.Cell>
            <BaseTable.Cell className="text-right">
                {field.kind === 'address' && <Address pubkey={field.pubkey} />}
                {field.kind === 'sol' && <SolBalance lamports={field.lamports} />}
                {field.kind === 'bytes' && `${field.size} byte(s)`}
                {field.kind === 'seed' && (
                    <Copyable text={field.seed}>
                        <code>{field.seed}</code>
                    </Copyable>
                )}
                {field.kind === 'text' && field.value}
                {field.kind === 'custom' && field.value}
            </BaseTable.Cell>
        </BaseTable.Row>
    );
}
