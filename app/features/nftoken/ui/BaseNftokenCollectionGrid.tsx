import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { pluralWord } from '@utils/index';
import { Children, type ReactElement } from 'react';

export function BaseNftokenCollectionGrid({
    onRefresh,
    refreshing,
    refreshFailed,
    tiles,
    undecodableCount,
}: {
    onRefresh: () => void;
    refreshing: boolean;
    refreshFailed?: boolean;
    tiles: ReactElement[];
    undecodableCount: number;
}) {
    return (
        <CollapsibleSection
            title="NFTs"
            className=""
            actions={
                <RefreshButton
                    analyticsSection="nft_token_collection_grid"
                    fetching={refreshing}
                    failed={refreshFailed}
                    onClick={onRefresh}
                />
            }
        >
            <div className="flex flex-col gap-4">
                {tiles.length > 0 && (
                    // Two columns on a phone, more as the row widens; every card gets the same width.
                    <ul
                        aria-label="NFTs"
                        className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-1.5 p-0 sm:gap-3"
                    >
                        {Children.map(tiles, tile => (
                            <li>{tile}</li>
                        ))}
                    </ul>
                )}
                {tiles.length === 0 && undecodableCount === 0 && <p className={NOTE_CLASSES}>No NFTs Found</p>}
                {undecodableCount > 0 && (
                    <p className={NOTE_CLASSES}>
                        {`${undecodableCount} NFT ${pluralWord(undecodableCount, 'account')} in this collection could not be decoded.`}
                    </p>
                )}
            </div>
        </CollapsibleSection>
    );
}

const NOTE_CLASSES = 'm-0 text-sm text-outer-space-300';
