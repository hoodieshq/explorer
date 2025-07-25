import { useWallet } from '@solana/wallet-adapter-react';
import { useAtomValue } from 'jotai';
import { useLayoutEffect, useMemo, useState } from 'react';

import type { InstructionData } from '@/app/components/account/idl/formatted-idl/formatters/FormattedIdl';
import { LoadingCard } from '@/app/components/shared/LoadingCard';

import { originalIdlAtom } from '../model/original-idl';
import { programIdAtom } from '../model/program-id';
import { useInstruction } from '../model/use-instruction';
import { InteractWithIdlView } from './InteractWithIdlView';

export function InteractWithIdl({
    instructions,
    // idl,
    // programId,
    cluster = 'mainnet-beta',
    onClusterSelect,
    onWalletConnect,
    onSendTransaction,
    logs = [],
}: {
    instructions?: InstructionData[];
    // idl: AnchorIdl;
    // programId: string;
    cluster?: string;
    onClusterSelect?: () => void;
    onWalletConnect?: () => void;
    onSendTransaction?: (instruction: string, data: any) => void;
    logs?: string[];
}) {
    // const [, setClusterModalShow] = useClusterModal();

    const [selectedInstruction, setSelectedInstruction] = useState<string | undefined>();
    const [accountValues, setAccountValues] = useState<Record<string, string>>({});
    const [argValues, setArgValues] = useState<Record<string, string>>({});
    const [_walletConnected, setWalletConnected] = useState(false);
    // const { connected: walletConnected, connecting, connect } = useWallet();

    // console.log({ connect, connecting, walletConnected });
    const idl = useAtomValue(originalIdlAtom);
    const progId = useAtomValue(programIdAtom);

    console.log(8888, idl, progId);

    const { connecting, connected, disconnecting } = useWallet();

    const {
        initializeWallet,
        isInitialized,
        initializeProgram,
        program,
        isProgramLoading,
        instructionState,
        invokeInstruction,
    } = useInstruction({
        enabled: idl && progId,
        idl,
        programId: progId.toString(),
    });

    useLayoutEffect(() => {
        console.log(777, { connected, connecting, disconnecting });
        const isProgramSelected = idl && progId;

        if (!isProgramLoading && connected && isProgramSelected) {
            // initializeProgram();
            // console.log(777, 'Init POrogram');
        }
    }, [isProgramLoading, connecting, connected, disconnecting, idl, progId, initializeProgram]);

    // useEffect(() => {
    //     // TODO: move formatting to the interpreter layer
    //     // setOriginalIdl(idl);
    //     // setProgramId(programId);
    //     console.log(123, { idl }, programId);
    // }, [idl, programId, setOriginalIdl, setProgramId]);

    const isReady = useMemo(() => idl && progId, [idl, progId]);

    // const handleInstructionSelect = useCallback(
    //     (instructionName: string) => {
    //         setSelectedInstruction(instructionName === selectedInstruction ? undefined : instructionName);
    //     },
    //     [selectedInstruction]
    // );

    // const handleAccountChange = useCallback((instructionName: string, accountName: string, value: string) => {
    //     setAccountValues(prev => ({
    //         ...prev,
    //         [`${instructionName}.${accountName}`]: value,
    //     }));
    // }, []);

    // const handleArgChange = useCallback((instructionName: string, argName: string, value: string) => {
    //     setArgValues(prev => ({
    //         ...prev,
    //         [`${instructionName}.${argName}`]: value,
    //     }));
    // }, []);

    console.log({ isReady });

    return <>{isReady ? <InteractWithIdlView instructions={instructions} idl={idl} /> : <LoadingCard />}</>;
}
