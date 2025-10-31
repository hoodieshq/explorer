import { RootNode } from 'codama';
import React from 'react';

import { getSerdeIdlSpecType } from '@/app/entities/idl/convert';

interface IdlBadgeProps {
    idl: any;
    title: string;
}

export function IdlBadge({ idl, title }: IdlBadgeProps) {
    const version = getIdlVersion(idl);
    const badgeClass = version === 'Legacy' ? 'bg-warning' : 'bg-success';

    return (
        <span className={`badge ${badgeClass}`}>
            {version} {title}
        </span>
    );
}

export function getIdlVersion(idl: any): string {
    const spec = getSerdeIdlSpecType(idl);
    switch (spec) {
        case 'legacy':
            return 'Legacy';
        case 'codama':
            return (idl as RootNode).version;
        default:
            return '0.30.1';
    }
}
