/* eslint-disable no-restricted-syntax -- test assertions use RegExp for pattern matching */
import { Compression, DataSource, Encoding, Format, packDirectData } from '@solana-program/program-metadata';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { trackEvent } from '@/app/shared/lib/analytics';

import type { PmpPayloadInstruction } from '../../lib/types';
import { PmpPayloadSection } from '../PmpPayloadSection';

vi.mock('@/app/shared/lib/analytics', () => ({ trackEvent: vi.fn() }));

// The real viewer is a next/dynamic import with ssr: false, so it resolves asynchronously and would force every
// assertion to be awaited. Stub it the way MetadataCard.spec.tsx does, which is the established pattern.
vi.mock('@/app/components/common/JsonViewer', () => ({
    SolarizedJsonViewer: ({ src }: { src: unknown }) => (
        <div data-testid="json-viewer">{JSON.stringify(src, null, 2)}</div>
    ),
}));

vi.mock('@/app/components/common/Address', () => ({
    Address: ({ pubkey }: { pubkey: { toBase58(): string } }) => <div data-testid="address">{pubkey.toBase58()}</div>,
}));

const DOC = '{"name":"company","version":"1.0.0"}';

function pack(content: string, compression: Compression): Uint8Array {
    return packDirectData({ compression, content, encoding: Encoding.Utf8 }).data as Uint8Array;
}

function renderSection(content: PmpPayloadInstruction, cap?: number) {
    return render(
        <table>
            <tbody>
                <PmpPayloadSection content={content} cap={cap} />
            </tbody>
        </table>,
    );
}

const JSON_CONFIG = { compression: Compression.None, encoding: Encoding.Utf8, format: Format.Json };

/**
 * The section opens on the Raw tab and Radix unmounts the inactive panel, so nothing decoded is in the DOM until
 * the reader switches. Every assertion about decoded content has to go through this first.
 */
async function openDecodedTab() {
    await userEvent.click(screen.getByRole('tab', { name: 'Decoded' }));
}

