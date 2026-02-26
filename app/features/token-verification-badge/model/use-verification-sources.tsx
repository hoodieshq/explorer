import { StaticImageData } from 'next/image';
import Image from 'next/image';

import { FullLegacyTokenInfo, FullTokenInfo } from '@/app/utils/token-info';

import BlupryntLogo from '../icons/bluprynt-logo.png';
import CoinGeckoLogo from '../icons/coingecko-logo.png';
import JupiterLogo from '../icons/jupiter-logo.png';
import RugCheckLogo from '../icons/rugcheck-logo.png';
import SolflareLogo from '../icons/solflare-logo.png';
import { EVerificationSource, VerificationSource } from '../lib/types';
import { BlupryntStatus, useBlupryntVerification } from './use-bluprynt';
import { CoingeckoStatus, useCoinGeckoVerification } from './use-coingecko';
import { JupiterStatus, useJupiterVerification } from './use-jupiter';
import { ERiskLevel, getRiskLevel, RugCheckStatus, useRugCheckVerification } from './use-rugcheck';

const ICON_SIZE = 16;

function Icon({ src, alt }: { src: StaticImageData; alt: string }) {
    return <Image src={src} alt={alt} width={ICON_SIZE} height={ICON_SIZE} className="e-rounded-full" />;
}

export type TokenVerificationResult = {
    rateLimitedSources: VerificationSource[];
    sources: VerificationSource[];
    sourcesToApply: VerificationSource[];
    verificationFoundSources: VerificationSource[];
    verifiedSources: VerificationSource[];
};

export function useTokenVerification(tokenInfo?: FullTokenInfo | FullLegacyTokenInfo): TokenVerificationResult {
    const blupryntInfo = useBlupryntVerification(tokenInfo?.address);
    const coinInfo = useCoinGeckoVerification(tokenInfo?.extensions?.coingeckoId);
    const jupiterInfo = useJupiterVerification(tokenInfo?.address);
    const rugCheckInfo = useRugCheckVerification(tokenInfo?.address);

    const blupryntVerified = blupryntInfo?.status === BlupryntStatus.Success && blupryntInfo.verified;
    const coingeckoVerified = !!tokenInfo?.extensions?.coingeckoId && coinInfo?.status === CoingeckoStatus.Success;
    const solflareVerified = tokenInfo && 'verified' in tokenInfo ? tokenInfo.verified : false;
    const jupiterVerified = jupiterInfo?.status === JupiterStatus.Success && jupiterInfo.verified;

    const rugCheckScore = rugCheckInfo?.status === RugCheckStatus.Success ? rugCheckInfo.score : undefined;
    const rugCheckLevel = rugCheckScore !== undefined ? getRiskLevel(rugCheckScore) : undefined;
    const rugCheckVerified = rugCheckLevel === ERiskLevel.Good;

    const sources: VerificationSource[] = [
        {
            applyUrl: 'https://app.bluprynt.com/register/account?integration_partner=solana_explorer',
            icon: <Icon src={BlupryntLogo} alt="Bluprynt" />,
            isVerificationFound: blupryntInfo?.status === BlupryntStatus.Success,
            name: EVerificationSource.Bluprynt,
            url: `https://verified.bluprynt.com/verified-assets/${tokenInfo?.address}/solana`,
            verified: blupryntVerified,
        },
        {
            applyUrl:
                'https://support.coingecko.com/hc/en-us/articles/23725417857817-Verification-Guide-for-Listing-Update-Requests-on-CoinGecko',
            icon: <Icon src={CoinGeckoLogo} alt="CoinGecko" />,
            isRateLimited: coinInfo?.status === CoingeckoStatus.RateLimited,
            isVerificationFound: Boolean(
                tokenInfo?.extensions?.coingeckoId && coinInfo?.status === CoingeckoStatus.Success
            ),
            name: EVerificationSource.CoinGecko,
            url: `https://www.coingecko.com/en/coins/${tokenInfo?.extensions?.coingeckoId}`,
            verified: coingeckoVerified,
        },
        {
            applyUrl: 'https://verified.jup.ag/tokens',
            icon: <Icon src={JupiterLogo} alt="Jupiter" />,
            isRateLimited: jupiterInfo?.status === JupiterStatus.RateLimited,
            isVerificationFound: jupiterInfo?.status === JupiterStatus.Success,
            name: EVerificationSource.Jupiter,
            url: `https://jup.ag/tokens/${tokenInfo?.address}`,
            verified: jupiterVerified,
        },
        {
            applyUrl: 'https://help.solflare.com/en/articles/9260147-i-cannot-find-a-token-in-solflare',
            icon: <Icon src={SolflareLogo} alt="Solflare" />,
            isVerificationFound: tokenInfo && 'verified' in tokenInfo,
            name: EVerificationSource.Solflare,
            url: `https://www.solflare.com/prices/${tokenInfo?.address}`,
            verified: solflareVerified,
        },
        {
            applyUrl: 'https://rugcheck.xyz/auth?redirectTo=%2Fauth',
            icon: <Icon src={RugCheckLogo} alt="RugCheck" />,
            isRateLimited: rugCheckInfo?.status === RugCheckStatus.RateLimited,
            isVerificationFound: rugCheckInfo?.status === RugCheckStatus.Success,
            level: rugCheckLevel,
            name: EVerificationSource.RugCheck,
            score: rugCheckScore,
            url: `https://rugcheck.xyz/tokens/${tokenInfo?.address}`,
            verified: rugCheckVerified,
        },
    ];

    const rateLimitedSources = sources.filter(s => s.isRateLimited);
    const verifiedSources = sources.filter(s => s.verified);
    const sourcesToApply = sources.filter(s => !s.verified && !s.isVerificationFound && !s.isRateLimited);
    const verificationFoundSources = sources.filter(s => s.isVerificationFound);

    return { rateLimitedSources, sources, sourcesToApply, verificationFoundSources, verifiedSources };
}
