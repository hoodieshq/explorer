import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAnchorProgram } from '@/app/entities/idl';
import { AnchorProgramName } from '@/app/utils/anchor';
import { Cluster } from '@/app/utils/cluster';

vi.mock('@/app/entities/idl/model/use-anchor-program', () => ({
    useAnchorProgram: vi.fn(),
}));

describe('[program] AnchorProgramName', () => {
    const mockProgramId = new PublicKey('11111111111111111111111111111111');
    const mockUrl = 'https://mainnet.rpc.address';
    const mockCluster: Cluster = 0;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render default name when useAnchorProgram returns null program', () => {
        vi.mocked(useAnchorProgram).mockReturnValue({
            idl: null,
            program: null,
        });

        render(<AnchorProgramName programId={mockProgramId} url={mockUrl} cluster={mockCluster} />);

        expect(screen.getByText('Unknown Program')).toBeDefined();
        expect(useAnchorProgram).toHaveBeenCalledWith(mockProgramId.toString(), mockUrl, mockCluster);
    });

    it('should render program name when useAnchorProgram returns a valid program', () => {
        const mockProgram = {
            idl: {
                metadata: {
                    name: 'test_program',
                },
            },
        } as Program;

        vi.mocked(useAnchorProgram).mockReturnValue({
            idl: mockProgram.idl,
            program: mockProgram,
        });

        render(<AnchorProgramName programId={mockProgramId} url={mockUrl} cluster={mockCluster} />);

        expect(screen.getByText('Test Program')).toBeDefined();
        expect(useAnchorProgram).toHaveBeenCalledWith(mockProgramId.toString(), mockUrl, mockCluster);
    });

    it('should render custom default name when provided and program is null', () => {
        const customDefaultName = 'Custom Default Program';

        vi.mocked(useAnchorProgram).mockReturnValue({
            idl: null,
            program: null,
        });

        render(
            <AnchorProgramName
                programId={mockProgramId}
                url={mockUrl}
                cluster={mockCluster}
                defaultName={customDefaultName}
            />
        );

        expect(screen.getByText(customDefaultName)).toBeDefined();
    });

    it('should render program name with snake_case to title case conversion', () => {
        const mockProgram = {
            idl: {
                metadata: {
                    name: 'snake_case_program_name',
                },
            },
        } as Program;

        vi.mocked(useAnchorProgram).mockReturnValue({
            idl: mockProgram.idl,
            program: mockProgram,
        });

        render(<AnchorProgramName programId={mockProgramId} url={mockUrl} />);

        expect(screen.getByText('Snake Case Program Name')).toBeDefined();
    });

    it('should render default name when program exists but has no name in metadata', () => {
        const mockProgram = {
            idl: {
                metadata: {},
            },
        } as Program;

        vi.mocked(useAnchorProgram).mockReturnValue({
            idl: mockProgram.idl,
            program: mockProgram,
        });

        render(<AnchorProgramName programId={mockProgramId} url={mockUrl} />);

        expect(screen.getByText('Unknown Program')).toBeDefined();
    });

    it('should call useAnchorProgram without cluster when not provided', () => {
        vi.mocked(useAnchorProgram).mockReturnValue({
            idl: null,
            program: null,
        });

        render(<AnchorProgramName programId={mockProgramId} url={mockUrl} />);

        expect(useAnchorProgram).toHaveBeenCalledWith(mockProgramId.toString(), mockUrl, undefined);
    });

    it('should handle program with multi-word snake_case name', () => {
        const mockProgram = {
            idl: {
                metadata: {
                    name: 'anchor_spl_token_program',
                },
            },
        } as Program;

        vi.mocked(useAnchorProgram).mockReturnValue({
            idl: mockProgram.idl,
            program: mockProgram,
        });

        render(<AnchorProgramName programId={mockProgramId} url={mockUrl} cluster={mockCluster} />);

        expect(screen.getByText('Anchor Spl Token Program')).toBeDefined();
    });
});
