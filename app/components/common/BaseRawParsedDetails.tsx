import { ParsedInstruction } from '@solana/web3.js';
import React from 'react';

export function BaseRawParsedDetails({ ix, children }: { ix: ParsedInstruction; children?: React.ReactNode }) {
    return (
        <>
            {children}

            <tr>
                <td>
                    Instruction Data <span className="e-text-muted">(JSON)</span>
                </td>
                <td>
                    <pre className="d-inline-block text-start json-wrap">{JSON.stringify(ix.parsed, null, 2)}</pre>
                </td>
            </tr>
        </>
    );
}
