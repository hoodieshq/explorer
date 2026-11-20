import { gen } from '@__fixtures__/gen';
import { fromRpcTransaction, type RpcTransactionResponse } from '@explorer/parsers/transaction';
import { type ParsedMessage, type ParsedMessageAccount, PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { AccountBadges } from '../AccountBadges';

const PUBKEY = gen.publicKey(1);
const FEE_PAYER = gen.address(1);
const LOOKUP_TABLE_LOADED_ADDRESS = gen.address(2);

const readonlyAccount: ParsedMessageAccount = {
    pubkey: PUBKEY,
    signer: false,
    source: 'transaction',
    writable: false,
};

const message = { accountKeys: [], addressTableLookups: [], instructions: [] } as unknown as ParsedMessage;

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

describe('AccountBadges', () => {
    test('should emit no node when no condition matches', () => {
        const { container } = render(
            <AccountBadges index={1} message={message} pubkey={PUBKEY} account={readonlyAccount} />,
        );

        expect(container.childNodes.length).toBe(0);
    });

    test('should emit a node for the fee payer', () => {
        const { container } = render(
            <AccountBadges index={0} message={message} pubkey={PUBKEY} account={readonlyAccount} />,
        );

        expect(container.childNodes.length).toBeGreaterThan(0);
    });
});

describe('AccountBadges lookup table badge under jsonParsed', () => {
    test('should render the lookup table badge while the parsed account carries no lookupTableAddress', () => {
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

        render(<AccountBadges account={account} index={1} pubkey={account.pubkey} message={message} />);

        expect(screen.getByText('Address Table Lookup')).toBeInTheDocument();
    });
});
