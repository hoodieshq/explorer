export type FormattedBaseReceipt = {
    date: {
        timestamp: number;
        utc: string;
    };
    fee: {
        raw: number;
        formatted: string;
    };
    total: {
        raw: number;
        formatted: string;
        unit: string;
    };
    network: string;
    sender: {
        address: string;
        truncated: string;
        domain?: string;
    };
    receiver: {
        address: string;
        truncated: string;
        domain?: string;
    };
    memo?: string | undefined;
    logoURI?: string | undefined;
};

export type FormattedReceiptSol = FormattedBaseReceipt;

export type FormattedReceiptToken = FormattedBaseReceipt & {
    symbol?: string | undefined;
};

export type FormattedReceipt = FormattedReceiptSol | FormattedReceiptToken;
