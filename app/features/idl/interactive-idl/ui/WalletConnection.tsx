import { Card } from '@/app/components/shared/ui/card';
import { WalletMultiButton } from '@/app/entities/wallet/connect/ui/WalletButton';

export function WalletConnection({ walletConnected }: { walletConnected: boolean }) {
    return (
        <Card className="e-border-[#1e2423] e-bg-[#0a0b0d] e-p-4">
            <div className="e-flex e-items-center e-justify-between">
                <div>
                    <p className="e-text-xs e-text-[#8E9090]">Wallet</p>
                    <p className="e-text-sm e-font-semibold e-text-white">
                        {walletConnected ? 'Connected' : 'Not Connected'}
                    </p>
                </div>
                <WalletMultiButton />
            </div>
        </Card>
    );
}
