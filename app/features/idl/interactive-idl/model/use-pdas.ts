import type { InstructionData, SupportedIdl } from '@entities/idl';
import { useEffect, useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';

import { computePdas } from './pda-generator/compute-pdas';
import type { PdaGenerationResult } from './pda-generator/types';
import type { InstructionFormData } from './use-instruction-form';

const PDA_DEBOUNCE_MS = 150;

export function usePdas({
    idl,
    instruction,
    form,
}: {
    idl: SupportedIdl | undefined;
    instruction: InstructionData;
    form: { control: Control<InstructionFormData> };
}) {
    const formValues = useWatch({ control: form.control });
    const [pdas, setPdas] = useState<Record<string, PdaGenerationResult>>({});

    useEffect(() => {
        let cancelled = false;

        const timeoutId = setTimeout(() => {
            computePdas(idl, instruction, formValues)
                .then(result => {
                    if (!cancelled) setPdas(result);
                })
                .catch(error => {
                    console.error('Failed to compute PDAs:', error);
                    if (!cancelled) setPdas({});
                });
        }, PDA_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [idl, instruction, formValues]);

    return pdas;
}
