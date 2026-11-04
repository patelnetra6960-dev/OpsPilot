import React from 'react';

export const TenantBadge = ({ role = 'member', tier = 'starter' }) => {
  const roleColors = {
    owner: 'bg-purple-950 text-purple-300 border-purple-800',
    admin: 'bg-blue-950 text-blue-300 border-blue-800',
    manager: 'bg-amber-950 text-amber-300 border-amber-800',
    member: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const tierColors = {
    enterprise: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    growth: 'bg-sky-950 text-sky-300 border-sky-800',
    starter: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      <span className={`px-2 py-0.5 rounded-full border capitalize ${roleColors[role] || roleColors.member}`}>
        {role}
      </span>
      <span className={`px-2 py-0.5 rounded-full border uppercase tracking-wider text-[10px] ${tierColors[tier] || tierColors.starter}`}>
        {tier}
      </span>
    </div>
  );
};

export default TenantBadge;
