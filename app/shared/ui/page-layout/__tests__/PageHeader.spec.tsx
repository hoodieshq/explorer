import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { PageHeader } from '../PageHeader';

describe('PageHeader', () => {
    it('should render the title as the page h1', () => {
        render(<PageHeader title="Transaction" />);

        expect(screen.getByRole('heading', { level: 1, name: 'Transaction' })).toBeInTheDocument();
    });

    it('should render the eyebrow when provided and omit it otherwise', () => {
        const { rerender } = render(<PageHeader eyebrow="Details" title="Transaction" />);
        expect(screen.getByText('Details')).toBeInTheDocument();

        rerender(<PageHeader title="Transaction" />);
        expect(screen.queryByText('Details')).not.toBeInTheDocument();
    });

    it('should own its vertical padding and the gap down to the first section', () => {
        render(<PageHeader title="Block" />);
        const header = screen.getByRole('banner');

        expect(header).toHaveClass('mb-3', 'py-6', 'gap-1.5');
        expect(header).not.toHaveClass('-mb-6');
    });

    it('should scale the title down when size is sm', () => {
        render(<PageHeader size="sm" title="Transaction" />);

        expect(screen.getByRole('heading', { level: 1 })).toHaveClass('text-xl', 'md:text-2xl');
    });

    it('should render additional children after the title', () => {
        render(
            <PageHeader title="Transaction">
                <p>subtitle</p>
            </PageHeader>,
        );

        expect(screen.getByText('subtitle')).toBeInTheDocument();
    });

    it('should render the actions beside the title and nothing extra without them', () => {
        const { rerender } = render(
            <PageHeader title="Feature Gates" actions={<button type="button">Search</button>} />,
        );
        const title = screen.getByRole('heading', { level: 1, name: 'Feature Gates' });
        // eslint-disable-next-line testing-library/no-node-access -- the title row has no role to query
        expect(title.parentElement).toContainElement(screen.getByRole('button', { name: 'Search' }));

        rerender(<PageHeader title="Feature Gates" />);
        // eslint-disable-next-line testing-library/no-node-access -- the title row has no role to query
        expect(screen.getByRole('heading', { level: 1 }).parentElement).toBe(screen.getByRole('banner'));
    });

    it('should copy the title onto the eyebrow line for the condensed mobile header, hidden from assistive tech', () => {
        render(<PageHeader eyebrow="Mainnet Beta" title="Feature Gates" actions={<span />} condensed />);

        expect(screen.getByText('/ Feature Gates')).toHaveAttribute('aria-hidden', 'true');
        expect(screen.getByRole('heading', { level: 1, name: 'Feature Gates' })).toBeInTheDocument();
    });

    it('should let the actions wrap under the title and leave the eyebrow alone when wrapActions is set', () => {
        render(
            <PageHeader
                eyebrow="Mainnet Beta"
                title="Feature Gates"
                actions={<span>actions</span>}
                wrapActions
                condensed
            />,
        );

        // eslint-disable-next-line testing-library/no-node-access -- the title row has no role to query
        expect(screen.getByRole('heading', { level: 1 }).parentElement).toHaveClass('flex-wrap');
        expect(screen.queryByText('/ Feature Gates')).not.toBeInTheDocument();
    });

    it('should merge a custom className and forward the ref to the header element', () => {
        const ref = createRef<HTMLElement>();
        render(<PageHeader ref={ref} className="custom-class" title="Transaction" />);

        expect(screen.getByRole('banner')).toHaveClass('custom-class', 'flex');
        expect(ref.current?.tagName).toBe('HEADER');
    });
});
