/**
 * Decorators and RPC stubs specific to the `storybook-design` slices. Kept here (rather than in
 * the shared `.storybook/responsive-decorators.tsx`) so the design-slice tooling stays confined to
 * this folder and doesn't touch the main Storybook config.
 */
import type { Decorator } from '@storybook-config/types';
import React from 'react';

const stubbedUndefined = async () => undefined;
const stubbedNumber = async () => 0;
const stubbedArray = async () => [];

/**
 * Base `@solana/web3.js` Connection RPC stubs, applied on `Connection.prototype` so design-slice
 * stories don't hit a real Solana RPC. Slice decorators (e.g. `withTabPreviewData`) layer their
 * own overrides on top of this set.
 */
export const rpcMethodStubs: Record<string, unknown> = {
    getAccountInfo: stubbedUndefined,
    getBalance: stubbedNumber,
    getBlockHeight: stubbedNumber,
    getMultipleAccountsInfo: stubbedArray,
    getParsedAccountInfo: stubbedUndefined,
    getParsedTokenAccountsByOwner: stubbedArray,
    getParsedTransaction: stubbedUndefined,
    getSignaturesForAddress: stubbedArray,
    getSlot: stubbedNumber,
    getTransaction: stubbedUndefined,
};

/**
 * Caps a standalone story at the `col` column-width token (max-w-col) and centers it, mirroring
 * the content column the real page wraps the section/card in. Use on stories whose component, on
 * the page, sits inside the centered content column — so the card constrains its width the same
 * way in isolation without hardcoding the value itself.
 */
export const withColumnWidth: Decorator = Story => (
    <div className="max-w-col mx-auto w-full">
        <Story />
    </div>
);
