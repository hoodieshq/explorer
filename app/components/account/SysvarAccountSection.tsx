import { AccountAddressRow, AccountBalanceRow } from '@components/common/Account';
import { Address } from '@components/common/Address';
import { Epoch } from '@components/common/Epoch';
import { Slot } from '@components/common/Slot';
import { SolBalance } from '@components/common/SolBalance';
import { RefreshButton } from '@components/shared/ui/refresh-button';
import { useRawAccountDataOnMount, useRefreshAccount } from '@entities/account';
import { AccountCard, AccountDownloadDropdown } from '@features/account';
import { Account } from '@providers/accounts';
import { displayTimestamp, unixTimestampToMs } from '@utils/date';
import {
    SysvarAccount,
    SysvarClockAccount,
    SysvarEpochScheduleAccount,
    SysvarFeesAccount,
    SysvarRecentBlockhashesAccount,
    SysvarRentAccount,
    SysvarRewardsAccount,
    SysvarSlotHashesAccount,
    SysvarSlotHistoryAccount,
    SysvarStakeHistoryAccount,
} from '@validators/accounts/sysvar';
import React from 'react';
import { Code } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { BaseRawAccountRows } from '@/app/shared/ui/BaseRawAccountRows';
import { Card } from '@/app/shared/ui/Card';
import { KeyValue } from '@/app/shared/ui/key-value';
import { BaseTable } from '@/app/shared/ui/Table';

export function SysvarAccountSection({ account, sysvarAccount }: { account: Account; sysvarAccount: SysvarAccount }) {
    switch (sysvarAccount.type) {
        case 'clock':
            return <SysvarAccountClockCard account={account} sysvarAccount={sysvarAccount} />;
        case 'rent':
            return <SysvarAccountRentCard account={account} sysvarAccount={sysvarAccount} />;
        case 'rewards':
            return <SysvarAccountRewardsCard account={account} sysvarAccount={sysvarAccount} />;
        case 'epochSchedule':
            return <SysvarAccountEpochScheduleCard account={account} sysvarAccount={sysvarAccount} />;
        case 'fees':
            return <SysvarAccountFeesCard account={account} sysvarAccount={sysvarAccount} />;
        case 'recentBlockhashes':
            return <SysvarAccountRecentBlockhashesCard account={account} sysvarAccount={sysvarAccount} />;
        case 'slotHashes':
            return <SysvarAccountSlotHashes account={account} sysvarAccount={sysvarAccount} />;
        case 'slotHistory':
            return <SysvarAccountSlotHistory account={account} sysvarAccount={sysvarAccount} />;
        case 'stakeHistory':
            return <SysvarAccountStakeHistory account={account} sysvarAccount={sysvarAccount} />;
    }
}

function SysvarAccountRecentBlockhashesCard({
    account,
}: {
    account: Account;
    sysvarAccount: SysvarRecentBlockhashesAccount;
}) {
    const refresh = useRefreshAccount();
    return (
        <AccountCard
            title="Sysvar: Recent Blockhashes"
            account={account}
            analyticsSection="sysvar_recent_blockhashes_section"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <AccountAddressRow account={account} />
            <AccountBalanceRow account={account} />
        </AccountCard>
    );
}

function SysvarAccountSlotHashes({ account }: { account: Account; sysvarAccount: SysvarSlotHashesAccount }) {
    const refresh = useRefreshAccount();
    return (
        <AccountCard
            title="Sysvar: Slot Hashes"
            account={account}
            analyticsSection="sysvar_slot_hashes_section"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <AccountAddressRow account={account} />
            <AccountBalanceRow account={account} />
        </AccountCard>
    );
}

function SysvarAccountSlotHistory({
    account,
    sysvarAccount,
}: {
    account: Account;
    sysvarAccount: SysvarSlotHistoryAccount;
}) {
    const refresh = useRefreshAccount();
    const history = Array.from(
        {
            length: 100,
        },
        (v, k) => sysvarAccount.info.nextSlot - k,
    );
    return (
        <AccountCard
            title="Sysvar: Slot History"
            account={account}
            analyticsSection="sysvar_slot_history_section"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <AccountAddressRow account={account} />
            <AccountBalanceRow account={account} />

            <BaseTable.Row>
                <BaseTable.Cell className="align-top">
                    Slot History <span className="text-dk-gray-700">(previous 100 slots)</span>
                </BaseTable.Cell>
                <BaseTable.Cell className="text-right font-mono">
                    {history.map(val => (
                        <p key={val} className="mb-0">
                            <Slot slot={val} link />
                        </p>
                    ))}
                </BaseTable.Cell>
            </BaseTable.Row>
        </AccountCard>
    );
}

