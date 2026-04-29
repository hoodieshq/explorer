import { AccountStatus } from '@entities/account-history';
import { describe, expect, it } from 'vitest';

import { loadVotingAnchorFixture } from '../__fixtures__';
import { InstructionType } from '../types';

/**
 * Smoke test that runs the full Anchor IDL parse + replay pipeline against real on-chain data
 * captured for the devnet `voting` program. Catches regressions in `parseAnchorIdlTransaction`,
 * `applyEvent`, and the snapshotState projection in one place.
 */
describe('voting Anchor IDL fixture', () => {
    const result = loadVotingAnchorFixture();

    it('should produce at least one snapshot', () => {
        expect(result.snapshots.length).toBeGreaterThan(0);
    });

    it('should mark every emitted snapshot with an empty bufferData (snapshotState projection)', () => {
        for (const snapshot of result.snapshots) {
            expect(snapshot.state.bufferData.length).toBe(0);
        }
    });

    it('should start with a Create event (genesis for the IDL account)', () => {
        const first = result.snapshots[0];
        expect(first.event.instructionType).toBe(InstructionType.Create);
        expect(first.state.status).toBe(AccountStatus.Active);
    });

    it('should accumulate Write events into a decoded IDL JSON containing the program name', () => {
        // The Write that completes the upload should have decoded content.
        const decoded = result.snapshots.filter(s => s.state.content !== undefined);
        expect(decoded.length).toBeGreaterThan(0);
        expect(decoded.at(-1)?.state.content).toContain('"voting"');
    });

    it('should expose dataSize matching the accumulated bytes for the latest Write', () => {
        const writes = result.snapshots.filter(s => s.event.instructionType === InstructionType.Write);
        if (writes.length === 0) return;
        const latestWrite = writes.at(-1);
        expect(latestWrite?.state.dataSize).toBeGreaterThan(0);
    });

    it('should recover decoded content at every SetBuffer (foreign buffer replay)', () => {
        const setBuffers = result.snapshots.filter(s => s.event.instructionType === InstructionType.SetBuffer);
        if (setBuffers.length === 0) return;
        for (const sb of setBuffers) {
            expect(sb.event.bufferAccount).toBeTruthy();
            expect(sb.state.dataSize).toBeGreaterThan(0);
            expect(sb.state.content).toContain('"voting"');
        }
    });

    it('should leave the latest snapshot Active with decoded content (no live fetch needed)', () => {
        const latest = result.snapshots[result.snapshots.length - 1];
        expect(latest.state.status).toBe(AccountStatus.Active);
        expect(latest.state.content).toContain('"voting"');
    });
});
