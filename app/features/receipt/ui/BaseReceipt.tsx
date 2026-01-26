import { InfoTooltip } from '@components/common/InfoTooltip';
import { Badge } from '@components/shared/ui/badge';
import { cn } from '@components/shared/utils';
import { displayTimestamp, displayTimestampUtc } from '@utils/date';
import { lamportsToSolString } from '@utils/index';

import { truncateAddress } from '@/app/entities/address/lib/utils';
// TODO: replace with real img
import { dollar } from '@/app/features/receipt/ui/images';


interface IReceiptData {
    date?: number;
    memo?: string;
    fee?: string;
    network?: string;
    receiver?: string;
    sender?: string;
    lamports?: number;
    confirmationStatus?: string;
}

export function BaseReceipt({ date, sender, receiver, network, fee, lamports, memo, confirmationStatus }: IReceiptData) {
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
                <div className="e-my-5 e-border-t [border-top-style:dashed] e-border-white/10" />
                <Footer fee={fee} lamports={lamports} memo={memo} />
            </div>
            <Zigzag />
        </div>
    );
}

export function Header({ date }: {date: IReceiptData['date']}) {
    return (
        <div className="e-flex e-items-center e-justify-between e-border-b e-border-white/10 e-p-6 e-pt-8 [border-bottom-style:solid] e-gap-x-4">
            <h3 className="e-m-0 e-font-medium e-text-white e-flex-shrink-0">Solana Receipt</h3>

            {date && 
                <InfoTooltip text={displayTimestampUtc(date, true)} withHelpIcon={false} right>
                    <span className="e-font-mono e-text-right e-text-sm e-text-gray-400">{displayTimestamp(date, true)}</span>
                </InfoTooltip>
            }
        </div>
    );
}

function Content({
    sender,
    receiver,
    network,
    confirmationStatus,
}: IReceiptData) {
    return (
        <div className="e-p-6 e-pt-8 e-grid e-gap-6 e-grid-cols-2 e-text-sm e-text-gray-400">
            <ListItem label="Sender" tooltipText={sender || ""} value={sender && truncateAddress(sender, 8, 8)} />
            <ListItem label="Receiver" tooltipText={receiver || ""} value={receiver && truncateAddress(receiver, 8, 8)} />
            <span>Status</span>
            <div className="e-text-right">
                <Badge size="sm" variant="success">
                    {confirmationStatus ? confirmationStatus.charAt(0).toUpperCase() + confirmationStatus.slice(1).toLowerCase() : 'Unknown'}
                </Badge>
            </div>
            <ListItem label="Network" className='e-text-white' value={network} />
        </div>
    );
}

function ListItem({ label, value, className, tooltipText }: { label: string; value?: string; className?: string; tooltipText?: string }) {
    if (!value) return null;

    return (
        <>
            <span>{label}</span>
            <InfoTooltip text={tooltipText} withHelpIcon={false} right>
                <span className={cn("e-font-mono e-text-green-400 e-text-right e-truncate", className)} title={value}>
                    {value}
                </span>
            </InfoTooltip>
        </>
    );
}

function Footer({ fee, lamports, memo }: IReceiptData) {
    return (
        <div className="e-p-6 e-pt-0 e-text-xs e-text-gray-400">
            <div className="e-grid e-grid-cols-2 e-items-center">
                <span className="e-text-white">Total</span>
                <InfoTooltip text={lamports?.toString()} withHelpIcon={false} right> 
                    <Total total={lamports ? lamportsToSolString(lamports, 9) : 'N/A'} />
                </InfoTooltip>
                <span>Fee</span>
                <span className='e-text-right'>{fee || 'N/A'}</span>
            </div>

            {memo && 
                <div className="e-flex e-flex-col e-mt-3 e-gap-1">
                    <span>Memo</span>
                    <span className="e-text-xs e-text-white">{memo}</span>
                </div>
            }
        </div>
    );
}

function Total({ total }: { total: string }) {
    return (
        <div className="e-flex e-items-center e-gap-2 e-justify-end">
            <img alt="SOL token icon" src={dollar} height="20" width="20" className="e-flex-shrink-0" />
            <span className="e-text-2xl e-text-white">{total}</span>
        </div>
    );
}

export function Zigzag () {
    return (
        <div className="zigzag e-bg-outer-space-900 e-pb-6"/>
    );
}