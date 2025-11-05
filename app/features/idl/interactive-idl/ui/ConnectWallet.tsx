import { useWalletMultiButton } from '@solana/wallet-adapter-base-ui';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useEffect, useState } from 'react';

import { BaseConnectWallet } from './BaseConnectWallet';

export function ConnectWallet() {
    const { wallet, connect, disconnect, connected, connecting, publicKey } = useWallet();
    const { setVisible: setModalVisible } = useWalletModal();
    const { buttonState } = useWalletMultiButton({
        onSelectWallet() {
            setModalVisible(true);
        },
    });
    const { connection } = useConnection();
    const { setVisible } = useWalletModal();
    const [balance, setBalance] = useState<number>();

    const handleConnect = () => {
        if (connected) {
            disconnect();
        } else if (wallet) {
            connect().catch(() => {});
        } else {
            setVisible(true);
        }
    };

    const walletAddress = publicKey?.toBase58();

    useEffect(() => {
        if (!connected || !publicKey) {
            setBalance(undefined);
            return;
        }

        const fetchBalance = async () => {
            try {
                const lamports = await connection.getBalance(publicKey);
                setBalance(lamports / LAMPORTS_PER_SOL);
            } catch (error) {
                console.error('Failed to fetch wallet balance:', error);
                setBalance(undefined);
            }
        };

        fetchBalance();
    }, [connected, publicKey, connection]);

    return (
        <>
            <BaseConnectWallet
                connected={connected}
                connecting={connecting}
                onConnect={handleConnect}
                onDisconnect={handleConnect}
                address={walletAddress}
                disabled={connecting}
                buttonState={buttonState}
            />
            {/*TODO: remove upon finishing the feature*/}
            {/*<WalletMultiButton />*/}
        </>
    );
}
