import type { Meta, StoryObj } from '@storybook-config/types';
import type { ReactNode } from 'react';
import { Check, ChevronDown, ChevronLeft, Download, FileText, Link, Share2, Table, XCircle } from 'react-feather';

import {
    DISPLAY_SIZE,
    NormalizedChevronDown,
    NormalizedChevronLeft,
    NormalizedXMark,
} from '@/app/shared/ui/icons/normalized';
import { XIcon } from '@/app/shared/ui/icons/XIcon';

// Every glyph the receipt toolbar and its two menus draw, in one sheet: first as the UI ships them,
// then forced to a common box size where their optical weight can be compared like for like. They do
// all sit on one 24-unit grid at one display size now: react-feather already inks ~75% of that box,
// and the normalized pair places the odd ones out onto it — the chevron scaled up from a quarter of
// the box, the brand mark padded down from filling it whole. Each normalized glyph sits next to the
// vendor one it came from, so the ink delta is a glance.
const COMPARISON_SIZES = [DISPLAY_SIZE, 48];

interface IconEntry {
    grid: string;
    name: string;
    render: (px: number) => ReactNode;
    /** Vendor glyph kept for comparison; not drawn anywhere in the receipt UI. */
    reference?: boolean;
    where: string;
}

const ICONS: IconEntry[] = [
    {
        grid: '24 · ink ×1.25',
        name: 'NormalizedChevronLeft',
        render: px => <NormalizedChevronLeft size={px} />,
        where: 'Back link',
    },
    // Each normalized chevron is followed by the vendor glyph it was built from, so the size delta
    // reads at a glance.
    {
        grid: '24 · stroke 2',
        name: 'ChevronLeft (vendor)',
        reference: true,
        render: px => <ChevronLeft size={px} />,
        where: 'not used here',
    },
    {
        grid: '24 · ink ×1.25',
        name: 'NormalizedChevronDown',
        render: px => <NormalizedChevronDown size={px} />,
        where: 'Both triggers',
    },
    {
        grid: '24 · stroke 2',
        name: 'ChevronDown (vendor)',
        reference: true,
        render: px => <ChevronDown size={px} />,
        where: 'PopoverButton default',
    },
    {
        grid: '24 · stroke 2',
        name: 'Download',
        render: px => <Download size={px} />,
        where: 'Download trigger',
    },
    { grid: '24 · stroke 2', name: 'Share2', render: px => <Share2 size={px} />, where: 'Share trigger' },
    {
        grid: '24 · stroke 2',
        name: 'Table',
        render: px => <Table size={px} />,
        where: 'Download menu — CSV',
    },
    {
        grid: '24 · stroke 2',
        name: 'FileText',
        render: px => <FileText size={px} />,
        where: 'Download menu — PDF',
    },
    {
        grid: '24 · ink 18/24',
        name: 'NormalizedXMark',
        render: px => <NormalizedXMark size={px} />,
        where: 'Share menu — X',
    },
    {
        grid: '11 · filled',
        name: 'XIcon (original)',
        reference: true,
        render: px => <XIcon width={px} height={px} />,
        where: 'not used here',
    },
    {
        grid: '24 · stroke 2',
        name: 'Link',
        render: px => <Link size={px} />,
        where: 'Share menu — copy link',
    },
    {
        grid: '24 · stroke 2',
        name: 'Check',
        render: px => <Check size={px} />,
        where: 'Share menu — copied',
    },
    {
        grid: '24 · stroke 2',
        name: 'XCircle',
        render: px => <XCircle size={px} />,
        where: 'Share menu — failed',
    },
];

function SheetHeading({ children }: { children: ReactNode }) {
    return <h3 className="mb-3 mt-0 text-xs font-medium text-white">{children}</h3>;
}

function IconSheet() {
    const shipped = ICONS.filter(icon => !icon.reference);

    return (
        <div className="inline-block bg-outer-space-900 p-6 text-neutral-200">
            <SheetHeading>As shipped</SheetHeading>
            <div className="mb-8 inline-flex items-center gap-4">
                {shipped.map(icon => (
                    <span key={icon.name} className="inline-flex">
                        {icon.render(DISPLAY_SIZE)}
                    </span>
                ))}
            </div>

            <SheetHeading>Same box</SheetHeading>
            <table className="border-collapse">
                <thead>
                    <tr className="text-left text-[10px] uppercase tracking-wide text-neutral-500">
                        <th className="pb-3 pr-6 font-normal">Icon</th>
                        {COMPARISON_SIZES.map(px => (
                            <th key={px} className="pb-3 pr-6 text-center font-normal">
                                {px}px
                            </th>
                        ))}
                        <th className="pb-3 pr-6 font-normal">Grid</th>
                        <th className="pb-3 font-normal">Used in</th>
                    </tr>
                </thead>
                <tbody>
                    {ICONS.map(icon => (
                        <tr key={icon.name} className="align-middle">
                            <td className="py-2 pr-6 text-xs">{icon.name}</td>
                            {COMPARISON_SIZES.map(px => (
                                <td key={px} className="py-2 pr-6">
                                    <div className="flex items-center justify-center" style={{ minWidth: px }}>
                                        {icon.render(px)}
                                    </div>
                                </td>
                            ))}
                            <td className="py-2 pr-6 font-mono text-[10px] text-neutral-500">{icon.grid}</td>
                            <td className="py-2 text-[10px] text-neutral-500">{icon.where}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

const meta: Meta<typeof IconSheet> = {
    component: IconSheet,
    tags: ['autodocs', 'test'],
    title: 'Features/Receipt/ReceiptIcons',
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
