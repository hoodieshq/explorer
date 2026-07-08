import { Address } from '@components/common/Address';
import { PublicKey } from '@solana/web3.js';
import React, { useMemo } from 'react';

import type { DomainInfo } from '@/app/entities/domain';

import { KeyValue } from '../../key-value/KeyValue';
import { LABEL_WIDTH } from '../UpgradeableProgramSection/constants';
import { SectionCard } from './SectionCard';

/**
 * "Owned Domain Names" tab — redesigned in the spirit of UpgradeableProgramSection.
 * The old two-column BaseTable (Domain Name | Name Service Account) becomes one
 * `KeyValue` row per domain: the domain name is the label, its name-service account
 * the left-aligned value — so it lines up with every other card on the page.
 */
export function BaseDomainsCard({ domains }: { domains: DomainInfo[] }) {
    const validDomains = useMemo(
        () =>
            domains
                .map(domain => ({ ...domain, pubkey: tryPublicKey(domain.address) }))
                .filter((d): d is DomainInfo & { pubkey: PublicKey } => d.pubkey !== null),
        [domains],
    );

    return (
        <SectionCard title="Owned Domain Names">
            {validDomains.map(domain => (
                <KeyValue key={domain.address} label={domain.name} labelWidth={LABEL_WIDTH} row>
                    <Address pubkey={domain.pubkey} link />
                </KeyValue>
            ))}
        </SectionCard>
    );
}

function tryPublicKey(address: string): PublicKey | null {
    try {
        return new PublicKey(address);
    } catch {
        return null;
    }
}
