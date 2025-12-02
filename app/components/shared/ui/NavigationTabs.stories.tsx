import type { Meta, StoryObj } from '@storybook/react';

import { NavigationTabs } from './NavigationTabs';

const meta: Meta<typeof NavigationTabs> = {
    component: NavigationTabs,
    parameters: {
        layout: 'padded',
        nextjs: {
            appDirectory: true,
        },
    },
    tags: ['autodocs'],
    title: 'Components/Shared/UI/NavigationTabs',
} satisfies Meta<typeof NavigationTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        baseUrl: '/address/DemoAddress123',
        tabs: [
            { path: '', title: 'History' },
            { path: 'tokens', title: 'Tokens' },
            { path: 'domains', title: 'Domains' },
        ],
    },
};

export const ManyTabs: Story = {
    args: {
        baseUrl: '/address/DemoAddress456',
        tabs: [
            { path: '', title: 'History' },
            { path: 'transfers', title: 'Transfers' },
            { path: 'instructions', title: 'Instructions' },
            { path: 'tokens', title: 'Tokens' },
            { path: 'domains', title: 'Domains' },
            { path: 'metadata', title: 'Metadata' },
            { path: 'attributes', title: 'Attributes' },
        ],
    },
};

export const WithCustomSlug: Story = {
    args: {
        baseUrl: '/address/DemoAddress789',
        tabs: [
            { path: '', slug: 'overview', title: 'Overview' },
            { path: 'vote-history', slug: 'vote-history', title: 'Vote History' },
            { path: 'rewards', slug: 'rewards', title: 'Rewards' },
        ],
    },
};

export const WithCustomComponent: Story = {
    args: {
        baseUrl: '/address/CustomAddress',
        tabs: [
            { path: '', title: 'History' },
            { path: 'tokens', title: 'Tokens' },
            {
                component: (
                    <li className="nav-item">
                        <a className="nav-link" href="#custom">
                            Custom Tab
                        </a>
                    </li>
                ),
                path: 'custom',
                slug: 'custom-tab',
                title: 'Custom',
            },
        ],
    },
};
