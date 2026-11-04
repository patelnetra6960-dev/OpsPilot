export const Card = ({ children, className = '', hover = false, ...props }) => (
  <div
    className={`rounded-2xl border bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-slate-950/50 transition-all ${
      hover ? 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700' : ''
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className = '', ...props }) => (
  <div
    className={`p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col gap-1.5 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle = ({ children, className = '', ...props }) => (
  <h3
    className={`text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription = ({ children, className = '', ...props }) => (
  <p
    className={`text-xs text-slate-500 dark:text-slate-400 leading-relaxed ${className}`}
    {...props}
  >
    {children}
  </p>
);

export const CardContent = ({ children, className = '', ...props }) => (
  <div className={`p-5 sm:p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }) => (
  <div
    className={`p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 rounded-b-2xl flex items-center justify-between ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
