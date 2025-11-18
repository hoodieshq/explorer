'use client';

// import wallet styles to not redeclare every style
import '@solana/wallet-adapter-react-ui/styles.css';

import { WalletError } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider as WalletAdapterProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { ComponentProps, FC, PropsWithChildren, useCallback, useMemo } from 'react';

import { useToast } from '@/app/components/shared/ui/sonner/use-toast';
import { useCluster } from '@/app/providers/cluster';
import { clusterUrl } from '@/app/utils/cluster';

export const WalletProvider: FC<
    Pick<ComponentProps<typeof WalletAdapterProvider>, 'autoConnect'> &
        PropsWithChildren & {
            skipToast?: boolean;
        }
> = ({ children, autoConnect, skipToast = false }) => {
    const { cluster, customUrl } = useCluster();
    const endpoint = useMemo(() => clusterUrl(cluster, customUrl), [cluster, customUrl]);
    const toast = useToast();

    const onError = useCallback(
        (error: WalletError) => {
            if (!skipToast) {
                toast.brand({ description: error.message, title: 'Wallet Error', type: 'error' });
            }
        },
        [toast, skipToast]
    );

    // use empty array to allow detect wallets automatially
    const wallets = useMemo(() => [], []);

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletAdapterProvider wallets={wallets} onError={onError} autoConnect={autoConnect}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletAdapterProvider>
        </ConnectionProvider>
    );
};
