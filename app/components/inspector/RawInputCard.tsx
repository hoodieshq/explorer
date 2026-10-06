import { getBase58Encoder } from '@solana/kit';
import { PublicKey, VersionedMessage } from '@solana/web3.js';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React from 'react';

import { Button } from '@/app/components/shared/ui/button';
import { cn } from '@/app/components/shared/utils';
import { Logger } from '@/app/shared/lib/logger';
import { MIN_MESSAGE_LENGTH, parseTransactionBytes } from '@/app/shared/lib/parse-transaction-bytes';
import { bridgeV1MessageBytes, isV1MessageBytes } from '@/app/shared/lib/v1-message-bridge';
import { BaseNavigationTabs } from '@/app/shared/ui/navigation-tabs/ui/BaseNavigationTabs';
import { TabsContent } from '@/app/shared/ui/Tabs';

import { BaseCodeExample } from './BaseCodeExample';
import { BaseInspectorInput } from './BaseInspectorInput';
import {
    ENCODING_PARAM,
    EXAMPLE_CLI_COMMAND,
    EXAMPLE_CLI_FOCUS,
    EXAMPLE_ENCODINGS,
    EXAMPLE_SQUADS_URL,
    EXAMPLE_SQUADS_VAULT_TRANSACTION,
    type ExampleEncoding,
    kitExample,
    parseExampleEncoding,
    RUST_ENCODING_CRATE,
    RUST_PRINT_LINE,
    rustExample,
    TS_PRINT_LINES,
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

function TabInstructions({
    encoding,
    onEncodingChange,
}: {
    encoding: ExampleEncoding;
    onEncodingChange: (encoding: ExampleEncoding) => void;
}) {
    const [activeTab, setActiveTab] = React.useState('cli');
    const rust = rustExample(encoding);
    const kit = kitExample(encoding);
    const ts = TS_PRINT_LINES[encoding];

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
                    encodingChoice={<EncodingChoice encoding={encoding} onEncodingChange={onEncodingChange} />}
                    instruction={
                        <>
                            Add <code className={INLINE_CODE}>{RUST_ENCODING_CRATE[encoding]}</code> crate dependency
                            and <code className={INLINE_CODE}>{RUST_PRINT_LINE[encoding]}</code>
                        </>
                    }
                    example={<BaseCodeExample language="rust" code={rust.code} focus={rust.focus} />}
                />
            ),
            id: 'rust',
            label: 'Rust',
        },
        {
            content: (
                <TabBody
                    encodingChoice={<EncodingChoice encoding={encoding} onEncodingChange={onEncodingChange} />}
                    instruction={
                        <SnippetGroup
                            // `@solana/web3.js` 2.x was renamed to `@solana/kit` with the same API, so one group covers both.
                            title={['@solana/kit', '@solana/web3.js 2.0.0 and later']}
                            rows={[
                                ['Transaction message:', ts.message],
                                ['Wire transaction:', ts.wire],
                            ]}
                        />
                    }
                    example={<BaseCodeExample language="typescript" code={kit.code} focus={kit.focus} />}
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
            <h2 className="m-0 mb-1 text-lg font-normal text-white">How to get the input for the field above</h2>
            {/* Styled as the account and block page tab bar, without the sticky behaviour; the underline stays
                within the content column at every width. */}
            <div className="border-0 border-b border-solid border-neutral-800">
                <BaseNavigationTabs
                    tabs={tabs.map(tab => ({ path: tab.id, title: tab.label }))}
                    activeValue={activeTab}
                    buildHref={id => `#${id}`}
                    onTabClick={id => setActiveTab(id)}
                    onSelectChange={setActiveTab}
                    className="gap-5"
                />
            </div>
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

// The same chips as the Parsed / RAW choice in the transaction Logs section, at the smaller `compact` size: the
// solid button with an accent border marks the chosen encoding, the outline button the other one.
function EncodingChoice({
    encoding,
    onEncodingChange,
}: {
    encoding: ExampleEncoding;
    onEncodingChange: (encoding: ExampleEncoding) => void;
}) {
    return (
        <div role="group" aria-label="Example encoding" className="flex gap-1">
            {EXAMPLE_ENCODINGS.map(value => (
                <Button
                    key={value}
                    variant={value === encoding ? 'default' : 'outline'}
                    size="compact"
                    aria-pressed={value === encoding}
                    className={cn(value === encoding && '!border-accent')}
                    onClick={() => onEncodingChange(value)}
                >
                    {value}
                </Button>
            ))}
        </div>
    );
}

function TabBody({
    encodingChoice,
    instruction,
    example,
}: {
    encodingChoice?: React.ReactNode;
    instruction: React.ReactNode;
    example: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-6 pt-5">
            {/* The encoding choice sits on its own row above the instruction, so the content keeps one left edge. */}
            {encodingChoice}
            <div className="text-sm leading-relaxed text-neutral-200">{instruction}</div>
            {example}
        </div>
    );
}

function SnippetGroup({
    title,
    rows,
}: {
    /** One entry per line. */
    title: string[];
    rows: [label: string, snippet: string][];
}) {
    return (
        <div className="flex flex-col gap-2">
            <div className="font-medium text-white">
                {title.map(line => (
                    <div key={line}>{line}</div>
                ))}
            </div>
            {/* Stacked on mobile: a snippet sits closer to its own label than to the next one. Side by side from
                `md`, rows align to the top; the label's `pt-0.5` matches the chip's margin so the first lines line up. */}
            <dl className="m-0 grid gap-x-4 md:grid-cols-[max-content_1fr] md:items-start md:gap-y-2">
                {rows.map(([label, snippet]) => (
                    <React.Fragment key={label}>
                        <dt className="mt-3 font-normal text-outer-space-300 first:mt-0 md:mt-0 md:pt-0.5">{label}</dt>
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

    // One encoding for every tab that offers the choice, so switching it in one tab switches the others.
    const encoding = parseExampleEncoding(currentSearchParams?.get(ENCODING_PARAM));
    const setEncoding = React.useCallback(
        (next: ExampleEncoding) => {
            const nextParams = new URLSearchParams(currentSearchParams?.toString());
            // base64 is the default, so it leaves the URL clean.
            if (next === 'base64') nextParams.delete(ENCODING_PARAM);
            else nextParams.set(ENCODING_PARAM, next);
            const queryString = nextParams.toString();
            router.replace(`${currentPathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
        },
        [currentPathname, currentSearchParams, router],
    );

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
            {/* pb-9 plus the layout's own gap leaves 60px above the footer. */}
            <section className="flex flex-col pb-9">
                <TabInstructions encoding={encoding} onEncodingChange={setEncoding} />
            </section>
        </>
    );
}
