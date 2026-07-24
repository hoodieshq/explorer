// Mock data for the subscriptions design slice.
//
// The REAL rows below were pulled from the live devnet Subscriptions tab for:
//   /address/8NMTsvBURPYJvzRCmxcudtyXt63zCQb4b2LzdF5S2KZ2/subscriptions?cluster=devnet
// That wallet's tab renders two populated blocks — Plans (32 rows) and Subscriptions (24 rows).
// The remaining block types (own Delegations, Received Subscriptions, Received Delegations) have
// no live rows for this wallet, so they are seeded with DERIVED rows that reuse the same real
// addresses / mint / amounts so each block can still be reviewed as its own entity.

import { gen } from '@__fixtures__/gen';
import type { Account } from '@providers/accounts';
import { type Address, address } from '@solana/kit';
import {
    AccountDiscriminator,
    type FixedDelegation,
    type Plan,
    type PlanWithAddress,
    PlanStatus,
    type RecurringDelegation,
    type SubscriptionDelegation,
} from '@solana/subscriptions';
import { PublicKey, SystemProgram } from '@solana/web3.js';

import type { NavigationTab } from '@/app/shared/ui/navigation-tabs';

const ZERO = address('11111111111111111111111111111111');

/** REAL — the page address; owner of every plan and delegator of every own subscription. */
export const WALLET_ADDRESS = '8NMTsvBURPYJvzRCmxcudtyXt63zCQb4b2LzdF5S2KZ2';
const WALLET = address(WALLET_ADDRESS);

