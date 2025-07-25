'use client';

import { Idl } from '@coral-xyz/anchor';
import { RootNode } from 'codama';
import { useMemo } from 'react';

import { FormattedIdl } from '@/app/components/account/idl/formatted-idl/formatters/FormattedIdl';
import { IdlAccountsView } from '@/app/components/account/idl/formatted-idl/IdlAccounts';
import { IdlConstantsView } from '@/app/components/account/idl/formatted-idl/IdlConstants';
import { IdlErrorsView } from '@/app/components/account/idl/formatted-idl/IdlErrors';
import { IdlEventsView } from '@/app/components/account/idl/formatted-idl/IdlEvents';
import { IdlInstructionsView } from '@/app/components/account/idl/formatted-idl/IdlInstructions';
import { IdlPdasView } from '@/app/components/account/idl/formatted-idl/IdlPdas';
import { IdlTypesView } from '@/app/components/account/idl/formatted-idl/IdlTypes';
import { InteractWithIdl } from '@/app/features/idl/interactive-idl/ui/InteractWithIdl';

type TabId = 'instructions' | 'accounts' | 'types' | 'errors' | 'constants' | 'events' | 'pdas' | 'interact';

type Tab = {
    id: TabId;
    title: string;
    disabled: boolean;
    component: JSX.Element;
};

function isCodamaIdl(idl: any | RootNode) {
    if (idl && 'standard' in idl && idl.standard === 'codama') {
        return true;
    }
    return false;
}

export function useTabs(
    idl: FormattedIdl | null,
    originalIdl: Idl | RootNode,
    programId: string,
    withInteractive: boolean
) {
    const tabs: Tab[] = useMemo(() => {
        if (!idl) return [];

        const tabItems: Tab[] = [
            {
                Component: IdlInstructionsView,
                component: <IdlInstructionsView data={idl.instructions} />,
                disabled: !idl.instructions,
                id: 'instructions',
                props: { data: idl.instructions },
                title: 'Instructions',
            },
            {
                Component: IdlAccountsView,
                component: <IdlAccountsView data={idl.accounts} />,
                disabled: !idl.accounts?.length,
                id: 'accounts',
                props: { data: idl.accounts },
                title: 'Accounts',
            },
            {
                Component: IdlTypesView,
                component: <IdlTypesView data={idl.types} />,
                disabled: !idl.types?.length,
                id: 'types',
                props: { data: idl.types },
                title: 'Types',
            },
            {
                Component: IdlPdasView,
                component: <IdlPdasView data={idl.pdas} />,
                disabled: !idl.pdas?.length,
                id: 'pdas',
                props: { data: idl.pdas },
                title: 'Pdas',
            },
            {
                Component: IdlErrorsView,
                component: <IdlErrorsView data={idl.errors} />,
                disabled: !idl.errors?.length,
                id: 'errors',
                props: { data: idl.errors },
                title: 'Errors',
            },
            {
                Component: IdlConstantsView,
                component: <IdlConstantsView data={idl.constants} />,
                disabled: !idl.constants?.length,
                id: 'constants',
                props: { data: idl.constants },
                title: 'Constants',
            },
            {
                Component: IdlEventsView,
                component: <IdlEventsView data={idl.events} />,
                disabled: !idl.events?.length,
                id: 'events',
                props: { data: idl.events },
                title: 'Events',
            },
        ];

        if (withInteractive && originalIdl && !isCodamaIdl(originalIdl)) {
            const _idl = originalIdl as unknown as Idl;
            tabItems.push({
                Component: InteractWithIdl,
                component: <InteractWithIdl instructions={idl.instructions} />,
                disabled: !idl.instructions?.length,
                id: 'interact',
                props: { instructions: idl.instructions },
                // TODO: allow to use icons ↓
                title: 'Interact',
            });
        }

        return tabItems;
    }, [idl, withInteractive, originalIdl]);

    return tabs;
}
