import '../../styles.css';

import { SignatureProps } from '@utils/index';
import { Metadata } from 'next/types';
import React from 'react';

import TransactionDetailsPageClient from './page-client';

type Props = Readonly<{
    params: SignatureProps;
    searchParams: Record<string, string | string[] | undefined>;
}>;

/// Receipt feature require BASE_URL to be set
const RECEIPT_BASE_URL = process.env.RECEIPT_BASE_URL ?? '';

export async function generateMetadata({ params: { signature }, searchParams }: Props): Promise<Metadata> {
    const isReceiptView = searchParams.view === 'receipt';

    if (isReceiptView) {
        const title = `Receipt | ${signature.slice(0, 16)}... | Solana`;
        const description = `Transaction receipt for ${signature} on Solana blockchain`;

        const baseUrl = RECEIPT_BASE_URL.trim();
        const ogImageUrl = `${baseUrl}/api/og/receipt/${signature}`;
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
