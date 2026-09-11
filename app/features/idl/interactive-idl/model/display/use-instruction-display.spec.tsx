import type { InstructionDisplay } from '@codama/dynamic-instructions';
import type { InstructionData } from '@entities/idl';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { programAtom } from '../state-atoms';
import type { UnifiedProgram } from '../unified-program.d';
import { useInstructionForm } from '../use-instruction-form';
import { useInstructionDisplay } from './use-instruction-display';

vi.mock('@entities/cluster', () => ({ useSolanaRpc: () => ({}) }));

const getFormInstructionDisplay = vi.fn();
vi.mock('./get-form-instruction-display', () => ({
    getFormInstructionDisplay: (...args: unknown[]) => getFormInstructionDisplay(...args),
}));

const FETCH_ACCOUNT = vi.fn();
const createFetchDisplayAccount = vi.fn(() => FETCH_ACCOUNT);
vi.mock('../../lib/fetch-display-account', () => ({
    createFetchDisplayAccount: () => createFetchDisplayAccount(),
}));

const DISPLAY: InstructionDisplay = {
    fields: [{ label: 'Amount', value: '1.5 SOL' }],
    intent: 'Transfer SOL',
    interpolatedIntent: 'Transfer 1.5 SOL',
};

const STALE_DISPLAY: InstructionDisplay = {
    fields: [{ label: 'Amount', value: '0.1 SOL' }],
    intent: 'Transfer SOL',
    interpolatedIntent: 'Transfer 0.1 SOL',
};

const INSTRUCTION = {
    accounts: [{ name: 'source' }, { name: 'destination' }],
    args: [{ name: 'amount', type: 'u64' }],
    name: 'transferSol',
} as unknown as InstructionData;

const PROGRAM = { buildInstruction: vi.fn(), getInstructionDisplay: vi.fn() } as unknown as UnifiedProgram;

// `withProgram` rather than an optional program: passing `undefined` would fall back to the default.
function setup({ withProgram = true }: { withProgram?: boolean } = {}) {
    const store = createStore();
    if (withProgram) store.set(programAtom, PROGRAM);

    const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;

    // The form is captured so a test can change a value and drive a second resolve.
    const formRef: { current?: ReturnType<typeof useInstructionForm>['form'] } = {};

    const view = renderHook(
        () => {
            const { form } = useInstructionForm({ instruction: INSTRUCTION, onSubmit: vi.fn() });
            formRef.current = form;
            return useInstructionDisplay({ form, instructionName: INSTRUCTION.name });
        },
        { wrapper },
    );

    return { ...view, formRef };
}

describe('useInstructionDisplay', () => {
    beforeEach(() => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        getFormInstructionDisplay.mockReset();
        getFormInstructionDisplay.mockResolvedValue(DISPLAY);
        createFetchDisplayAccount.mockClear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should hold back the display until the debounce elapses', () => {
        const { result } = setup();

        expect(result.current).toBeUndefined();
        expect(getFormInstructionDisplay).not.toHaveBeenCalled();
    });

    it('should resolve the display once the debounce elapses', async () => {
        const { result } = setup();

        await act(async () => {
            vi.advanceTimersByTime(400);
        });

        await waitFor(() => expect(result.current).toEqual(DISPLAY));
    });

    it('should not resolve while no program is initialized', async () => {
        const { result } = setup({ withProgram: false });

        await act(async () => {
            vi.advanceTimersByTime(400);
        });

        expect(result.current).toBeUndefined();
        expect(getFormInstructionDisplay).not.toHaveBeenCalled();
    });

    it('should clear the display when the form cannot be built', async () => {
        getFormInstructionDisplay.mockRejectedValue(new Error('Invalid public key for account "source"'));
        const { result } = setup();

        await act(async () => {
            vi.advanceTimersByTime(400);
        });

        await waitFor(() => expect(result.current).toBeUndefined());
    });

    it('should pass a memoized fetchAccount to the resolver', async () => {
        setup();

        await act(async () => {
            vi.advanceTimersByTime(400);
        });

        await waitFor(() => expect(getFormInstructionDisplay).toHaveBeenCalled());
        expect(createFetchDisplayAccount).toHaveBeenCalled();
        expect(getFormInstructionDisplay.mock.calls[0][0]).toMatchObject({
            fetchAccount: FETCH_ACCOUNT,
            instructionName: 'transferSol',
        });
    });

    it('should build a fresh fetchAccount per resolve, so a cached account cannot go stale', async () => {
        const { formRef } = setup();

        await act(async () => {
            vi.advanceTimersByTime(400);
        });
        await waitFor(() => expect(getFormInstructionDisplay).toHaveBeenCalledTimes(1));

        await act(async () => {
            formRef.current?.setValue('arguments.transferSol.amount', '2000000000');
            vi.advanceTimersByTime(400);
        });

        await waitFor(() => expect(getFormInstructionDisplay).toHaveBeenCalledTimes(2));
        expect(createFetchDisplayAccount).toHaveBeenCalledTimes(2);
    });

    it('should discard an in-flight result once newer form values supersede it', async () => {
        let resolveFirst: (display: InstructionDisplay) => void = () => {};
        getFormInstructionDisplay
            .mockImplementationOnce(() => new Promise<InstructionDisplay>(resolve => (resolveFirst = resolve)))
            .mockResolvedValueOnce(DISPLAY);

        const { result, formRef } = setup();

        await act(async () => {
            vi.advanceTimersByTime(400);
        });
        await waitFor(() => expect(getFormInstructionDisplay).toHaveBeenCalledTimes(1));

        // Changing a value restarts the effect, so the still-pending first run loses ownership.
        await act(async () => {
            formRef.current?.setValue('arguments.transferSol.amount', '2000000000');
            vi.advanceTimersByTime(400);
        });
        await waitFor(() => expect(result.current).toEqual(DISPLAY));

        await act(async () => {
            resolveFirst(STALE_DISPLAY);
        });

        expect(result.current).toEqual(DISPLAY);
    });
});
