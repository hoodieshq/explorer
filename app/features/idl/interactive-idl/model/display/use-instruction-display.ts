import 'client-only';

import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { useSolanaRpc } from '@entities/cluster';
import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { type UseFormReturn, useWatch } from 'react-hook-form';

import { createFetchDisplayAccount } from '../../lib/fetch-display-account';
import { programAtom } from '../state-atoms';
import type { InstructionFormData } from '../use-instruction-form';
import { getFormInstructionDisplay } from './get-form-instruction-display';

/** Long enough that a typed address settles before the first resolve, short enough to feel live. */
const DEBOUNCE_MS = 400;

/**
 * The sRFC 39 display for the instruction the form currently describes, undefined when it cannot be
 * built yet. A partially filled form is the normal state here, so failing to build is not an error.
 */
export function useInstructionDisplay({
    form,
    instructionName,
}: {
    form: UseFormReturn<InstructionFormData>;
    instructionName: string;
}): InstructionDisplay | undefined {
    const program = useAtomValue(programAtom);
    const rpc = useSolanaRpc();
    const values = useWatch({ control: form.control });
    const [display, setDisplay] = useState<InstructionDisplay>();
    const runIdRef = useRef(0);

    // Serialized rather than passed by reference: useWatch hands back a fresh object per change, and
    // an unstable dependency would restart the debounce on every unrelated render.
    const valuesKey = JSON.stringify(values);

    useEffect(() => {
        const runId = ++runIdRef.current;

        if (!program) {
            setDisplay(undefined);
            return;
        }

        const timer = setTimeout(() => {
            getFormInstructionDisplay({
                // One memo per computation: the display layer re-reads the same account up to six times.
                fetchAccount: createFetchDisplayAccount(rpc),
                instructionName,
                program,
                values: form.getValues(),
            })
                .then(next => {
                    if (runIdRef.current === runId) setDisplay(next);
                })
                .catch(() => {
                    if (runIdRef.current === runId) setDisplay(undefined);
                });
        }, DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [program, rpc, instructionName, valuesKey, form]);

    return display;
}
