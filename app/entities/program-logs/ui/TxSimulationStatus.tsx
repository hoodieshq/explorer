import { CopyableMonoText, StatusBar } from './StatusBar';

// txIdentifier is either the signature (if the error occurred after the transaction was sent to the network) or the serialized message (if the error occurred before the transaction could be sent).
type TxSimulationStatusProps =
    | { status: 'success'; unitsConsumed: number | undefined; date: Date; link?: string }
    | { status: 'error'; txIdentifier?: string; date: Date; link?: string };

export function TxSimulationStatus(props: TxSimulationStatusProps) {
    if (props.status === 'success') {
        return (
            <StatusBar
                message={
                    props.unitsConsumed !== undefined ? (
                        <ComputeUnitsBadge unitsConsumed={props.unitsConsumed} />
                    ) : undefined
                }
                date={props.date}
                theme="accent"
                badge={{ label: 'Simulated', variant: 'success' }}
                link={props.link}
            />
        );
    }
    return (
        <StatusBar
            message={
                props.txIdentifier ? <CopyableMonoText text={props.txIdentifier} theme="destructive" /> : undefined
            }
            date={props.date}
            theme="destructive"
            badge={{ label: 'Simulation Error', variant: 'destructive' }}
            link={props.link}
        />
    );
}

function ComputeUnitsBadge({ unitsConsumed }: { unitsConsumed: number }) {
    return (
        <div className="e-flex e-items-center e-gap-1">
            <span className="e-text-xs e-tracking-tight e-text-accent-700">
                {unitsConsumed.toLocaleString('en-US')} CU
            </span>
        </div>
    );
}
