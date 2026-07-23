import { Address } from '@components/common/Address';
import { RawDataField } from '@components/shared/RawDataField';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/shared/ui/accordion';
import { Autocomplete, type Value } from '@components/shared/ui/autocomplete';
import { Badge } from '@components/shared/ui/badge';
import { Button } from '@components/shared/ui/button';
import { CollapsibleCard } from '@components/shared/ui/collapsible-card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@components/shared/ui/dialog';
// Legacy Bootstrap-style dropdown (self-managed open state). Aliased to avoid clashing with the Radix menu.
import { Dropdown, DropdownHeader, DropdownItem, DropdownMenu as LegacyDropdownMenu, DropdownToggle } from '@components/shared/ui/dropdown';
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@components/shared/ui/dropdown-menu';
import { ExternalLink } from '@components/shared/ui/external-link';
import { Input } from '@components/shared/ui/input';
import { Label } from '@components/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { Skeleton } from '@components/shared/ui/skeleton';
import { Slideover, SlideoverBody, SlideoverContent, SlideoverHeader, SlideoverTitle, SlideoverTrigger } from '@components/shared/ui/slideover';
import { Switch } from '@components/shared/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@components/shared/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/shared/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/shared/ui/tooltip';
import { nextjsParameters, withClusterAccountsAndTokenInfo } from '@storybook-config/decorators';
import type { Meta, StoryObj } from '@storybook-config/types';
import React, { useState } from 'react';
import { ChevronDown } from 'react-feather';
import { expect, within } from 'storybook/test';

import { FormControl } from '@/app/shared/ui/FormControl';
// Manual (uncontrolled) tab bar — the closest thing the repo has to a segmented control.
import { TabsContent as SegContent, TabsList as SegList, TabsTrigger as SegTrigger } from '@/app/shared/ui/Tabs';

import { ACCOUNT_ITEMS, EXTERNAL_URL, FEE_PAYER, PROGRAM_TAGS, RAW_INSTRUCTION_DATA, SOL_MINT, TOKEN_ROWS, TX_FACTS } from './mocks';
// The multi-primitive vertical-rhythm editor (palette + drag-and-drop + per-type offset tuning).
import { PrimitivesInspector } from './primitives-inspector';

// ---- layout helpers -------------------------------------------------------

