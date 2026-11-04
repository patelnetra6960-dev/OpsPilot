import { Layers, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Card, Badge } from '../components/ui/index.js';

export const PlaceholderModulePage = ({ title, milestone, description, features = [] }) => {
  const { currentTenant } = useSelector((state) => state.tenant);

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <Card className="p-8 sm:p-12 text-center space-y-4">
        <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-600/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
          <Layers className="w-8 h-8" />
        </div>

        <div>
          <Badge variant="brand" size="md">
            {milestone}
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mt-2 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>
            Active Tenant Isolation Ready:{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-semibold">
              {currentTenant?.name}
            </strong>
          </span>
        </div>
      </Card>

      {features.length > 0 && (
        <Card className="p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Planned Modular Monolith Capabilities
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export default PlaceholderModulePage;
