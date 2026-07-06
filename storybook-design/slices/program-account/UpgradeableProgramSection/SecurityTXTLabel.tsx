import type { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import React from 'react';
import { ExternalLink } from 'react-feather';

import { useProgramMetadataSecurityTxt } from '@/app/entities/program-metadata';
import { useCluster } from '@/app/providers/cluster';
import {
    NEODYME_SECURITY_TXT_DOC_LINK,
    PMP_SECURITY_TXT_DOC_LINK,
} from '@/app/features/security-txt/lib/constants';

import { InfoTooltip } from './InfoTooltip';

export function ProgramSecurityTXTLabel({ programPubkey }: { programPubkey: PublicKey }) {
    const { url, cluster } = useCluster();
    const { programMetadataSecurityTxt } = useProgramMetadataSecurityTxt(programPubkey.toBase58(), url, cluster);

    return (
        <InfoTooltip text="Security.txt helps security researchers to contact developers if they find security bugs.">
            {/* Reference by default to Neodyme security.txt doc */}
            {/* Reference to Program Metadata only if it's uploaded */}
            <Link
                rel="noopener noreferrer"
                target="_blank"
                href={programMetadataSecurityTxt ? PMP_SECURITY_TXT_DOC_LINK : NEODYME_SECURITY_TXT_DOC_LINK}
            >
                <span className="text-dk-white">Security.txt</span>
                <ExternalLink className="ml-1.5 align-text-top" size={13} />
            </Link>
        </InfoTooltip>
    );
}
