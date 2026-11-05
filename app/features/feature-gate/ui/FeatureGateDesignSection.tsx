'use client';

import { useAtom } from 'jotai';

import { DesignMenuOptions, DesignMenuSection, DesignMenuSwitch } from '@/app/shared/ui/design-menu';

import {
    featureGateDesignAtom,
    featureGateMockPlannedAtom,
    featureGateSearchDesignAtom,
} from '../model/design-variant';

// REVIEW(HOO-926): the design menu's sections for the feature-gate page; remove with the menu.

export function FeatureGateDesignSection() {
    const [design, setDesign] = useAtom(featureGateDesignAtom);
    const [searchDesign, setSearchDesign] = useAtom(featureGateSearchDesignAtom);
    const [mockPlanned, setMockPlanned] = useAtom(featureGateMockPlannedAtom);
    return (
        <>
            <DesignMenuSection title="Feature gates">
                <DesignMenuOptions
                    layout="grid"
                    options={[
                        { label: 'Table', value: 'table' },
                        { label: 'Feed', value: 'feed' },
                    ]}
                    value={design}
                    onChange={setDesign}
                />
                <DesignMenuSwitch
                    label="Mock planned (3 latest epochs)"
                    checked={mockPlanned}
                    onCheckedChange={setMockPlanned}
                />
            </DesignMenuSection>
            <DesignMenuSection title="Feature gate search">
                <DesignMenuOptions
                    options={[
                        { label: 'Combo', value: 'combo' },
                        { label: 'Button', value: 'button' },
                        { label: 'Field', value: 'field' },
                    ]}
                    value={searchDesign}
                    onChange={setSearchDesign}
                />
            </DesignMenuSection>
        </>
    );
}
