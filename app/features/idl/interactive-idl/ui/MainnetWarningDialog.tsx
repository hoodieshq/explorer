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
import { BaseDisplayFields, BaseIntentSentence } from '@entities/idl';
import { KeyValue } from '@shared/ui/key-value';
import { PublicKey } from '@solana/web3.js';
import { cva } from 'class-variance-authority';
import { AlertCircle, Send } from 'react-feather';

import type { MainnetSummary } from '../model/display/use-mainnet-summary';

// The summary carries full-width field rows (addresses), so the dialog widens when it has one.
// The whole box is one scroll: title, text, summary and buttons move together on a short screen, with
// nothing pinned. The close mark is positioned inside the box, so it scrolls with it too.
const contentVariants = cva('max-h-[calc(100dvh-2rem)] overflow-y-auto', {
    variants: { withSummary: { false: '', true: 'max-w-md' } },
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
    const hasSummary = summary?.status === 'loading' || summary?.status === 'resolved';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={contentVariants({ withSummary: hasSummary })}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {/* The app's danger colour, as the RPC consent dialog and a failed cluster connection use. */}
                        <AlertCircle className="text-dk-danger" size={16} />
                        Spend real funds?
                    </DialogTitle>
                </DialogHeader>
                {hasSummary ? <SummaryBody summary={summary} /> : <PlainWarningBody />}
                <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                        <Button variant="outline" size="sm" onClick={onCancel}>
                            Cancel
                        </Button>
                    </DialogClose>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={onConfirm}
                        disabled={summary?.status === 'loading'}
                        data-testid="mainnet-confirm"
                    >
                        <Send size={12} />
                        Yes, spend real funds
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function SummaryBody({ summary }: { summary: Extract<MainnetSummary, { status: 'loading' | 'resolved' }> }) {
    return (
        <div className="flex flex-col gap-3" aria-live="polite" data-testid="mainnet-summary">
            {/* One statement of the stakes and of the check to make (the wallet should show the same instruction:
                the habit clear signing depends on), with the terms as its fine print right under it. `m-0`: the
                description renders a <p>, which picks up the global paragraph margin otherwise. */}
            <div className="flex flex-col gap-1">
                <DialogDescription className="m-0">
                    You&apos;re on Mainnet. This can&apos;t be undone. Your wallet opens next. It should show the same
                    instruction. If it doesn&apos;t, reject it there.
                </DialogDescription>
                <BetaNote />
            </div>

            {/* The plate holds only the sentence — what is being signed; the fields sit under it as plain rows. */}
            {/* The intent blocks' ground (the page background), so the summary reads as the same thing here. */}
            <div className="flex flex-col gap-2 rounded-lg border border-solid border-outer-space-800 bg-dark-background p-3">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-outer-space-300">Intent</span>
                {summary.status === 'loading' ? (
                    <div className="flex flex-col gap-2" data-testid="mainnet-summary-loading">
                        <Skeleton className="h-4 w-[85%]" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ) : (
                    <BaseIntentSentence
                        sentence={summary.display.interpolatedIntent ?? summary.display.intent}
                        size="lg"
                    />
                )}
            </div>

            {summary.status === 'resolved' && (
                <div className="flex flex-col gap-1.5">
                    <BaseDisplayFields fields={summary.display.fields} />
                    <KeyValue label="Program" align="start" density="flat" divider={false}>
                        <Address pubkey={new PublicKey(summary.programId)} link noNicknameEditing />
                    </KeyValue>
                </div>
            )}
        </div>
    );
}

// Worded as the summary's lines; with no intent to compare against, the wallet check asks to read it there.
function PlainWarningBody() {
    return (
        <div className="flex flex-col gap-1">
            <DialogDescription className="m-0">
                You&apos;re on Mainnet. This can&apos;t be undone. Your wallet opens next. Check the instruction there.
                If it looks wrong, reject it.
            </DialogDescription>
            <BetaNote />
        </div>
    );
}

function BetaNote() {
    return (
        <p className="m-0 text-xs text-outer-space-300">
            Beta feature, provided as is.{' '}
            <a href="/tos" target="_blank" rel="noopener noreferrer">
                Terms
            </a>
        </p>
    );
}