describe('PmpPayloadSection', () => {
    beforeEach(() => {
        vi.mocked(trackEvent).mockClear();
    });

    it('should render an inline Direct JSON payload through the JSON viewer', async () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.Direct,
            kind: 'setData',
            payload: pack(DOC, Compression.None),
        });
        await openDecodedTab();

        const viewer = screen.getByTestId('json-viewer');
        expect(viewer).toHaveTextContent('company');
        expect(viewer).toHaveTextContent('1.0.0');
        expect(screen.getByTestId('pmp-decoded-json')).toBeInTheDocument();
    });

    it('should also offer the raw encoded bytes on a Raw tab', async () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.Direct,
            kind: 'setData',
            payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        });

        await userEvent.click(screen.getByRole('tab', { name: 'Raw' }));

        // RawDataField owns the hex grid and the byte count, so asserting on them proves it is wired up.
        const raw = screen.getByTestId('pmp-payload-raw');
        expect(raw).toHaveTextContent('de ad be ef');
        expect(raw).toHaveTextContent('4 bytes');
        expect(screen.getByRole('tab', { name: 'Hex' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Base64' })).toBeInTheDocument();
    });

    it('should decompress a Zlib payload before rendering it', async () => {
        renderSection({
            config: { compression: Compression.Zlib, encoding: Encoding.Utf8, format: Format.Json },
            dataSource: DataSource.Direct,
            kind: 'setData',
            payload: pack(DOC, Compression.Zlib),
        });
        await openDecodedTab();

        expect(screen.getByTestId('json-viewer')).toHaveTextContent('1.0.0');
    });

    it('should render a Yaml payload as verbatim text rather than through the viewer', async () => {
        renderSection({
            config: { compression: Compression.None, encoding: Encoding.Utf8, format: Format.Yaml },
            dataSource: DataSource.Direct,
            kind: 'setData',
            payload: pack('name: company\n', Compression.None),
        });
        await openDecodedTab();

        expect(screen.getByTestId('pmp-decoded-text')).toHaveTextContent('name: company');
        expect(screen.queryByTestId('json-viewer')).not.toBeInTheDocument();
    });

    it('should render an Encoding None payload as hex text rather than as characters', async () => {
        renderSection({
            config: { compression: Compression.None, encoding: Encoding.None, format: Format.None },
            dataSource: DataSource.Direct,
            kind: 'setData',
            payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        });
        await openDecodedTab();

        expect(screen.getByTestId('pmp-decoded-text')).toHaveTextContent('deadbeef');
    });

    it('should render a Json-hinted payload that does not parse as verbatim text', async () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.Direct,
            kind: 'setData',
            payload: pack('{not json', Compression.None),
        });
        await openDecodedTab();

        expect(screen.getByTestId('pmp-decoded-text')).toHaveTextContent('{not json');
        expect(screen.queryByTestId('json-viewer')).not.toBeInTheDocument();
    });

    it('should state that a header-only setData carries no new payload without surfacing a decode failure', () => {
        renderSection({ config: JSON_CONFIG, kind: 'setData' });

        expect(screen.getByTestId('pmp-header-only-note')).toBeInTheDocument();
        expect(screen.queryByTestId('pmp-decode-error')).not.toBeInTheDocument();
        expect(screen.queryByTestId('pmp-decoded-json')).not.toBeInTheDocument();
        expect(screen.queryByTestId('pmp-decoded-text')).not.toBeInTheDocument();
    });

    it('should show the source buffer address when setData carries no inline payload', () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.Direct,
            kind: 'setData',
            sourceBuffer: '4wBqpZM9xaSheZzJSMawUKKwhdpChKbZ5eu5ky4Vigw',
        });

        expect(screen.getByTestId('pmp-deferred-source-note')).toBeInTheDocument();
        expect(screen.getByTestId('address')).toHaveTextContent('4wBqpZM9xaSheZzJSMawUKKwhdpChKbZ5eu5ky4Vigw');
    });

    it('should show the metadata account when initialize is the in-place shape', () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.Direct,
            kind: 'initialize',
            metadataAccount: '2mWhJDFtX2LGKggEPVhznvs8cPzy5HM8HhsVPj5YxqA8',
            seed: 'idl',
        });

        expect(screen.getByTestId('pmp-deferred-source-note')).toBeInTheDocument();
        expect(screen.getByTestId('address')).toHaveTextContent('2mWhJDFtX2LGKggEPVhznvs8cPzy5HM8HhsVPj5YxqA8');
    });

    it('should render an External payload through the same tabs, opening on the raw bytes', () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.External,
            kind: 'setData',
            payload: new Uint8Array(40),
        });

        // A non-Direct source gets no special-cased note in this section: the card's `Data Source` config row
        // already names it, so the section stays a plain bytes view rather than repeating the same fact.
        expect(screen.getByTestId('pmp-payload-raw')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Decoded' })).toBeInTheDocument();
        expect(screen.queryByTestId('pmp-decoded-json')).not.toBeInTheDocument();
    });

    it('should render a Url payload pointer as decoded text without resolving it', async () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.Url,
            kind: 'setData',
            payload: new TextEncoder().encode('https://example.com/idl.json'),
        });
        await openDecodedTab();

        // The decoded panel applies the instruction's own hints to the POINTER bytes - a local decode, not
        // resolution. For a Url payload that is the URL text itself, and nothing is fetched or linked.
        expect(screen.getByTestId('pmp-decoded-text')).toHaveTextContent('https://example.com/idl.json');
        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should fall back to the raw view with an inline error note when the payload fails to decode', async () => {
        renderSection({
            config: { compression: Compression.Zlib, encoding: Encoding.Utf8, format: Format.Json },
            dataSource: DataSource.Direct,
            kind: 'setData',
            payload: new Uint8Array([1, 2, 3, 4]),
        });
        await openDecodedTab();

        expect(screen.getByTestId('pmp-decode-error')).toHaveTextContent('incorrect header check');
        expect(screen.queryByTestId('pmp-decoded-json')).not.toBeInTheDocument();
        // The failed panel no longer repeats a raw view of its own - Raw is a sibling tab, so the bytes stay one
        // click away. Assert the escape hatch is still reachable rather than that it is mounted right now.
        expect(screen.getByRole('tab', { name: 'Raw' })).toBeInTheDocument();
    });

    it('should render a bounded view with the byte count and a download when the payload exceeds the cap', async () => {
        renderSection(
            {
                config: JSON_CONFIG,
                dataSource: DataSource.Direct,
                kind: 'setData',
                payload: new Uint8Array(2048).fill(0x41),
            },
            8,
        );
        await openDecodedTab();

        const oversized = screen.getByTestId('pmp-payload-oversized');
        expect(oversized).toHaveTextContent(/too large/i);
        // The DECOMPRESSED size, which is what the cap is measured on - the on-chain payload here is 2048 bytes
        // uncompressed, so the two happen to match, but the number reported is the decoded one.
        expect(oversized).toHaveTextContent('2048 bytes');
        expect(screen.queryByTestId('pmp-decoded-json')).not.toBeInTheDocument();
        // The panel carries its OWN copy/download over the decompressed bytes. The sibling Raw tab is not a
        // substitute: that one serves the on-chain payload, so for a compressed document it would hand back the
        // compressed bytes. Without this the Alert's "Copy or download it instead" would point at nothing.
        expect(oversized).toHaveTextContent(/use download\/copy/i);
        expect(screen.getByLabelText('Download')).toBeInTheDocument();
    });

    it('should emit a tab analytics event when the reader opens the decoded tab', async () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.Direct,
            kind: 'setData',
            payload: pack(DOC, Compression.None),
        });

        await userEvent.click(screen.getByRole('tab', { name: 'Decoded' }));

        expect(trackEvent).toHaveBeenCalledWith('pmp_data_tab_opened', {
            data_source: 'direct',
            format: 'json',
            instruction: 'set_data',
            tab: 'decoded',
        });
    });

    it('should carry the data source when the tabs render for a non-Direct payload', async () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.Url,
            kind: 'setData',
            payload: new TextEncoder().encode('https://example.com/idl.json'),
        });

        await userEvent.click(screen.getByRole('tab', { name: 'Decoded' }));

        expect(trackEvent).toHaveBeenCalledWith(
            'pmp_data_tab_opened',
            expect.objectContaining({ data_source: 'url', tab: 'decoded' }),
        );
    });

    it('should emit no analytics event on mount, before any tab is clicked', () => {
        renderSection({
            config: JSON_CONFIG,
            dataSource: DataSource.Direct,
            kind: 'setData',
            payload: pack(DOC, Compression.None),
        });

        // The default panel must not count as an interaction, or every rendered card inflates the tab counts.
        expect(trackEvent).not.toHaveBeenCalled();
    });

    it('should emit no analytics event when there are no tabs to click', () => {
        renderSection({ config: JSON_CONFIG, kind: 'setData' });

        expect(trackEvent).not.toHaveBeenCalled();
    });
});
