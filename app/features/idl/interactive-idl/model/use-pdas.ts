import type { InstructionData, SupportedIdl } from '@entities/idl';
import { useEffect, useState } from 'react';
import { type Control, useWatch } from 'react-hook-form';

import { computePdas } from './pda-generator/compute-pdas';
import type { PdaGenerationResult } from './pda-generator/types';
import type { InstructionFormData } from './use-instruction-form';

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

        computePdas(idl, instruction, formValues)
            .then(result => {
                if (!cancelled) setPdas(result);
            })
            .catch(() => {
                if (!cancelled) setPdas({});
            });

        return () => {
            cancelled = true;
        };
    }, [idl, instruction, formValues]);

    return pdas;
}
