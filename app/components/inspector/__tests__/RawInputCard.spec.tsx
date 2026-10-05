import { fireEvent, render, screen } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { describe, expect, test, vi } from 'vitest';

import { EXAMPLE_LABEL } from '../BaseCodeExample';
import {
    EXAMPLE_CLI_FOCUS,
    EXAMPLE_RUST_FOCUS,
    EXAMPLE_SQUADS_VAULT_TRANSACTION,
    EXAMPLE_TYPESCRIPT_FOCUS,
} from '../inspector-examples';
import { RawInput } from '../RawInputCard';

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useRouter: vi.fn(),
    useSearchParams: vi.fn(),
}));

describe('RawInput', () => {
    beforeEach(() => {
        vi.mocked(usePathname).mockReturnValue('/tx/inspector');
        vi.mocked(useSearchParams).mockReturnValue(
            new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>,
        );
        vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as unknown as ReturnType<typeof useRouter>);
    });

    test('should focus the input on mount and hides Clear while it is empty', () => {
        render(<RawInput setTransactionData={vi.fn()} />);

        expect(screen.getByLabelText('Inspector input')).toHaveFocus();
        expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
    });

    test('should show Clear for typed input and empty the field on click', () => {
        const setTransactionData = vi.fn();
        render(<RawInput setTransactionData={setTransactionData} />);
        const input = screen.getByLabelText<HTMLTextAreaElement>('Inspector input');

        fireEvent.input(input, { target: { value: 'not-a-transaction!' } });
        expect(screen.getByRole('alert')).toHaveTextContent(
            'Input must be base58/base64 encoded or a valid account address',
        );

        fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
        expect(input.value).toBe('');
        expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
        expect(screen.queryByRole('alert')).toBeNull();
        expect(setTransactionData).toHaveBeenLastCalledWith(undefined);
    });

    test('should explain the instructions below the input', () => {
        render(<RawInput setTransactionData={vi.fn()} />);

        expect(screen.getByRole('heading', { name: 'How to get the input for the field above' })).toBeInTheDocument();
    });

    test('should show an example in every instructions tab', () => {
        render(<RawInput setTransactionData={vi.fn()} />);

        expect(screen.getAllByText(EXAMPLE_LABEL)).toHaveLength(4);
        expect(screen.queryByRole('button', { name: 'Copy code' })).toBeNull();
        // Each tab marks the part the reader should copy or look for.
        for (const focus of [
            EXAMPLE_CLI_FOCUS,
            EXAMPLE_RUST_FOCUS,
            EXAMPLE_TYPESCRIPT_FOCUS,
            EXAMPLE_SQUADS_VAULT_TRANSACTION,
        ]) {
            // Highlighting splits the marked text into spans, so match on the mark's whole text content.
            expect(
                screen.getByText((_content, element) => element?.tagName === 'MARK' && element.textContent === focus),
            ).toBeInTheDocument();
        }
    });

    // `{}` inside JSX text is an empty expression, so the Rust format string must be written as `{'{}'}`.
    test('should print the Rust format placeholder in the instruction', () => {
        render(<RawInput setTransactionData={vi.fn()} />);

        expect(
            screen.getByText('println!("{}", base64::encode(&transaction.message_data()));', { selector: 'code' }),
        ).toBeInTheDocument();
    });

    test('should switch the instruction panel when a tab is clicked', () => {
        render(<RawInput setTransactionData={vi.fn()} />);

        expect(screen.getByRole('tab', { name: 'CLI' })).toHaveAttribute('aria-selected', 'true');
        fireEvent.click(screen.getByRole('tab', { name: 'Rust' }));

        expect(screen.getByRole('tab', { name: 'Rust' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveTextContent('crate dependency');
    });
});
