import type { ReceiptSol, ReceiptToken } from './model/types';

export type FormattedBaseReceipt = {
    date: string;
    fee: string;
    total: string;
    network: string;
};

export type FormattedReceiptSol = Omit<ReceiptSol, 'date' | 'fee' | 'total'> & FormattedBaseReceipt;

export type FormattedReceiptToken = Omit<ReceiptToken, 'date' | 'fee' | 'total'> &
    FormattedBaseReceipt & {
        symbol?: string | undefined;
    };

export type FormattedReceipt = FormattedReceiptSol | FormattedReceiptToken;
