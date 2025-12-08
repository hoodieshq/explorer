# Token-2022 Testing Guide

A comprehensive guide for testing Token-2022 instruction support in Solana Explorer from scratch.

## Overview

The explorer now includes support for parsing and displaying Token-2022 program instructions (version 0.6.1):
- **Metadata instructions** (7 types)
- **Group instructions** (8 types)

All instructions are displayed as **structured data**, not raw JSON.

## Creating Test Transactions from Scratch

### Step 1: Start Local Validator

Start a local Solana test validator with the required feature deactivated:

```bash
solana-test-validator --deactivate-feature CxeBn9PVeeXbmjbNwLv6U4C6svNxnC4JX6mfkvgeMocM --reset
```

### Step 2: Run the Token Creation Script

Use the script from this gist: https://gist.github.com/rogaldh/59be2c4cc6ab90679ee2142e24d87a25

The script performs the following steps:

1. **Create Authority** - Generates a new keypair and airdrops 5 SOL
2. **Create Mint** - Creates Token-2022 mint account with metadata extension
3. **Initialize Metadata Pointer** - Points to where metadata is stored (in the mint itself)
4. **Initialize Mint** - Sets up the mint with 9 decimals
5. **Initialize Metadata** - Adds initial metadata (name, symbol, URI)
6. **Create Associated Token Account** - Creates ATA for the authority

**To run the script:**

1. Download the script from the gist
2. Save it as `name.mjs` in the project root
3. Run it:
   ```bash
   pnpx tsx ./name.mjs
   ```

**Expected output:**

```
Mint Address: <mint-address>
Transaction Signature: <signature>
```

The script creates a Token-2022 mint with metadata and returns the mint address and transaction signature.

### Step 3: Test in Explorer

#### Using Local Validator

1. Start the explorer dev server in a **new terminal** (keep validator running):
   ```bash
   pnpm dev
   ```

2. Open the transaction in your browser:
   ```
   http://localhost:3000/tx/<signature>?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899
   ```

3. You should see instructions including:
   - `Initialize Metadata Pointer`
   - `Initialize Token Metadata`


### How to Update Token Metadata

After creating a token with metadata (using the script above), you can update the metadata fields.

#### Create a new script to update metadata

Save this as `update-metadata.mjs`:

```javascript
import {
    getUpdateTokenMetadataFieldInstruction,
} from '@solana-program/token-2022';
import {
    appendTransactionMessageInstructions,
    createSolanaRpc,
    createSolanaRpcSubscriptions,
    createTransactionMessage,
    generateKeyPairSigner,
    getSignatureFromTransaction,
    pipe,
    sendAndConfirmTransactionFactory,
    setTransactionMessageFeePayerSigner,
    setTransactionMessageLifetimeUsingBlockhash,
    signTransactionMessageWithSigners,
    address,
} from '@solana/kit';

const rpc = createSolanaRpc('http://localhost:8899');
const rpcSubscriptions = createSolanaRpcSubscriptions('ws://localhost:8900');

// Use the same authority keypair from the creation script
const authority = await generateKeyPairSigner();

// Use the mint address from the creation script
const mintAddress = address('<your-mint-address>');

// Create update instructions
const updateUriInstruction = getUpdateTokenMetadataFieldInstruction({
    metadata: mintAddress,
    updateAuthority: authority,
    field: { __kind: 'Uri' },
    value: 'https://example.com/updated-metadata.json',
});

const updateNameInstruction = getUpdateTokenMetadataFieldInstruction({
    metadata: mintAddress,
    updateAuthority: authority,
    field: { __kind: 'Name' },
    value: 'Updated Token Name',
});

const updateCustomFieldInstruction = getUpdateTokenMetadataFieldInstruction({
    metadata: mintAddress,
    updateAuthority: authority,
    field: { __kind: 'Key', fields: ['custom_field'] },
    value: 'Custom Value',
});

// Build and send transaction
const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

const updateInstructions = [
    updateUriInstruction,
    updateNameInstruction,
    updateCustomFieldInstruction,
];

const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    tx => setTransactionMessageFeePayerSigner(authority, tx),
    tx => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    tx => appendTransactionMessageInstructions(updateInstructions, tx)
);

const signedTransaction = await signTransactionMessageWithSigners(transactionMessage);

await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTransaction, {
    commitment: 'confirmed',
    skipPreflight: true,
});

const signature = getSignatureFromTransaction(signedTransaction);

console.log('Update Transaction Signature:', signature);
console.log('Test in Explorer:');
console.log(`http://localhost:3000/tx/${signature}?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899`);
```

#### Run the update script

```bash
pnpx tsx ./update-metadata.mjs
```

**Expected output:**

```
Update Transaction Signature: <signature>
Test in Explorer:
http://localhost:3000/tx/<signature>?cluster=custom&customUrl=http%3A%2F%2Flocalhost%3A8899
```

#### What the update transaction contains

The update transaction will have **3 instructions**:

1. **Update Token Metadata Field (URI)**
   - Field: `uri`
   - Value: `https://example.com/updated-metadata.json`

