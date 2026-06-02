import { cn } from '@shared/utils';
import { AlertCircle } from 'react-feather';

interface WarningNoteProps {
    label: string;
    className?: string;
}

export function WarningNote({ label, className }: WarningNoteProps) {
    return (
        <div className={cn('e-flex e-items-center e-gap-1.5 e-rounded', className)}>
            <AlertCircle className="e-text-destructive" size={14} />
            <div className="e-mt-0.5 e-text-xs e-tracking-tight e-text-destructive">{label}</div>
        </div>
    );
}
