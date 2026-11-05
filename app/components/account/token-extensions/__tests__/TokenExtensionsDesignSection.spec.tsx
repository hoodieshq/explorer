import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { describe, expect, it } from 'vitest';

import {
    DEFAULT_EXTENSION_DESIGN,
    extensionActionsBottomAtom,
    extensionActionsPlacementAtom,
    extensionFieldsGapAtom,
    savedExtensionDesignsAtom,
} from '../design-variant';
import { TokenExtensionsDesignSection } from '../TokenExtensionsDesignSection';

// REVIEW(HOO-935): the configurator goes with the design menu before the external PR.
describe('TokenExtensionsDesignSection', () => {
    it('should start from the base preset, save new ones next to it and never delete it', async () => {
        const user = userEvent.setup();
        const store = createStore();
        renderSection(store);

        // The base preset is there from the start, marked primary with the legend under the chips, and picked: nothing
        // to save, update or delete.
        expect(screen.getByText('— primary')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Base (primary)' })).toHaveAttribute('aria-pressed', 'true');
        // Saving and deleting live inside the folded settings.
        expect(screen.queryByRole('button', { name: 'Save as new' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Settings' }));
        expect(screen.getByRole('button', { name: 'Save as new' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Update Base' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Delete Base' })).toBeDisabled();

        // Other settings: Base stays picked, and they can go into a new preset.
        act(() => store.set(extensionFieldsGapAtom, '20'));
        expect(screen.getByRole('button', { name: 'Base (primary)' })).toHaveAttribute('aria-pressed', 'true');
        await user.click(screen.getByRole('button', { name: 'Save as new' }));
        expect(screen.getByRole('button', { name: 'Preset 1' })).toHaveAttribute('aria-pressed', 'true');

        // One click brings the base settings back.
        await user.click(screen.getByRole('button', { name: 'Base (primary)' }));
        expect(store.get(extensionFieldsGapAtom)).toBe(DEFAULT_EXTENSION_DESIGN.gap);
        expect(screen.getByRole('button', { name: 'Delete Base' })).toBeDisabled();

        // A saved preset goes; the base one gets picked again and, untouched, is never stored.
        await user.click(screen.getByRole('button', { name: 'Preset 1' }));
        await user.click(screen.getByRole('button', { name: 'Delete Preset 1' }));
        expect(screen.queryByRole('button', { name: 'Preset 1' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Base (primary)' })).toHaveAttribute('aria-pressed', 'true');
        expect(store.get(savedExtensionDesignsAtom)).toEqual([]);
    });

    it('should store the base preset once it is updated, and give it back its name when cleared', async () => {
        const user = userEvent.setup();
        const store = createStore();
        renderSection(store);

        await user.click(screen.getByRole('button', { name: 'Settings' }));
        act(() => store.set(extensionFieldsGapAtom, '12'));
        await user.click(screen.getByRole('button', { name: 'Update Base' }));
        expect(store.get(savedExtensionDesignsAtom)).toEqual([{ ...DEFAULT_EXTENSION_DESIGN, gap: '12', number: 0 }]);

        await user.dblClick(screen.getByRole('button', { name: 'Base (primary)' }));
        await user.clear(screen.getByRole('textbox', { name: 'Preset name' }));
        await user.keyboard('{Enter}');
        expect(screen.getByRole('button', { name: 'Base (primary)' })).toBeInTheDocument();
    });

    it('should write the settings back into the picked preset on Update', async () => {
        const user = userEvent.setup();
        const store = createStore();
        store.set(savedExtensionDesignsAtom, [{ ...DEFAULT_EXTENSION_DESIGN, name: 'Compact', number: 3 }]);
        renderSection(store);

        await user.click(screen.getByRole('button', { name: 'Compact' }));
        await user.click(screen.getByRole('button', { name: 'Settings' }));
        act(() => store.set(extensionFieldsGapAtom, '12'));
        await user.click(screen.getByRole('button', { name: 'Update Compact' }));

        // Same number and name, the new settings; nothing left to update.
        expect(store.get(savedExtensionDesignsAtom)).toEqual([
            { ...DEFAULT_EXTENSION_DESIGN, gap: '12', name: 'Compact', number: 3 },
        ]);
        expect(screen.getByRole('button', { name: 'Update Compact' })).toBeDisabled();
    });

    it('should rename a preset on a double click, and keep the name on Escape', async () => {
        const user = userEvent.setup();
        const store = createStore();
        store.set(savedExtensionDesignsAtom, [{ ...DEFAULT_EXTENSION_DESIGN, number: 1 }]);
        renderSection(store);

        await user.dblClick(screen.getByRole('button', { name: 'Preset 1' }));
        await user.clear(screen.getByRole('textbox', { name: 'Preset name' }));
        await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'Compact{Enter}');
        expect(screen.getByRole('button', { name: 'Compact' })).toBeInTheDocument();

        await user.dblClick(screen.getByRole('button', { name: 'Compact' }));
        await user.type(screen.getByRole('textbox', { name: 'Preset name' }), ' draft{Escape}');
        expect(screen.getByRole('button', { name: 'Compact' })).toBeInTheDocument();

        // An empty name gives the preset back its number.
        await user.dblClick(screen.getByRole('button', { name: 'Compact' }));
        await user.clear(screen.getByRole('textbox', { name: 'Preset name' }));
        await user.keyboard('{Enter}');
        expect(screen.getByRole('button', { name: 'Preset 1' })).toBeInTheDocument();
    });

    it('should give a preset saved before a setting existed that setting’s default', async () => {
        const user = userEvent.setup();
        const store = createStore();
        // A preset from before `actionsBottom`, as it sits in localStorage.
        const older = {
            border: 'left',
            dividers: false,
            gap: '6',
            indent: '12',
            indentActions: false,
            inner: '10',
            number: 1,
            placement: 'below',
            space: '24',
        } as const;
        store.set(savedExtensionDesignsAtom, [older as never]);
        store.set(extensionActionsBottomAtom, '64');
        renderSection(store);

        await user.click(screen.getByRole('button', { name: 'Preset 1' }));
        expect(store.get(extensionActionsPlacementAtom)).toBe('below');
        expect(store.get(extensionActionsBottomAtom)).toBe('40');
    });

    it('should fold the settings away and offer the space under Raw and Docs only below the fields', async () => {
        const user = userEvent.setup();
        const store = createStore();
        renderSection(store);

        expect(screen.queryByText('Gap between rows, px')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Settings' }));
        expect(screen.getByText('Gap between rows, px')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Above' }));
        expect(screen.queryByText('Space under Raw and Docs, px')).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Below' }));
        expect(screen.getByText('Space under Raw and Docs, px')).toBeInTheDocument();
    });
});

function renderSection(store: ReturnType<typeof createStore>) {
    render(
        <Provider store={store}>
            <TokenExtensionsDesignSection />
        </Provider>,
    );
}
