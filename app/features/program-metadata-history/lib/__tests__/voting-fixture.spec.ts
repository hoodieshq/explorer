import { AccountStatus } from '@entities/account-history';
import { describe, expect, it } from 'vitest';

import { loadVotingPmpFixture } from '../__fixtures__';
import { InstructionType } from '../types';

/**
 * Smoke test that runs the full parse + replay pipeline against real on-chain data captured
 * for the devnet `voting` program. Catches regressions in `parseMetadataTransaction`,
 * `applyEvent`, and the snapshotState projection in one place.
 */
describe('voting PMP fixture', () => {
    const result = loadVotingPmpFixture();

    it('should expand raw transactions into more snapshots (inner CPIs are walked)', () => {
        expect(result.snapshots.length).toBeGreaterThan(result.totalSignatures);
    });

    it('should mark every emitted snapshot with an empty bufferData (snapshotState projection)', () => {
        for (const snapshot of result.snapshots) {
            expect(snapshot.state.bufferData.length).toBe(0);
        }
    });

    it('should produce an Initialize as the first chronological snapshot', () => {
        const first = result.snapshots[0];
        expect(first.event.instructionType).toBe(InstructionType.Initialize);
        expect(first.state.status).toBe(AccountStatus.Active);
    });

    it('should decode the Initialize content as the voting program IDL JSON', () => {
        const first = result.snapshots[0];
        expect(first.state.content).toContain('"voting"');
        expect(first.state.content).toContain('"instructions"');
    });

    it('should end the captured history with status=Closed and dataSize=0', () => {
        const latest = result.snapshots[result.snapshots.length - 1];
        expect(latest.state.status).toBe(AccountStatus.Closed);
        expect(latest.state.dataSize).toBe(0);
        expect(latest.state.content).toBeUndefined();
    });

    it('should preserve a decoded snapshot for the panel fallback even after Close', () => {
        // The smart card walks backwards to find the most recent state.content !== undefined.
        const lastWithContent = result.snapshots.filter(s => s.state.content !== undefined).at(-1);
        expect(lastWithContent).toBeDefined();
        expect(lastWithContent?.state.content).toContain('"voting"');
    });

    it('should record at least one SetAuthority handover', () => {
        const handovers = result.snapshots.filter(s => s.event.instructionType === InstructionType.SetAuthority);
        expect(handovers.length).toBeGreaterThan(0);
        for (const h of handovers) {
            expect(h.event.newAuthority).toBeTruthy();
        }
    });
});
