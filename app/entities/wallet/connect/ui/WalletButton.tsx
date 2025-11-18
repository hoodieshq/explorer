'use client';
import './wallet-button.css';

import dynamic from 'next/dynamic';
import { ComponentProps } from 'react';

const BaseWalletMultiButton = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).BaseWalletMultiButton,
    {
        ssr: false,
    }
);

const LABELS = {
    'change-wallet': 'Change wallet',
    connecting: 'Connecting ...',
    copied: 'Copied',
    'copy-address': 'Copy address',
    disconnect: 'Disconnect',
    'has-wallet': 'Connect',
    'no-wallet': 'Select Wallet',
} as const;

export function WalletMultiButton({ children, ...props }: ComponentProps<'button'>) {
    return (
        <BaseWalletMultiButton labels={LABELS} {...props}>
            {children}
        </BaseWalletMultiButton>
    );
}
