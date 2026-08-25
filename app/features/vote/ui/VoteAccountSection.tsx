import { Address } from '@components/common/Address';
import { Copyable } from '@components/common/Copyable';
import { Slot } from '@components/common/Slot';
import { SolBalance } from '@components/common/SolBalance';
import { RawDataField } from '@components/shared/RawDataField';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { cn } from '@components/shared/utils';
import { useRawAccountDataOnMount, useRefreshAccount } from '@entities/account';
import { AccountDownloadDropdown } from '@features/account';
import { Account } from '@providers/accounts';
import { displayTimestamp } from '@utils/date';
import React from 'react';
import { Code } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Card } from '@/app/shared/ui/Card';
import { DSCOMMON_BETWEEN_BLOCKS } from '@/app/shared/ui/page-spacing/spacing';

import { collapseAuthorizedVoters } from '../lib/authorized-voters';
import { VoteAccount } from '../lib/validators';

// Grid-based key/value row, mirroring the block Overview card so account overview cards stay consistent
// across pages. The `1fr` value column lets long mono values wrap (`break-all`) instead of forcing the
// whole card into horizontal scroll on narrow screens.
type RowProps = React.HTMLAttributes<HTMLDivElement> & { divider?: boolean };
function Row({ children, className, divider, ...props }: RowProps) {
    return (
        <div
            className={cn(
                'grid min-h-9 grid-cols-[clamp(100px,25%,200px)_1fr] items-baseline gap-2 px-3 py-2.5 md:px-4',
                // `last:border-b-0` drops the trailing divider so it can't double up with the card's own
                // bottom border — the shared idiom used across the account/transaction cards.
                divider && 'border-1 border-b border-white/10 [border-bottom-style:solid] last:border-b-0',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

function Label({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('flex flex-wrap items-center gap-1 overflow-hidden text-sm text-outer-space-300', className)}
            {...props}
        >
            {children}
        </div>
    );
}

// `mono` toggles the monospace face — on for hashes/addresses/numbers, off for prose like dates.
// (cn is plain clsx here, so an added `font-sans` wouldn't reliably beat a hardcoded `font-mono`;
// omitting `font-mono` and inheriting the sans default is the robust way to opt out.)
// `breakAll` lets a long unbreakable token (a pubkey) wrap anywhere instead of forcing horizontal
// scroll; turn it off for space-separated prose so words wrap whole, only at the spaces.
function Value({
    children,
    className,
    mono = true,
    breakAll = true,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { mono?: boolean; breakAll?: boolean }) {
    return (
        <div className={cn('text-sm text-white', breakAll && 'break-all', mono && 'font-mono', className)} {...props}>
            {children}
        </div>
    );
}

// Raw account bytes view — mounted only while the Raw toggle is on so its SWR fetch (useRawAccountDataOnMount)
// doesn't run for the common case. Uses the same grid Row/Label/Value layout as the default view so the
// card looks consistent when toggled (rather than the old dashkit BaseTable rows).
function RawAccountRows({ account }: { account: Account }) {
    const { data, isLoading } = useRawAccountDataOnMount(account.pubkey);
    return (
        <>
            <Row divider>
                <Label>Address</Label>
                <Value className="flex w-full min-w-0 items-baseline">
                    <Address pubkey={account.pubkey} raw noTruncate />
                </Value>
            </Row>

            <Row divider>
                <Label>Balance (SOL)</Label>
                <Value className="uppercase">
                    <SolBalance lamports={account.lamports} />
                </Value>
            </Row>

            <Row divider>
                <Label>Assigned Program Id</Label>
                <Value>
                    <Address pubkey={account.owner} link noTruncate />
                </Value>
            </Row>

            {account.space !== undefined && (
                <Row divider>
                    <Label>Allocated Data Size</Label>
                    <Value mono={false}>{account.space} byte(s)</Value>
                </Row>
            )}

            <Row divider>
                <Label>Executable</Label>
                <Value mono={false}>{account.executable ? 'Yes' : 'No'}</Value>
            </Row>

            <Row divider>
                <Label>Raw Data</Label>
                <Value className="min-w-0">
                    <RawDataField data={data} filename={account.pubkey.toBase58()} loading={isLoading} />
                </Value>
            </Row>
        </>
    );
}

export function VoteAccountSection({ account, voteAccount }: { account: Account; voteAccount: VoteAccount }) {
    const refresh = useRefreshAccount();
    const [showRaw, setShowRaw] = React.useState(false);
    const rootSlot = voteAccount.info.rootSlot;
    const authorizedVoters = collapseAuthorizedVoters(voteAccount.info.authorizedVoters);

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-normal text-white">Overview</h2>
                <div className="flex items-center gap-2">
                    <RefreshButton
                        analyticsSection="vote_account_section"
                        onClick={() => refresh(account.pubkey, 'parsed')}
                    />
                    <Button
                        variant={showRaw ? 'default' : 'outline'}
                        size="sm"
                        aria-label="Raw"
                        className={showRaw ? 'shadow-active-sm' : undefined}
                        onClick={() => setShowRaw(r => !r)}
                    >
                        <Code size={12} />
                        <span className="hidden md:inline">Raw</span>
                    </Button>
                    <AccountDownloadDropdown pubkey={account.pubkey} space={account.space} />
                </div>
            </div>

            {/* Card outline matched to the block page's tight cards: visible `outer-space-800` border,
                8px radius, no dashkit shadow. `overflow-hidden` clips the row dividers to the corners.
                The bottom margin is the shared between-blocks token (gap to the tabs below). */}
            <Card
                variant="tight"
                className={cn(
                    DSCOMMON_BETWEEN_BLOCKS.marginClassName,
                    'overflow-hidden !rounded-lg border-outer-space-800 bg-outer-space-900',
                )}
            >
                {showRaw ? (
                    <RawAccountRows account={account} />
                ) : (
                    <>
                        <Row divider>
                            <Label>Address</Label>
                            <Value className="flex w-full min-w-0 items-baseline">
                                {/* Address renders its own Copyable (Address.tsx) — don't wrap it in another. */}
                                <Address pubkey={account.pubkey} raw noTruncate />
                            </Value>
                        </Row>

                        <Row divider>
                            <Label>Balance (SOL)</Label>
                            <Value className="uppercase">
                                <SolBalance lamports={account.lamports} />
                            </Value>
                        </Row>

                        <Row divider>
                            <Label>Authorized Voter{authorizedVoters.length > 1 ? 's' : ''}</Label>
                            <Value className="flex flex-col gap-1">
                                {authorizedVoters.map(voter => (
                                    <span key={voter.fromEpoch} className="flex flex-wrap items-baseline gap-x-1 pl-5">
                                        {/* Hanging indent for the epoch: when it can't sit beside the address it wraps
                                            to its own line, and the wrapper's `pl-5` shifts that wrapped line right so
                                            the epoch's start lines up with the address *text*. The address wrapper's
                                            matching `-ml-5` cancels the padding on line 1, pulling the address back to
                                            the column edge (aligned with the other rows). The 20px offset is the copy
                                            affordance the Address renders before its text: 13px icon + its 6px right
                                            margin + the 1px row padding. */}
                                        <span className="-ml-5 min-w-0">
                                            <Address pubkey={voter.authorizedVoter} link noTruncate />
                                        </span>
                                        <span className="whitespace-nowrap font-sans text-sm text-outer-space-300">
                                            (epoch{' '}
                                            {voter.fromEpoch === voter.toEpoch
                                                ? voter.fromEpoch
                                                : `${voter.fromEpoch}-${voter.toEpoch}`}
                                            )
                                        </span>
                                    </span>
                                ))}
                            </Value>
                        </Row>

                        <Row divider>
                            <Label>Authorized Withdrawer</Label>
                            <Value>
                                <Address pubkey={voteAccount.info.authorizedWithdrawer} link noTruncate />
                            </Value>
                        </Row>

                        <Row divider>
                            <Label>Last Timestamp</Label>
                            <Value mono={false}>
                                {displayTimestamp(voteAccount.info.lastTimestamp.timestamp * 1000)}
                            </Value>
                        </Row>

                        <Row divider>
                            <Label>Commission</Label>
                            <Value mono={false}>{`${voteAccount.info.commission}%`}</Value>
                        </Row>

                        {voteAccount.info.blsPubkeyCompressed && (
                            <Row divider>
                                <Label>BLS Pubkey</Label>
                                <Value className="flex w-full min-w-0 items-baseline">
                                    <Copyable text={voteAccount.info.blsPubkeyCompressed}>
                                        <span className="min-w-0 break-all">
                                            {voteAccount.info.blsPubkeyCompressed}
                                        </span>
                                    </Copyable>
                                </Value>
                            </Row>
                        )}

                        {voteAccount.info.inflationRewardsCommissionBps !== undefined && (
                            <Row divider>
                                <Label>Inflation Rewards Commission</Label>
                                <Value mono={false}>{`${voteAccount.info.inflationRewardsCommissionBps / 100}%`}</Value>
                            </Row>
                        )}

                        {voteAccount.info.inflationRewardsCollector && (
                            <Row divider>
                                <Label>Inflation Rewards Collector</Label>
                                <Value>
                                    <Address pubkey={voteAccount.info.inflationRewardsCollector} link noTruncate />
                                </Value>
                            </Row>
                        )}

                        {voteAccount.info.blockRevenueCommissionBps !== undefined && (
                            <Row divider>
                                <Label>Block Revenue Commission</Label>
                                <Value mono={false}>{`${voteAccount.info.blockRevenueCommissionBps / 100}%`}</Value>
                            </Row>
                        )}

                        {voteAccount.info.blockRevenueCollector && (
                            <Row divider>
                                <Label>Block Revenue Collector</Label>
                                <Value>
                                    <Address pubkey={voteAccount.info.blockRevenueCollector} link noTruncate />
                                </Value>
                            </Row>
                        )}

                        {voteAccount.info.pendingDelegatorRewards !== undefined && (
                            <Row divider>
                                <Label>Pending Delegator Rewards (SOL)</Label>
                                <Value>
                                    <SolBalance lamports={BigInt(voteAccount.info.pendingDelegatorRewards)} />
                                </Value>
                            </Row>
                        )}

                        <Row>
                            <Label>Root Slot</Label>
                            <Value>{rootSlot !== null ? <Slot slot={rootSlot} link /> : 'N/A'}</Value>
                        </Row>
                    </>
                )}
            </Card>
        </section>
    );
}
