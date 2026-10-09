import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CustomIdlUploadDialog } from '../CustomIdlUploadDialog';

const json = '{"instructions":[]}';

function dragData(file?: File) {
    return { dataTransfer: { dropEffect: 'none', files: file ? [file] : [], types: ['Files'] } };
}

function renderDialog(open = true) {
    const onSubmit = vi.fn(() => ({ ok: true as const }));
    render(<CustomIdlUploadDialog open={open} onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    return { onSubmit };
}

describe('CustomIdlUploadDialog', () => {
    it('should show the drop hint while a file is dragged anywhere over the window', () => {
        renderDialog();
        fireEvent.dragEnter(window, dragData());
        expect(screen.getByText('Drop the IDL file')).toBeInTheDocument();

        fireEvent.dragLeave(window, dragData());
        expect(screen.queryByText('Drop the IDL file')).not.toBeInTheDocument();
    });

    it('should take a file dropped anywhere over the window', async () => {
        const { onSubmit } = renderDialog();
        // jsdom's File has no `text()`; browsers do.
        const file = Object.assign(new File([json], 'voting.json', { type: 'application/json' }), {
            text: () => Promise.resolve(json),
        });

        fireEvent.dragEnter(window, dragData(file));
        fireEvent.drop(window, dragData(file));

        expect(await screen.findByText('voting.json')).toBeInTheDocument();
        expect(screen.queryByText('Drop the IDL file')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Add IDL' }));
        expect(onSubmit).toHaveBeenCalledWith({ fileName: 'voting.json', text: json });
    });

    it('should ignore drags that carry no files', () => {
        renderDialog();
        fireEvent.dragEnter(window, { dataTransfer: { types: ['text/plain'] } });
        expect(screen.queryByText('Drop the IDL file')).not.toBeInTheDocument();
    });

    it('should not listen for drops while closed', () => {
        renderDialog(false);
        fireEvent.dragEnter(window, dragData());
        expect(screen.queryByText('Drop the IDL file')).not.toBeInTheDocument();
    });

    it('should put the file text into the JSON field and clear both on remove', async () => {
        renderDialog();
        const file = Object.assign(new File([json], 'voting.json', { type: 'application/json' }), {
            text: () => Promise.resolve(json),
        });

        fireEvent.drop(window, dragData(file));

        expect(await screen.findByText('voting.json')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Or paste JSON' })).toHaveValue(json);

        fireEvent.click(screen.getByRole('button', { name: 'Remove file' }));
        expect(screen.queryByText('voting.json')).not.toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Or paste JSON' })).toHaveValue('');
        expect(screen.getByRole('button', { name: 'Add IDL' })).toBeDisabled();
    });

    it('should show a rejected IDL once', () => {
        render(
            <CustomIdlUploadDialog
                open
                onOpenChange={vi.fn()}
                onSubmit={() => ({ error: 'This JSON is not an Anchor or Codama IDL.', ok: false })}
            />,
        );
        fireEvent.change(screen.getByRole('textbox', { name: 'Or paste JSON' }), { target: { value: '{}' } });
        fireEvent.click(screen.getByRole('button', { name: 'Add IDL' }));

        expect(screen.getByRole('alert')).toHaveTextContent('This JSON is not an Anchor or Codama IDL.');
    });

    it('should reject a file for another program as soon as it is loaded, and reset the form', async () => {
        const otherProgramJson = '{"address":"devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH","instructions":[]}';
        const file = Object.assign(new File([otherProgramJson], 'amm.json', { type: 'application/json' }), {
            text: () => Promise.resolve(otherProgramJson),
        });
        render(
            <CustomIdlUploadDialog
                programAddress="ComputeBudget111111111111111111111111111111"
                open
                onOpenChange={vi.fn()}
                onSubmit={vi.fn()}
            />,
        );

        fireEvent.drop(window, dragData(file));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'This IDL is for program devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH, not ComputeBudget111111111111111111111111111111.',
        );
        expect(screen.getByRole('button', { name: 'Add IDL' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.queryByText('amm.json')).not.toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'Or paste JSON' })).toHaveValue('');
    });

    it('should wait until pasted JSON parses before checking it', () => {
        render(
            <CustomIdlUploadDialog
                programAddress="ComputeBudget111111111111111111111111111111"
                open
                onOpenChange={vi.fn()}
                onSubmit={vi.fn()}
            />,
        );
        const field = screen.getByRole('textbox', { name: 'Or paste JSON' });

        fireEvent.change(field, { target: { value: '{"address":"devi51' } });
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();

        fireEvent.change(field, { target: { value: '{"address":"devi51","instructions":[]}' } });
        expect(screen.getByRole('alert')).toHaveTextContent('This IDL is for program devi51');
    });
});
