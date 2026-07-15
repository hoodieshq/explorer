import React, { useMemo } from 'react';
import { AlertCircle, Download } from 'react-feather';
import { ErrorBoundary } from 'react-error-boundary';

import { Button } from '@/app/components/shared/ui/button';
import { Alert } from '@/app/shared/ui/Alert';
import { Logger } from '@/app/shared/lib/logger';
import { triggerDownload } from '@/app/shared/lib/triggerDownload';
import { PMP_SECURITY_TXT_KEYS } from '@/app/features/security-txt/lib/constants';
import type { NeodymeSecurityTXT } from '@/app/features/security-txt/lib/types';
import { ContactInfo, SecurityTxtVersionBadge } from '@/app/features/security-txt/ui/common';
import { EmptySecurityTxtCard } from '@/app/features/security-txt/ui/EmptySecurityTxtCard';
import {
    isString,
    isValidLink,
    parseContactList,
    securityTxtDataToBase64,
    tryParseContactString,
} from '@/app/features/security-txt/ui/utils';

import { KeyValue } from '../../key-value/KeyValue';
import { LABEL_WIDTH } from '../UpgradeableProgramSection/constants';
import { SectionCard } from './SectionCard';
import { CodeBlock, ExternalLinkValue, StackedList, TextValue } from './values';

/**
 * "Security.txt" tab — redesigned in the spirit of UpgradeableProgramSection. Both the
 * Neodyme (embedded in program data) and Program-Metadata (PMP) payloads render as
 * left-aligned `KeyValue` rows instead of the right-aligned BaseTable, with the version
 * badge in the outside header alongside the Download action and the self-reported warning
 * living inside the card body.
 *
 * Accepts security.txt from Program Data and Program Metadata json; by default renders the
 * PMP json, falling back to the Program Data security.txt.
 */
export function ProgramSecurityTxtCard({
    programAddress,
    programDataSecurityTxt,
    pmpSecurityTxt,
}: {
    programAddress: string;
    programDataSecurityTxt: NeodymeSecurityTXT | undefined;
    pmpSecurityTxt: any;
}) {
    const downloadData = useMemo(() => {
        if (!pmpSecurityTxt && !programDataSecurityTxt) return '';
        return securityTxtDataToBase64(pmpSecurityTxt || programDataSecurityTxt);
    }, [programDataSecurityTxt, pmpSecurityTxt]);

    if (!programDataSecurityTxt && !pmpSecurityTxt) {
        return <EmptySecurityTxtCard programAddress={programAddress} />;
    }

    const rows = pmpSecurityTxt ? (
        <PmpSecurityTxtRows data={pmpSecurityTxt} />
    ) : programDataSecurityTxt ? (
        <NeodymeSecurityTxtRows data={programDataSecurityTxt} />
    ) : null;

    return (
        <SectionCard
            title={
                <>
                    Security.txt
                    <SecurityTxtVersionBadge version={pmpSecurityTxt ? 'pmp' : 'neodyme'} />
                </>
            }
            headerActions={
                // Same trigger as the Program Account Download button (outline / size="sm" →
                // h-7): icon-only below md, "Download" label at md+. A fixed-height button keeps
                // the outside header the same height as Program Account — the version badge, being
                // shorter, no longer dictates the row height.
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Download"
                    onClick={() =>
                        triggerDownload(downloadData, `${programAddress}-security-txt.json`, {
                            type: 'application/json',
                        }).catch(err =>
                            Logger.error(new Error('Failed to download security.txt', { cause: err })),
                        )
                    }
                >
                    <Download size={12} />
                    <span className="hidden md:inline">Download</span>
                </Button>
            }
            note={
                <Alert variant="warning" appearance="outlined" icon={<AlertCircle size={16} />}>
                    Note that this is self-reported by the author of the program and might not be accurate
                </Alert>
            }
        >
            <ErrorBoundary
                fallback={<div className="px-3 py-2 text-center">Invalid security.txt</div>}
            >
                {rows}
            </ErrorBoundary>
        </SectionCard>
    );
}

// --- Neodyme (embedded in program data) ---------------------------------------

enum NeodymeType {
    String,
    URL,
    Date,
    Contacts,
    PGP,
    Auditors,
}

const NEODYME_ROWS: { display: string; key: keyof NeodymeSecurityTXT; type: NeodymeType }[] = [
    { display: 'Name', key: 'name', type: NeodymeType.String },
    { display: 'Project URL', key: 'project_url', type: NeodymeType.URL },
    { display: 'Contacts', key: 'contacts', type: NeodymeType.Contacts },
    { display: 'Policy', key: 'policy', type: NeodymeType.URL },
    { display: 'Preferred Languages', key: 'preferred_languages', type: NeodymeType.String },
    { display: 'Secure Contact Encryption', key: 'encryption', type: NeodymeType.PGP },
    { display: 'Source Code URL', key: 'source_code', type: NeodymeType.URL },
    { display: 'Source Code Release Version', key: 'source_release', type: NeodymeType.String },
    { display: 'Source Code Revision', key: 'source_revision', type: NeodymeType.String },
    { display: 'Auditors', key: 'auditors', type: NeodymeType.Auditors },
    { display: 'Acknowledgements', key: 'acknowledgements', type: NeodymeType.URL },
    { display: 'Expiry', key: 'expiry', type: NeodymeType.Date },
];

