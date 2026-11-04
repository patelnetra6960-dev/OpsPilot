export const Skeleton = ({ className = '', ...props }) => (
  <div
    className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800/80 ${className}`}
    {...props}
  />
);

export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, idx) => (
      <Skeleton key={idx} className={`h-3.5 ${idx === lines - 1 ? 'w-2/3' : 'w-full'}`} />
    ))}
  </div>
);

export const SkeletonCard = ({ className = '' }) => (
  <div
    className={`p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 space-y-4 ${className}`}
  >
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="h-8 w-20" />
    <Skeleton className="h-3 w-40" />
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
  <div
    className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-4 space-y-3 ${className}`}
  >
    <div className="grid grid-cols-4 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-24" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div key={rowIdx} className="grid grid-cols-4 gap-4 py-2">
        {Array.from({ length: cols }).map((_, colIdx) => (
          <Skeleton key={colIdx} className={`h-4 ${colIdx === 0 ? 'w-32' : 'w-20'}`} />
        ))}
      </div>
    ))}
  </div>
);

export default Skeleton;
