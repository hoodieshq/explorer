import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/shared/ui/accordion';
import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import { ChevronDown, Globe, Send, Terminal } from 'react-feather';

// import type { InstructionData } from '../../../formatted-idl/formatters/FormattedIdl';
import type { InstructionData } from '@/app/components/account/idl/formatted-idl/formatters/FormattedIdl';
import { Badge } from '@/app/components/shared/ui/badge';
import { Button } from '@/app/components/shared/ui/button';
import { Card } from '@/app/components/shared/ui/card';
import { Input } from '@/app/components/shared/ui/input';
import { Label } from '@/app/components/shared/ui/label';
import { useClusterModal } from '@/app/providers/cluster';

// import { WalletProvider } from '@/app/providers/wallet-provider';
import type { IdlArg } from './types';

export function ArgumentInput({
    arg,
    value,
    onChange,
}: {
    arg: IdlArg;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div className="e-space-y-2">
            <div className="e-flex e-items-center e-gap-2">
                <Label className="e-text-sm e-font-medium e-text-white">{arg.name}</Label>
                <Badge variant="transparent" size="sm" className="e-bg-[#1a1b1d] e-text-[#8E9090]">
                    {arg.type}
                </Badge>
            </div>
            <Input
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={`Enter ${arg.type} value`}
                className="e-border-[#2a2b2d] e-bg-[#1a1b1d] e-text-white placeholder:e-text-[#4a4b4d]"
            />
            {arg.desc && <p className="e-text-xs e-text-[#8E9090]">{arg.desc}</p>}
        </div>
    );
}
