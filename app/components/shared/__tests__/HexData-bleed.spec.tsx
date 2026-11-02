import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { HexData } from '../HexData';

const DATA = new Uint8Array([0x03, 0xe8, 0x00, 0x00]);

describe('HexData', () => {
    it('should pull the block padding into the surrounding padding with bleed', () => {
        render(<HexData raw={DATA} align="start" bleed />);

        const pre = getHexBlock();
        expect(pre).toHaveClass('-my-1.5');
        // A plain `mb-0` would beat `-my-1.5` in CSS order and leave the bottom padding in place.
        expect(pre).not.toHaveClass('mb-0');
    });

    it('should keep the block padding without bleed', () => {
        render(<HexData raw={DATA} align="start" />);

        const pre = getHexBlock();
        expect(pre).toHaveClass('mb-0');
        expect(pre).not.toHaveClass('-my-1.5');
    });
});

function getHexBlock() {
    return screen.getByText((_, element) => element?.tagName === 'PRE');
}
