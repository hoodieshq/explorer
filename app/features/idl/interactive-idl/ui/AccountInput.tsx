import { Badge } from '@/app/components/shared/ui/badge';
import { Input } from '@/app/components/shared/ui/input';
import { Label } from '@/app/components/shared/ui/label';

// import { WalletProvider } from '@/app/providers/wallet-provider';
import type { IdlAccount } from './types';

export function AccountInput({
    account,
    value,
    onChange,
}: {
    account: IdlAccount;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="e-space-y-2">
            <div className="e-flex e-items-center e-gap-2">
                <Label className="e-text-sm e-font-medium e-text-white">{account.name}</Label>
                <div className="e-flex e-gap-1">
                    {account.isMut && (
                        <Badge variant="transparent" size="sm" className="e-bg-[#1a1b1d] e-text-[#F4C744]">
                            writable
                        </Badge>
                    )}
                    {account.isSigner && (
                        <Badge variant="transparent" size="sm" className="e-bg-[#1a1b1d] e-text-[#14F195]">
                            signer
                        </Badge>
                    )}
                </div>
            </div>
            <Input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="Enter account address"
                className="e-border-[#2a2b2d] e-bg-[#1a1b1d] e-text-white placeholder:e-text-[#4a4b4d]"
            />
            {account.desc && <p className="e-text-xs e-text-[#8E9090]">{account.desc}</p>}
        </div>
    );
}
