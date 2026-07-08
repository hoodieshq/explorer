import { ErrorCard } from '@components/common/ErrorCard';
import { UpgradeableLoaderAccountData } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import React from 'react';
import { ExternalLink } from 'react-feather';

import { Address } from '@/app/components/common/Address';
import { LoadingCard } from '@/app/components/common/LoadingCard';
import { Badge } from '@/app/components/shared/ui/badge';
import { Card, CardBody } from '@/app/shared/ui/Card';
import { OsecRegistryInfo, VerificationStatus } from '@/app/utils/verified-builds';

import { KeyValue } from '../../key-value/KeyValue';
import { LABEL_WIDTH } from '../UpgradeableProgramSection/constants';
import { InfoCard } from './InfoCard';
import { SectionCard } from './SectionCard';
import { CopyableCode, ExternalLinkValue, TextValue } from './values';

const VERIFIED_BUILDS_GUIDE = 'https://solana.com/developers/guides/advanced/verified-builds';

/**
 * "Verified Build" tab — redesigned in the spirit of UpgradeableProgramSection. The osec.io
 * registry table (BaseTable + TableCardBody) becomes a stack of left-aligned `KeyValue` rows;
 * the guide callout moves into an `InfoCard` note between the header and the card (the
 * H-explorer-pre-sorybook treatment).
 */
export function BaseVerifiedBuildCard({
    data,
    registryInfo,
    isLoading,
}: {
    data: UpgradeableLoaderAccountData;
    registryInfo: OsecRegistryInfo | null;
    isLoading: boolean;
}) {
    if (!data.programData) {
        return <ErrorCard text="Account has no data" />;
    }

    if (isLoading) {
        return <LoadingCard message="Fetching last verified build hash" />;
    }

    if (!registryInfo) {
        return (
            <SectionCard title="Verified Build">
                <CardBody ui="dashkit" className="text-center">
                    Verified build information not yet uploaded by the program authority. For more information, see the{' '}
                    <Link href={VERIFIED_BUILDS_GUIDE} target="_blank">
                        Verified Build Guide
                    </Link>
                    .<br />
                    <br />
                    Note: Some programs were verified using older, deprecated versions of the API and may not include
                    on-chain verification details.
                </CardBody>
            </SectionCard>
        );
    }

    let verificationMessage;
    if (
        registryInfo.verification_status === VerificationStatus.Verified ||
        registryInfo.verification_status === VerificationStatus.PdaUploaded
    ) {
        verificationMessage = 'Information provided by osec.io';
    } else if (registryInfo.verification_status === VerificationStatus.NotVerified) {
        verificationMessage = 'No verified build found';
    }

    return (
        <SectionCard
            title="Verified Build"
            note={
                <InfoCard variant="info">
                    A verified build badge indicates that this program was built from source code that is publicly
                    available, but does not imply that this program has been audited. For more details, refer to the{' '}
                    <a href={VERIFIED_BUILDS_GUIDE} target="_blank" rel="noopener noreferrer">
                        Verified Builds Guide
                        <ExternalLink className="relative -top-0.5 ml-1.5" size={13} />
                    </a>
                    .
                </InfoCard>
            }
        >
            {ROWS.filter(x => x.key in registryInfo).map(x => (
                <KeyValue key={x.key} label={x.display} labelWidth={LABEL_WIDTH} row>
                    <RenderValue value={registryInfo[x.key]} type={x.type} mono={x.mono ?? true} />
                </KeyValue>
            ))}
            {/* "Information provided by osec.io" — a full-width muted footer note (no value
                column), matching the H-explorer-pre-sorybook `verified-build-note` row. */}
            {verificationMessage && (
                <div className="border-0 border-b border-solid border-dark-border px-3 py-2 text-dk-sm text-outer-space-300 last:border-b-0">
                    {verificationMessage}
                </div>
            )}
        </SectionCard>
    );
}

enum DisplayType {
    Boolean,
    String,
    URL,
    Date,
    LongString,
    PublicKey,
}

type TableRow = {
    display: string;
    key: keyof OsecRegistryInfo;
    type: DisplayType;
    /** Render the value in the normal body font instead of monospace. */
    mono?: boolean;
};

const ROWS: TableRow[] = [
    { display: 'Verified', key: 'is_verified', type: DisplayType.Boolean },
    { display: 'Message', key: 'message', mono: false, type: DisplayType.String },
    { display: 'Uploader', key: 'signer', type: DisplayType.PublicKey },
    { display: 'On Chain Hash', key: 'on_chain_hash', type: DisplayType.String },
    { display: 'Executable Hash', key: 'executable_hash', type: DisplayType.String },
    { display: 'Last Verified At', key: 'last_verified_at', mono: false, type: DisplayType.Date },
    { display: 'Verify Command', key: 'verify_command', type: DisplayType.LongString },
    { display: 'Repository URL', key: 'onchain_repo_url', mono: false, type: DisplayType.URL },
];

function RenderValue({
    value,
    type,
    mono,
}: {
    value: OsecRegistryInfo[keyof OsecRegistryInfo];
    type: DisplayType;
    mono: boolean;
}) {
    switch (type) {
        case DisplayType.Boolean:
            return (
                <Badge ui="dashkit" variant={value ? 'success' : 'warning'}>
                    {String(value)}
                </Badge>
            );
        case DisplayType.String:
            if (Object.values(VerificationStatus).includes(value as VerificationStatus)) {
                const isVerified = value === VerificationStatus.Verified;
                return (
                    <Badge ui="dashkit" variant={isVerified ? 'success' : 'warning'}>
                        {isVerified ? 'true' : 'false'}
                    </Badge>
                );
            }
            return <TextValue mono={mono}>{value && (value as string).length > 1 ? value : '-'}</TextValue>;
        case DisplayType.LongString:
            return value && (value as string).length > 1 ? (
                <CopyableCode value={value as string} />
            ) : (
                <TextValue mono={mono}>-</TextValue>
            );
        case DisplayType.URL:
            return isValidLink(value as string) ? (
                <ExternalLinkValue url={value as string} mono={mono} />
            ) : (
                <TextValue mono={mono}>{value && (value as string).length > 1 ? (value as string).trim() : '-'}</TextValue>
            );
        case DisplayType.Date:
            return (
                <TextValue mono={mono}>
                    {value && (value as string).length > 1 ? new Date(value as string).toUTCString() : '-'}
                </TextValue>
            );
        case DisplayType.PublicKey:
            return <Address pubkey={new PublicKey(value as string)} link />;
        default:
            return null;
    }
}

function isValidLink(value: string) {
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
}
