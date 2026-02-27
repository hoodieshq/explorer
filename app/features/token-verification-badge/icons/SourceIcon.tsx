import Image from 'next/image';

import BlupryntLogo from '../icons/bluprynt-logo.png';
import CoinGeckoLogo from '../icons/coingecko-logo.png';
import JupiterLogo from '../icons/jupiter-logo.png';
import RugCheckLogo from '../icons/rugcheck-logo.png';
import SolflareLogo from '../icons/solflare-logo.png';
import { EVerificationSource } from '../lib/types';

const ICON_SIZE = 16;

const SOURCE_ICONS = {
    [EVerificationSource.Bluprynt]: BlupryntLogo,
    [EVerificationSource.CoinGecko]: CoinGeckoLogo,
    [EVerificationSource.Jupiter]: JupiterLogo,
    [EVerificationSource.RugCheck]: RugCheckLogo,
    [EVerificationSource.Solflare]: SolflareLogo,
};

export function SourceIcon({ source }: { source: EVerificationSource }) {
    const icon = SOURCE_ICONS[source];

    return <Image src={icon} alt={source} width={ICON_SIZE} height={ICON_SIZE} className="e-rounded-full" />;
}
