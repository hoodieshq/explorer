import type { Account } from '@/app/providers/accounts';

import { AccountDownloadDropdown } from './AccountDownloadDropdown';
import { BaseAccountCard, type BaseAccountCardProps } from './BaseAccountCard';
import { BaseRawAccountRows } from './BaseRawAccountRows';

type AccountCardProps = Omit<BaseAccountCardProps, 'rawContent' | 'headerActions'> & {
    account: Account;
};

export function AccountCard({ account, children, ...rest }: AccountCardProps) {
    return (
        <BaseAccountCard
            rawContent={<RawAccountRows account={account} />}
            headerActions={<AccountDownloadDropdown pubkey={account.pubkey} space={account.space} />}
            {...rest}
        >
            {children}
        </BaseAccountCard>
    );
}

function RawAccountRows({ account }: { account: Account }) {
    // The isolated slice skips the real `useRawAccountDataOnMount` SWR fetch — Raw toggle
    // renders the same rows the production BaseRawAccountRows shows while loading.
    return <BaseRawAccountRows account={account} isLoading={false} />;
}
