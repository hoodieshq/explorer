'use client';

// Reuse note: production dispatch is in `app/address/[address]/layout.tsx`
// (`RenderComponentByOwnerAddress`). This dispatcher only knows about the
// thumbnails worth a custom layout right now (spl-token mint, upgradeable
// program); everything else falls back to a generic JSON-dump card.

import { useAccountThumbnailData } from '../model/use-account-thumbnail-data';
import { GenericAccountThumbnail } from './GenericAccountThumbnail';
import { ThumbnailShell } from './shell';
import { ThumbnailSkeleton } from './ThumbnailSkeleton';
import { isTokenMint, TokenMintThumbnail } from './TokenMintThumbnail';
import { isUpgradeableProgram, UpgradeableProgramThumbnail } from './UpgradeableProgramThumbnail';

export function AccountThumbnail({ address }: { address: string }) {
    const { data, error, isLoading } = useAccountThumbnailData(address);

    if (isLoading) {
        return <ThumbnailSkeleton />;
    }

    if (error) {
        return (
            <ThumbnailShell title="Error" tone="danger">
                {error instanceof Error ? error.message : String(error)}
            </ThumbnailShell>
        );
    }

    if (!data) {
        return <ThumbnailSkeleton />;
    }

    if (isTokenMint(data)) {
        return <TokenMintThumbnail data={data} />;
    }

    if (isUpgradeableProgram(data)) {
        return <UpgradeableProgramThumbnail data={data} />;
    }

    return <GenericAccountThumbnail data={data} />;
}