/** REAL — the token mint shared by every plan on this page. */
const PLAN_MINT = address('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

const HOUR_720 = 720n; // the period on almost every row ("720 hours")
const NEVER = 0n; // expiry "Never"

// --- Builders --------------------------------------------------------------------------------

function makePlan(account: string, planId: bigint, amount: bigint, periodHours = HOUR_720): PlanWithAddress {
    const plan: Plan = {
        bump: 255,
        data: {
            destinations: [ZERO, ZERO, ZERO, ZERO],
            endTs: NEVER,
            metadataUri: '',
            mint: PLAN_MINT,
            planId,
            pullers: [ZERO, ZERO, ZERO, ZERO],
            terms: { amount, createdAt: NEVER, periodHours },
        },
        discriminator: AccountDiscriminator.Plan,
        owner: WALLET,
        status: PlanStatus.Active,
    };
    return { address: address(account), data: plan };
}

function makeSubscription(
    account: string,
    delegatee: string,
    amount: bigint,
    periodHours = HOUR_720,
    expiresAtTs = NEVER,
): { address: Address; data: SubscriptionDelegation; kind: 'subscription' } {
    const data: SubscriptionDelegation = {
        amountPulledInPeriod: 0n,
        currentPeriodStartTs: 0n,
        expiresAtTs,
        header: {
            bump: 251,
            delegatee: address(delegatee),
            delegator: WALLET,
            discriminator: AccountDiscriminator.SubscriptionDelegation,
            initId: 0n,
            payer: ZERO,
            version: 1,
        },
        terms: { amount, createdAt: NEVER, periodHours },
    };
    return { address: address(account), data, kind: 'subscription' };
}

// --- REAL: Plans block (32 rows) -------------------------------------------------------------

export const PLANS: PlanWithAddress[] = [
    makePlan('5kvqDoHt3ZaLumhqHoD757N1mtjKp2adtYZjvEq8DHN', 1783224324017652036n, 1_000_000n),
    makePlan('NV36bDzBCghVcCwV2Vx1ue5escT6rT6BkyEVd5wryyQ', 1783321058534248751n, 5_000_000n),
    makePlan('2fF9tmBFLYDQ9EQ4wvGuGomvt14zeYCqYshpsrvBiNRE', 1781580105064854892n, 10_000_000n),
    makePlan('2w8mmuB8i26i1b3efTRR4BpqM4VbaWghuU2Acteh6LbK', 1783243611471530723n, 1_000_000n),
    makePlan('3ebzSL48BAgC2pTyG1bcwBy9snXS74GM5QbjhbzNS89e', 1783223569667112735n, 1_000_000n),
    makePlan('5YajogzYPdnkgXMJ7L6xwjnzhB4L6LEBkAmbmFj7Psi2', 1783224948394394802n, 1_000_000n),
    makePlan('5mGywC9nmyJtfe2wpfx6zYdzgTEyBF1RySFweyEAgRN6', 1783321557637950046n, 7_000_000n),
    makePlan('5msUqTrSe1Ckkr1dW1G7n227dwbhp6wfgpg216XNzDgZ', 1783320300499226532n, 2_000_000n),
    makePlan('6kbZqnDt1haESk2jB5Vju5YrztkFt1Q3o2ooLjEq8tWm', 1781580097569187534n, 7_000_000n),
    makePlan('7599LST3WfR6ZJKrHhzpxBXM7W5YRzqFNBqsj5qfHwyc', 1781583333238666324n, 1_000_000n),
    makePlan('7AfhAGzota7H6EFF5HbnF7fqK3zTJz9aN5rQdWUFACdK', 1783187124442544961n, 3_000_000n),
    makePlan('7kk2Fy6cASzbqXgzJnxn8PxtzmmNf8QFbQv853poDzEK', 1783217345579229244n, 1_000_000n),
    makePlan('7mNUEKmVhG1smXMNoRrvvd3DdrD4ZRraaGkRsdzcmzny', 1783222240686273286n, 1_000_000n),
    makePlan('7nHiZ6UMsAtmTu2coX1UKfSZRzD8zuCX4yrqZYysqCJb', 1783318621355472170n, 3_000_000n),
    makePlan('8BpXAEovk1FG6tqk7GAYshJ7sS5WHp9bQrSXrYprn7JG', 1783243410193914040n, 1_000_000n),
    makePlan('8d1cwbABddoULzQMCAJF4Exmhqjigv1JGhuMdfxEkhJN', 1781576934057307846n, 10_000_000n),
    makePlan('9A3XcXYs3SDhh82BY7mczdgTcTGwbF6WKrmXQZeZfVti', 1783222759655539682n, 2_000_000n),
    makePlan('9d8GBVNHKopgUcs919gtkGrth9hUPVG9m98EBuUErgZN', 1781507658407596481n, 1_000_000n, 2160n),
    makePlan('BUfa7Sdxqrk5sViYe7kCTXom7igWx6D2op639eeqKs69', 1783222512434157076n, 1_000_000n),
    makePlan('CRevyjFJuy7c6fbnGhnThzkfCwMCdKaL5MktyitZnpvD', 1781919332767322580n, 1_000_000n),
    makePlan('CSr4HSrVv51AGC4NX4czRibLqvfy9n1fr1XHomUuJyzi', 1783322968330523301n, 3_000_000n),
    makePlan('CUBVTC5s2xYXT6JC8EMd78eQyCdjQs8piYVDmWeaByZz', 1783234225986942450n, 1_000_000n),
    makePlan('CYJM6kmkyDazXo4k97pxZ4i78d6RpYLkxNbjKRzTP9XN', 1783223020127778452n, 1_000_000n),
    makePlan('Car59jVMRh79ceEY3JzF215PsNBdDQBxP74HtwGUuyW4', 1783241705399859280n, 2_000_000n),
    makePlan('DepGHk4Z3p5KaHiJYypYCLtwSB2roXC8jAs7wYhHnExn', 1783221607590191600n, 1_000_000n),
    makePlan('EvdFNtpkz9tz1u5o3RyNLbFtwsz3JFZeHPNZZtnY5r6e', 1783225680489585535n, 1_000_000n),
    makePlan('FFiHW7HaYaeXEWHvzAUcNBZ9Y3PMd9wWV6D4GyDNtRaV', 1781580044497303352n, 5_000_000n),
    makePlan('FLpNg5C22sQMurjTGJfjYj3f51bJabpxTvQAq7TnLVwm', 1781576899051949794n, 5_000_000n),
    makePlan('FUca1j5m41BLNT1pT5nF45Rh2iBdrW3co8iLBxqWj28a', 1783241369714694397n, 1_000_000n),
    makePlan('GHFownChgTbeBNptNM6PPJu469yLQzRxRz1FeMFsKKz5', 1781576922168311872n, 7_000_000n),
    makePlan('GvG3xMLJfJioL2Ca8DPM7MANMsJ1aT7N3br2kmCpLeVK', 1783222750918912592n, 1_000_000n),
    makePlan('HQdvgjDYQU1uZKLaWLe6gwUa6WD2D2kYLY4iMeUgqcem', 1781928311566318543n, 20_000_000n),
];

// --- REAL: Subscriptions block (24 rows, this wallet is the delegator) -----------------------

export const SUBSCRIPTIONS = [
    makeSubscription('12AAu76xvPxLbu9LacitvW7P1UkfmBmFyhPLXaRbpRJ2', 'EPsfEpS9mp8WpyX7FaPy86H5wajimdER3vTCBmHamMNJ', 20_000_000n),
    makeSubscription('LK3ycKLdHp31NEn9eDP6qkW7gHKtp1D9Y1cG6hNsZeH', '7jtReQR3n9kDTEBprB5bYzCrnkEx6GEYZVngFhXRr2zS', 9_000_000n),
    makeSubscription('LnLAgwPgYS9Vqk1KVwpyqdz1ycHjt92Wo1QX8qHez8V', '8BpXAEovk1FG6tqk7GAYshJ7sS5WHp9bQrSXrYprn7JG', 1_000_000n),
    makeSubscription('2YGFXoUrZsf5y96WdifENcEcZ2YhwzW5iiYprweo4Vcg', 'FFiHW7HaYaeXEWHvzAUcNBZ9Y3PMd9wWV6D4GyDNtRaV', 5_000_000n),
    makeSubscription('2n8gxHojmm2UPUV1UZnPMPuQgWRTHKBxaJ1JEbE7n4br', '4QU4G3F5eQJTs4hKU11gkuxYchHC9W3mRG7UWajQcMQi', 1_000_000n),
    makeSubscription('4KWs5PkTVeJTeQ1BFAL27ZToNYGuEqr9pMQDRDj4USvr', 'NV36bDzBCghVcCwV2Vx1ue5escT6rT6BkyEVd5wryyQ', 5_000_000n),
    makeSubscription('54B5zwdNrdGTQD79kQbNCjcQENUieW2TeV8KJQQvQLxX', '7nHiZ6UMsAtmTu2coX1UKfSZRzD8zuCX4yrqZYysqCJb', 3_000_000n),
    makeSubscription('5fUNL9BbiscJkW45kZyJU2k5DobeCENbYG9VjKoDyKKx', 'D5Vk4Qfm53ZzJjrH4FLe1BGuHL2UWyRXXcCnQNhSNuvE', 10_000_000n, 168n),
    makeSubscription('7CLDBv3z6eA2KF6AqJSZWKo1q47hWfSwWe9JsasrS6FS', 'FqPdaNZC54T9Yh7ytyYEfMxug3nx8v5ZEyirFmfP13dh', 1_000_000n),
    makeSubscription('7agQ6Z8zrmSriixr2KhDhjCyd29yByWbtf6Yy3pJQ37H', '5sh3mMkfCNEkaZEHCRde98sxguXLGVEQCqFfhWhEYwMr', 1_000_000n),
    makeSubscription('85SnfwgcGNVEJJwRf4wnsoQDGFD9hjerTFetguSCqR2P', 'Car59jVMRh79ceEY3JzF215PsNBdDQBxP74HtwGUuyW4', 2_000_000n),
    makeSubscription('8SzhCVH2qgJ4KGyu7Lxd9JJqFboBsnstV58LARdBGtLH', '4HNakTUk5rCicbuR6begZwsbyF8cvHjc2YrNQn7Wn8Qg', 2_000_000n),
    makeSubscription('8WN2M5R7t8MC4vZFaUpELXuay8yt2qgJ4xs9FWQymwEP', '6kbZqnDt1haESk2jB5Vju5YrztkFt1Q3o2ooLjEq8tWm', 7_000_000n),
    makeSubscription('8YThuM7LRpqxikDkJHkkm5mtj8gpPyj5Q3YDAvyMJmZB', 'DDcTZLh5wPrqyE9aG5z3fG7v1qJUJJCCUPWJNJTiVeyg', 2_000_000n),
    makeSubscription('9dciyysoPuNfgvcSpnKbw7cqeTr19pzQbUV9Y33EsWHk', '8jd8pUqw3iJcHJwkJbdMutd8rKRA1T6Z4WjdkFkCTeoW', 2_000_000n),
    makeSubscription('9jrR3u6vt9ECuZfHmHEX9YpZkTp9a1NdJvQhTuFoR26F', 'EvdFNtpkz9tz1u5o3RyNLbFtwsz3JFZeHPNZZtnY5r6e', 1_000_000n),
    makeSubscription('Ahxxff6UuD6gcGtn3oskUYBBZ8tXGVBeg4zt6Yiqp1zA', '7599LST3WfR6ZJKrHhzpxBXM7W5YRzqFNBqsj5qfHwyc', 1_000_000n),
    makeSubscription('BX57D5asoLmQv8ZUWPZJu4Vs87J2Vb6zkcrjXhyD19vk', '4bgUcwugJ9NKWiaw1S3TmzoNniRy7FLEBYPYtJEEVyaf', 1_000_000n, 2160n),
    makeSubscription('CQ2ofr8od7zYPEbHuYj24hbp2dBu8FKYvAyaLtqwcmUm', 'ARMhaA8TYc9AnQg8fB8DircmRoYJgwSnV9P2CTY2vQW6', 1_000_000n, 168n),
    makeSubscription('CkYWDwgqb4VKsD7gB6iYumoNuvfPHVD7XdpZq2FGxZww', 'Cw6aZ6hKU42jrEHsz2NBWV6ahYQf5d8Ymcjp56JV3WKo', 10_000_000n),
    makeSubscription('E3HFEsFUk5hGasyaJBcoP88hpR4EeF6FkeELZMSCdb4K', 'BY8tBCZ4TSvAALNQuiv2BPpdEKBifHZX4tqNPP5uyCZk', 2_000_000n, HOUR_720, 1783605474n),
    makeSubscription('Fy21mqGSH466PrgLVWfyG1N1SyJHG3LyCczuKMV1f38y', '5xtVfVAe444WpnLSiLA5gkMbQdASGYxBWJnzSGjTjZFD', 1_000_000n),
    makeSubscription('HR8y18MQk6oHA1rZqJVqA7rswVMRPiH8EHjLMviNmwrv', 'xbc1zedc6CKZWUGMkFPR3yCuNn2EfjxWYK7hbpAvPQt', 1_000_000n, 24n),
    makeSubscription('HsaHpPHLvBvbZvSQyLcwdFDHZQS84KHYZd3DYwMQcCcT', 'EtFzVfYxvvWSEizi2iEquKufjTccvq2vqPr9URH6bXXE', 3_000_000n),
];

// --- DERIVED: blocks with no live rows for this wallet (real-shaped, so each entity renders) --

const DERIVED_DELEGATEE = address('EPsfEpS9mp8WpyX7FaPy86H5wajimdER3vTCBmHamMNJ');

const FIXED_DELEGATION: FixedDelegation = {
    amount: 5_000_000n,
    expiryTs: NEVER,
    header: {
        bump: 253,
        delegatee: DERIVED_DELEGATEE,
        delegator: WALLET,
        discriminator: AccountDiscriminator.FixedDelegation,
        initId: 1n,
        payer: ZERO,
        version: 1,
    },
    mint: PLAN_MINT,
    subscriptionAuthority: ZERO,
};

const RECURRING_DELEGATION: RecurringDelegation = {
    amountPerPeriod: 1_000_000n,
    amountPulledInPeriod: 0n,
    currentPeriodStartTs: 0n,
    expiryTs: NEVER,
    header: {
        bump: 252,
        delegatee: DERIVED_DELEGATEE,
        delegator: WALLET,
        discriminator: AccountDiscriminator.RecurringDelegation,
        initId: 2n,
        payer: ZERO,
        version: 1,
    },
    mint: PLAN_MINT,
    periodLengthS: 3600n * 720n,
    subscriptionAuthority: ZERO,
};

export const DELEGATIONS = [
    { address: address(gen.address(201)), data: FIXED_DELEGATION, kind: 'fixed' as const },
    { address: address(gen.address(202)), data: RECURRING_DELEGATION, kind: 'recurring' as const },
];

export const RECEIVED_SUBSCRIPTIONS = [
    {
        address: address(gen.address(203)),
        data: {
            amountPulledInPeriod: 0n,
            currentPeriodStartTs: 0n,
            expiresAtTs: NEVER,
            header: {
                bump: 251,
                delegatee: WALLET,
                delegator: DERIVED_DELEGATEE,
                discriminator: AccountDiscriminator.SubscriptionDelegation,
                initId: 4n,
                payer: ZERO,
                version: 1,
            },
            terms: { amount: 4_000_000n, createdAt: NEVER, periodHours: HOUR_720 },
        } satisfies SubscriptionDelegation,
        kind: 'subscription' as const,
    },
];

export const RECEIVED_DELEGATIONS = [
    {
        address: address(gen.address(204)),
        data: {
            ...FIXED_DELEGATION,
            header: { ...FIXED_DELEGATION.header, delegatee: WALLET, delegator: DERIVED_DELEGATEE, initId: 3n },
        },
        kind: 'fixed' as const,
    },
];

// --- Data bundles ----------------------------------------------------------------------------

/** REAL live page: the Plans and Subscriptions blocks, exactly as rendered on devnet. */
export const DEFAULT_PAGE = {
    delegations: SUBSCRIPTIONS,
    delegationsReceived: [],
    plans: PLANS,
};

/** Every block populated at once — for reviewing the full composition. */
export const ALL_SECTIONS = {
    delegations: [...SUBSCRIPTIONS, ...DELEGATIONS],
    delegationsReceived: [...RECEIVED_SUBSCRIPTIONS, ...RECEIVED_DELEGATIONS],
    plans: PLANS,
};

export const EMPTY_PAGE = { delegations: [], delegationsReceived: [], plans: [] };

// --- Full-page chrome: account overview + tab bar ---------------------------------------------
// REAL: the account itself is a plain System-owned wallet (~4.8087518 SOL, 0 bytes, not executable),
// rendered as the "Overview" (UnknownAccountCard). Tabs mirror the live page for this address.

export const MOCK_ACCOUNT: Account = {
    data: {},
    executable: false,
    lamports: 4_808_751_800, // ~4.8087518 SOL
    owner: SystemProgram.programId,
    pubkey: new PublicKey(WALLET_ADDRESS),
    space: 0,
};

export const ADDRESS_TABS: NavigationTab[] = [
    { path: '', title: 'History' },
    { path: 'metadata', title: 'Metadata' },
    { path: 'attributes', title: 'Attributes' },
    { path: 'compression', title: 'Compression' },
    { path: 'tokens', title: 'Tokens' },
    { path: 'domains', title: 'Domains' },
    { path: 'subscriptions', title: 'Subscriptions' },
];
