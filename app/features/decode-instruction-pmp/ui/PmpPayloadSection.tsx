import { RawDataField } from '@components/shared/RawDataField';
import { PublicKey } from '@solana/web3.js';
import { DataSource } from '@solana-program/program-metadata';
import React from 'react';

import { Address } from '@/app/components/common/Address';
import { SolarizedJsonViewer } from '@/app/components/common/JsonViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { Alert } from '@/app/shared/ui/Alert';
import { BaseTable } from '@/app/shared/ui/Table';

import { pmpAnalytics } from '../lib/analytics';
import {
    PMP_ANALYTICS_IX_NAMES,
    PMP_DATA_SOURCE_ANALYTICS_NAMES,
    PMP_DECODED_DOWNLOAD_FILENAME,
    PMP_DECODED_RENDER_CAP_BYTES,
    PMP_FORMAT_ANALYTICS_NAMES,
    PMP_JSON_COLLAPSE_DEPTH,
    PMP_RAW_DOWNLOAD_FILENAME,
} from '../lib/constants';
import { decodePmpPayload } from '../lib/decode-pmp-payload';
import type { PmpDecodedPayload, PmpPayloadInstruction } from '../lib/types';

/** The card table has three columns, so every row in this section spans all of them. */
const CARD_TABLE_COLUMNS = 3;

/**
 * The Decoded Content section of the PMP card. Owns every payload state.
 * A decode failure degrades to the raw view plus an inline note INSIDE this section (it never throws
 * out to the card's error boundary, which would discard the accounts and config tables), and an oversized
 * payload renders a bounded view plus a download rather than the full document.
 *
 * Raw bytes always go through `RawDataField`, which owns the hex/base64 tabs, the byte count, copy, download,
 * show-more and its own too-large guard. Nothing here reimplements those.
 */
export function PmpPayloadSection({
    content,
    cap = PMP_DECODED_RENDER_CAP_BYTES,
}: {
    content: PmpPayloadInstruction;
    cap?: number;
}) {
    const { config, payload } = content;

    // Decoded for every payload, not just `Direct`: `Url` and `External` also get the Decoded/Raw tabs, where the
    // decoded panel applies the instruction's own encoding/compression hints to the POINTER bytes. That is a local
    // decode, not pointer resolution - nothing is fetched and no account is read, which stays P3/P4 work.
    const decoded = React.useMemo(
        () => (payload ? decodePmpPayload({ cap, config, data: payload }) : undefined),
        [cap, config, payload],
    );

    return (
        <>
            <BaseTable.Row>
                <BaseTable.Cell colSpan={CARD_TABLE_COLUMNS} data-testid="pmp-payload-section">
                    <PayloadBody content={content} decoded={decoded} />
                </BaseTable.Cell>
            </BaseTable.Row>
        </>
    );
}

function PayloadBody({ content, decoded }: { content: PmpPayloadInstruction; decoded: PmpDecodedPayload | undefined }) {
    const { dataSource } = content;

    // A 4-byte header-only setData updates the hints and leaves the stored bytes alone - not "no data", and not a decode failure.
    // Only `setData` reaches here:
    // `initialize` carries `dataSource` as a fixed struct field, so its decode always produces one.
    if (dataSource === undefined) {
        return (
            <Alert variant="default" data-testid="pmp-header-only-note" className="mb-0">
                This instruction updates the encoding, compression and format hints only. It carries no new payload.
            </Alert>
        );
    }

    if (content.payload === undefined) {
        return <DeferredSourceNote content={content} />;
    }

    // A payload is present, which is exactly what the memo in the parent decodes on, so `decoded` is always set
    // here. TypeScript cannot relate the two, so narrow once and keep `decoded` NON-optional in everything below -
    // the impossible state must not cross a component boundary.
    if (!decoded) return <></>;

    return <DecodedTabs content={content} dataSource={dataSource} decoded={decoded} payload={content.payload} />;
}