2. **Update Token Metadata Field (Name)**
   - Field: `name`
   - Value: `Updated Token Name`

3. **Update Token Metadata Field (Custom Field)**
   - Field: `custom_field`
   - Value: `Custom Value`

Open the transaction URL in your browser to see these instructions parsed and displayed as structured data in the explorer.

## What to Verify in Explorer

### Metadata Instructions

#### 1. InitializeTokenMetadata
**Fields to verify:**
- Metadata address (PublicKey)
- Mint address (PublicKey)
- Mint authority (PublicKey)
- Name (string)
- Symbol (string)
- Update authority (PublicKey)
- URI (string)

**Expected result:** All fields displayed as structured data, addresses are clickable.

#### 2. UpdateTokenMetadataField
**Fields to verify:**
- Field (field name: "name", "symbol", "uri", or custom)
- Metadata address (PublicKey)
- Update authority (PublicKey)
- Value (new value)

**Example field values:**
- `"uri"` - update URI
- `"name"` - update name
- `"symbol"` - update symbol
- `"custom_field"` - add custom field

**Expected result:** Field displayed as readable string, not as enum/number.

#### 3. RemoveTokenMetadataKey
**Fields to verify:**
- Key (name of key to remove)
- Metadata address (PublicKey)
- Update authority (PublicKey)
- Idempotent (boolean, optional)

#### 4. UpdateTokenMetadataUpdateAuthority
**Fields to verify:**
- Metadata address (PublicKey)
- New update authority (PublicKey)
- Update authority (PublicKey)

#### 5. EmitTokenMetadata
**Fields to verify:**
- Metadata address (PublicKey)
- Start (number or null)
- End (number or null)

#### 6. InitializeMetadataPointer
**Fields to verify:**
- Authority (PublicKey)
- Metadata address (PublicKey)
- Mint (PublicKey)

#### 7. UpdateMetadataPointer
**Fields to verify:**
- Authority (PublicKey)
- Metadata address (PublicKey or null)
- Mint (PublicKey)

### Group Instructions

#### 8. InitializeGroupPointer
**Fields to verify:**
- Authority (PublicKey)
- Group address (PublicKey)
- Mint (PublicKey)

#### 9. UpdateGroupPointer
**Fields to verify:**
- Authority (PublicKey)
- Group address (PublicKey or null)
- Mint (PublicKey)

#### 10. InitializeGroupMemberPointer
**Fields to verify:**
- Authority (PublicKey)
- Member address (PublicKey)
- Mint (PublicKey)

#### 11. UpdateGroupMemberPointer
**Fields to verify:**
- Authority (PublicKey)
- Member address (PublicKey or null)
- Mint (PublicKey)

#### 12. InitializeTokenGroup
**Fields to verify:**
- Group (PublicKey)
- Max size (number)
- Mint (PublicKey)
- Mint authority (PublicKey)
- Update authority (PublicKey)

#### 13. UpdateTokenGroupMaxSize
**Fields to verify:**
- Group (PublicKey)
- Max size (number)
- Update authority (PublicKey)

#### 14. UpdateTokenGroupUpdateAuthority
**Fields to verify:**
- Group (PublicKey)
- New update authority (PublicKey)
- Update authority (PublicKey)

#### 15. InitializeTokenGroupMember
**Fields to verify:**
- Group (PublicKey)
- Group update authority (PublicKey)
- Member (PublicKey)
- Member mint (PublicKey)
- Member mint authority (PublicKey)

## Success Criteria

### Required Checks

1. **Instruction Parsing:**
   - [ ] All Token-2022 instructions are recognized (not shown as "Unknown")
   - [ ] No parsing errors in browser console
   - [ ] No errors in dev server logs

2. **Data Display:**
   - [ ] Data displayed as structured fields, not as JSON
   - [ ] PublicKey fields displayed as clickable links
   - [ ] Numeric values displayed correctly (not as BigInt objects)
   - [ ] String values displayed in full

## Summary

This guide shows how to:

1. Start local validator with correct feature flags
2. Run script to create Token-2022 mint with metadata
3. Update metadata with 3 different instructions
4. Test in explorer with structured data display
5. Verify all 15 supported instructions (7 metadata + 8 group)

The script generates real transactions on local validator that you can immediately test in the explorer running on `localhost:3000`.
