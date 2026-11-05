import { gen } from '@__fixtures__/gen';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createStore, Provider } from 'jotai';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AccountsProvider } from '@/app/providers/accounts';
import { ClusterProvider } from '@/app/providers/cluster';
import { ScrollAnchorProvider } from '@/app/providers/scroll-anchor';
import type { TokenExtension } from '@/app/validators/accounts/token-extension';

import {
    EXTENSION_FIELDS_PRESETS,
    type ExtensionActionsPlacement,
    extensionActionsPlacementAtom,
    extensionFieldsBorderAtom,
    extensionFieldsDividersAtom,
    extensionFieldsGapAtom,
    extensionFieldsIndentActionsAtom,
    extensionFieldsIndentAtom,
    extensionFieldsInnerAtom,
    type ExtensionFieldsLook,
    extensionFieldsSpaceAtom,
} from '../token-extensions/design-variant';
import { TokenExtensionsSection } from '../TokenExtensionsSection';
import type { ParsedTokenExtension } from '../types';

vi.mock('next/navigation', () => ({
    usePathname: () => '/',
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams('cluster=mainnet-beta'),
}));

describe('TokenExtensionsSection', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should expand the row in place on desktop and swap the fields for raw data', async () => {
        mockViewport({ desktop: true });
        const user = userEvent.setup();
        renderSection();

        await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
        expect(screen.getByRole('button', { name: 'Collapse extension details' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        // The extension name, plus the field label of the same name once the fields show.
        expect(screen.getAllByText('Permanent Delegate')).toHaveLength(2);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Show raw data' }));
        expect(screen.getByRole('button', { name: 'Hide raw data' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getAllByText('Permanent Delegate')).toHaveLength(1);
        // The raw view is the design-system JSON tree, with its copy button for the whole block.
        expect(screen.getByRole('button', { name: 'Copy JSON' })).toBeInTheDocument();
    });

    it('should show the inline part wherever the list counts as desktop, not only from the md screen', async () => {
        // `useBreakpoint` turns `md` on at 768px, a pixel before the CSS screen: the inline part must not wait for
        // `md:` there, or a 768px window would open neither it nor the drawer.
        mockViewport({ desktop: true });
        const user = userEvent.setup();
        renderSection();

        await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
        // Block → the stack → its clipping box → the animated inline part.
        const block = fieldsBlockOf(screen.getAllByText('Permanent Delegate')[1]);
        // eslint-disable-next-line testing-library/no-node-access
        const reveal = block?.parentElement?.parentElement?.parentElement;
        expect(reveal).toHaveClass('grid');
        expect(reveal).not.toHaveClass('hidden');
    });

    it('should keep several rows open at once on desktop', async () => {
        mockViewport({ desktop: true });
        const user = userEvent.setup();
        renderSection({ twoExtensions: true });

        const [first, second] = screen.getAllByRole('button', { name: 'Expand extension details' });
        await user.click(first);
        await user.click(second);
        expect(screen.getAllByRole('button', { name: 'Collapse extension details' })).toHaveLength(2);

        // Closing one leaves the other open.
        await user.click(screen.getAllByRole('button', { name: 'Collapse extension details' })[0]);
        expect(screen.getAllByRole('button', { name: 'Collapse extension details' })).toHaveLength(1);
    });

    it('should head the list with the extension column and keep the status by the name', () => {
        mockViewport({ desktop: true });
        renderSection();

        expect(screen.getByRole('table')).toBeInTheDocument();
        expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Extension', 'Details']);
        // The status badge sits in the name's cell, right after the name.
        const [title] = screen.getAllByRole('cell');
        expect(within(title).getByText('Permanent Delegate')).toBeInTheDocument();
        expect(within(title).getByText('Enabled')).toBeInTheDocument();
    });

    it.each([
        { border: 'left', indent: '12', line: true, padding: '11px' },
        { border: 'left', indent: '24', line: true, padding: '23px' },
        // The left border never goes without an indent: a 0 falls back to 12.
        { border: 'left', indent: '0', line: true, padding: '11px' },
        { border: 'none', indent: '12', line: false, padding: '12px' },
        { border: 'all', indent: '0', line: false, padding: '0px' },
        // The full frame ignores the indent.
        { border: 'all', indent: '24', line: false, padding: '0px' },
    ] as const)(
        'should draw the left line and indent from the menu (border $border, indent $indent)',
        async ({ border, indent, line, padding }) => {
            mockViewport({ desktop: true });
            const user = userEvent.setup();
            renderSection({ look: { border, indent } });

            await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
            const block = fieldsBlockOf(screen.getAllByText('Permanent Delegate')[1]);
            if (line) expect(block).toHaveClass('border-l');
            else expect(block).not.toHaveClass('border-l');
            expect(block).toHaveStyle({ paddingLeft: padding });
        },
    );

    it('should space the pairs by half the gap on each side', async () => {
        mockViewport({ desktop: true });
        const user = userEvent.setup();
        renderSection({ look: { gap: '12' } });

        await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
        const [, label] = screen.getAllByText('Permanent Delegate');
        // eslint-disable-next-line testing-library/no-node-access
        const pair = label.parentElement;
        expect(pair).toHaveStyle({ paddingBottom: '6px', paddingTop: '6px' });
        expect(pair).not.toHaveClass('border-b');
        // Unframed, the container pulls back the outer half gaps.
        // eslint-disable-next-line testing-library/no-node-access
        expect(pair?.parentElement).toHaveStyle({ marginBottom: '-6px', marginTop: '-6px' });
    });

    it('should frame and divide the pairs with the Table preset', async () => {
        mockViewport({ desktop: true });
        const user = userEvent.setup();
        renderSection({ look: EXTENSION_FIELDS_PRESETS.table });

        await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
        // The frame and the dividers are only classes, so the test walks up from the label to read them.
        const [, label] = screen.getAllByText('Permanent Delegate');
        // eslint-disable-next-line testing-library/no-node-access
        const pair = label.parentElement;
        expect(pair).toHaveClass('border-b', 'px-3');
        // eslint-disable-next-line testing-library/no-node-access
        expect(pair?.parentElement?.parentElement).toHaveClass('rounded-lg', 'border');
    });

    it.each([
        { border: 'all', frame: '16px' },
        // Without a full frame there is nothing to pad inside.
        { border: 'left', frame: undefined },
    ] as const)('should pad inside the border only when it is full ($border)', async ({ border, frame }) => {
        mockViewport({ desktop: true });
        const user = userEvent.setup();
        renderSection({ look: { border, inner: '16' } });

        await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
        const [, label] = screen.getAllByText('Permanent Delegate');
        // Label → its pair → the stack → the frame (or the bare container).
        // eslint-disable-next-line testing-library/no-node-access
        const container = label.parentElement?.parentElement?.parentElement;
        if (frame) expect(container).toHaveStyle({ paddingBottom: frame, paddingTop: frame });
        else expect(container).not.toHaveAttribute('style');
    });

    it.each([
        // Fields after the buttons: the gap and the open part's bottom padding carry the space.
        { bottom: '16px', gap: '16px', placement: 'above', shift: '0px', space: '24' },
        { bottom: '24px', gap: '24px', placement: 'above', shift: '0px', space: '32' },
        // Fields first: the open part moves toward the row by the rest; nothing crosses its clipping edges.
        // Under buttons that close it, the space below is a setting of its own (40px by default).
        { bottom: '40px', gap: '8px', placement: 'below', shift: '-8px', space: '16' },
        { bottom: '4px', gap: '4px', placement: 'column', shift: '-12px', space: '12' },
    ] as const)(
        'should keep $space px around the fields with Raw and Docs $placement',
        async ({ bottom, gap, placement, shift, space }) => {
            mockViewport({ desktop: true });
            const user = userEvent.setup();
            renderSection({ look: { space }, placement });

            await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
            const block = fieldsBlockOf(screen.getAllByText('Permanent Delegate')[1]);
            // The block keeps no margins of its own, so the frame and the line are never clipped.
            expect(block).not.toHaveStyle({ marginTop: '-8px' });
            // Block → the open part's stack → its clipping box → the animated open part.
            // eslint-disable-next-line testing-library/no-node-access
            const stack = block?.parentElement;
            expect(stack).toHaveStyle({ rowGap: gap });
            if (bottom) expect(stack).toHaveStyle({ paddingBottom: bottom });
            // eslint-disable-next-line testing-library/no-node-access
            expect(stack?.parentElement?.parentElement).toHaveStyle({ marginTop: shift });
        },
    );

    it.each([
        { border: 'left', indentActions: true, padding: '12px' },
        { border: 'none', indentActions: true, padding: '12px' },
        { border: 'left', indentActions: false, padding: undefined },
        // A full frame takes no indent, so the buttons keep the 12px line too.
        { border: 'all', indentActions: true, padding: '0px' },
    ] as const)(
        'should indent Raw and Docs with the fields only when asked (border $border, $indentActions)',
        async ({ border, indentActions, padding }) => {
            mockViewport({ desktop: true });
            const user = userEvent.setup();
            renderSection({ look: { border, indent: '12', indentActions } });

            await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
            // eslint-disable-next-line testing-library/no-node-access
            const buttons = screen.getByRole('button', { name: 'Show raw data' }).parentElement;
            if (padding) expect(buttons).toHaveStyle({ paddingLeft: padding });
            else expect(buttons).not.toHaveAttribute('style');
        },
    );

    it('should put Raw over the open fields in the above placement', async () => {
        mockViewport({ desktop: true });
        const user = userEvent.setup();
        renderSection();

        expect(screen.queryByRole('button', { name: 'Show raw data' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
        const raw = screen.getByRole('button', { name: 'Show raw data' });
        const [, field] = screen.getAllByText('Permanent Delegate');
        expect(raw.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('should put Raw under the open fields in the below placement', async () => {
        mockViewport({ desktop: true });
        const user = userEvent.setup();
        renderSection({ placement: 'below' });

        await user.click(screen.getByRole('button', { name: 'Expand extension details' }));
        const raw = screen.getByRole('button', { name: 'Show raw data' });
        const [, field] = screen.getAllByText('Permanent Delegate');
        expect(raw.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    });

    it('should give Raw and Docs table columns of their own in the column placement', async () => {
        mockViewport({ desktop: true });
        const user = userEvent.setup();
        renderSection({ placement: 'column' });

        expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual([
            'Extension',
            'Raw data',
            'Documentation',
            'Details',
        ]);
        // Raw on a closed row opens it straight into the JSON.
        await user.click(screen.getByRole('button', { name: 'Show raw data' }));
        expect(screen.getByRole('button', { name: 'Collapse extension details' })).toHaveAttribute(
            'aria-expanded',
            'true',
        );
        expect(screen.getAllByRole('button', { name: 'Hide raw data' })[0]).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getAllByText('Permanent Delegate')).toHaveLength(1);
    });

    it('should open the fields in a drawer on a phone', async () => {
        mockViewport({ desktop: false });
        const user = userEvent.setup();
        renderSection();

        await user.click(screen.getByText('Mint can be permanently delegated to a different address'));
        const drawer = await screen.findByRole('dialog');
        // The drawer heading and the field label.
        expect(within(drawer).getAllByText('Permanent Delegate')).toHaveLength(2);
        expect(within(drawer).getByRole('button', { name: 'Show raw data' })).toBeInTheDocument();
        expect(within(drawer).getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
});

const MINT = gen.address(0);
const DELEGATE = gen.publicKey(1);

const PARSED: ParsedTokenExtension[] = [
    {
        description: 'Mint can be permanently delegated to a different address',
        extension: 'permanentDelegate',
        externalLinks: [],
        name: 'Permanent Delegate',
        parsed: { delegate: DELEGATE },
        status: 'active',
    },
];

const EXTENSIONS = [{ extension: 'permanentDelegate', state: { delegate: DELEGATE } }] as TokenExtension[];

// A second extension, for the tests that open more than one row.
const MORE_PARSED: ParsedTokenExtension[] = [
    ...PARSED,
    {
        description: 'Mint can be closed by the close authority',
        extension: 'mintCloseAuthority',
        externalLinks: [],
        name: 'Mint Close Authority',
        parsed: { closeAuthority: DELEGATE },
        status: 'active',
    },
];
const MORE_EXTENSIONS = [
    ...EXTENSIONS,
    { extension: 'mintCloseAuthority', state: { closeAuthority: DELEGATE } },
] as TokenExtension[];

// Field label → its KeyValue pair → the stack → the fields container → the block that carries the left line, the
// indent and the space around the fields.
function fieldsBlockOf(label: HTMLElement) {
    return label.parentElement?.parentElement?.parentElement?.parentElement;
}

// `useBreakpoint` reads `matchMedia`; desktop matches every min-width query.
function mockViewport({ desktop }: { desktop: boolean }) {
    vi.spyOn(globalThis, 'matchMedia').mockImplementation(
        query =>
            ({
                addEventListener: () => undefined,
                matches: desktop,
                media: query,
                removeEventListener: () => undefined,
            }) as unknown as MediaQueryList,
    );
}

function renderSection({
    look = {},
    placement = 'above',
    twoExtensions = false,
}: { look?: Partial<ExtensionFieldsLook>; placement?: ExtensionActionsPlacement; twoExtensions?: boolean } = {}) {
    const { border, dividers, gap, indent, indentActions, inner, space } = {
        ...EXTENSION_FIELDS_PRESETS['key-value'],
        ...look,
    };
    const store = createStore();
    store.set(extensionFieldsGapAtom, gap);
    store.set(extensionFieldsIndentAtom, indent);
    store.set(extensionFieldsBorderAtom, border);
    store.set(extensionFieldsDividersAtom, dividers);
    store.set(extensionFieldsSpaceAtom, space);
    store.set(extensionFieldsInnerAtom, inner);
    store.set(extensionFieldsIndentActionsAtom, indentActions);
    store.set(extensionActionsPlacementAtom, placement);
    render(
        <Provider store={store}>
            <ScrollAnchorProvider>
                <ClusterProvider>
                    <AccountsProvider>
                        <TokenExtensionsSection
                            address={MINT}
                            decimals={6}
                            extensions={twoExtensions ? MORE_EXTENSIONS : EXTENSIONS}
                            parsedExtensions={twoExtensions ? MORE_PARSED : PARSED}
                        />
                    </AccountsProvider>
                </ClusterProvider>
            </ScrollAnchorProvider>
        </Provider>,
    );
}
