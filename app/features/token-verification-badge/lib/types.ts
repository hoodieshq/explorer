export enum EVerificationSource {
    Bluprynt = 'Bluprynt',
    CoinGecko = 'CoinGecko',
    Solflare = 'Solflare',
    Jupiter = 'Jupiter',
    RugCheck = 'RugCheck',
}

export type VerificationSource = {
    applyUrl?: string;
    icon: React.ReactNode;
    isRateLimited?: boolean;
    isVerificationFound?: boolean;
    level?: string;
    name: string;
    score?: number;
    url?: string;
    verified: boolean;
};
