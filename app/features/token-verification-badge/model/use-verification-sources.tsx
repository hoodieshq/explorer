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
import { getRiskLevel, RugCheckStatus, useRugCheckVerification } from './use-rugcheck';

const ICON_SIZE = 16;

function Icon({ src, alt }: { src: StaticImageData; alt: string }) {
    return <Image src={src} alt={alt} width={ICON_SIZE} height={ICON_SIZE} className="e-rounded-full" />;
}

export type TokenVerificationResult = {
    isLoading: boolean;
    sources: VerificationSource[];
    verifiedSources: VerificationSource[];
    unverifiedSources: VerificationSource[];
    verificationFoundSources: VerificationSource[];
};

export function useTokenVerification(tokenInfo?: FullTokenInfo | FullLegacyTokenInfo): TokenVerificationResult {
    const blupryntInfo = useBlupryntVerification(tokenInfo?.address);
    const coinInfo = useCoinGeckoVerification(tokenInfo?.extensions?.coingeckoId);
    const jupiterInfo = useJupiterVerification(tokenInfo?.address);
    const rugCheckInfo = useRugCheckVerification(tokenInfo?.address);

    const isLoading =
        blupryntInfo?.status === BlupryntStatus.Loading ||
        (Boolean(tokenInfo?.extensions?.coingeckoId) && coinInfo?.status === CoingeckoStatus.Loading) ||
        jupiterInfo?.status === JupiterStatus.Loading ||
        rugCheckInfo?.status === RugCheckStatus.Loading;

    const blupryntVerified = blupryntInfo?.status === BlupryntStatus.Success && blupryntInfo.verified;
    const coingeckoVerified = !!tokenInfo?.extensions?.coingeckoId && coinInfo?.status === CoingeckoStatus.Success;
    const solflareVerified = tokenInfo && 'verified' in tokenInfo ? tokenInfo.verified : false;
    const jupiterVerified = jupiterInfo?.status === JupiterStatus.Success && jupiterInfo.verified;

    const rugCheckScore = rugCheckInfo?.status === RugCheckStatus.Success ? rugCheckInfo.score : undefined;
    const rugCheckLevel = rugCheckScore !== undefined ? getRiskLevel(rugCheckScore) : undefined;
    const rugCheckVerified = Boolean(rugCheckScore || rugCheckScore === 0);

    const sources: VerificationSource[] = [
        {
            applyUrl: 'https://www.bluprynt.com/',
            icon: <Icon src={BlupryntLogo} alt="Bluprynt" />,
            isVerificationFound: blupryntInfo?.status === BlupryntStatus.Success,
            name: EVerificationSource.Bluprynt,
            verified: blupryntVerified,
        },
        {
            applyUrl:
                'https://support.coingecko.com/hc/en-us/articles/23725417857817-Verification-Guide-for-Listing-Update-Requests-on-CoinGecko',
            icon: <Icon src={CoinGeckoLogo} alt="CoinGecko" />,
            isVerificationFound: Boolean(
                tokenInfo?.extensions?.coingeckoId && coinInfo?.status === CoingeckoStatus.Success
            ),
            name: EVerificationSource.CoinGecko,
            verified: coingeckoVerified,
        },
        {
            applyUrl: 'https://catdetlist.jup.ag/',
            icon: <Icon src={JupiterLogo} alt="Jupiter" />,
            isVerificationFound: jupiterInfo?.status === JupiterStatus.Success,
            name: EVerificationSource.Jupiter,
            verified: jupiterVerified,
        },
        {
            applyUrl: 'https://help.solflare.com/en/articles/9260147-i-cannot-find-a-token-in-solflare',
            icon: <Icon src={SolflareLogo} alt="Solflare" />,
            isVerificationFound: tokenInfo && 'verified' in tokenInfo,
            name: EVerificationSource.Solflare,
            verified: solflareVerified,
        },
        {
            applyUrl: 'https://rugcheck.xyz/',
            icon: <Icon src={RugCheckLogo} alt="RugCheck" />,
            isVerificationFound: rugCheckInfo?.status === RugCheckStatus.Success,
            level: rugCheckLevel,
            name: EVerificationSource.RugCheck,
            score: rugCheckScore,
            verified: rugCheckVerified,
        },
    ];

    const verifiedSources = sources.filter(s => s.verified);
    const unverifiedSources = sources.filter(s => !s.verified);
    const verificationFoundSources = sources.filter(s => s.isVerificationFound);

    return { isLoading, sources, unverifiedSources, verificationFoundSources, verifiedSources };
}
