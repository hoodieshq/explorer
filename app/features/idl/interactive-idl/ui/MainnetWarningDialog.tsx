import { Address } from '@components/common/Address';
import { Button } from '@components/shared/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@components/shared/ui/dialog';
import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import { BaseDisplayFields, BaseIntentSentence } from '@entities/idl';
import { KeyValue } from '@shared/ui/key-value';
import { PublicKey } from '@solana/web3.js';
import { cva } from 'class-variance-authority';
import { useId, useState } from 'react';
import { AlertTriangle, ChevronDown, Send } from 'react-feather';

import type { MainnetSummary } from '../model/display/use-mainnet-summary';

// The RPC consent dialog's box from the main-navigation task: the cluster menu's ground and edge, roomier
// padding, room above the title for the close mark. The whole box is one scroll (title and buttons included,
// nothing pinned), and the same dialog serves phones. `!`: the shared DialogContent sets its own box, and
// this dialog does not change the shared component.
const CONTENT = cn(
    '!max-w-md !gap-3 !border-outer-space-800 !bg-outer-space-900 !p-5 !pt-6 max-h-[calc(100dvh-2rem)] overflow-y-auto',
    // The close mark as the navigation branch sets it: a 24px target, an 18px mark, equally inset from the
    // top and the side. Reached through the box, since the shell renders the mark itself as its last child.
    '[&>button:last-child]:!right-3.5 [&>button:last-child]:!top-3.5',
    '[&>button:last-child]:!h-6 [&>button:last-child]:!w-6',
    '[&>button:last-child>svg]:!h-[18px] [&>button:last-child>svg]:!w-[18px]',
);

// The field labels ("Nonce Authority", "Token Account") wrap in the shared KeyValue column at this width, so the
// column is 40px wider here.
const FIELD_LABEL_WIDTH = 'w-[clamp(124px,calc(20%_+_40px),280px)]';

// Same reveal as the Accounts table rows and the transaction read-out.
const fieldsRevealVariants = cva('grid transition-[grid-template-rows,opacity] duration-200 ease-in-out', {
    variants: { open: { false: 'grid-rows-[0fr] opacity-0', true: 'grid-rows-[1fr] opacity-100' } },
});

type MainnetWarningDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    onCancel: () => void;
    /** What is about to be signed. Absent or unavailable: the plain warning, which never disappears. */
    summary?: MainnetSummary;
};

/**
 * "Spend real funds?" before a mainnet execution. With intent metadata it shows what will be signed and
 * asks the user to check the wallet shows the same — the one habit clear signing depends on. Confirm stays
 * locked until those details load.
 */
export function MainnetWarningDialog({ open, onOpenChange, onConfirm, onCancel, summary }: MainnetWarningDialogProps) {
    const shown = summary?.status === 'loading' || summary?.status === 'resolved' ? summary : undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={CONTENT}>
                <DialogHeader className="!space-y-0 !text-left">
                    {/* The app's danger colour, as the RPC consent dialog and a failed cluster connection use. */}
                    <DialogTitle className="!text-xl !font-medium !leading-snug !text-dk-danger">
                        <AlertTriangle size={24} aria-hidden className="mr-2 inline-block align-[-0.2em]" />
                        Spend real funds?
                    </DialogTitle>
                </DialogHeader>
                <div className="mb-2 flex flex-col gap-3 text-left">
                    {/* The title already says what is at stake, so the text says only the check to make. */}
                    <div className="flex flex-col gap-1">
                        <DialogDescription className="m-0 !text-[13px] leading-relaxed !text-white">
                            {shown ? (
                                <>
                                    Your wallet opens next. It should show the same instruction. If it doesn&apos;t,
                                    reject it there.
                                </>
                            ) : (
                                // With no intent to compare against, the wallet check asks to read it there.
                                <>Your wallet opens next. Check the instruction there. If it looks wrong, reject it.</>
                            )}
                        </DialogDescription>
                        <p className="m-0 text-xs text-outer-space-300">
                            Beta feature, provided as is.{' '}
                            <a href="/tos" target="_blank" rel="noopener noreferrer">
                                Terms
                            </a>
                        </p>
                    </div>
                    {shown && <SummaryBody summary={shown} />}
                </div>
                <DialogFooter className="!flex-row !items-center !justify-start gap-2 sm:!space-x-0">
                    <Button
                        size="lg"
                        variant="danger"
                        onClick={onConfirm}
                        disabled={summary?.status === 'loading'}
                        data-testid="mainnet-confirm"
                    >
                        <Send size={12} />
                        Yes, spend real funds
                    </Button>
                    <DialogClose asChild>
                        <Button size="lg" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// The sentence in the text flow, no plate: its size sets it apart. The fields stay behind "Show fields" — the
// sentence already says what is signed, and the rows are there for the reader who wants to check each value.
function SummaryBody({ summary }: { summary: Extract<MainnetSummary, { status: 'loading' | 'resolved' }> }) {
    const [fieldsOpen, setFieldsOpen] = useState(false);
    const fieldsId = useId();

    return (
        // 4px from the sentence to its toggle (the button's own height adds the rest), and 20px above the block
        // (8px on top of the body's 12px gap).
        <div className="mt-2 flex flex-col gap-1 text-left" aria-live="polite" data-testid="mainnet-summary">
            {summary.status === 'loading' ? (
                <div className="flex flex-col gap-2" data-testid="mainnet-summary-loading">
                    <Skeleton className="h-4 w-[85%]" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            ) : (
                <>
                    <BaseIntentSentence
                        size="xl"
                        sentence={summary.display.interpolatedIntent ?? summary.display.intent}
                    />
                    {/* The toggle follows what it opens, as RawDataField's "Show more" does: the fields grow in
                        between, so the button moves down under them. */}
                    <div className={fieldsRevealVariants({ open: fieldsOpen })}>
                        <div id={fieldsId} className="min-h-0 overflow-hidden" inert={!fieldsOpen}>
                            {/* 16px from the sentence to the first field with the column's 4px gap, as an expanded
                                account row sets its details. Inside the clipped box, so a closed spoiler adds no space. */}
                            <div className="flex flex-col gap-1.5 pt-3">
                                <BaseDisplayFields fields={summary.display.fields} labelWidth={FIELD_LABEL_WIDTH} />
                                <KeyValue
                                    label="Program"
                                    labelWidth={FIELD_LABEL_WIDTH}
                                    align="start"
                                    density="flat"
                                    divider={false}
                                >
                                    <Address pubkey={new PublicKey(summary.programId)} link noNicknameEditing />
                                </KeyValue>
                            </div>
                        </div>
                    </div>
                    {/* The shared ghost button, quiet text, a chevron after it turning over when open; `!px-0`
                        ranges it with the sentence. */}
                    <Button
                        variant="ghost"
                        size="sm"
                        aria-expanded={fieldsOpen}
                        aria-controls={fieldsId}
                        onClick={() => setFieldsOpen(open => !open)}
                        className="group w-fit !px-0 hover:!bg-transparent"
                    >
                        <span className="text-xs text-outer-space-300 group-hover:text-white">
                            {fieldsOpen ? 'Hide fields' : 'Show fields'}
                        </span>
                        <ChevronDown
                            size={14}
                            aria-hidden
                            className="text-outer-space-300 transition-transform group-hover:text-white group-aria-expanded:rotate-180"
                        />
                    </Button>
                </>
            )}
        </div>
    );
}
