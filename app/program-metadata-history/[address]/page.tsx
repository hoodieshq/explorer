import type { Metadata } from 'next/types';

import ProgramMetadataHistoryPageClient from './page-client';

type Props = Readonly<{
    params: Promise<{
        address: string;
    }>;
}>;

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { address } = await props.params;
    return {
        description: `View the full metadata change history for Solana program ${address}`,
        title: `Metadata History | ${address} | Solana`,
    };
}

export default async function ProgramMetadataHistoryPage(props: Props) {
    const { address } = await props.params;
    return <ProgramMetadataHistoryPageClient address={address} />;
}
