import type { Metadata } from 'next/types';

import AnchorIdlHistoryPageClient from './page-client';

type Props = Readonly<{
    params: Promise<{
        address: string;
    }>;
}>;

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { address } = await props.params;
    return {
        description: `View the Anchor IDL change history for Solana program ${address}`,
        title: `Anchor IDL History | ${address} | Solana`,
    };
}

export default async function AnchorIdlHistoryPage(props: Props) {
    const { address } = await props.params;
    return <AnchorIdlHistoryPageClient address={address} />;
}
