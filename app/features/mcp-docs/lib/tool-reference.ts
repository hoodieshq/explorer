/** Tool reference copy shared by the docs page variants. */

export const INSPECT_ENTITY_COVERS = [
    'SPL Token and Token-2022 mints, token accounts and multisigs, including parsed Token-2022 extensions.',
    'Upgradeable programs — upgradeability, upgrade authority, last deploy slot and on-chain IDL discovery.',
    'Stake, vote, nonce, sysvar, config, address lookup table and feature accounts.',
    'Compressed NFTs, nftoken accounts and Solana Attestation Service accounts.',
    'Transactions — signers, fee, status and instructions with inner instructions, decoded through IDL, bundled and raw sources.',
    'Accounts of unrecognised programs, decoded through the owner program’s on-chain IDL when it publishes one.',
];

// A real reply: USDC mint on mainnet-beta.
export const INSPECT_ENTITY_RESPONSE = `{
    "payload": {
        "entity": {
            "kind": "spl-token:mint",
            "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
            "decimals": 6,
            "freeze_authority": "7dGbd2QZcCKcTndnHcTL8q7SMVXAkp688NTQYwrRCrar",
            "is_initialized": true,
            "mint_authority": "BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG",
            "supply": "7902797573976355",
            "supply_type": "variable",
            "token_program": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
    },
    "errors": []
}`;
