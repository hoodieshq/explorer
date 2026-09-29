import 'client-only';

import { getInstructionIntentTemplate } from '@entities/idl';
import { useAtomValue } from 'jotai';
import { useEffect, useMemo, useState } from 'react';
import { type UseFormReturn, useWatch } from 'react-hook-form';

import { programAtom } from '../state-atoms';
import type { InstructionFormData } from '../use-instruction-form';
import { buildReadback, type Readback } from './build-readback';
import { getFormInstructionDisplay } from './get-form-instruction-display';

/** Short enough to feel live, long enough that a pasted address settles before the sentence is built. */
const DEBOUNCE_MS = 150;

export type InstructionReadback = Readback & {
    /** The SDK's sentence once every placeholder is filled; formats values (e.g. lamports as SOL). */
    sentence: string | undefined;
};

/**
 * The one-line readback of what the form will send, always visible above Execute.
 * The template renders first and fills in as fields are completed; once complete, the SDK's own sentence
 * replaces it. Zero RPC: no account is fetched here, formatting that needs chain data waits for Execute.
 * Undefined when the instruction's IDL publishes no intent template.
 */
export function useInstructionReadback({
    form,
    instructionName,
}: {
    form: UseFormReturn<InstructionFormData>;
    instructionName: string;
}): InstructionReadback | undefined {
    const program = useAtomValue(programAtom);
    const values = useWatch({ control: form.control });
    const template = getInstructionIntentTemplate(program?.idl, instructionName);

    // Serialized rather than passed by reference: useWatch hands back a fresh object per change, and
    // an unstable dependency would restart the debounce on every unrelated render.
    const valuesKey = JSON.stringify(values);

    const readback = useMemo(
        () => (template ? buildReadback({ instructionName, template, values }) : undefined),
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `valuesKey` stands in for `values`
        [template, instructionName, valuesKey],
    );

    // Tagged with the values it was built from, so an edit hides a stale sentence at once.
    const [resolved, setResolved] = useState<{ key: string; sentence: string | undefined }>();
    const isComplete = readback !== undefined && readback.missing.length === 0;

    useEffect(() => {
        if (!program || !isComplete) return;

        let cancelled = false;
        const timer = setTimeout(() => {
            getFormInstructionDisplay({ instructionName, program, values: form.getValues() })
                .then(display => {
                    if (!cancelled) setResolved({ key: valuesKey, sentence: display?.interpolatedIntent ?? undefined });
                })
                .catch(() => {
                    // A value that does not encode yet (e.g. a half-typed number) leaves the template showing.
                    if (!cancelled) setResolved({ key: valuesKey, sentence: undefined });
                });
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [program, isComplete, instructionName, valuesKey, form]);

    if (!readback) return undefined;
    return { ...readback, sentence: isComplete && resolved?.key === valuesKey ? resolved.sentence : undefined };
}
