import { Skeleton } from '@components/shared/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/shared/ui/tooltip';
import { ExternalLink as ExternalLinkIcon } from 'react-feather';

import { ExternalLink } from '@/app/components/shared/ui/external-link';
import { getSafeExternalHref } from '@/app/shared/lib/url';

import type { NftokenAccount } from '../lib/nftoken-accounts';
import type { NftokenMetadataState } from '../model/use-nftoken-metadata';

// Values the Overview card and the card header (REVIEW(HOO-929)) both show.

const MUTABLE_TOOLTIP: Record<NftokenAccount['kind'], string> = {
    collection: 'The authority of this Collection can update the Metadata and add NFTs.',
    nft: 'The authority of this NFT can update the Metadata.',
};
const IMMUTABLE_TOOLTIP = 'The Metadata cannot be updated by anyone.';

/** "Mutable" or "Immutable" with what it means on hover; the header showed it as a badge before HOO-929. */
export function MutabilityHint({ kind, mutable }: { kind: NftokenAccount['kind']; mutable: boolean }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-help underline decoration-outer-space-500 decoration-dotted underline-offset-4">
                    {mutable ? 'Mutable' : 'Immutable'}
                </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">{mutable ? MUTABLE_TOOLTIP[kind] : IMMUTABLE_TOOLTIP}</TooltipContent>
        </Tooltip>
    );
}

/** The site from the metadata, which the header has already asked for. */
export function NftokenWebsite({ metadata }: { metadata: NftokenMetadataState }) {
    if (metadata.kind === 'loading') return <Skeleton className="inline-block h-4 w-32 align-middle" />;

    const url = metadata.kind === 'loaded' ? metadata.metadata.externalUrl : undefined;
    if (!url) return <span className="text-outer-space-300">—</span>;
    // Anyone can write the metadata: a URL that isn't http(s) stays plain text instead of a link.
    if (!getSafeExternalHref(url)) return <span className="break-all">{url}</span>;

    return (
        <ExternalLink href={url} className="break-all">
            {url}
            <ExternalLinkIcon className="ml-1.5 align-text-top" size={13} />
        </ExternalLink>
    );
}