function NeodymeSecurityTxtRows({ data }: { data: NeodymeSecurityTXT }) {
    return (
        <>
            {NEODYME_ROWS.filter(x => x.key in data && data[x.key]).map(x => (
                <KeyValue key={x.key} label={x.display} labelWidth={LABEL_WIDTH} row>
                    {/* Only the Source Code Revision (a commit hash) stays monospace; every other
                        field renders in the normal body font. */}
                    <NeodymeValue value={data[x.key] as string} type={x.type} mono={x.key === 'source_revision'} />
                </KeyValue>
            ))}
        </>
    );
}

function NeodymeValue({ value, type, mono }: { value: string; type: NeodymeType; mono: boolean }) {
    switch (type) {
        case NeodymeType.String:
        case NeodymeType.Date:
            return <TextValue mono={mono}>{value}</TextValue>;
        case NeodymeType.URL:
            return isValidLink(value) ? <ExternalLinkValue url={value} mono={mono} /> : <TextValue mono={mono}>{value}</TextValue>;
        case NeodymeType.PGP:
            return isValidLink(value) ? <ExternalLinkValue url={value} mono={mono} /> : <CodeBlock mono={mono}>{value}</CodeBlock>;
        case NeodymeType.Contacts:
            return (
                <StackedList mono={mono}>
                    {value.split(',').map((c, i) => {
                        const idx = c.indexOf(':');
                        if (idx < 0) {
                            return <li key={i}>{c}</li>;
                        }
                        return (
                            <li key={i}>
                                <ContactInfo type={c.slice(0, idx)} information={c.slice(idx + 1)} />
                            </li>
                        );
                    })}
                </StackedList>
            );
        case NeodymeType.Auditors:
            return isValidLink(value) ? (
                <ExternalLinkValue url={value} mono={mono} />
            ) : (
                <StackedList mono={mono}>
                    {value.split(',').map((c, idx) => (
                        <li key={idx}>{c}</li>
                    ))}
                </StackedList>
            );
        default:
            return null;
    }
}

// --- Program Metadata (PMP) ----------------------------------------------------

function PmpSecurityTxtRows({ data }: { data: Record<string, any> }) {
    const entries = useMemo(() => {
        if (!(data instanceof Object)) {
            throw new Error('Invalid data');
        }
        return Object.entries(data).reduce(
            (acc, [key, value]) => {
                if ((PMP_SECURITY_TXT_KEYS as string[]).includes(key)) {
                    acc.main.push([key, value]);
                } else {
                    acc.additional.push([key, value]);
                }
                return acc;
            },
            { additional: [] as [string, any][], main: [] as [string, any][] },
        );
    }, [data]);

    return (
        <>
            {entries.main.map(([key, value]) => (
                <KeyValue key={key} label={key} labelWidth={LABEL_WIDTH} row>
                    <PmpValue entryKey={key} value={value} mono={key === 'source_revision'} />
                </KeyValue>
            ))}
            {entries.additional.length > 0 && (
                <>
                    <div className="border-0 border-b border-solid border-dark-border px-3 py-2">
                        <span className="font-semibold text-dk-gray-700">Additional</span>
                    </div>
                    {entries.additional.map(([key, value]) => (
                        <KeyValue key={key} label={key} labelWidth={LABEL_WIDTH} row>
                            <PmpValue entryKey={key} value={value} mono={key === 'source_revision'} />
                        </KeyValue>
                    ))}
                </>
            )}
        </>
    );
}

function PmpValue({ entryKey, value, mono }: { entryKey: string; value: any; mono: boolean }) {
    if (!value) {
        return <TextValue mono={mono}>{String(value)}</TextValue>;
    }
    if (isValidLink(value)) {
        return <ExternalLinkValue url={value} mono={mono} />;
    }
    if (isString(value)) {
        if (entryKey === 'contacts') {
            const contacts = parseContactList(value);
            return (
                <StackedList mono={mono}>
                    {contacts.map(entry => (
                        <li key={entry.kind === 'contact' ? `${entry.type}:${entry.info}` : entry.value}>
                            {entry.kind === 'contact' ? (
                                <ContactInfo type={entry.type} information={entry.info} />
                            ) : (
                                entry.value
                            )}
                        </li>
                    ))}
                </StackedList>
            );
        }
        if (value.includes('PGP') || value.includes('PUBLIC KEY')) {
            return <CodeBlock mono={mono}>{value}</CodeBlock>;
        }
        return <TextValue mono={mono}>{value}</TextValue>;
    }
    if (Array.isArray(value)) {
        return (
            <StackedList mono={mono}>
                {value.map((item, index) => (
                    <li key={`${entryKey}-${index}`}>
                        <PmpListItem value={item} mono={mono} />
                    </li>
                ))}
            </StackedList>
        );
    }
    if (!isNaN(value)) {
        return <TextValue mono={mono}>{value}</TextValue>;
    }
    return <CodeBlock mono={mono}>{String(value)}</CodeBlock>;
}

function PmpListItem({ value, mono }: { value: any; mono: boolean }) {
    if (!value) {
        return <>-</>;
    }
    if (isValidLink(value)) {
        return <ExternalLinkValue url={value} mono={mono} />;
    }
    if (isString(value)) {
        const maybeContact = tryParseContactString(value);
        if (Array.isArray(maybeContact)) {
            return <ContactInfo type={maybeContact[0]} information={maybeContact[1]} />;
        }
        return <>{value}</>;
    }
    if (!isNaN(value)) {
        return <>{value}</>;
    }
    return <CodeBlock mono={mono}>{String(value)}</CodeBlock>;
}
