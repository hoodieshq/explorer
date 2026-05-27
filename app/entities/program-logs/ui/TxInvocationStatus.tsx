import { CopyableMonoText, StatusBar } from './StatusBar';

type TxInvocationStatusProps = {
    status: 'success' | 'error';
    signature: string;
    date: Date;
    link: string;
};

export function TxInvocationStatus({ status, signature, date, link }: TxInvocationStatusProps) {
    const isSuccess = status === 'success';
    return (
        <StatusBar
            message={<CopyableMonoText text={signature} theme={isSuccess ? 'accent' : 'destructive'} />}
            date={date}
            theme={isSuccess ? 'accent' : 'destructive'}
            badge={{ label: isSuccess ? 'Success' : 'Error', variant: isSuccess ? 'success' : 'destructive' }}
            link={link}
        />
    );
}
