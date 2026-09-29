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
import { programNameByAddress } from '@utils/programs';
import { cva } from 'class-variance-authority';
import { AlertCircle, AlertTriangle, Send } from 'react-feather';

import type { MainnetSummary } from '../model/display/use-mainnet-summary';

// The summary carries full-width field rows (addresses), so the dialog widens when it has one.
const contentVariants = cva('', { variants: { withSummary: { false: '', true: 'max-w-md' } } });

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
                        <AlertCircle className="text-destructive" size={16} />
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
                        variant="destructive"
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
        <div className="flex flex-col gap-3">
            <DialogDescription>You&apos;re on Mainnet. This can&apos;t be undone.</DialogDescription>

            <div
                className="flex flex-col gap-2.5 rounded-lg border border-solid border-dark-border bg-heavy-metal-950 p-3.5"
                aria-live="polite"
                data-testid="mainnet-summary"
            >
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-400">Summary</span>
                {summary.status === 'loading' ? (
                    <div className="flex flex-col gap-2" data-testid="mainnet-summary-loading">
                        <Skeleton className="h-4 w-[85%]" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ) : (
                    <>
                        <BaseIntentSentence
                            sentence={summary.display.interpolatedIntent ?? summary.display.intent}
                            className="text-lg font-medium leading-snug"
                        />
                        <BaseDisplayFields
                            fields={[
                                ...summary.display.fields,
                                {
                                    label: 'Program',
                                    value: programNameByAddress(summary.programId) ?? summary.programId,
                                },
                            ]}
                        />
                    </>
                )}
            </div>

            <p className="m-0 flex items-start gap-2 text-sm text-neutral-300">
                <AlertTriangle className="mt-0.5 shrink-0 text-yellow-300" size={14} />
                Your wallet opens next. It should show the same instruction. If it doesn&apos;t, reject it there.
            </p>
            <p className="m-0 text-xs text-neutral-500">
                Beta feature, provided as is.{' '}
                <a href="/tos" target="_blank" rel="noopener noreferrer">
                    Terms
                </a>
            </p>
        </div>
    );
}

function PlainWarningBody() {
    return (
        <div className="space-y-2 pl-6">
            <DialogDescription>
                You&apos;re connected to Mainnet. Any SOL you send now is permanent and costs real money. Make sure the
                details are correct before continuing.
            </DialogDescription>
            <p className="text-sm text-neutral-400">
                Please take note that this is a beta version feature and is provided on an &quot;as is&quot; and
                &quot;as available&quot; basis. Solana Explorer does not provide any warranties and will not be liable
                for any loss, direct or indirect, through continued use of this feature.
            </p>
        </div>
    );
}
