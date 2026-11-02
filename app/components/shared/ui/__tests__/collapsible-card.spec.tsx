import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { CollapsibleCard } from '../collapsible-card';

describe('CollapsibleCard', () => {
    it('should put the collapse button at the top of a compact header', () => {
        render(
            <CollapsibleCard title="Title" density="compact">
                Body
            </CollapsibleCard>,
        );

        expect(screen.getByRole('button', { name: 'Collapse' })).toHaveClass('self-start');
        const header = screen.getByText((_, element) => element?.classList.contains('border-dark-border') ?? false);
        expect(header).toHaveClass('p-3', 'items-baseline');
        expect(header).not.toHaveClass('min-h-[60px]');
    });

    it('should drop the card margin with marginBottom="none"', () => {
        const ref = React.createRef<HTMLDivElement>();
        render(
            <CollapsibleCard ref={ref} title="Title" marginBottom="none">
                Body
            </CollapsibleCard>,
        );

        expect(ref.current).toHaveClass('mb-0');
        expect(ref.current).not.toHaveClass('mb-6');
    });
});
