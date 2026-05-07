'use client';

// Reuse note: production rendering for upgradeable-loader accounts lives in
// `@components/account/UpgradeableLoaderAccountSection.tsx`. This compact
// thumbnail surfaces the linked `programData` address that the parsed info
// already carries, so the program card doubles as a pointer to its bytecode.

import type { AccountThumbnailFetchResult } from '../model/use-account-thumbnail-data';
import { ParsedInfoDetails } from './ParsedInfoDetails';
import { shortAddress, ThumbnailField, ThumbnailShell } from './shell';

const LOADER_PROGRAM = 'bpf-upgradeable-loader';

type UpgradeableProgramInfo = { programData: string };

export function UpgradeableProgramThumbnail({ data }: { data: AccountThumbnailFetchResult }) {
    if (data.kind !== 'parsed') return null;
    const { account } = data;
    if (account.program !== LOADER_PROGRAM || account.parsed.type !== 'program') return null;

    const info = account.parsed.info as unknown as UpgradeableProgramInfo;

    return (
        <ThumbnailShell title="Upgradeable program" badge={account.program}>
            <ThumbnailField label="Address" value={shortAddress(account.pubkey)} title={account.pubkey} mono />
            <ThumbnailField
                label="programData"
                labelBadge={
                    <span
                        title="Program-Derived Address: ['ProgramData', programId] under the upgradeable loader."
                        className="e-rounded e-bg-sky-500/15 e-px-1.5 e-py-px e-text-[9px] e-font-semibold e-uppercase e-tracking-wide e-text-sky-300 e-ring-1 e-ring-inset e-ring-sky-500/30"
                    >
                        PDA
                    </span>
                }
                value={info.programData ? shortAddress(info.programData) : '—'}
                title={info.programData}
                mono
            />
            <ThumbnailField label="Lamports" value={account.lamports.toLocaleString()} />
            <ThumbnailField label="Space" value={`${account.space} bytes`} />
            <ParsedInfoDetails key={account.pubkey} info={account.parsed.info} />
        </ThumbnailShell>
    );
}

export function isUpgradeableProgram(data: AccountThumbnailFetchResult): boolean {
    return data.kind === 'parsed' && data.account.program === LOADER_PROGRAM && data.account.parsed.type === 'program';
}
