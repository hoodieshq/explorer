'use client';

// Reuse note: production rendering for spl-token mint accounts lives in
// `@components/account/TokenAccountSection.tsx`, with full Token-2022 extension
// rendering in `TokenExtensionsCard`/`TokenExtensionsSection`. This thumbnail is
// a self-contained skeleton meant for iteration on the compact layout only.

import type { AccountThumbnailFetchResult } from '../model/use-account-thumbnail-data';
import { ParsedInfoDetails } from './ParsedInfoDetails';
import { shortAddress, ThumbnailField, ThumbnailShell } from './shell';

const TOKEN_PROGRAMS = new Set(['spl-token', 'spl-token-2022']);

type MintInfo = {
    decimals: number;
    supply: string;
    isInitialized: boolean;
    mintAuthority: string | null;
    freezeAuthority: string | null;
};

export function TokenMintThumbnail({ data }: { data: AccountThumbnailFetchResult }) {
    if (data.kind !== 'parsed') return null;
    const { account } = data;
    if (!TOKEN_PROGRAMS.has(account.program) || account.parsed.type !== 'mint') return null;

    const info = account.parsed.info as unknown as MintInfo;

    return (
        <ThumbnailShell title="Token mint" badge={account.program}>
            <ThumbnailField label="Address" value={shortAddress(account.pubkey)} title={account.pubkey} mono />
            <div className="e-grid e-grid-cols-2 e-gap-3">
                <ThumbnailField label="Decimals" value={String(info.decimals)} />
                <ThumbnailField label="Supply" value={info.supply} />
                <ThumbnailField
                    label="Mint authority"
                    value={info.mintAuthority ? shortAddress(info.mintAuthority) : '—'}
                    title={info.mintAuthority ?? undefined}
                    mono
                />
                <ThumbnailField
                    label="Freeze authority"
                    value={info.freezeAuthority ? shortAddress(info.freezeAuthority) : '—'}
                    title={info.freezeAuthority ?? undefined}
                    mono
                />
            </div>
            <ThumbnailField label="Initialized" value={info.isInitialized ? 'yes' : 'no'} />
            <ParsedInfoDetails key={account.pubkey} info={account.parsed.info} />
        </ThumbnailShell>
    );
}

export function isTokenMint(data: AccountThumbnailFetchResult): boolean {
    return data.kind === 'parsed' && TOKEN_PROGRAMS.has(data.account.program) && data.account.parsed.type === 'mint';
}
