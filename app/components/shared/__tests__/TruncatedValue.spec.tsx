import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TruncatedValue } from '../TruncatedValue';

const VALUE = '4wRiBhEzHHi1o1j5ZyfzDdxGEEHqfzqtKndDT12y5G3drKz7syihe8vxK6q1CC46r4oP1UjyVMZmnAmqxb9A4GgL';

describe('TruncatedValue', () => {
    it('should render the inline copy glyph next to the value by default', () => {
        const { container } = render(<TruncatedValue value={VALUE} truncation={{ enabled: false }} />);

        expect(screen.getByText(VALUE)).toBeInTheDocument();
        // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- the glyph is an unlabelled feather svg
        expect(container.querySelector('svg')).not.toBeNull();
    });

    it('should drop the copy glyph but keep the value when noCopy is set', () => {
        const { container } = render(<TruncatedValue value={VALUE} truncation={{ enabled: false }} noCopy />);

        expect(screen.getByText(VALUE)).toBeInTheDocument();
        // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- the glyph is an unlabelled feather svg
        expect(container.querySelector('svg')).toBeNull();
    });
});
