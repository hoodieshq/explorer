import { PublicKey } from '@solana/web3.js';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';

import { Cluster } from '@/app/utils/cluster';

import { ProgramSecurityTXTBadge } from '../SecurityTXTBadge';

vi.mock('@/app/providers/cluster', () => ({
    useCluster: vi.fn(),
}));

vi.mock('@/app/providers/program-metadata/useProgramMetadataSecurityTxt', () => ({
    useProgramMetadataSecurityTxt: vi.fn(),
}));

import { useCluster } from '@/app/providers/cluster';
import { useProgramMetadataSecurityTxt } from '@/app/providers/program-metadata/useProgramMetadataSecurityTxt';
import { SecurityTXT } from '@/app/utils/security-txt';

const mockProgramData = {
    authority: new PublicKey('11111111111111111111111111111111'),
    data: ['deadbeef', 'base64'] as [string, 'base64'],
    slot: 123,
};
const invalidProgramData = {
    authority: new PublicKey('11111111111111111111111111111111'),
    data: [''] as unknown as [string, 'base64'],
    slot: 123,
};
const programDataWithSecurityTxt = {
    authority: new PublicKey('11111111111111111111111111111111'),
    data: [encodeSecurityTxt({ contacts: 'email:mail@mail.mail', name: 'name', policy: 'policy', project_url: 'https://github.com' }), 'base64'] as [string, 'base64'],
    slot: 123,
};

const mockPubkey = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');

function encodeSecurityTxt(data: Pick<SecurityTXT, "name" | "project_url" | "contacts" | "policy">): string {
    const HEADER = "=======BEGIN SECURITY.TXT V1=======\0";
    const FOOTER = "=======END SECURITY.TXT V1=======\0";

    // build key-value pairs separated by \0
    const parts: string[] = [];
    for (const [k, v] of Object.entries(data)) {
        parts.push(k, v);
    }

    const content = parts.join("\0") + "\0";
    return Buffer.from(HEADER + content + FOOTER, "utf8").toString("base64");
}

describe('ProgramSecurityTXTBadge (mocked useProgramMetadataSecurityTxt)', () => {
    beforeEach(() => {
        (useCluster as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ cluster: Cluster.MainnetBeta });
    });
    afterEach(() => vi.clearAllMocks());

    it('should show error when program doesn\'t have security.txt', () => {
        (useProgramMetadataSecurityTxt as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            programMetadataSecurityTxt: null,
        });
        render(<ProgramSecurityTXTBadge programData={mockProgramData} pubkey={mockPubkey} />);
        expect(screen.getByText(/Program has no security.txt/i)).toBeInTheDocument();
    });

    it('should show error when program has invalid data', () => {
        (useProgramMetadataSecurityTxt as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            programMetadataSecurityTxt: null,
        });
        render(<ProgramSecurityTXTBadge programData={invalidProgramData} pubkey={mockPubkey} />);
        expect(screen.getByText(/Failed to decode program data/i)).toBeInTheDocument();
    });

    it('should show Included badge when program has only security.txt from Program Metadata', () => {
        (useProgramMetadataSecurityTxt as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            programMetadataSecurityTxt: { name: 'Program security.txt' },
        });
        render(<ProgramSecurityTXTBadge programData={invalidProgramData} pubkey={mockPubkey} />);
        expect(screen.getByText(/Included/i)).toBeInTheDocument();
    });

    it('should show Included badge when program has only security.txt from Program Data', () => {
        (useProgramMetadataSecurityTxt as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            programMetadataSecurityTxt: undefined,
        });
        render(<ProgramSecurityTXTBadge programData={programDataWithSecurityTxt} pubkey={mockPubkey} />);
        expect(screen.getByText(/Included/i)).toBeInTheDocument();
    });

    it('should show Included badge when program has both security.txts', () => {
        (useProgramMetadataSecurityTxt as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            programMetadataSecurityTxt: { name: 'Name' },
        });
        render(<ProgramSecurityTXTBadge programData={programDataWithSecurityTxt} pubkey={mockPubkey} />);
        expect(screen.getByText(/Included/i)).toBeInTheDocument();
    });
});
