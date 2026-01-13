'use client';
import { getIdlVersion, type SupportedIdl, useAnchorProgram } from '@entities/idl';
import { useProgramMetadataIdl } from '@entities/program-metadata';
import { useCluster } from '@providers/cluster';
import { Badge } from '@shared/ui/badge';
import { cn } from '@shared/utils';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Copy } from 'react-feather';

import { IdlVariant, useIdlLastTransactionDate } from '../model/use-idl-last-transaction-date';
import { IdlSection } from './IdlSection';

type IdlTab = {
    id: IdlVariant;
    idl: SupportedIdl;
    title: string;
    badge: string;
};

export function IdlCard({ programId }: { programId: string }) {
    const { url, cluster } = useCluster();
    const { idl } = useAnchorProgram(programId, url, cluster);
    const { programMetadataIdl } = useProgramMetadataIdl(programId, url, cluster);
    const [activeTabIndex, setActiveTabIndex] = useState<number>();
    const [searchStr, setSearchStr] = useState<string>('');

    const preferredIdlVariant = useIdlLastTransactionDate(programId, Boolean(idl), Boolean(programMetadataIdl));

    const tabs = useMemo<IdlTab[]>(() => {
        const idlTabs: IdlTab[] = [];

        // Add pmpTab first (default)
        if (programMetadataIdl) {
            idlTabs.push({
                badge: 'Program Metadata IDL',
                id: IdlVariant.ProgramMetadata,
                idl: programMetadataIdl,
                title: 'Program Metadata',
            });
        }

        // Optionally add anchor tab
        if (idl) {
            const anchorTab: IdlTab = {
                badge: 'Anchor IDL',
                id: IdlVariant.Anchor,
                idl: idl,
                title: 'Anchor',
            };
            // If anchor is preferred, put it first
            if (preferredIdlVariant === IdlVariant.Anchor) {
                idlTabs.unshift(anchorTab);
            } else {
                idlTabs.push(anchorTab);
            }
        }

        return idlTabs;
    }, [idl, programMetadataIdl, preferredIdlVariant]);

    useEffect(() => {
        // Activate first tab when tabs are available
        if (tabs.length > 0 && activeTabIndex === undefined) {
            setActiveTabIndex(0);
        }
    }, [tabs, activeTabIndex]);

    if (tabs.length === 0 || activeTabIndex === undefined) {
        return (
            <div className="card">
                <div className="card-header">
                    <h4 className="card-header-title">Program IDL</h4>
                </div>
                <div className="card-body">
                    <div className="e-mb-6 e-flex e-items-center e-gap-2 e-text-destructive">
                        <AlertTriangle size={16} />
                        <span>
                            This program doesn&apos;t have an IDL yet. If you&apos;re the developer, upload it using the
                            instructions below.
                        </span>
                    </div>

                    <div className="e-space-y-6">
                        <IdlInstructionSection
                            title="Create & manage IDL buffer"
                            description="First create a buffer from an IDL JSON file and then transfer authority of that buffer to a new Solana wallet/account"
                            commands={[
                                'npx @solana-program/program-metadata create-buffer ./target/idl/let_me_buy.json',
                                `npx @solana-program/program-metadata set-buffer-authority \\
  --buffer $BUFFER_ACCOUNT \\
  --new-authority $NEW_AUTHORITY_WALLET`,
                            ]}
                        />

                        <IdlInstructionSection
                            title="Create on-chain IDL"
                            description="They use the buffer to either create or update the IDL (Interface Definition Language) on-chain for a specific Solana program"
                            commands={[
                                `npx @solana-program/program-metadata create idl $PROGRAM_ID \\
  --buffer $BUFFER_ACCOUNT \\
  --export $AUTHORITY_WALLET \\
  --export-encoding base58`,
                            ]}
                        />

                        <IdlInstructionSection
                            title="Update on-chain IDL if it already exists"
                            description="They use the buffer to either create or update the IDL (Interface Definition Language) on-chain for a specific Solana program"
                            commands={[
                                `npx @solana-program/program-metadata update idl $PROGRAM_ID \\
  --buffer $BUFFER_ACCOUNT \\
  --export $AUTHORITY_WALLET \\
  --export-encoding base58`,
                            ]}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const activeTab = tabs[activeTabIndex];
    return (
        <div className="card">
            <div className="card-header">
                <div className="nav nav-tabs e-border-0" role="tablist">
                    {tabs
                        .filter(tab => tab.idl)
                        .map(tab => (
                            <button
                                key={tab.title}
                                className={cn('nav-item nav-link', {
                                    active: tab.id === activeTab?.id,
                                })}
                                onClick={() => {
                                    setActiveTabIndex(tabs.findIndex(t => t.id === tab.id));
                                    setSearchStr('');
                                }}
                            >
                                {tab.title}
                            </button>
                        ))}
                </div>
            </div>
            <div className="card-body">
                <IdlSection
                    badge={
                        <Badge
                            size="xs"
                            variant={getIdlVersion(activeTab.idl) === 'Legacy' ? 'destructive' : 'success'}
                        >
                            {getIdlVersion(activeTab.idl)} {activeTab.badge}
                        </Badge>
                    }
                    idl={activeTab.idl}
                    programId={programId}
                    searchStr={searchStr}
                    onSearchChange={setSearchStr}
                />
            </div>
        </div>
    );
}

type IdlInstructionSectionProps = {
    title: string;
    description: string;
    commands: string[];
};

function IdlInstructionSection({ title, description, commands }: IdlInstructionSectionProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const allCommands = commands.join('\n');
        navigator.clipboard.writeText(allCommands);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="card">
            <div className="card-body e-flex e-items-start e-justify-between e-space-x-2 e-px-3 e-py-2">
                <div>
                    <h5 className="e-mb-1 e-text-sm e-font-semibold">{title}</h5>
                    <p className="e-mb-3 e-text-xs e-text-gray-500">{description}</p>
                    <div>
                        {commands.map((command, index) => (
                            <div key={index} className="e-font-mono e-text-xs">
                                <pre className="e-whitespace-pre-wrap e-bg-transparent e-p-0 e-text-green-400">
                                    <span>&gt; </span>
                                    {command}
                                </pre>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleCopy}
                    type="button"
                    className="btn btn-white btn-sm e-flex-shrink-0"
                    aria-label={'Copy'}
                    aria-pressed={true}
                >
                    {copied ? (
                        <span className="e-text-green-400">Copied</span>
                    ) : (
                        <>
                            <Copy size={16} /> Copy
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
