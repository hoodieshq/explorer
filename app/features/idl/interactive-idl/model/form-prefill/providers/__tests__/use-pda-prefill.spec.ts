import type { InstructionData, SupportedIdl } from '@entities/idl';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PdaGenerationResult } from '../../../pda-generator/types';
import votingIdl030 from '../../../__mocks__/anchor/anchor-0.30.0-voting-AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye.json';
import votingIdl030Variations from '../../../__mocks__/anchor/anchor-0.30.0-voting-variations-AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye.json';
import { findInstruction } from '../../../__tests__/utils';
import { useInstructionForm } from '../../../use-instruction-form';
import { usePdaPrefill } from '../use-pda-prefill';

const MOCK_PDA_ADDRESS_1 = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const MOCK_PDA_ADDRESS_2 = '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2';

describe('usePdaPrefill', () => {
    it('should not fill when pdas are empty', () => {
        const { createForm, mockInstruction } = setup(votingIdl030, 'initialize_poll');
        const { form, fieldNames } = createForm();

        const setValueSpy = vi.spyOn(form, 'setValue');

        renderHook(() =>
            usePdaPrefill({
                pdas: {},
                form,
                instruction: mockInstruction,
                fieldNames: { account: fieldNames.account },
            })
        );

        expect(setValueSpy).not.toHaveBeenCalled();
    });

    it('should not fill when pda has no generated value', () => {
        const { createForm, mockInstruction } = setup(votingIdl030, 'initialize_poll');
        const { form, fieldNames } = createForm();

        const setValueSpy = vi.spyOn(form, 'setValue');

        renderHook(() =>
            usePdaPrefill({
                pdas: {
                    poll: { generated: null, seeds: [{ name: 'pollId', value: null }] },
                },
                form,
                instruction: mockInstruction,
                fieldNames: { account: fieldNames.account },
            })
        );

        expect(setValueSpy).not.toHaveBeenCalled();
    });

    it('should fill PDA account when generated value is provided', () => {
        const { createForm, mockInstruction } = setup(votingIdl030, 'initialize_poll');
        const { form, fieldNames } = createForm();

        renderHook(() =>
            usePdaPrefill({
                pdas: {
                    poll: { generated: MOCK_PDA_ADDRESS_1, seeds: [{ name: 'pollId', value: '123' }] },
                },
                form,
                instruction: mockInstruction,
                fieldNames: { account: fieldNames.account },
            })
        );

        const pollValue = form.getValues('accounts.initializePoll.poll');
        expect(pollValue).toBe(MOCK_PDA_ADDRESS_1);
    });

    it('should not overwrite existing PDA value if it matches', () => {
        const { createForm, mockInstruction } = setup(votingIdl030, 'initialize_poll');
        const { form, fieldNames } = createForm();

        const pdas: Record<string, PdaGenerationResult> = {
            poll: { generated: MOCK_PDA_ADDRESS_1, seeds: [{ name: 'pollId', value: '123' }] },
        };

        const { rerender } = renderHook(() =>
            usePdaPrefill({
                pdas,
                form,
                instruction: mockInstruction,
                fieldNames: { account: fieldNames.account },
            })
        );

        expect(form.getValues('accounts.initializePoll.poll')).toBe(MOCK_PDA_ADDRESS_1);

        const setValueSpy = vi.spyOn(form, 'setValue');
        rerender();

        expect(setValueSpy).not.toHaveBeenCalled();
        expect(form.getValues('accounts.initializePoll.poll')).toBe(MOCK_PDA_ADDRESS_1);
    });

    it('should handle nested PDA accounts', () => {
        const { createForm, mockInstruction } = setup(votingIdl030Variations, 'instruction_with_nested');
        const { form, fieldNames } = createForm();

        renderHook(() =>
            usePdaPrefill({
                pdas: {
                    nestedAccount: { generated: MOCK_PDA_ADDRESS_1, seeds: [{ name: 'pollId', value: '123' }] },
                },
                form,
                instruction: mockInstruction,
                fieldNames: { account: fieldNames.account },
            })
        );

        const nestedAccountValue = form.getValues('accounts.instructionWithNested.nestedGroup.nestedAccount');
        expect(nestedAccountValue).toBe(MOCK_PDA_ADDRESS_1);
    });

    it('should not fill non-PDA accounts', () => {
        const { createForm, mockInstruction } = setup(votingIdl030Variations, 'instruction_with_non_pda');
        const { form, fieldNames } = createForm();

        const setValueSpy = vi.spyOn(form, 'setValue');

        renderHook(() =>
            usePdaPrefill({
                pdas: {},
                form,
                instruction: mockInstruction,
                fieldNames: { account: fieldNames.account },
            })
        );

        expect(setValueSpy).not.toHaveBeenCalled();
    });

    it('should preserve manual edits', () => {
        const { createForm, mockInstruction } = setup(votingIdl030, 'initialize_poll');
        const { form, fieldNames } = createForm();

        const { rerender } = renderHook(
            ({ pdas }) =>
                usePdaPrefill({
                    pdas,
                    form,
                    instruction: mockInstruction,
                    fieldNames: { account: fieldNames.account },
                }),
            {
                initialProps: {
                    pdas: {
                        poll: { generated: MOCK_PDA_ADDRESS_1, seeds: [{ name: 'pollId', value: '123' }] },
                    } as Record<string, PdaGenerationResult>,
                },
            }
        );

        expect(form.getValues('accounts.initializePoll.poll')).toBe(MOCK_PDA_ADDRESS_1);

        const manualEdit = 'ManuallyEditedAddress123456789';
        act(() => {
            form.setValue('accounts.initializePoll.poll', manualEdit);
        });

        rerender({
            pdas: {
                poll: { generated: MOCK_PDA_ADDRESS_1, seeds: [{ name: 'pollId', value: '123' }] },
            },
        });

        expect(form.getValues('accounts.initializePoll.poll')).toBe(manualEdit);
    });

    it('should update auto-filled fields when generated value changes', () => {
        const { createForm, mockInstruction } = setup(votingIdl030, 'initialize_poll');
        const { form, fieldNames } = createForm();

        const { rerender } = renderHook(
            ({ pdas }) =>
                usePdaPrefill({
                    pdas,
                    form,
                    instruction: mockInstruction,
                    fieldNames: { account: fieldNames.account },
                }),
            {
                initialProps: {
                    pdas: {
                        poll: { generated: MOCK_PDA_ADDRESS_1, seeds: [{ name: 'pollId', value: '123' }] },
                    } as Record<string, PdaGenerationResult>,
                },
            }
        );

        expect(form.getValues('accounts.initializePoll.poll')).toBe(MOCK_PDA_ADDRESS_1);

        rerender({
            pdas: {
                poll: { generated: MOCK_PDA_ADDRESS_2, seeds: [{ name: 'pollId', value: '456' }] },
            },
        });

        expect(form.getValues('accounts.initializePoll.poll')).toBe(MOCK_PDA_ADDRESS_2);
    });
});

function setup(idl: unknown, instructionName: string) {
    const mockIdl = idl as SupportedIdl;
    const mockInstruction = findInstruction(idl, instructionName)!;

    const createForm = () => {
        return renderHook(() =>
            useInstructionForm({
                instruction: mockInstruction,
                onSubmit: vi.fn(),
            })
        ).result.current;
    };

    return { createForm, mockIdl, mockInstruction };
}
