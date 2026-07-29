'use client';

import { Address } from '@components/common/Address';
import { Button } from '@components/shared/ui/button';
import { cn } from '@components/shared/utils';
import { PublicKey } from '@solana/web3.js';
import React, { useId, useMemo, useState } from 'react';
import { ChevronDown } from 'react-feather';

import { Card } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

import { DomainInfo } from '../model/types';

// Collapsible section mirroring @features/transaction's CollapsibleSection: heading lifted out above
// the card + a chevron toggle + the grid `1fr`/`0fr` height animation. Rebuilt locally on shared
// primitives because FSD forbids entity → feature imports; drop this in favour of a shared
// CollapsibleSection once that lands (the `dk-*` header work is shelved on commit f2950869).
export function BaseDomainsCard({ domains }: { domains: DomainInfo[] }) {
    const [expanded, setExpanded] = useState(true);
    const headingId = useId();

    const validDomains = useMemo(
        () =>
            domains
                .map(domain => ({ ...domain, pubkey: tryPublicKey(domain.address) }))
                .filter((d): d is DomainInfo & { pubkey: PublicKey } => d.pubkey !== null),
        [domains],
    );

    return (
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 id={headingId} className="m-0 text-lg font-normal text-white">
                    Owned Domain Names
                </h2>
                <Button
                    variant="outline"
                    size="sm"
                    className="md:min-w-[86px]"
                    aria-expanded={expanded}
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                    onClick={() => setExpanded(v => !v)}
                >
                    <ChevronDown
                        size={12}
                        className={cn(
                            'transition-transform duration-200 ease-in-out',
                            expanded && '[transform:rotate(180deg)]',
                        )}
                    />
                    <span className="hidden md:inline-block">{expanded ? 'Collapse' : 'Expand'}</span>
                </Button>
            </div>
            <div
                className={cn(
                    'grid transition-[grid-template-rows] duration-200 ease-in-out',
                    expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
            >
                <div className="overflow-hidden">
                    <Card ui="dashkit">
                        <BaseTable ui="dashkit" variant="card" nowrap>
                            <BaseTable.Head>
                                <BaseTable.Row>
                                    <BaseTable.HeaderCell className="text-dk-gray-700">
                                        Domain Name
                                    </BaseTable.HeaderCell>
                                    <BaseTable.HeaderCell className="text-dk-gray-700">
                                        Name Service Account
                                    </BaseTable.HeaderCell>
                                </BaseTable.Row>
                            </BaseTable.Head>
                            <BaseTable.Body>
                                {validDomains.map(domain => (
                                    <BaseTable.Row key={domain.address}>
                                        <BaseTable.Cell>{domain.name}</BaseTable.Cell>
                                        <BaseTable.Cell>
                                            <Address pubkey={domain.pubkey} link />
                                        </BaseTable.Cell>
                                    </BaseTable.Row>
                                ))}
                            </BaseTable.Body>
                        </BaseTable>
                    </Card>
                </div>
            </div>
        </section>
    );
}

function tryPublicKey(address: string): PublicKey | null {
    try {
        return new PublicKey(address);
    } catch {
        return null;
    }
}
