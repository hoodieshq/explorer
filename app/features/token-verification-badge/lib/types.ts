export enum EVerificationSource {
    Bluprynt = 'Bluprynt',
    CoinGecko = 'CoinGecko',
    Solflare = 'Solflare',
    Jupiter = 'Jupiter',
    RugCheck = 'RugCheck',
}

export type VerificationSource = {
    name: string;
    verified: boolean;
    icon: React.ReactNode;
    score?: number;
    level?: string;
    isVerificationFound?: boolean;
    applyUrl?: string;
    url?: string;
};
