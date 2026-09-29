import 'client-only';

import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { useSolanaRpc } from '@entities/cluster';
import { createFetchDisplayAccount, getInstructionIntentTemplate } from '@entities/idl';
import { useAtomValue } from 'jotai';
import { useEffect, useState } from 'react';

import { programAtom } from '../state-atoms';
import type { InstructionCallParams } from '../use-instruction-form';
import { getCallInstructionDisplay } from './get-form-instruction-display';

/** What the mainnet confirmation shows about the instruction it is about to send. */
export type MainnetSummary =
    | { status: 'loading' }
    | { status: 'resolved'; display: InstructionDisplay; programId: string }
    /** No intent metadata, or it could not be resolved: the dialog falls back to its plain warning. */
    | { status: 'unavailable' };

/**
 * The formatted display for a pending mainnet execution. This is the one place the Interact tab spends
 * RPC on formatting (decimals, token accounts): once, when the confirmation opens, because this is the
 * moment the user decides to spend real funds.
 */
export function useMainnetSummary(
    pending: { instructionName: string; params: InstructionCallParams } | undefined,
): MainnetSummary | undefined {
    const program = useAtomValue(programAtom);
    const rpc = useSolanaRpc();
    const [summary, setSummary] = useState<MainnetSummary>();

    const instructionName = pending?.instructionName;
    const params = pending?.params;

    useEffect(() => {
        if (!instructionName || !params) {
            setSummary(undefined);
            return;
        }
        if (!program || !getInstructionIntentTemplate(program.idl, instructionName)) {
            setSummary({ status: 'unavailable' });
            return;
        }

        let cancelled = false;
        setSummary({ status: 'loading' });

        getCallInstructionDisplay({
            fetchAccount: createFetchDisplayAccount(rpc),
            instructionName,
            params,
            program,
        })
            .then(display => {
                if (cancelled) return;
                setSummary(
                    display
                        ? { display, programId: program.programId.toBase58(), status: 'resolved' }
                        : { status: 'unavailable' },
                );
            })
            .catch(() => {
                if (!cancelled) setSummary({ status: 'unavailable' });
            });

        return () => {
            cancelled = true;
        };
    }, [instructionName, params, program, rpc]);

    return summary;
}
