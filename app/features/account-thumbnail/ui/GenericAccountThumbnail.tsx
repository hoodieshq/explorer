'use client';

// Reuse note: production fallback for unknown account types is
// `@components/account/UnknownAccountCard.tsx`. This generic thumbnail is a
// minimal stand-in — it dumps whatever `parsed.info` exists so the playground
// can still render a useful card while specific thumbnails are TODO.

import type { AccountThumbnailFetchResult } from '../model/use-account-thumbnail-data';
import { ParsedInfoDetails } from './ParsedInfoDetails';
import { shortAddress, ThumbnailField, ThumbnailShell } from './shell';

export function GenericAccountThumbnail({ data }: { data: AccountThumbnailFetchResult }) {
    if (data.kind === 'missing') {
        return <ThumbnailShell title="Not found">{shortAddress(data.pubkey)}</ThumbnailShell>;
    }

    if (data.kind === 'raw') {
        return (
            <ThumbnailShell title="Unparsed account" badge="raw" badgeTone="raw">
                <ThumbnailField label="Address" value={shortAddress(data.pubkey)} title={data.pubkey} mono />
                <ThumbnailField label="Owner" value={shortAddress(data.owner)} title={data.owner} mono />
                <ThumbnailField label="Lamports" value={data.lamports.toLocaleString()} />
                <ThumbnailField label="Space" value={`${data.space} bytes`} />
            </ThumbnailShell>
        );
    }

    const { account } = data;

    return (
        <ThumbnailShell title={`${account.program} · ${account.parsed.type}`} badge="parsed">
            <ThumbnailField label="Address" value={shortAddress(account.pubkey)} title={account.pubkey} mono />
            <ThumbnailField label="Owner" value={shortAddress(account.owner)} title={account.owner} mono />
            <ThumbnailField label="Lamports" value={account.lamports.toLocaleString()} />
            <ThumbnailField label="Space" value={`${account.space} bytes`} />
            {/* `key` forces the <details> to remount (closed) when the active address changes,
                otherwise its uncontrolled `open` state persists across selections. */}
            <ParsedInfoDetails key={account.pubkey} info={account.parsed.info} />
        </ThumbnailShell>
    );
}
