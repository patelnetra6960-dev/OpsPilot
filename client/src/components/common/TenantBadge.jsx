import { Badge } from '../ui/Badge.jsx';

export const TenantBadge = ({ role = 'employee', tier = 'starter' }) => {
  const roleVariants = {
    owner: 'brand',
    admin: 'info',
    manager: 'warning',
    employee: 'neutral',
    customer: 'success',
    member: 'neutral'
  };

  const tierVariants = {
    enterprise: 'success',
    growth: 'info',
    starter: 'neutral'
  };

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium">
      <Badge variant={roleVariants[role] || 'neutral'} size="sm">
        <span className="capitalize">{role}</span>
      </Badge>
      <Badge variant={tierVariants[tier] || 'neutral'} size="sm">
        <span className="uppercase tracking-wider font-mono text-[9px]">{tier}</span>
      </Badge>
    </div>
  );
};

export default TenantBadge;
