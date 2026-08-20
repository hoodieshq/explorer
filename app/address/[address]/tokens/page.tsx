import { OwnedTokensCard } from '@components/account/OwnedTokensCard';
import { TokenHistoryCard } from '@components/account/TokenHistoryCard';
import getReadableTitleFromAddress, { AddressPageMetadataProps } from '@utils/get-readable-title-from-address';
import { Metadata } from 'next/types';

import { TransactionsProvider } from '@/app/providers/transactions';
import { DSCOMMON_BETWEEN_BLOCKS } from '@/app/shared/ui/page-spacing/spacing';

type Props = Readonly<{
    params: Promise<{
        address: string;
    }>;
}>;

export async function generateMetadata(props: AddressPageMetadataProps): Promise<Metadata> {
    const { address } = await props.params;
    return {
        description: `All tokens owned by the address ${address} on Solana`,
        title: `Tokens | ${await getReadableTitleFromAddress(props)} | Solana`,
    };
}

export default async function OwnedTokensPage(props: Props) {
    const { address } = await props.params;

    return (
        <TransactionsProvider>
            {/* Match the block/transaction pages: token blocks are separated by the shared
                between-blocks spacing token (the layout only spaces the tab bar from the first block). */}
            <div className={DSCOMMON_BETWEEN_BLOCKS.className}>
                <OwnedTokensCard address={address} layout="grid" />
                <TokenHistoryCard address={address} layout="grid" />
            </div>
        </TransactionsProvider>
    );
}
