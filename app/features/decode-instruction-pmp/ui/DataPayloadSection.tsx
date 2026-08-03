import { RawDataField } from '@components/shared/RawDataField';
import { PublicKey } from '@solana/web3.js';
import { DataSource } from '@solana-program/program-metadata';
import React from 'react';

import { Address } from '@/app/components/common/Address';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';
import { Alert } from '@/app/shared/ui/Alert';
import { BaseTable } from '@/app/shared/ui/Table';

import { pmpAnalytics } from '../lib/analytics';
import {
    PMP_ACCOUNT_RAW_DOWNLOAD_FILENAME,
    PMP_ANALYTICS_IX_NAMES,
    PMP_DATA_SOURCE_ANALYTICS_NAMES,
    PMP_DECODED_DOWNLOAD_FILENAME,
    PMP_DECODED_RENDER_CAP_BYTES,
    PMP_FORMAT_ANALYTICS_NAMES,
    PMP_RAW_DOWNLOAD_FILENAME,
} from '../lib/constants';
import { decodePmpPayload } from '../lib/decode-pmp-payload';
import type { PmpAccountContent, PmpDecodedPayload, PmpPayloadInstruction } from '../lib/types';
import { usePmpAccountPayload } from '../model/use-pmp-account-payload';

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
export function DataPayloadSection({
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
            <Alert variant="default" data-testid="pmp-header-only-note" className="!mb-0">
                Instruction carries no new payload.
            </Alert>
        );
    }

    if (content.payload === undefined) {
        return <AccountSourceSection content={content} dataSource={dataSource} />;
    }

    // A payload is present, which is exactly what the memo in the parent decodes on, so `decoded` is always set
    // here. TypeScript cannot relate the two, so narrow once and keep `decoded` NON-optional in everything below -
    // the impossible state must not cross a component boundary.
    if (!decoded) return <></>;

    return (
        <DecodedTabs
            content={content}
            dataSource={dataSource}
            decoded={decoded}
            payload={content.payload}
            source="instruction"
        />
    );
}

/**
 * setData from a foreign buffer, or initialize in-place: the bytes are not in this transaction, they are in the
 * account this instruction points at. That account can be read, so the section names it and reads it.
 */
function AccountSourceSection({ content, dataSource }: { content: PmpPayloadInstruction; dataSource: DataSource }) {
    const account = content.kind === 'setData' ? content.sourceBuffer : content.metadataAccount;
    const label = content.kind === 'setData' ? 'Source buffer' : 'Metadata account';

    if (!account) {
        return (
            <Alert variant="default" data-testid="pmp-deferred-source-note" className="!mb-0">
                This instruction carries no payload bytes.
            </Alert>
        );
    }

    return (
        <div className="flex flex-col gap-0">
            <Alert variant="default" data-testid="pmp-deferred-source-note" className="!mb-0 pl-0">
                <div className="flex w-full flex-row items-center gap-2">
                    <span>The payload was written to the {label} account</span>
                    <Address noNicknameEditing pubkey={new PublicKey(account)} link raw />
                </div>
            </Alert>
            <AccountPayload account={account} content={content} dataSource={dataSource} />
        </div>
    );
}

/**
 * Reads what the referenced account holds RIGHT NOW, on render.
 * Deliberately not a reconstruction of what the viewed transaction wrote, no write-history replay.
 */
function AccountPayload({
    account,
    content,
    dataSource,
}: {
    account: string;
    content: PmpPayloadInstruction;
    dataSource: DataSource;
}) {
    // `content.config` comes from the card's own `decodePmpContentInstruction` memo, so it is referentially
    // stable across renders, which is what keeps the hook from re-decoding the payload on every render.
    const state = usePmpAccountPayload({ address: account, config: content.config });

    if (state.status === 'loading') {
        return (
            <span data-testid="pmp-account-loading" className="text-xs text-neutral-500">
                Reading account...
            </span>
        );
    }

    if (state.status === 'failed') {
        return (
            <Alert variant="warning" data-testid="pmp-account-failed" className="!mb-0">
                Could not read this account. The RPC request failed.
            </Alert>
        );
    }

    return <AccountContentBody content={content} dataSource={dataSource} result={state.content} />;
}

