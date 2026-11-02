import { AccountHeader } from '@components/account/AccountHeader';
import { isTokenProgramData } from '@providers/accounts';
import { cva } from 'class-variance-authority';
import { type ComponentProps, useMemo } from 'react';

import { TokenMarketData, TokenMarketDataStatus, useTokenMarketData } from '@/app/features/token-market-data';
import { TokenVerificationBadge, type VerificationTarget } from '@/app/features/token-verification-badge';
import { toKitAddress } from '@/app/shared/lib/web3js-compat';
import { isNativeMint, isTokenMintByOwner } from '@/app/shared/model/token-program';

type HeaderProps = ComponentProps<typeof AccountHeader>;

export function Header({ address, account, tokenInfo, isTokenInfoLoading }: HeaderProps) {
    const parsedData = account?.data.parsed;
    // isTokenProgramData + parsed.type check gonna be replaced with isTokenMintByOwner(owner, data) at some point
    const isTokenMint =
        !isNativeMint(address) &&
        parsedData &&
        isTokenProgramData(parsedData) &&
        parsedData?.parsed.type === 'mint' &&
        isTokenMintByOwner(toKitAddress(account.owner), account.data.raw);

    const marketData = useTokenMarketData(address, !!isTokenMint);
    // Loaded stats always yield at least the Price tile. While they load, fail or are missing, Verification
    // is the only tile and keeps its full-width strip.
    const hasMarketTiles = marketData?.status === TokenMarketDataStatus.Success;

    const verificationTarget: VerificationTarget = useMemo(
        () => ({
            address,
            isTokenMint: !!isTokenMint,
            solflareVerified: tokenInfo && 'verified' in tokenInfo ? tokenInfo.verified : undefined,
        }),
        [address, isTokenMint, tokenInfo],
    );

    return (
        <header className="mb-3 flex flex-col items-start gap-4 py-6 lg:flex-row lg:items-end lg:justify-between lg:gap-1">
            <AccountHeader
                address={address}
                account={account}
                tokenInfo={tokenInfo}
                isTokenInfoLoading={isTokenInfoLoading}
            />
            {isTokenMint && (
                <div className={tilesVariants({ grid: hasMarketTiles })}>
                    <TokenVerificationBadge
                        target={verificationTarget}
                        isTokenInfoLoading={isTokenInfoLoading}
                        layout={hasMarketTiles ? 'tile' : 'row'}
                    />
                    <TokenMarketData marketData={marketData} />
                </div>
            )}
        </header>
    );
}

// Below md the Verification and market data tiles form a 2×2 grid; each row takes the height of its own
// tallest tile, so a wrapped price change grows only the first row. Verification alone stays a full-width
// strip. From md up all tiles sit in one row and stretch to the tallest, the Verification tile.
const tilesVariants = cva('w-full gap-1 sm:gap-2 md:flex md:w-auto md:flex-row', {
    defaultVariants: { grid: false },
    variants: {
        grid: {
            false: 'flex flex-col sm:items-start',
            true: 'grid grid-cols-2',
        },
    },
});
