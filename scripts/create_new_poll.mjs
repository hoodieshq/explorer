//FIXME: added scripts for demo. remove them upon publishing the feature

import { SystemProgram, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

//pnpx ts-node --esm scripts/create_new_poll.mjs 1 [<wallet_adddress>]

const programId = new PublicKey('AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye');
const pollId = new BN(process.argv[2]); // or any unique number
const [pollPDA] = PublicKey.findProgramAddressSync([pollId.toArrayLike(Buffer, 'le', 8)], programId);

const wallet = {
    publicKey: new PublicKey(process.argv[3] ?? '4ASmCJc8BxA6d6mHVnPLGbCof7LgMC2v92YeEQ7aSPNn'),
};

const accounts = {
    signer: wallet.publicKey,
    systemProgram: SystemProgram.programId,
    poll: pollPDA,
};

const args = {
    pollId: pollId,
    description: 'Description',
    pollStart: parseInt(Date.now() / 1000), // current timestamp
    pollEnd: parseInt(Date.now() / 1000 + 86400 * 7), // 7 days later
};

console.log({ accounts, args });
