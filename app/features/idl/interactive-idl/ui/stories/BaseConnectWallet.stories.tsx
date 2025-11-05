import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { BaseConnectWallet } from '../BaseConnectWallet';

const meta = {
    component: BaseConnectWallet,
    tags: ['autodocs'],
    title: 'Features/IDL/Interactive IDL/BaseConnectWallet',
    args: {
        onConnect: fn(),
        onDisconnect: fn(),
    },
} satisfies Meta<typeof BaseConnectWallet>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default disconnected state
 * Shows the wallet connection card when no wallet is connected
 */
export const Default: Story = {
    args: {
        connected: false,
        connecting: false,
    },
};

/**
 * Not connected state
 * Shows the connect wallet interface when no wallet is available
 */
export const NotConnected: Story = {
    args: {
        connected: false,
        connecting: false,
        buttonState: 'no-wallet',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the wallet selection interface when no wallet is available.',
            },
        },
    },
};

/**
 * Connecting state
 * Shows the component while a wallet connection is in progress
 */
export const Connecting: Story = {
    args: {
        connected: false,
        connecting: true,
        buttonState: 'connecting',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component state while connecting to a wallet.',
            },
        },
    },
};

/**
 * Has wallet available state
 * Shows when a wallet is detected but not yet connected
 */
export const HasWallet: Story = {
    args: {
        connected: false,
        connecting: false,
        buttonState: 'has-wallet',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component when a wallet is available for connection.',
            },
        },
    },
};

/**
 * Connected state
 * Shows the component when a wallet is successfully connected
 */
export const Connected: Story = {
    args: {
        connected: true,
        connecting: false,
        address: 'DjVE6JNiYqPL2QXyCUUh8rNjHrbz9hXHNYt99MQ59qw1',
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component with a connected wallet and address display.',
            },
        },
    },
};

/**
 * Disabled state
 * Shows the component when interaction is disabled
 */
export const Disabled: Story = {
    args: {
        connected: false,
        connecting: false,
        disabled: true,
    },
    parameters: {
        docs: {
            description: {
                story: 'Shows the component in a disabled state where no interaction is possible.',
            },
        },
    },
};