/** setData from a foreign buffer, or initialize in-place: the bytes are not in this transaction (P2 territory). */
function DeferredSourceNote({ content }: { content: PmpPayloadInstruction }) {
    const account = content.kind === 'setData' ? content.sourceBuffer : content.metadataAccount;
    const label = content.kind === 'setData' ? 'Source buffer' : 'Metadata account';

    if (!account) {
        return (
            <Alert variant="default" data-testid="pmp-deferred-source-note" className="mb-0">
                This instruction carries no payload bytes.
            </Alert>
        );
    }

    return (
        <Alert variant="default" data-testid="pmp-deferred-source-note" className="mb-0">
            <div className="flex w-full flex-row items-center gap-1.5">
                <span>The payload was written to the {label} account</span>
                <Address noNicknameEditing pubkey={new PublicKey(account)} link raw />
            </div>
        </Alert>
    );
}

function DecodedTabs({
    content,
    dataSource,
    decoded,
    payload,
}: {
    content: PmpPayloadInstruction;
    dataSource: DataSource;
    decoded: PmpDecodedPayload;
    payload: Uint8Array;
}) {
    // `onValueChange` fires only on a reader-initiated switch, never for the tab selected on mount, so the
    // default panel produces no event. Radix hands back a plain string, so narrow it to the tracked union.
    const handleTabChange = (value: string) => {
        if (value !== 'decoded' && value !== 'raw') return;
        pmpAnalytics.trackTabOpened({
            dataSource: PMP_DATA_SOURCE_ANALYTICS_NAMES[dataSource],
            format: PMP_FORMAT_ANALYTICS_NAMES[content.config.format],
            instruction: PMP_ANALYTICS_IX_NAMES[content.kind],
            tab: value,
        });
    };

    return (
        <Tabs defaultValue="raw" onValueChange={handleTabChange}>
            <TabsList>
                <TabsTrigger value="raw">Raw</TabsTrigger>
                <TabsTrigger value="decoded">Decoded</TabsTrigger>
            </TabsList>
            <TabsContent value="raw" className="pt-3">
                <RawBytes payload={payload} />
            </TabsContent>
            <TabsContent value="decoded" className="pt-3">
                <DecodedBody decoded={decoded} />
            </TabsContent>
        </Tabs>
    );
}

function DecodedBody({ decoded }: { decoded: PmpDecodedPayload }) {
    if (decoded.kind === 'failed') {
        return (
            <div className="flex flex-col gap-3">
                <Alert variant="warning" data-testid="pmp-decode-error" className="mb-0">
                    Could not decode this payload: {decoded.reason}
                </Alert>
            </div>
        );
    }

    if (decoded.kind === 'oversized') {
        return (
            <div className="flex flex-col gap-3" data-testid="pmp-payload-oversized">
                <Alert variant="warning" className="mb-0">
                    Payload too large to render ({decoded.bytes.length} bytes). Copy or download it instead.
                </Alert>
                {/* The DECOMPRESSED bytes, which the sibling Raw tab cannot give you: that tab shows the on-chain
                    payload, so for a compressed document it hands back the compressed bytes. This is the only
                    route to the actual document once it is over the cap, which is what makes the copy/download
                    the Alert promises real. RawDataField's own 1 KB guard means nothing this big is inlined. */}
                <RawDataField data={decoded.bytes} filename={PMP_DECODED_DOWNLOAD_FILENAME} />
            </div>
        );
    }

    if (decoded.document.kind === 'json') {
        return (
            // `.string-value` is emitted by react-json-view - the arbitrary variant scopes break-all to its
            // descendants only, matching how MetadataCard and AttestationDataCard wrap the same viewer.
            <div data-testid="pmp-decoded-json" className="[&_.string-value]:break-all">
                <SolarizedJsonViewer
                    src={decoded.document.value}
                    collapsed={PMP_JSON_COLLAPSE_DEPTH}
                    name={false}
                    enableClipboard={true}
                    displayObjectSize={false}
                    displayDataTypes={false}
                />
            </div>
        );
    }

    // TODO: resolving DataSource.URL and DataSource.Externals lands in a later milestone.
    // Currently text url gets rendered.
    return (
        <pre
            data-testid="pmp-decoded-text"
            className="mb-0 max-h-80 overflow-auto whitespace-pre-wrap break-words bg-heavy-metal-900 p-3 text-left text-xs"
        >
            {decoded.document.text}
        </pre>
    );
}

/** Thin wrapper so the section's own test id sits on a stable node around the shared field. */
function RawBytes({ payload }: { payload: Uint8Array }) {
    return (
        <div data-testid="pmp-payload-raw">
            <RawDataField data={payload} filename={PMP_RAW_DOWNLOAD_FILENAME} />
        </div>
    );
}
