import { CopyableMonoText, StatusBar } from './StatusBar';

export function TxErrorStatus({
    message,
    date,
    link,
    label = 'Error',
}: {
    message: string | null;
    date: Date;
    link: string | null;
    label?: string;
}) {
    return (
        <StatusBar
            primary={message ? <CopyableMonoText text={message} theme="destructive" /> : undefined}
            date={date}
            theme="destructive"
            badge={{ label, variant: 'destructive' }}
            link={link}
        />
    );
}
