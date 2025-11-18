import { IdlDocView } from './IdlDocView';
import { IdlFieldsView } from './IdlFieldsView';
import type { FormattedIdlDataView } from './types';

export function IdlEventsView({ data }: FormattedIdlDataView<'events'>) {
    if (!data) return null;
    return (
        <table className="table table-sm table-nowrap card-table">
            <thead>
                <tr>
                    <th className="e-text-neutral-500">Name</th>
                    <th className="e-text-neutral-500">Fields</th>
                </tr>
            </thead>
            <tbody className="list">
                {data.map(event => (
                    <tr key={event.name}>
                        <td>
                            <span className="e-font-mono e-text-xs">{event.name}</span>
                            <IdlDocView docs={event.docs} />
                        </td>
                        <td>{!!event.fieldType && <IdlFieldsView fieldType={event.fieldType} />}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
