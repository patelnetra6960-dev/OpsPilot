export const Table = ({ children, className = '', ...props }) => (
  <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm">
    <table className={`w-full text-left border-collapse text-xs ${className}`} {...props}>
      {children}
    </table>
  </div>
);

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

export default Table;
