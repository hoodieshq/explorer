import { getBase58Encoder } from '@solana/kit';
import { PublicKey, VersionedMessage } from '@solana/web3.js';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { Logger } from '@/app/shared/lib/logger';
import { MIN_MESSAGE_LENGTH, parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';
import { bridgeV1MessageBytes, isV1MessageBytes } from '@/app/shared/lib/v1-message-bridge';
import { TabsContent, TabsList, TabsTrigger } from '@/app/shared/ui/Tabs';

import { BaseCodeExample } from './BaseCodeExample';
import { BaseInspectorInput } from './BaseInspectorInput';
import {
    EXAMPLE_CLI_COMMAND,
    EXAMPLE_CLI_FOCUS,
    EXAMPLE_RUST_CODE,
    EXAMPLE_RUST_FOCUS,
    EXAMPLE_SQUADS_URL,
    EXAMPLE_SQUADS_VAULT_TRANSACTION,
    EXAMPLE_TYPESCRIPT_CODE,
    EXAMPLE_TYPESCRIPT_FOCUS,
} from './inspector-examples';
import type { InspectorData, TransactionData } from './InspectorPage';

const BASE58_ENCODER = getBase58Encoder();

export { MIN_MESSAGE_LENGTH };

function getTransactionDataFromUserSuppliedBytes(bytes: Uint8Array): TransactionData {
    const { messageBytes, signatures } = parseTransactionBytes(bytes);
    if (isV1MessageBytes(messageBytes)) {
        const { message, transactionConfig } = bridgeV1MessageBytes(messageBytes);
        return {
            message,
            rawMessage: messageBytes,
            transactionConfig,
            version: 1,
            ...(signatures ? { signatures } : undefined),
        };
    }
    const message = VersionedMessage.deserialize(messageBytes);
    return {
        message,
        rawMessage: messageBytes,
        ...(signatures ? { signatures } : undefined),
    };
}

function parseAccountAddresses(input: string): string[] {
    // Split by commas, newlines, or spaces and filter out empty strings
    return (
        input
            // eslint-disable-next-line no-restricted-syntax -- split by whitespace and comma delimiters
            .split(/[\s,]+/)
            .map(addr => addr.trim())
            .filter(addr => addr.length > 0)
    );
}

type TabData = {
    id: string;
    label: string;
    content: React.ReactNode;
};

// The global `code` chip colour matches the page background, so instruction chips get a lighter surface here.
// A chip that does not fit wraps inside itself as one multi-line chip: `inline-block` keeps a single box, and
// `overflow-wrap:anywhere` (as `InlineCode` in mcp-docs) breaks long tokens.
// `my-0.5` keeps chips on neighbouring lines from touching (a vertical margin grows an inline-block's line box).
const INLINE_CODE =
    'inline-block max-w-full rounded bg-heavy-metal-800 my-0.5 px-1.5 py-px align-middle text-neutral-100 [overflow-wrap:anywhere]';

function TabInstructions() {
    const [activeTab, setActiveTab] = React.useState('cli');

    const tabs: TabData[] = [
        {
            content: (
                <TabBody
                    instruction={
                        <>
                            Use <code className={INLINE_CODE}>--dump-transaction-message</code> flag
                        </>
                    }
                    example={<BaseCodeExample language="shell" code={EXAMPLE_CLI_COMMAND} focus={EXAMPLE_CLI_FOCUS} />}
                />
            ),
            id: 'cli',
            label: 'CLI',
        },
        {
            content: (
                <TabBody
                    instruction={
                        <>
                            Add <code className={INLINE_CODE}>base64</code> crate dependency and{' '}
                            <code className={INLINE_CODE}>
                                println!(&quot;{'{}'}&quot;, base64::encode(&transaction.message_data()));
                            </code>
                        </>
                    }
                    example={<BaseCodeExample language="rust" code={EXAMPLE_RUST_CODE} focus={EXAMPLE_RUST_FOCUS} />}
                />
            ),
            id: 'rust',
            label: 'Rust',
        },
        {
            content: (
                <TabBody
                    instruction={
                        <div className="flex flex-col gap-4">
                            <SnippetGroup
                                title="@solana/web3.js before 2.0.0"
                                rows={[
                                    ['Legacy Transaction:', 'console.log(tx.serializeMessage().toString("base64"));'],
                                    [
                                        'Versioned Transaction:',
                                        'console.log(Buffer.from(tx.serialize()).toString("base64"));',
                                    ],
                                ]}
                            />
                            <SnippetGroup
                                title="@solana/web3.js 2.0.0 and later"
                                rows={[['Legacy Transaction:', 'console.log(getBase64EncodedWireTransaction(tx));']]}
                            />
                        </div>
                    }
                    example={
                        <BaseCodeExample
                            language="typescript"
                            code={EXAMPLE_TYPESCRIPT_CODE}
                            focus={EXAMPLE_TYPESCRIPT_FOCUS}
                        />
                    }
                />
            ),
            id: 'ts',
            label: 'TypeScript',
        },
        {
            content: (
                <TabBody
                    instruction={
                        <>
                            Add <code className={INLINE_CODE}>vault_transaction</code> from{' '}
                            <code className={INLINE_CODE}>
                                https://app.squads.so/squads/&lt;squad_id&gt;/transactions/&lt;vault_transaction&gt;
                            </code>
                        </>
                    }
                    example={
                        <BaseCodeExample
                            language="url"
                            code={EXAMPLE_SQUADS_URL}
                            focus={EXAMPLE_SQUADS_VAULT_TRANSACTION}
                        />
                    }
                />
            ),
            id: 'squads',
            label: 'Squads',
        },
    ];

    return (
        <div>
            <TabsList>
                {tabs.map(tab => (
                    <TabsTrigger
                        key={tab.id}
                        active={activeTab === tab.id}
                        // master used `me-3 nav-link` (no nav-item margins): 0.75rem trailing gap only
                        className="ml-0 mr-3"
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>
            <div>
                {tabs.map(tab => (
                    <TabsContent key={tab.id} active={activeTab === tab.id}>
                        {tab.content}
                    </TabsContent>
                ))}
            </div>
        </div>
    );
}

function TabBody({ instruction, example }: { instruction: React.ReactNode; example: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-6 pt-5">
            <div className="text-sm leading-relaxed text-neutral-200">{instruction}</div>
            {example}
        </div>
    );
}

function SnippetGroup({ title, rows }: { title: string; rows: [label: string, snippet: string][] }) {
    return (
        <div className="flex flex-col gap-2">
            <div className="font-medium text-white">{title}</div>
            {/* Stacked on mobile: a snippet sits closer to its own label than to the next one. */}
            <dl className="m-0 grid gap-x-4 md:grid-cols-[11rem_1fr] md:items-baseline md:gap-y-2">
                {rows.map(([label, snippet]) => (
                    <React.Fragment key={label}>
                        <dt className="mt-3 font-normal text-outer-space-300 first:mt-0 md:mt-0">{label}</dt>
                        <dd className="m-0 mt-1 md:mt-0">
                            <code className={INLINE_CODE}>{snippet}</code>
                        </dd>
                    </React.Fragment>
                ))}
            </dl>
        </div>
    );
}

export function RawInput({
    value,
    setTransactionData,
}: {
    value?: string;
    setTransactionData: (param: InspectorData | undefined) => void;
}) {
    const rawInput = React.useRef<HTMLTextAreaElement>(null);
    const [error, setError] = React.useState<string>();
    const [rows, setRows] = React.useState(3);
    const [hasValue, setHasValue] = React.useState(false);
    const currentPathname = usePathname();
    const currentSearchParams = useSearchParams();
    const router = useRouter();

    const onInput = React.useCallback(() => {
        const input = rawInput.current?.value;
        setHasValue(Boolean(input));
        if (!input) {
            setError(undefined);
            return;
        }

        // Clear url params when input is detected
        if (currentSearchParams?.get('message')) {
            const nextQueryParams = new URLSearchParams(currentSearchParams?.toString());
            nextQueryParams.delete('message');
            const queryString = nextQueryParams.toString();
            router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
        } else if (currentSearchParams?.get('transaction')) {
            const nextQueryParams = new URLSearchParams(currentSearchParams?.toString());
            nextQueryParams.delete('transaction');
            const queryString = nextQueryParams.toString();
            router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
        }

        // Dynamically expand height based on input length
        setRows(Math.max(3, Math.min(10, Math.round(input.length / 150))));

        let buffer;
        // First try to parse as an account address
        try {
            const accounts = parseAccountAddresses(input);
            if (accounts.length > 0) {
                if (accounts.length > 1) {
                    setError('Please provide only one account address');
                    return;
                }

                // Necessary to validate the account address
                new PublicKey(accounts[0]);

                setTransactionData({ account: accounts[0] });
                setError(undefined);
                return;
            }
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        }

        try {
            // Try base58 decode, use result as Uint8Array
            buffer = new Uint8Array(BASE58_ENCODER.encode(input));
        } catch (_err) {
            // If base58 fails, try base64
            try {
                buffer = Uint8Array.from(atob(input), c => c.charCodeAt(0));
            } catch (err) {
                Logger.error(err);
                setError('Input must be base58/base64 encoded or a valid account address');
                return;
            }
        }

        try {
            if (buffer.length < MIN_MESSAGE_LENGTH) {
                throw new Error('Input is not long enough to be a valid transaction message.');
            }
            const transactionData = getTransactionDataFromUserSuppliedBytes(buffer);
            setTransactionData(transactionData);
            setError(undefined);
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        }
    }, [currentSearchParams, router, currentPathname, setTransactionData]);

    const clearInput = React.useCallback(() => {
        if (rawInput.current) {
            rawInput.current.value = '';
            setHasValue(false);
            setError(undefined);
            setTransactionData(undefined);
        }

        // Clear URL params if they exist
        if (currentSearchParams?.get('message') || currentSearchParams?.get('transaction')) {
            const nextQueryParams = new URLSearchParams(currentSearchParams?.toString());
            nextQueryParams.delete('message');
            nextQueryParams.delete('transaction');
            const queryString = nextQueryParams.toString();
            router.push(`${currentPathname}${queryString ? `?${queryString}` : ''}`);
        }
    }, [currentSearchParams, router, currentPathname, setTransactionData]);

    // The input is the only control on the empty inspector page, so it takes focus on mount.
    React.useEffect(() => {
        rawInput.current?.focus({ preventScroll: true });
    }, []);

    React.useEffect(() => {
        const input = rawInput.current;
        if (input && value) {
            input.value = value;
            onInput();
        }
    }, [value, onInput]);

    const placeholder = 'Paste a raw base58/base64 encoded transaction message or Squads vault transaction account';
    return (
        <>
            <BaseInspectorInput
                ref={rawInput}
                rows={rows}
                onInput={onInput}
                onClear={clearInput}
                hasValue={hasValue}
                error={error}
                placeholder={placeholder}
                name="tx-inspector-input"
            />
            <section className="flex flex-col gap-1">
                <h2 className="m-0 text-lg font-normal text-white">How to get the input for the field above</h2>
                <TabInstructions />
            </section>
        </>
    );
}
