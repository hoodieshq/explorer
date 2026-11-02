import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { BaseCardHeader } from '../BaseCard';

describe('BaseCardHeader', () => {
    it('should keep only the compact padding with density="compact"', () => {
        render(
            <BaseCardHeader ui="dashkit" density="compact" data-testid="header">
                Title
            </BaseCardHeader>,
        );

        const header = screen.getByTestId('header');
        expect(header).toHaveClass('p-3', 'items-baseline');
        expect(header).not.toHaveClass('px-dk-4', 'h-[60px]', 'items-center');
    });

    it('should keep the fixed dashkit header by default', () => {
        render(
            <BaseCardHeader ui="dashkit" data-testid="header">
                Title
            </BaseCardHeader>,
        );

        expect(screen.getByTestId('header')).toHaveClass('h-[60px]', 'px-dk-4', 'items-center');
    });
});
