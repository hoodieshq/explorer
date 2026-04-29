'use client';

import React, { useEffect, useState } from 'react';

import { Input } from '@/app/components/shared/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/shared/ui/tabs';

const PRESET_SEEDS = [
    { label: 'IDL', value: 'idl' },
    { label: 'Security', value: 'security' },
] as const;

function isPresetSeed(seed: string): boolean {
    return PRESET_SEEDS.some(p => p.value === seed);
}

interface SeedSelectorProps {
    seed: string;
    onSeedChange: (seed: string) => void;
}

export function SeedSelector({ seed, onSeedChange }: SeedSelectorProps) {
    const isPreset = isPresetSeed(seed);
    const [activeTab, setActiveTab] = useState(isPreset ? seed : 'custom');
    // When activeTab is 'custom', the input echoes the external seed so a shared/bookmarked
    // `?seed=foo` URL renders with "foo" visible (instead of an empty input).
    const [customSeed, setCustomSeed] = useState(isPreset ? '' : seed);

    // Sync to external `seed` changes (e.g. URL navigation). Without this, the visual tab and
    // custom-input drift from the actual seed in use.
    useEffect(() => {
        if (isPresetSeed(seed)) {
            setActiveTab(seed);
        } else {
            setActiveTab('custom');
            setCustomSeed(seed);
        }
    }, [seed]);

    return (
        <Tabs
            value={activeTab}
            onValueChange={tab => {
                setActiveTab(tab);
                const preset = PRESET_SEEDS.find(p => p.value === tab);
                if (preset) {
                    onSeedChange(preset.value);
                }
            }}
        >
            <TabsList>
                {PRESET_SEEDS.map(preset => (
                    <TabsTrigger key={preset.value} value={preset.value}>
                        {preset.label}
                    </TabsTrigger>
                ))}
                <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
            <TabsContent value="custom">
                <div className="e-mt-3 e-flex e-items-center e-gap-2">
                    <Input
                        placeholder="Enter custom seed..."
                        value={customSeed}
                        variant="dark"
                        onChange={e => setCustomSeed(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && customSeed.trim()) {
                                onSeedChange(customSeed.trim());
                            }
                        }}
                    />
                    <button
                        className="e-shrink-0 e-rounded e-border e-border-solid e-border-neutral-700 e-bg-neutral-900 e-px-3 e-py-2 e-text-xs e-text-neutral-200 hover:e-bg-neutral-800 disabled:e-opacity-50"
                        disabled={!customSeed.trim()}
                        onClick={() => {
                            if (customSeed.trim()) {
                                onSeedChange(customSeed.trim());
                            }
                        }}
                    >
                        Load
                    </button>
                </div>
            </TabsContent>
        </Tabs>
    );
}
