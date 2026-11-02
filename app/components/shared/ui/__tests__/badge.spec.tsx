import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Badge } from '../badge';

describe('Badge', () => {
    it('should move padding from bottom to top with baseline', () => {
        render(
            <Badge ui="dashkit" baseline>
                #1
            </Badge>,
        );

        expect(screen.getByText('#1')).toHaveClass('pt-[calc(0.33em_+_1.5px)]', 'pb-[calc(0.33em_-_1.5px)]');
    });

    it('should keep the even dashkit padding by default', () => {
        render(<Badge ui="dashkit">#1</Badge>);

        expect(screen.getByText('#1')).not.toHaveClass('pt-[calc(0.33em_+_1.5px)]');
    });
});