function Cell({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4">
            <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted">{title}</span>
                {note && <span className="text-[11px] leading-tight text-muted/70">{note}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-3">{children}</div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col gap-4">
            <h2 className="m-0 text-sm font-normal uppercase tracking-wide text-muted">{title}</h2>
            {children}
        </section>
    );
}

// ---- the gallery ----------------------------------------------------------

function PrimitivesGallery() {
    const [switchOn, setSwitchOn] = useState(true);
    const [showMint, setShowMint] = useState(true);
    const [showOwner, setShowOwner] = useState(false);
    const [autoValue, setAutoValue] = useState<Value>('');
    const [segment, setSegment] = useState<'summary' | 'accounts' | 'logs'>('summary');

    return (
        <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-8 text-white">
            <header className="flex flex-col gap-1.5">
                <span className="text-xs font-normal uppercase text-muted">Design Slices</span>
                <h1 className="m-0 text-2xl font-normal leading-none md:text-3xl">Base components — alignment gallery</h1>
                <p className="m-0 max-w-2xl text-sm text-muted">
                    Every base primitive pulled into Storybook, fed with data from the real transaction. Use the
                    baseline-alignment row to work on how these components line up next to one another.
                </p>
            </header>

            {/* The core playground: the same set of inline primitives on three alignment baselines. */}
            <Section title="Baseline alignment playground">
                {(
                    [
                        ['items-baseline', 'align baseline'],
                        ['items-center', 'align center'],
                        ['items-end', 'align end'],
                    ] as const
                ).map(([align, caption]) => (
                    <div key={align} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-4">
                        <span className="text-[11px] uppercase tracking-wide text-muted">{caption}</span>
                        <div className={`flex flex-wrap gap-4 ${align}`}>
                            <Label htmlFor="pg-align">Fee payer</Label>
                            <Address pubkey={FEE_PAYER} link />
                            <Badge variant="success">{TX_FACTS.result}</Badge>
                            <Input id="pg-align" variant="dark" placeholder="Search…" className="w-40" />
                            <Button variant="outline" size="sm">Refresh</Button>
                            <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                            <ExternalLink href={EXTERNAL_URL}>Solscan</ExternalLink>
                        </div>
                    </div>
                ))}
            </Section>

            <Section title="Text & data primitives">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Cell title="Label">
                        <Label htmlFor="pg-l">Compute units</Label>
                        <span className="font-mono text-sm">{TX_FACTS.computeUnits.toLocaleString()}</span>
                    </Cell>
                    <Cell title="Address" note="app/components/common/Address">
                        <Address pubkey={FEE_PAYER} link />
                        <Address pubkey={SOL_MINT} link />
                    </Cell>
                    <Cell title="Badge (tags)" note="program & status tags">
                        <Badge variant="success">{TX_FACTS.result}</Badge>
                        {PROGRAM_TAGS.map(tag => (
                            <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                        <Badge variant="info">slot {TX_FACTS.slot}</Badge>
                        <Badge variant="warning">warning</Badge>
                        <Badge variant="destructive">error</Badge>
                    </Cell>
                    <Cell title="ExternalLink">
                        <ExternalLink href={EXTERNAL_URL}>View on Solscan</ExternalLink>
                    </Cell>
                    <Cell title="Raw data" note="instruction #3 bytes (real)">
                        <div className="w-full">
                            <RawDataField data={RAW_INSTRUCTION_DATA} filename="instruction-3" />
                        </div>
                    </Cell>
                    <Cell title="Skeleton">
                        <div className="flex w-full flex-col gap-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-4 w-64" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </Cell>
                </div>
            </Section>

            <Section title="Form controls">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Cell title="Input" note="default + dark variants">
                        <Input placeholder="Default" className="w-44" />
                        <Input variant="dark" placeholder="Dark" className="w-44" />
                    </Cell>
                    <Cell title="FormControl" note="styled wrapper (flush-auto)">
                        <FormControl variant="flush-auto" className="w-full font-mono text-white">
                            <textarea rows={2} defaultValue={`fee: ${TX_FACTS.feeLamports} lamports`} />
                        </FormControl>
                    </Cell>
                    <Cell title="Switch" note="default + lg">
                        <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
                        <Switch size="lg" checked={switchOn} onCheckedChange={setSwitchOn} />
                    </Cell>
                    <Cell title="Checkbox" note="no standalone primitive — DropdownMenuCheckboxItem / Switch are used">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Columns <ChevronDown size={14} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuCheckboxItem checked={showMint} onCheckedChange={setShowMint}>
                                    Show mint
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuCheckboxItem checked={showOwner} onCheckedChange={setShowOwner}>
                                    Show owner
                                </DropdownMenuCheckboxItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </Cell>
                    <Cell title="Autocomplete" note="transaction accounts">
                        <div className="w-full max-w-xs">
                            <Autocomplete
                                items={ACCOUNT_ITEMS}
                                value={autoValue}
                                onChange={setAutoValue}
                                inputProps={{ placeholder: 'Find an account…' }}
                            />
                        </div>
                    </Cell>
                </div>
            </Section>

            <Section title="Buttons">
                <Cell title="Button variants (ui=tw)">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="accent">Accent</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="link">Link</Button>
                </Cell>
                <Cell title="Button sizes">
                    <Button size="lg">Large</Button>
                    <Button size="default">Default</Button>
                    <Button size="sm">Small</Button>
                    <Button size="compact">Compact</Button>
                </Cell>
                <Cell title="RefreshButton">
                    <RefreshButton analyticsSection="primitives-gallery" onClick={() => undefined} />
                    <RefreshButton analyticsSection="primitives-gallery" fetching onClick={() => undefined} />
                </Cell>
            </Section>

            <Section title="Menus & overlays">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Cell title="Dropdown (legacy)">
                        <Dropdown>
                            <DropdownToggle asChild>
                                <Button variant="outline" size="sm">
                                    Cluster <ChevronDown size={14} />
                                </Button>
                            </DropdownToggle>
                            <LegacyDropdownMenu align="start">
                                <DropdownHeader>Cluster</DropdownHeader>
                                <DropdownItem>Mainnet Beta</DropdownItem>
                                <DropdownItem>Devnet</DropdownItem>
                                <DropdownItem>Testnet</DropdownItem>
                            </LegacyDropdownMenu>
                        </Dropdown>
                    </Cell>
                    <Cell title="DropdownMenu (Radix)">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    Actions <ChevronDown size={14} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuItem>Copy signature</DropdownMenuItem>
                                <DropdownMenuItem>Open in Solscan</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Report</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </Cell>
                    <Cell title="Tooltip">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="outline" size="sm">Hover me</Button>
                            </TooltipTrigger>
                            <TooltipContent>Fee: {TX_FACTS.feeLamports} lamports</TooltipContent>
                        </Tooltip>
                    </Cell>
                    <Cell title="Popover">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">Open popover</Button>
                            </PopoverTrigger>
                            <PopoverContent>
                                <div className="flex flex-col gap-1 text-sm">
                                    <span className="text-muted">Slot</span>
                                    <span className="font-mono">{TX_FACTS.slot}</span>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </Cell>
                    <Cell title="Dialog">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">Open dialog</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Transaction {TX_FACTS.result}</DialogTitle>
                                    <DialogDescription>Slot {TX_FACTS.slot} · fee {TX_FACTS.feeLamports} lamports</DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline" size="sm">Close</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </Cell>
                    <Cell title="Slideover">
                        <Slideover>
                            <SlideoverTrigger asChild>
                                <Button variant="outline" size="sm">Open slideover</Button>
                            </SlideoverTrigger>
                            <SlideoverContent>
                                <SlideoverHeader>
                                    <SlideoverTitle>Details</SlideoverTitle>
                                </SlideoverHeader>
                                <SlideoverBody>
                                    <p className="text-sm text-muted">Compute units: {TX_FACTS.computeUnits.toLocaleString()}</p>
                                </SlideoverBody>
                            </SlideoverContent>
                        </Slideover>
                    </Cell>
                </div>
            </Section>

            <Section title="Navigation & disclosure">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Cell title="Tabs (Radix, underline)">
                        <Tabs defaultValue="summary" className="w-full">
                            <TabsList>
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                                <TabsTrigger value="accounts">Accounts</TabsTrigger>
                                <TabsTrigger value="logs">Logs</TabsTrigger>
                            </TabsList>
                            <TabsContent value="summary">Summary content</TabsContent>
                            <TabsContent value="accounts">Accounts content</TabsContent>
                            <TabsContent value="logs">Logs content</TabsContent>
                        </Tabs>
                    </Cell>
                    <Cell title="Tabs (manual)" note="closest to a segmented control">
                        <div className="w-full">
                            <SegList>
                                <SegTrigger active={segment === 'summary'} onClick={() => setSegment('summary')}>
                                    Summary
                                </SegTrigger>
                                <SegTrigger active={segment === 'accounts'} onClick={() => setSegment('accounts')}>
                                    Accounts
                                </SegTrigger>
                                <SegTrigger active={segment === 'logs'} onClick={() => setSegment('logs')}>
                                    Logs
                                </SegTrigger>
                            </SegList>
                            <SegContent active={segment === 'summary'}>Summary content</SegContent>
                            <SegContent active={segment === 'accounts'}>Accounts content</SegContent>
                            <SegContent active={segment === 'logs'}>Logs content</SegContent>
                        </div>
                    </Cell>
                    <Cell title="Accordion">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="a">
                                <AccordionTrigger>Instruction #1</AccordionTrigger>
                                <AccordionContent>createIdempotent (associated-token-account)</AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="b">
                                <AccordionTrigger>Instruction #2</AccordionTrigger>
                                <AccordionContent>transfer (system)</AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Cell>
                    <Cell title="CollapsibleCard">
                        <div className="w-full">
                            <CollapsibleCard title="Overview">
                                <div className="text-sm text-muted">Slot {TX_FACTS.slot} · {TX_FACTS.result}</div>
                            </CollapsibleCard>
                        </div>
                    </Cell>
                </div>
            </Section>

            <Section title="Table">
                <Cell title="Table" note="post token balances">
                    <div className="w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account</TableHead>
                                    <TableHead>Mint</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Decimals</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {TOKEN_ROWS.map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="font-mono">{row.account}</TableCell>
                                        <TableCell className="font-mono">{row.mint}</TableCell>
                                        <TableCell>{row.amount}</TableCell>
                                        <TableCell>{row.decimals}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Cell>
            </Section>
        </div>
    );
}

const meta = {
    component: PrimitivesGallery,
    decorators: [withClusterAccountsAndTokenInfo],
    parameters: {
        ...nextjsParameters,
        layout: 'fullscreen',
    },
    title: 'Design Slices/PrimitivesGallery',
} satisfies Meta<typeof PrimitivesGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Interactive playground copied from the KeyLabel slice. A collapsible box-model inspector drives
 * the vertical-rhythm visualisation, laying out the whole Tailwind type scale per line-height and
 * overlaying each label's box-model layers.
 */
export const Playground: Story = {
    // Address / RawDataField inside the inspector's palette need cluster context (nextjsParameters +
    // the fullscreen layout come from meta); the wrapper gives the editor room to breathe.
    decorators: [
        Story => (
            <div className="flex min-h-96 w-full flex-col gap-8 p-8 text-white">
                <Story />
            </div>
        ),
        withClusterAccountsAndTokenInfo,
    ],
    parameters: { controls: { disable: true } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        expect(canvas.getByText('Inspector')).toBeInTheDocument();
    },
    render: () => <PrimitivesInspector />,
};
