import { getDisplayIdlSpecType } from '@entities/idl/convert';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import ReactJson from 'react-json-view';

import { ErrorCard } from '@/app/components/shared/ErrorCard';
import { useCluster } from '@/app/providers/cluster';

import { AnchorFormattedIdl } from '../formatted-idl/ui/AnchorFormattedIdl';
import { CodamaFormattedIdl } from '../formatted-idl/ui/CodamaFormattedIdl';
import { originalIdlAtom } from '../interactive-idl/model/original-idl';
import { programIdAtom } from '../interactive-idl/model/program-id';
import { useInstruction } from '../interactive-idl/model/use-instruction';
import { IdlErrorFallback } from './IdlErrorFallback';

export function IdlRenderer({
    idl,
    collapsed,
    raw,
    searchStr = '',
    programId,
}: {
    idl: any;
    collapsed: boolean | number;
    raw: boolean;
    searchStr: string;
    programId: string;
}) {
    const { url } = useCluster();
    const setOriginalIdl = useSetAtom(originalIdlAtom);
    const setProgramId = useSetAtom(programIdAtom);
    const wallet = useWallet();
    const { isProgramLoading, program, initializeProgram } = useInstruction({
        cluster: url,
        idl,
        programId,
    });

    useEffect(() => {
        console.log(123, { idl }, programId);
        setOriginalIdl(idl);
        setProgramId(programId);
    }, [idl, programId, setOriginalIdl, setProgramId]);
    useEffect(() => {
        console.log(567567, { isProgramLoading, program });
        if (!program && !isProgramLoading) {
            initializeProgram();
        }
    }, [isProgramLoading, program, initializeProgram]);
    if (raw) {
        return (
            <ReactJson
                src={idl}
                theme={'solarized'}
                style={{ padding: 25 }}
                name={null}
                enableClipboard={true}
                collapsed={collapsed}
                displayObjectSize={false}
                displayDataTypes={false}
                displayArrayKey={false}
            />
        );
    }

    const spec = getDisplayIdlSpecType(idl);
    switch (spec) {
        case 'codama':
            return (
                <ErrorBoundary fallback={<IdlErrorFallback message="Error rendering PMP IDL" />}>
                    <CodamaFormattedIdl idl={idl} programId={programId} searchStr={searchStr} />
                </ErrorBoundary>
            );
        default:
            return (
                <ErrorBoundary fallback={<IdlErrorFallback message="Error rendering Anchor IDL" />}>
                    {spec === 'legacy-shank' ? (
                        <ErrorCard
                            message={`Right now, we don’t support IDL with the “${spec}” origin in full. Some data might be absent.`}
                        />
                    ) : null}
                    <AnchorFormattedIdl idl={idl} programId={programId} searchStr={searchStr} />
                </ErrorBoundary>
            );
    }
}
