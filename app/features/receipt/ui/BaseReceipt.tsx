import { InfoTooltip } from '@components/common/InfoTooltip';
import { Badge } from '@components/shared/ui/badge';
import { cn } from '@components/shared/utils';
import { displayTimestamp, displayTimestampUtc } from '@utils/date';

// TODO: replace with real img
import { dollar } from '@/app/features/receipt/ui/images';

import { FormattedReceipt } from '../types';

type Data = FormattedReceipt & { confirmationStatus: string | undefined };

interface BaseReceiptProps {
    data: Data;
}

export function BaseReceipt({
    data: { date, sender, receiver, network, fee, total, memo, confirmationStatus },
}: BaseReceiptProps) {
    return (
        <div className="e-w-full e-max-w-lg">
            <div className="e-bg-outer-space-900">
                <Header date={date} />
                <Content
                    sender={sender}
                    receiver={receiver}
                    network={network}
                    confirmationStatus={confirmationStatus}
                />
                <div className="e-my-5 e-border-t e-border-white/10 [border-top-style:dashed]" />
                <Footer fee={fee} total={total} memo={memo} />
            </div>
            <Zigzag />
        </div>
    );
}

export function Header({ date }: Pick<Data, 'date'>) {
    return (
        <div className="e-flex e-items-center e-justify-between e-gap-x-4 e-border-b e-border-white/10 e-p-6 e-pt-8 [border-bottom-style:solid]">
            <h3 className="e-m-0 e-flex-shrink-0 e-font-medium e-text-white">Solana Receipt</h3>
            {date && (
                <InfoTooltip text={displayTimestampUtc(date.timestamp, true)} withHelpIcon={false} right>
                    <span className="e-text-right e-font-mono e-text-sm e-text-gray-400">
                        {displayTimestamp(date.timestamp, true)}
                    </span>
                </InfoTooltip>
            )}
        </div>
    );
}

function Content({
    sender,
    receiver,
    network,
    confirmationStatus,
}: Pick<Data, 'sender' | 'receiver' | 'network' | 'confirmationStatus'>) {
    return (
        <div className="e-grid e-grid-cols-2 e-gap-6 e-p-6 e-pt-8 e-text-sm e-text-gray-400">
            <ListItem label="Sender" tooltipText={sender.address} value={sender.truncated} />
            <ListItem label="Receiver" tooltipText={receiver.address} value={receiver.truncated} />
            <span>Status</span>
            <div className="e-text-right">
                <Badge size="sm" variant="success">
                    {confirmationStatus
                        ? confirmationStatus.charAt(0).toUpperCase() + confirmationStatus.slice(1).toLowerCase()
                        : 'Unknown'}
                </Badge>
            </div>
            <ListItem label="Network" className="e-text-white" value={network} />
        </div>
    );
}

function ListItem({
    label,
    value,
    className,
    tooltipText,
}: {
    label: string;
    value?: string;
    className?: string;
    tooltipText?: string;
}) {
    if (!value) return null;

    return (
        <>
            <span>{label}</span>
            <InfoTooltip text={tooltipText} withHelpIcon={false} right>
                <span className={cn('e-truncate e-text-right e-font-mono e-text-green-400', className)} title={value}>
                    {value}
                </span>
            </InfoTooltip>
        </>
    );
}

function Footer({ fee, total, memo }: Pick<Data, 'fee' | 'total' | 'memo'>) {
    return (
        <div className="e-p-6 e-pt-0 e-text-xs e-text-gray-400">
            <div className="e-grid e-grid-cols-2 e-items-center">
                <span className="e-text-white">Total</span>
                <InfoTooltip text={total.raw} withHelpIcon={false} right>
                    <Total total={total} />
                </InfoTooltip>
                <span>Fee</span>
                <span className="e-text-right">{fee} SOL</span>
            </div>

            {memo && (
                <div className="e-mt-3 e-flex e-flex-col e-gap-1">
                    <span>Memo</span>
                    <span className="e-text-xs e-text-white">{memo}</span>
                </div>
            )}
        </div>
    );
}

function Total({ total }: Pick<Data, 'total'>) {
    return (
        <div className="e-flex e-items-center e-justify-end e-gap-2">
            <img alt="SOL token icon" src={dollar} height="20" width="20" className="e-flex-shrink-0" />
            <span className="e-text-2xl e-text-white">
                {total.formatted} {total.unit}
            </span>
        </div>
    );
}

export function Zigzag() {
    return <div className="zigzag e-bg-outer-space-900 e-pb-6" />;
}

export function NoReceipt() {
    return (
        <div className="">
            <div className=""></div>

            <div className="">There is no receipt for this transaction.</div>
        </div>
    );
}