function AccountContentBody({
    content,
    dataSource,
    result,
}: {
    content: PmpPayloadInstruction;
    dataSource: DataSource;
    result: PmpAccountContent;
}) {
    if (result.kind === 'absent') {
        return (
            <Alert variant="warning" data-testid="pmp-account-absent" className="!mb-0">
                Account does not exist on chain.
            </Alert>
        );
    }

    if (result.kind === 'unreadable') {
        return (
            <Alert variant="warning" data-testid="pmp-account-unreadable" className="!mb-0">
                Could not read account content: {result.reason}.
            </Alert>
        );
    }

    return (
        <div className="flex flex-col gap-0">
            <DecodedTabs
                content={content}
                dataSource={dataSource}
                decoded={result.payload}
                payload={result.body}
                source="account"
            />
        </div>
    );
}

/**
 * `source` says where `payload` came from, and it settles which panel opens first: the instruction's own bytes
 * are already on screen unasked, so they open Raw, while account content was fetched on an explicit request for
 * the decoded document and opens Decoded. It also rides along on the tab event, so the two panels' switch counts
 * stay separable despite their different starting tabs.
 */
function DecodedTabs({
    content,
    dataSource,
    decoded,
    payload,
    source,
}: {
    content: PmpPayloadInstruction;
    dataSource: DataSource;
    decoded: PmpDecodedPayload;
    payload: Uint8Array;
    source: 'account' | 'instruction';
}) {
    // `onValueChange` fires only on a reader-initiated switch, never for the tab selected on mount, so the
    // default panel produces no event. Radix hands back a plain string, so narrow it to the tracked union.
    const handleTabChange = (value: string) => {
        if (value !== 'decoded' && value !== 'raw') return;
        pmpAnalytics.trackTabOpened({
            dataSource: PMP_DATA_SOURCE_ANALYTICS_NAMES[dataSource],
            format: PMP_FORMAT_ANALYTICS_NAMES[content.config.format],
            instruction: PMP_ANALYTICS_IX_NAMES[content.kind],
            source,
            tab: value,
        });
    };

    return (
        <Tabs defaultValue={source === 'account' ? 'decoded' : 'raw'} onValueChange={handleTabChange}>
            <TabsList>
                <TabsTrigger value="raw">Raw</TabsTrigger>
                <TabsTrigger value="decoded">Decoded</TabsTrigger>
            </TabsList>
            <TabsContent value="raw" className="pt-3">
                <RawBytes payload={payload} source={source} />
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
            <div className="flex flex-col gap-0">
                <Alert variant="warning" data-testid="pmp-decode-error" className="!mb-0">
                    Could not decode this payload: {decoded.reason}
                </Alert>
            </div>
        );
    }

    if (decoded.kind === 'oversized') {
        return (
            <div className="flex flex-col gap-0" data-testid="pmp-payload-oversized">
                <Alert variant="warning" className="!mb-0">
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

    // Plain text rather than a JSON viewer: the common payload is a program IDL, and react-json-view is not
    // virtualized, so an interactive tree costs thousands of nodes per card. A Json payload arrives already
    // pretty-printed from `toDocumentText`, so every format renders through this one node.
    // TODO: resolve DataSource.URL and DataSource.Externals lands in a later milestone. Currently only text url gets rendered.
    return (
        <pre
            data-testid="pmp-decoded-text"
            className="mb-0 max-h-80 overflow-auto whitespace-pre-wrap break-words bg-heavy-metal-900 p-3 text-left text-xs"
        >
            {decoded.text}
        </pre>
    );
}

/** Thin wrapper so the section's own test id sits on a stable node around the shared field. */
function RawBytes({ payload, source }: { payload: Uint8Array; source: 'account' | 'instruction' }) {
    const isAccount = source === 'account';
    return (
        <div data-testid={isAccount ? 'pmp-account-raw' : 'pmp-payload-raw'}>
            <RawDataField
                data={payload}
                filename={isAccount ? PMP_ACCOUNT_RAW_DOWNLOAD_FILENAME : PMP_RAW_DOWNLOAD_FILENAME}
            />
        </div>
    );
}
