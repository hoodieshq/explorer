import React from 'react';

import type { ByteArray } from '@/app/shared/lib/bytes';

// Deterministic byte payloads — no Math.random, so the rendered hex/base64 is
// stable across reloads and screenshots.
function makeBytes(length: number): Uint8Array {
    const out = new Uint8Array(length);
    for (let i = 0; i < length; i++) out[i] = (i * 37 + 11) & 0xff;
    return out;
}

// ~120 bytes: overflows the popover's 3-row hex preview so "Show more" appears.
export const MOCK_DATA_SMALL: ByteArray = makeBytes(120);

// ~220 bytes: overflows the embedded 4-row clamp so the fade + "Full screen"
// spoiler appear — this is the payload the fullscreen stories drive.
export const MOCK_DATA_LARGE: ByteArray = makeBytes(220);

// > MAX_INLINE_BYTES (1024): triggers the "Too large to display" branch.
export const MOCK_DATA_TOO_LARGE: ByteArray = makeBytes(1400);

// Realistic 88-char base58 signature, used as the download filename.
export const MOCK_FILENAME = '5wHu1qwD4kMvVKfMK5FcxDo9YHtthLK8FUZAmXTVUgZDMTC8LMs6UbmpuVQ9J7hLThTQu1YRRLd6bU6RmdQP5Vv';

// Constrains the embedded variant to the mobile drawer width so the 4-row clamp,
// bottom fade, and "Full screen" spoiler render exactly as they do in the drawer.
export function withDrawerFrame(Story: React.ComponentType) {
    return (
        <div className="max-w-[380px] rounded-lg bg-heavy-metal-900 p-4">
            <Story />
        </div>
    );
}
