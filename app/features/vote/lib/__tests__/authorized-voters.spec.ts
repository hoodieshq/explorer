import { Keypair, PublicKey } from '@solana/web3.js';
import { describe, expect, it } from 'vitest';

import { collapseAuthorizedVoters } from '../authorized-voters';

describe('@features/vote', () => {
    describe('collapseAuthorizedVoters', () => {
        it('should collapse the per-epoch copies of an unchanged authority', () => {
            const voter = randomPubkey();

            const collapsed = collapseAuthorizedVoters([
                { authorizedVoter: voter, epoch: 1020 },
                { authorizedVoter: voter, epoch: 1021 },
            ]);

            expect(collapsed).toStrictEqual([{ authorizedVoter: voter, epoch: 1020 }]);
        });

        it('should keep a rotation, dated by the epoch the new key takes effect', () => {
            const outgoing = randomPubkey();
            const incoming = randomPubkey();

            const collapsed = collapseAuthorizedVoters([
                { authorizedVoter: outgoing, epoch: 1020 },
                { authorizedVoter: outgoing, epoch: 1021 },
                { authorizedVoter: incoming, epoch: 1022 },
            ]);

            expect(collapsed).toStrictEqual([
                { authorizedVoter: outgoing, epoch: 1020 },
                { authorizedVoter: incoming, epoch: 1022 },
            ]);
        });

        it('should keep two runs of the same key apart', () => {
            // Rotating away and back is legal. Grouping by pubkey would claim voterA signed epoch 1021.
            const voterA = randomPubkey();
            const voterB = randomPubkey();

            const collapsed = collapseAuthorizedVoters([
                { authorizedVoter: voterA, epoch: 1020 },
                { authorizedVoter: voterB, epoch: 1021 },
                { authorizedVoter: voterA, epoch: 1023 },
            ]);

            expect(collapsed.map(voter => voter.epoch)).toStrictEqual([1020, 1021, 1023]);
        });

        it('should order by epoch regardless of the input order', () => {
            const voterA = randomPubkey();
            const voterB = randomPubkey();

            const collapsed = collapseAuthorizedVoters([
                { authorizedVoter: voterB, epoch: 1022 },
                { authorizedVoter: voterA, epoch: 1020 },
            ]);

            expect(collapsed.map(voter => voter.epoch)).toStrictEqual([1020, 1022]);
            expect(collapsed[0].authorizedVoter).toBe(voterA);
        });

        it('should compare keys by value, since each entry decodes into its own PublicKey', () => {
            const voter = randomPubkey();

            const collapsed = collapseAuthorizedVoters([
                { authorizedVoter: voter, epoch: 1020 },
                { authorizedVoter: new PublicKey(voter.toBase58()), epoch: 1021 },
            ]);

            expect(collapsed).toHaveLength(1);
        });

        it('should not mutate the input', () => {
            const voterA = randomPubkey();
            const voterB = randomPubkey();
            const voters = [
                { authorizedVoter: voterB, epoch: 1022 },
                { authorizedVoter: voterA, epoch: 1020 },
            ];

            collapseAuthorizedVoters(voters);

            expect(voters.map(voter => voter.epoch)).toStrictEqual([1022, 1020]);
        });

        it('should return nothing for an empty map', () => {
            expect(collapseAuthorizedVoters([])).toStrictEqual([]);
        });
    });
});

function randomPubkey() {
    return Keypair.generate().publicKey;
}
