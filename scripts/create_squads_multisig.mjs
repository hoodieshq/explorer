// FIXME: remove upon publishing PR. experiment with squads

import * as multisig from '@sqds/multisig';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';

// pnpx ts-node --esm scripts/create_squads_multisig.mjs

// Defines permissions enum
const { Permission, Permissions } = multisig.types;

// Permission constants
const PERMISSION_INITIATE = 1 << 0;
const PERMISSION_VOTE = 1 << 1;
const PERMISSION_EXECUTE = 1 << 2;

// Helper to create permissions
const createPermissions = (initiate, vote, execute) => {
    let mask = 0;
    if (initiate) mask |= PERMISSION_INITIATE;
    if (vote) mask |= PERMISSION_VOTE;
    if (execute) mask |= PERMISSION_EXECUTE;
    return { mask };
};

async function main() {
    // Cluster Connection
    // Required argument if you use the .rpc method
    const connection = new Connection('https://lulu-wvhzen-fast-devnet.helius-rpc.com');

    // Random Public Key that will be used to derive a multisig PDA
    // This will need to be a signer on the transaction
    const createKey = Keypair.generate().publicKey;

    // Creator should be a Keypair or a Wallet Adapter wallet
    const creator = {
        publicKey: new PublicKey('4ASmCJc8BxA6d6mHVnPLGbCof7LgMC2v92YeEQ7aSPNn'),
    }; //Keypair.generate();

    // Derive the multisig PDA
    const [multisigPda] = multisig.getMultisigPda({
        createKey,
    });

    const programConfigPda = multisig.getProgramConfigPda({})[0];

    const programConfig = await multisig.accounts.ProgramConfig.fromAccountAddress(connection, programConfigPda);

    const configTreasury = programConfig.treasury;
    console.log({ programConfig });
    const timeLock = 0;

    const members = [
        {
            key: creator.publicKey,
            permissions: createPermissions(true, true, true), // All permissions
        },
    ];

    const params = {
        programConfigPda,
        // Must sign the transaction, unless the .rpc method is used.
        createKey: createKey,
        // The creator & fee payer
        creator: creator.publicKey,
        // The PDA of the multisig you are creating, derived by a random PublicKey
        multisigPda,
        // Here the config authority will be the system program
        configAuthority: null,
        // Create without any time-lock
        timeLock: timeLock,
        // List of the members to add to the multisig
        members: [
            {
                // Members Public Key
                key: creator.publicKey,
                // Granted Proposer, Voter, and Executor permissions
                permissions: Permissions.all(),
            },
            // {
            //     key: secondMember.publicKey,
            //     // Member can only add votes to proposed transactions
            //     permissions: Permissions.fromPermissions([Permission.Vote]),
            // },
        ],
        // This means that there needs to be 2 votes for a transaction proposal to be approved
        threshold: 1,
        // This is for the program config treasury account
        treasury: configTreasury,
        // Rent reclaim account
        rentCollector: null,
        systemProgram: SystemProgram.programId,
        arguments: JSON.stringify({
            configAuthority: null, //programConfig.authority.toBuffer(), //configAuthority:
            timeLock: 0, //new BN(1), //threshold
            members, //creator.publicKey.toBuffer(), //members:
            threshold: 1, //new BN(timeLock), //timeLock:
            memo: null,
        }),
    };

    console.log(params);

    return;
    const ix = await multisig.instructions.multisigCreateV2({
        // Must sign the transaction, unless the .rpc method is used.
        createKey: createKey.publicKey,
        // The creator & fee payer
        creator: creator.publicKey,
        // The PDA of the multisig you are creating, derived by a random PublicKey
        multisigPda,
        // Here the config authority will be the system program
        configAuthority: null,
        // Create without any time-lock
        timeLock: 0,
        // List of the members to add to the multisig
        members: [
            {
                // Members Public Key
                key: creator.publicKey,
                // Granted Proposer, Voter, and Executor permissions
                permissions: Permissions.all(),
            },
            {
                key: secondMember.publicKey,
                // Member can only add votes to proposed transactions
                permissions: Permissions.fromPermissions([Permission.Vote]),
            },
        ],
        // This means that there needs to be 2 votes for a transaction proposal to be approved
        threshold: 2,
        // This is for the program config treasury account
        treasury: configTreasury,
        // Rent reclaim account
        rentCollector: null,
    });

    console.log('Multisig created: ', signature);
}

await main();
