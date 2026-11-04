import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { HomeSection } from '../HomeSection';

vi.mock('@/app/shared/lib/logger', () => ({ Logger: { panic: vi.fn() } }));

function Boom(): never {
    throw new Error('section blew up');
}

describe('HomeSection', () => {
    it('should render its children when they do not throw', () => {
        render(
            <HomeSection>
                <div>section content</div>
            </HomeSection>,
        );
        expect(screen.getByText('section content')).toBeInTheDocument();
    });

    it('should render nothing when a child throws, keeping the error off the page', () => {
        render(
            <HomeSection>
                <Boom />
            </HomeSection>,
        );
        expect(screen.queryByText('section blew up')).not.toBeInTheDocument();
    });
});
