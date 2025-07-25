import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useState } from 'react';
import { Globe, Terminal } from 'react-feather';

// import type { InstructionData } from '../../../formatted-idl/formatters/FormattedIdl';
import type { InstructionData } from '@/app/components/account/idl/formatted-idl/formatters/FormattedIdl';
import { Button } from '@/app/components/shared/ui/button';
import { Card } from '@/app/components/shared/ui/card';
import { useClusterModal } from '@/app/providers/cluster';

import { InteractInstructions } from './InteractInstructions';
// import { WalletProvider } from '@/app/providers/wallet-provider';
import { WalletConnection } from './WalletConnection';

// !!!
// FIXME(rogaldh): fix type
// interface IdlInstruction {
//     name: string;
//     accounts: IdlAccount[];
//     args: IdlArg[];
//     docs?: string[];
// }

export function InteractWithIdlView({
    instructions,
    idl,
    programId,
    cluster = 'mainnet-beta',
    onClusterSelect,
    onWalletConnect,
    onSendTransaction,
    logs = [],
}: {
    instructions: InstructionData[];
    idl: Idl;
    programId: string;
    cluster?: string;
    onClusterSelect?: () => void;
    onWalletConnect?: () => void;
    onSendTransaction?: (instruction: string, data: any) => void;
    logs?: string[];
}) {
    const [, setClusterModalShow] = useClusterModal();
    const { connected: walletConnected, connecting, connect } = useWallet();

    const [selectedInstruction, setSelectedInstruction] = useState<string | undefined>();
    const [accountValues, setAccountValues] = useState<Record<string, string>>({});
    const [argValues, setArgValues] = useState<Record<string, string>>({});

    console.log({ connect, connecting, walletConnected });

    const handleInstructionSelect = useCallback(
        (instructionName: string) => {
            setSelectedInstruction(instructionName === selectedInstruction ? undefined : instructionName);
        },
        [selectedInstruction]
    );

    const handleAccountChange = useCallback((instructionName: string, accountName: string, value: string) => {
        setAccountValues(prev => ({
            ...prev,
            [`${instructionName}.${accountName}`]: value,
        }));
    }, []);

    const handleArgChange = useCallback((instructionName: string, argName: string, value: string) => {
        setArgValues(prev => ({
            ...prev,
            [`${instructionName}.${argName}`]: value,
        }));
    }, []);

    return (
        <div className="e-container e-mx-auto e-px-4">
            {/* Main Grid Layout - responsive */}
            <div className="e-grid e-gap-6 lg:e-grid-cols-12">
                {/* Left Column - Instructions */}
                <div className="lg:e-col-span-8 xl:e-col-span-9">
                    <InteractInstructions instructions={instructions} />
                </div>

                {/* Right Column - Controls & Logs */}
                <div className="lg:e-col-span-4 xl:e-col-span-3">
                    <div className="e-sticky e-top-4 e-space-y-4">
                        {/* Cluster Selector */}
                        <Card className="e-border-[#1e2423] e-bg-[#0a0b0d] e-p-4">
                            <div className="e-flex e-items-center e-justify-between">
                                <div>
                                    <p className="e-text-xs e-text-[#8E9090]">Current Cluster</p>
                                    <p className="e-text-sm e-font-semibold e-text-white">{cluster}</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setClusterModalShow(true)}
                                    className="e-border-[#1e2423] hover:e-bg-[#1a1b1d]"
                                >
                                    <Globe size={14} className="e-mr-1" />
                                    Change
                                </Button>
                            </div>
                        </Card>

                        {/* Wallet Connection */}
                        <WalletConnection walletConnected={walletConnected} />

                        {/* Transaction Logs */}
                        <Card className="e-border-[#1e2423] e-bg-[#0a0b0d] e-p-4">
                            <div className="e-mb-3 e-flex e-items-center">
                                <Terminal size={16} className="e-mr-2 e-text-[#14F195]" />
                                <h3 className="e-text-sm e-font-semibold e-text-white">Transaction Logs</h3>
                            </div>
                            <div className="e-max-h-64 e-overflow-y-auto e-rounded-lg e-bg-[#1a1b1d] e-p-3">
                                {logs.length > 0 ? (
                                    <div className="e-space-y-1">
                                        {logs.map((log, index) => (
                                            <p key={index} className="e-font-mono e-text-xs e-text-[#8E9090]">
                                                {log}
                                            </p>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="e-text-xs e-italic e-text-[#8E9090]">No logs yet</p>
                                )}
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