// `LABEL_WIDTH` (`clamp(84px,20%,240px)`) with a 108px floor. A literal class, since Tailwind's JIT can't build it.
const LABEL_WIDTH_108 = 'w-[clamp(108px,20%,240px)]';

// Raw account bytes — mounted only while the Raw toggle is on so its SWR fetch (useRawAccountDataOnMount)
// doesn't run for the common case. The shared KeyValue rows render straight into the card, without the
// dashkit table wrapper (same as the account card's Raw view).
function StakeHistoryRawAccountRows({ account }: { account: Account }) {
    const { data, isLoading } = useRawAccountDataOnMount(account.pubkey);
    return <BaseRawAccountRows account={account} rawData={data} isLoading={isLoading} />;
}

// The Stake History account overview, reworked to match the vote account card: the "Sysvar: Stake History"
// heading is lifted out above a tight `<Card>`, the Refresh / Raw / Download actions sit on the heading
// row, and Address / Balance render as the shared KeyValue rows.
function SysvarAccountStakeHistory({ account }: { account: Account; sysvarAccount: SysvarStakeHistoryAccount }) {
    const refresh = useRefreshAccount();
    const [showRaw, setShowRaw] = React.useState(false);

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-normal text-white">Sysvar: Stake History</h2>
                <div className="flex items-center gap-2">
                    <RefreshButton
                        analyticsSection="sysvar_stake_history_section"
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

            {/* Tailwind surface from design-system tokens only (no dashkit): `outer-space-900` is the closest
                non-dk token to the dashkit card bg. No bottom margin: the address layout owns the gap to the
                tabs. `overflow-hidden` clips the row dividers to the corners. */}
            <Card variant="tight" className="overflow-hidden rounded-lg border-outer-space-800 bg-outer-space-900">
                {showRaw ? (
                    <StakeHistoryRawAccountRows account={account} />
                ) : (
                    // The shared KeyValue rows, same as the tx summary card (and this card's Raw view). The label
                    // floor is raised from 84px to 108px via `labelWidth` so "Balance (SOL)" stays on one line.
                    <>
                        <KeyValue label="Address" labelWidth={LABEL_WIDTH_108}>
                            {/* Address renders its own Copyable (Address.tsx) — don't wrap it in another. */}
                            <Address pubkey={account.pubkey} raw noTruncate />
                        </KeyValue>
                        <KeyValue label="Balance (SOL)" labelWidth={LABEL_WIDTH_108}>
                            <SolBalance lamports={account.lamports} />
                        </KeyValue>
                    </>
                )}
            </Card>
        </section>
    );
}

function SysvarAccountFeesCard({ account, sysvarAccount }: { account: Account; sysvarAccount: SysvarFeesAccount }) {
    const refresh = useRefreshAccount();
    return (
        <AccountCard
            title="Sysvar: Fees"
            account={account}
            analyticsSection="sysvar_fees_section"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <AccountAddressRow account={account} />
            <AccountBalanceRow account={account} />

            <BaseTable.Row>
                <BaseTable.Cell>Lamports Per Signature</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    {sysvarAccount.info.feeCalculator.lamportsPerSignature}
                </BaseTable.Cell>
            </BaseTable.Row>
        </AccountCard>
    );
}

