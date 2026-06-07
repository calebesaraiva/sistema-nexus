import { ReactNode } from 'react';
import { EmptyState, LoadingState, ErrorState } from './States';

export function ResponsiveTable<T>({ columns, data, loading, error, renderActions }: {
  columns: { key: keyof T | string; label: string; render?: (item: T) => ReactNode }[];
  data: T[];
  loading?: boolean;
  error?: boolean;
  renderActions?: (item: T) => ReactNode;
}) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState />;
  if (!data.length) return <EmptyState />;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{columns.map((c) => <th key={String(c.key)}>{c.label}</th>)}{renderActions ? <th>Ações</th> : null}</tr></thead>
        <tbody>{data.map((item, index) => <tr key={String((item as { id?: string }).id || index)}>
          {columns.map((c) => <td data-label={c.label} key={String(c.key)}>{c.render ? c.render(item) : String((item as Record<string, unknown>)[String(c.key)] ?? '-')}</td>)}
          {renderActions ? <td data-label="Ações">{renderActions(item)}</td> : null}
        </tr>)}</tbody>
      </table>
    </div>
  );
}
