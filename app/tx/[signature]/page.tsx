import '../../styles.css';

import { SignatureProps } from '@utils/index';
import { Metadata } from 'next/types';
import React from 'react';

import TransactionDetailsPageClient from './page-client';

type Props = Readonly<{
    params: SignatureProps;
    searchParams: Record<string, string | string[] | undefined>;
}>;

export async function generateMetadata({ params: { signature }, searchParams }: Props): Promise<Metadata> {
    const isReceiptView = searchParams.view === 'receipt';

    if (isReceiptView) {
        const title = `Receipt | ${signature.slice(0, 16)}... | Solana`;
        const description = `Transaction receipt for ${signature} on Solana blockchain`;

        const ogImageParams = new URLSearchParams();

        if (searchParams.sender) ogImageParams.set('sender', searchParams.sender as string);
        if (searchParams.receiver) ogImageParams.set('receiver', searchParams.receiver as string);
        if (searchParams.date) ogImageParams.set('date', searchParams.date as string);
        if (searchParams.memo) ogImageParams.set('memo', searchParams.memo as string);
        if (searchParams.transfers) ogImageParams.set('transfers', searchParams.transfers as string);
        if (searchParams.instructions) ogImageParams.set('instructions', searchParams.instructions as string);

        const ogImageUrl = `/api/og/receipt?${ogImageParams.toString()}`;

        return {
            description,
            openGraph: {
                description,
                images: [
                    {
                        alt: 'Solana Transaction Receipt',
                        height: 630,
                        url: ogImageUrl,
                        width: 1200,
                    },
                ],
                title,
                type: 'website',
            },
            title,
            twitter: {
                card: 'summary_large_image',
                description,
                images: [ogImageUrl],
                title,
            },
        };
    }

    return {
        description: `Details of the Solana transaction with signature ${signature}`,
        title: `Transaction | ${signature} | Solana`,
    };
}

export default function TransactionDetailsPage(props: Props) {
    return <TransactionDetailsPageClient {...props} />;
}
