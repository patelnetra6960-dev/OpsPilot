import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export const TableHeader = ({ children, className = '', ...props }) => (
  <thead
    className={`bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none ${className}`}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody = ({ children, className = '', ...props }) => (
  <tbody
    className={`divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 ${className}`}
    {...props}
  >
    {children}
  </tbody>
);

export const TableRow = ({ children, className = '', hover = true, ...props }) => (
  <tr
    className={`transition-colors ${
      hover ? 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40' : ''
    } ${className}`}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead = ({ children, className = '', ...props }) => (
  <th className={`py-3.5 px-4 font-bold ${className}`} {...props}>
    {children}
  </th>
);

export const TableCell = ({ children, className = '', ...props }) => (
  <td className={`py-3.5 px-4 align-middle ${className}`} {...props}>
    {children}
  </td>
);

export const TableFooter = ({ children, className = '', ...props }) => (
  <tfoot
    className={`bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300 ${className}`}
    {...props}
  >
    {children}
  </tfoot>
);

export const Table = ({
  children,
  columns,
  data,
  emptyMessage = 'No records found.',
  isLoading = false,
  onRowClick,
  className = '',
  ...props
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aVal = a?.[sortConfig.key];
      const bVal = b?.[sortConfig.key];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const comparison = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
        sensitivity: 'base'
      });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Compound mode: children supplied directly
  if (children || !Array.isArray(columns)) {
    return (
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
        <table className={`w-full text-left border-collapse text-xs ${className}`} {...props}>
          {children}
        </table>
      </div>
    );
  }

  // Data-driven mode: columns + data props
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
      <table className={`w-full text-left border-collapse text-xs ${className}`} {...props}>
        <TableHeader>
          <tr>
            {columns.map((col, idx) => (
              <TableHead
                key={col.key || idx}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                className={col.sortable ? 'cursor-pointer hover:text-slate-800 dark:hover:text-slate-200' : ''}
              >
                <div className="inline-flex items-center gap-1.5">
                  <span>{col.label || col.header || col.key}</span>
                  {col.sortable && (
                    <span className="text-slate-400">
                      {sortConfig.key === col.key ? (
                        sortConfig.direction === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-indigo-500" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-500" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      )}
                    </span>
                  )}
                </div>
              </TableHead>
            ))}
          </tr>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <tr>
              <TableCell colSpan={columns.length} className="py-10 text-center text-slate-400">
                Loading records...
              </TableCell>
            </tr>
          ) : sortedData.length === 0 ? (
            <tr>
              <TableCell colSpan={columns.length} className="py-10 text-center text-slate-500 dark:text-slate-400">
                {emptyMessage}
              </TableCell>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => (
              <TableRow
                key={row.id || row._id || rowIdx}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {columns.map((col, colIdx) => (
                  <TableCell key={col.key || colIdx}>
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </table>
    </div>
  );
};

export default Table;
