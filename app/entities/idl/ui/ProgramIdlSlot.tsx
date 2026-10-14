'use client';

import { createContext, type ReactNode, useContext } from 'react';

import { ValueMarkProvider } from '@/app/shared/lib/marked-value';

import { useCustomIdlAllowedHere } from '../model/custom-idl/idl-surfaces';
import { useProgramIdlPreference } from '../model/custom-idl/use-program-idl-preference';
import { BaseIdlSelectUnavailable } from './BaseIdlSelectUnavailable';
import { CustomIdlMark } from './CustomIdlMark';
import { ProgramIdlSelector } from './ProgramIdlSelector';

type ProgramIdlSlotValue = { programAddress: string; decodedByRpc: boolean };

const ProgramIdlSlotContext = createContext<ProgramIdlSlotValue | undefined>(undefined);

/**
 * Tells the instruction card below which program it shows and whether the RPC already decoded it. The
 * instruction list knows that; the shared card header only renders the slot. Every card sets its own value,
 * so an inner card never inherits its parent's program.
 */
export function ProgramIdlSlotProvider({
    programAddress,
    decodedByRpc = false,
    children,
}: {
    programAddress: string;
    /** The RPC returned the instruction pre-parsed, without the raw bytes a custom IDL would decode. */
    decodedByRpc?: boolean;
    children: ReactNode;
}) {
    const { preference } = useProgramIdlPreference(programAddress);
    // A selected custom IDL decodes every instruction that has its raw bytes, so then every value the card
    // renders from an IDL comes from the custom one.
    const isCustomIdl = !decodedByRpc && preference?.selected === 'custom' && Boolean(preference.custom);
    return (
        <ProgramIdlSlotContext.Provider value={{ decodedByRpc, programAddress }}>
            <CustomIdlMarkProvider active={isCustomIdl}>{children}</CustomIdlMarkProvider>
        </ProgramIdlSlotContext.Provider>
    );
}

/** Marks every `MarkedValue` below with the custom-IDL background while `active`, and clears outer marks when not. */
export function CustomIdlMarkProvider({ active, children }: { active: boolean; children: ReactNode }) {
    return <ValueMarkProvider mark={active ? markCustomIdlValue : undefined}>{children}</ValueMarkProvider>;
}

function markCustomIdlValue(value: ReactNode) {
    return <CustomIdlMark>{value}</CustomIdlMark>;
}

/**
 * The enclosing instruction's IDL selector, or its unavailable stand-in when the RPC decoded it. Shown only for a
 * program with a stored custom IDL (see {@link StoredProgramIdlSelector}).
 */
export function ProgramIdlSlot() {
    const slot = useContext(ProgramIdlSlotContext);
    if (!slot) return undefined;
    return <StoredProgramIdlSelector programAddress={slot.programAddress} decodedByRpc={slot.decodedByRpc} />;
}

/**
 * The program's IDL selector on pages that decode transactions and accounts. It shows only once the program has a
 * stored custom IDL, since on-chain IDLs alone leave nothing to choose there; a new custom IDL is added through the
 * catalog, or on the program's IDL tab.
 */
export function StoredProgramIdlSelector({
    programAddress,
    decodedByRpc = false,
}: {
    programAddress: string;
    decodedByRpc?: boolean;
}) {
    const { preference } = useProgramIdlPreference(programAddress);
    const allowed = useCustomIdlAllowedHere();
    // REVIEW(HOO-1971): a page the design menu turned the custom IDL off for has nothing to choose either.
    if (!preference?.custom || !allowed) return undefined;
    if (decodedByRpc) return <BaseIdlSelectUnavailable />;
    return <ProgramIdlSelector programAddress={programAddress} />;
}
