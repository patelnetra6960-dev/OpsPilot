import React from 'react';
import { Layers, ArrowRight, ShieldCheck } from 'lucide-react';
import { useSelector } from 'react-redux';

export const PlaceholderModulePage = ({ title, milestone, description, features = [] }) => {
  const { currentTenant } = useSelector((state) => state.tenant);

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-center space-y-4">
        <div className="inline-flex p-3 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
          <Layers className="w-8 h-8" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {milestone}
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-3">{title}</h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto mt-1 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Active Tenant Isolation Ready: <strong className="text-slate-200">{currentTenant?.name}</strong></span>
        </div>
      </div>

      {features.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Planned Modular Monolith Capabilities
          </h3>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PlaceholderModulePage;
