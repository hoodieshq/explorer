// Placeholder values, shaped like base58 addresses but readable as made up, so nobody mistakes an example for a
// real account or pastes it expecting a result.
const FROM = 'SenderWa11et111111111111111111111111111111';
const TO = 'RecipientWa11et11111111111111111111111111';
const BLOCKHASH = 'RecentB1ockhash1111111111111111111111111111';

// `--sign-only` with pubkey signers prints the message without a keypair or an RPC call.
export const EXAMPLE_CLI_COMMAND = `solana transfer ${TO} 0.1 \\
  --from ${FROM} \\
  --fee-payer ${FROM} \\
  --blockhash ${BLOCKHASH} \\
  --sign-only --dump-transaction-message`;
export const EXAMPLE_CLI_FOCUS = '--dump-transaction-message';

export const EXAMPLE_RUST_CODE = `use solana_sdk::{hash::Hash, message::Message, pubkey, system_instruction, transaction::Transaction};
use std::str::FromStr;

fn main() {
    let from = pubkey!("${FROM}");
    let to = pubkey!("${TO}");
    let blockhash = Hash::from_str("${BLOCKHASH}").unwrap();
    let instruction = system_instruction::transfer(&from, &to, 100_000_000);
    let message = Message::new_with_blockhash(&[instruction], Some(&from), &blockhash);
    let transaction = Transaction::new_unsigned(message);
    println!("{}", base64::encode(&transaction.message_data()));
}`;
export const EXAMPLE_RUST_FOCUS = 'println!("{}", base64::encode(&transaction.message_data()));';

export const EXAMPLE_TYPESCRIPT_CODE = `import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

const from = new PublicKey("${FROM}");
const to = new PublicKey("${TO}");
const tx = new Transaction({ feePayer: from, recentBlockhash: "${BLOCKHASH}" }).add(
  SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: 100_000_000 }),
);
console.log(tx.serializeMessage().toString("base64"));`;
export const EXAMPLE_TYPESCRIPT_FOCUS = 'console.log(tx.serializeMessage().toString("base64"));';

export const EXAMPLE_SQUADS_VAULT_TRANSACTION = 'Vau1tTransaction111111111111111111111111111';
export const EXAMPLE_SQUADS_URL = `https://app.squads.so/squads/MySquad1111111111111111111111111111111111/transactions/${EXAMPLE_SQUADS_VAULT_TRANSACTION}`;
