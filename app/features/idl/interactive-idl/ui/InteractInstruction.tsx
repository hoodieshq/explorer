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
import { AccountInput } from './AccountInput';
import { ArgumentInput } from './ArgumentInput';
import { InstructionHeader } from './InstructionHeader';

export type InstructionCallParams = {
    accounts: Record<string, string>;
    arguments: Record<string, string>;
};

export function InteractInstruction({
    selectedInstruction,
    instruction,
    onExecuteInstruciton,
}: {
    onExecuteInstruciton: (name: InstructionData['name'], data: InstructionData, params: InstructionCallParams) => void;
    instruction: InstructionData;
}) {
    const { connected: walletConnected } = useWallet();

    const [, setSelectedInstruction] = useState<string | undefined>();

    const [accountValues, setAccountValues] = useState<Record<string, string>>({});
    const [argValues, setArgValues] = useState<Record<string, string>>({});

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
        <Card key={instruction.name}>
            <AccordionItem
                value={instruction.name}
                className="e-overflow-hidden e-rounded-lg e-border e-border-[#1e2423]"
            >
                <AccordionTrigger
                    className="e-bg-[#0a0b0d] e-px-4 e-py-3 e-transition-colors hover:e-bg-[#1a1b1d]"
                    onClick={() => handleInstructionSelect(instruction.name)}
                >
                    <InstructionHeader instruction={instruction} />
                </AccordionTrigger>

                <AccordionContent className="e-bg-[#0a0b0d] e-px-4 e-py-4">
                    {/* Instruction Documentation */}
                    {instruction.docs && instruction.docs.length > 0 && (
                        <div className="e-mb-4 e-rounded-lg e-bg-[#1a1b1d] e-p-3">
                            <p className="e-text-xs e-text-[#8E9090]">{instruction.docs.join(' ')}</p>
                        </div>
                    )}

                    {/* Accounts Section */}
                    {instruction.accounts.length > 0 && (
                        <div className="e-mb-6">
                            <h3 className="e-mb-3 e-text-sm e-font-semibold e-text-white">Accounts</h3>
                            <div className="e-space-y-3">
                                {instruction.accounts.map(account => (
                                    <AccountInput
                                        key={account.name}
                                        account={account}
                                        value={accountValues[`${instruction.name}.${account.name}`] || ''}
                                        onChange={value => handleAccountChange(instruction.name, account.name, value)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Arguments Section */}
                    {instruction.args.length > 0 && (
                        <div className="e-mb-6">
                            <h3 className="e-mb-3 e-text-sm e-font-semibold e-text-white">Arguments</h3>
                            <div className="e-space-y-3">
                                {instruction.args.map(arg => (
                                    <ArgumentInput
                                        key={arg.name}
                                        arg={arg}
                                        value={argValues[`${instruction.name}.${arg.name}`] || ''}
                                        onChange={value => handleArgChange(instruction.name, arg.name, value)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Execute Button */}
                    <Button
                        className="e-w-full e-bg-[#14F195] e-font-semibold e-text-black hover:e-bg-[#0fd180]"
                        onClick={() =>
                            onExecuteInstruciton?.(instruction.name, instruction, {
                                accounts: accountValues,
                                arguments: argValues,
                            })
                        }
                        disabled={!walletConnected}
                    >
                        <Send size={16} className="e-mr-2" />
                        Execute Instruction
                    </Button>
                </AccordionContent>
            </AccordionItem>
        </Card>
    );
}
