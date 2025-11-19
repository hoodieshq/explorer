'use client';

import { Idl } from '@coral-xyz/anchor';
import type { FormattedIdl } from '@entities/idl/formatters/formatted-idl';
import { RootNode } from 'codama';
import React, { useMemo } from 'react';
import { PlayCircle, XCircle } from 'react-feather';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/shared/ui/tooltip';
import { cn } from '@/app/components/shared/utils';
import { getIdlVersion } from '@/app/entities/idl';

import { IdlAccountsView } from '../formatted-idl/ui/IdlAccountsView';
import { IdlConstantsView } from '../formatted-idl/ui/IdlConstantsView';
import { IdlErrorsView } from '../formatted-idl/ui/IdlErrorsView';
import { IdlEventsView } from '../formatted-idl/ui/IdlEventsView';
import { IdlInstructionsView } from '../formatted-idl/ui/IdlInstructionsView';
import { IdlPdasView } from '../formatted-idl/ui/IdlPdasView';
import { IdlTypesView } from '../formatted-idl/ui/IdlTypesView';
import { NoSearchResultsPlaceholder } from '../formatted-idl/ui/NoSearchResultsPlaceholder';
import type { FormattedIdlDataView, IdlDataKeys } from '../formatted-idl/ui/types';
import { BaseWarningCard } from '../interactive-idl/ui/BaseWarningCard';
import { InteractWithIdl } from '../interactive-idl/ui/InteractWithIdl';

type TabId = 'instructions' | 'accounts' | 'types' | 'errors' | 'constants' | 'events' | 'pdas' | 'interact';

export type DataTab<K extends IdlDataKeys = IdlDataKeys> = {
    id: TabId;
    title: string;
    disabled: boolean;
    render: () => React.ReactElement<FormattedIdlDataView<K>>;
};

export type InteractTab = {
    id: 'interact';
    title: string | React.ReactNode;
    disabled: boolean;
    render: () => ReturnType<typeof InteractWithIdl>;
};

type Tab = DataTab | InteractTab;

export function useTabs(idl: FormattedIdl | null, originalIdl: Idl | RootNode, hasSearch?: boolean) {
    const tabs: Tab[] = useMemo(() => {
        if (!idl) return [];

        const getTitleWithCount = (baseTitle: string, data: unknown[] | undefined) => {
            const count = data?.length;
            if (hasSearch && count !== undefined) {
                return `${baseTitle} (${count})`;
            }
            return baseTitle;
        };

        const createDataTabRenderer = <K extends IdlDataKeys>(
            ViewComponent: React.ComponentType<FormattedIdlDataView<K>>,
            data: FormattedIdl[K] | undefined,
            tabName: string
        ) => {
            if (hasSearch && (!data || (Array.isArray(data) && data.length === 0))) {
                const PlaceholderComponent = () => <NoSearchResultsPlaceholder tabName={tabName} />;
                PlaceholderComponent.displayName = `NoSearchResultsPlaceholder(${tabName})`;
                return PlaceholderComponent;
            }
            const DataComponent = () => <ViewComponent data={data} />;
            DataComponent.displayName = `${ViewComponent.displayName || ViewComponent.name || 'DataView'}`;
            return DataComponent;
        };

        const tabItems: Tab[] = [
            {
                disabled: !idl.instructions,
                id: 'instructions',
                render: createDataTabRenderer(IdlInstructionsView, idl.instructions, 'Instructions'),
                title: getTitleWithCount('Instructions', idl.instructions),
            } as DataTab<'instructions'>,
            {
                disabled: !idl.accounts?.length,
                id: 'accounts',
                render: createDataTabRenderer(IdlAccountsView, idl.accounts, 'Accounts'),
                title: getTitleWithCount('Accounts', idl.accounts),
            } as DataTab<'accounts'>,
            {
                disabled: !idl.types?.length,
                id: 'types',
                render: createDataTabRenderer(IdlTypesView, idl.types, 'Types'),
                title: getTitleWithCount('Types', idl.types),
            } as DataTab<'types'>,
            {
                disabled: !idl.pdas?.length,
                id: 'pdas',
                render: createDataTabRenderer(IdlPdasView, idl.pdas, 'PDAs'),
                title: getTitleWithCount('Pdas', idl.pdas),
            } as DataTab<'pdas'>,
            {
                disabled: !idl.errors?.length,
                id: 'errors',
                render: createDataTabRenderer(IdlErrorsView, idl.errors, 'Errors'),
                title: getTitleWithCount('Errors', idl.errors),
            } as DataTab<'errors'>,
            {
                disabled: !idl.constants?.length,
                id: 'constants',
                render: createDataTabRenderer(IdlConstantsView, idl.constants, 'Constants'),
                title: getTitleWithCount('Constants', idl.constants),
            } as DataTab<'constants'>,
            {
                disabled: !idl.events?.length,
                id: 'events',
                render: createDataTabRenderer(IdlEventsView, idl.events, 'Events'),
                title: getTitleWithCount('Events', idl.events),
            } as DataTab<'events'>,
        ];

        if (originalIdl && !isCodamaIdl(originalIdl)) {
            const version = getIdlVersion(originalIdl);

            /// Allow to work with modern Anchor@>=0.30
            const isInteractDisabled = version !== '0.30.1';

            tabItems.push({
                disabled: !idl.instructions?.length,
                id: 'interact',
                render: () =>
                    isInteractDisabled ? (
                        <BaseWarningCard message="Current version of IDL is not suported" />
                    ) : (
                        <InteractWithIdl data={idl.instructions} />
                    ),
                title: <InteractWithIdlTabName isInteractDisabled={isInteractDisabled} />,
            } as InteractTab);
        }

        return tabItems;
    }, [idl, originalIdl, hasSearch]);

    return tabs;
}

function isCodamaIdl(idl: any | RootNode) {
    if (idl && 'standard' in idl && idl.standard === 'codama') {
        return true;
    }
    return false;
}

function InteractWithIdlTabName({ isInteractDisabled }: { isInteractDisabled: boolean }) {
    const tab = (
        <div className="e-flex e-items-center e-gap-1">
            {isInteractDisabled ? <XCircle size={14} /> : <PlayCircle size={14} />}
            Interact
        </div>
    );

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className={cn('e-w-fit', {
                        'e-cursor-not-allowed e-opacity-50': isInteractDisabled,
                    })}
                >
                    {tab}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <div className="e-min-w-36 e-max-w-16">
                    {isInteractDisabled
                        ? 'Currently we support only modern Anchor IDL'
                        : "Launch Anchor's instructions"}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
