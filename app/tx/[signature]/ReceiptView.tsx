'use client';

import { SignatureContext } from '@components/instruction/SignatureContext';
import { TransactionSignature } from '@solana/web3.js';
import React from 'react';

type Props = {
    signature: TransactionSignature;
};

export function ReceiptView({ signature }: Props) {
    return (
        <SignatureContext.Provider value={signature}>
            receipt
        </SignatureContext.Provider>
    );
}
