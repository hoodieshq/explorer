import { gen } from '@__fixtures__/gen';
import { fromRpcTransaction, type RpcTransactionResponse } from '@explorer/parsers/transaction';
import type { ParsedMessage, ParsedMessageAccount } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { AccountBadges } from '../AccountBadges';

const FEE_PAYER = gen.address(1);
const LOOKUP_TABLE_LOADED_ADDRESS = gen.address(2);

function jsonParsedResponse(): RpcTransactionResponse {
    return {
        transaction: {
            message: {
                accountKeys: [
                    { pubkey: FEE_PAYER, signer: true, source: 'transaction', writable: true },
                    { pubkey: LOOKUP_TABLE_LOADED_ADDRESS, signer: false, source: 'lookupTable', writable: true },
                ],
                instructions: [],
                recentBlockhash: gen.blockhash(),
            },
            signatures: [gen.signature(1)],
        },
        version: 0,
    };
}

describe('AccountBadges lookup table badge under jsonParsed', () => {
    it('should render the lookup table badge while the parsed account carries no lookupTableAddress', () => {
        const parsedTransaction = fromRpcTransaction(jsonParsedResponse());
        const lookupAccount = parsedTransaction.accounts.find(
            account => account.address === LOOKUP_TABLE_LOADED_ADDRESS,
        );
        expect(lookupAccount?.lookupTableAddress).toBeUndefined();

        const account = {
            pubkey: new PublicKey(LOOKUP_TABLE_LOADED_ADDRESS),
            signer: false,
            source: 'lookupTable',
            writable: true,
        } as ParsedMessageAccount;
        const message = { instructions: [] } as unknown as ParsedMessage;

        render(<AccountBadges account={account} index={1} pubkey={account.pubkey} message={message} />);

        expect(screen.getByText('Address Table Lookup')).toBeInTheDocument();
    });
});