function SysvarAccountEpochScheduleCard({
    account,
    sysvarAccount,
}: {
    account: Account;
    sysvarAccount: SysvarEpochScheduleAccount;
}) {
    const refresh = useRefreshAccount();
    return (
        <AccountCard
            title="Sysvar: Epoch Schedule"
            account={account}
            analyticsSection="sysvar_epoch_schedule_section"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <AccountAddressRow account={account} />
            <AccountBalanceRow account={account} />

            <BaseTable.Row>
                <BaseTable.Cell>Slots Per Epoch</BaseTable.Cell>
                <BaseTable.Cell className="text-right">{sysvarAccount.info.slotsPerEpoch}</BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell>Leader Schedule Slot Offset</BaseTable.Cell>
                <BaseTable.Cell className="text-right">{sysvarAccount.info.leaderScheduleSlotOffset}</BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell>Epoch Warmup Enabled</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    <code>{sysvarAccount.info.warmup ? 'true' : 'false'}</code>
                </BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell>First Normal Epoch</BaseTable.Cell>
                <BaseTable.Cell className="text-right">{sysvarAccount.info.firstNormalEpoch}</BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell>First Normal Slot</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    <Slot slot={sysvarAccount.info.firstNormalSlot} />
                </BaseTable.Cell>
            </BaseTable.Row>
        </AccountCard>
    );
}

function SysvarAccountClockCard({ account, sysvarAccount }: { account: Account; sysvarAccount: SysvarClockAccount }) {
    const refresh = useRefreshAccount();
    return (
        <AccountCard
            title="Sysvar: Clock"
            account={account}
            analyticsSection="sysvar_clock_section"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <AccountAddressRow account={account} />
            <AccountBalanceRow account={account} />

            <BaseTable.Row>
                <BaseTable.Cell>Timestamp</BaseTable.Cell>
                <BaseTable.Cell className="text-right font-mono">
                    {displayTimestamp(unixTimestampToMs(sysvarAccount.info.unixTimestamp))}
                </BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell>Epoch</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    <Epoch epoch={sysvarAccount.info.epoch} link />
                </BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell>Leader Schedule Epoch</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    <Epoch epoch={sysvarAccount.info.leaderScheduleEpoch} link />
                </BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell>Slot</BaseTable.Cell>
                <BaseTable.Cell className="text-right">
                    <Slot slot={sysvarAccount.info.slot} link />
                </BaseTable.Cell>
            </BaseTable.Row>
        </AccountCard>
    );
}

function SysvarAccountRentCard({ account, sysvarAccount }: { account: Account; sysvarAccount: SysvarRentAccount }) {
    const refresh = useRefreshAccount();
    return (
        <AccountCard
            title="Sysvar: Rent"
            account={account}
            analyticsSection="sysvar_rent_section"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <AccountAddressRow account={account} />
            <AccountBalanceRow account={account} />

            <BaseTable.Row>
                <BaseTable.Cell>Burn Percent</BaseTable.Cell>
                <BaseTable.Cell className="text-right">{`${sysvarAccount.info.burnPercent}%`}</BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell>Exemption Threshold</BaseTable.Cell>
                <BaseTable.Cell className="text-right">{sysvarAccount.info.exemptionThreshold} years</BaseTable.Cell>
            </BaseTable.Row>

            <BaseTable.Row>
                <BaseTable.Cell>Lamports Per Byte Year</BaseTable.Cell>
                <BaseTable.Cell className="text-right">{sysvarAccount.info.lamportsPerByteYear}</BaseTable.Cell>
            </BaseTable.Row>
        </AccountCard>
    );
}

function SysvarAccountRewardsCard({
    account,
    sysvarAccount,
}: {
    account: Account;
    sysvarAccount: SysvarRewardsAccount;
}) {
    const refresh = useRefreshAccount();

    const validatorPointValueFormatted = new Intl.NumberFormat('en-US', {
        maximumSignificantDigits: 20,
    }).format(sysvarAccount.info.validatorPointValue);

    return (
        <AccountCard
            title="Sysvar: Rewards"
            account={account}
            analyticsSection="sysvar_rewards_section"
            refresh={() => refresh(account.pubkey, 'parsed')}
        >
            <AccountAddressRow account={account} />
            <AccountBalanceRow account={account} />

            <BaseTable.Row>
                <BaseTable.Cell>Validator Point Value</BaseTable.Cell>
                <BaseTable.Cell className="text-right font-mono">
                    {validatorPointValueFormatted} lamports
                </BaseTable.Cell>
            </BaseTable.Row>
        </AccountCard>
    );
}
