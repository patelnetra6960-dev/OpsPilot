import { useState } from 'react';
import { Card, Badge, Input, Table } from '../../components/ui/index.js';

export const CustomerServicesPage = () => {
  const [search, setSearch] = useState('');

  const services = [
    {
      id: 'WO-8421',
      title: 'Hydraulic Loading Ramp Periodic Inspection',
      type: 'Maintenance',
      technician: 'David Kim',
      eta: 'Today at 02:30 PM',
      status: 'in_progress'
    },
    {
      id: 'WO-8429',
      title: 'Cold Storage Ambient Temperature Sensor Diagnostic',
      type: 'Repair',
      technician: 'Emily Davis',
      eta: 'Today at 04:00 PM',
      status: 'dispatched'
    },
    {
      id: 'WO-8402',
      title: 'Quarterly Conveyor Belt Motor Lubrication',
      type: 'Preventative',
      technician: 'Carlos Mendez',
      eta: 'Completed Nov 1',
      status: 'completed'
    }
  ];

  const filtered = services.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'id',
      label: 'Order ID',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
          {val}
        </span>
      )
    },
    {
      key: 'title',
      label: 'Service Scope',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.type}</div>
        </div>
      )
    },
    {
      key: 'technician',
      label: 'Assigned Lead',
      sortable: true,
      render: (val) => <span className="text-xs text-slate-700 dark:text-slate-300">{val}</span>
    },
    {
      key: 'eta',
      label: 'ETA / Completion',
      sortable: true,
      render: (val) => <span className="text-xs text-slate-500 font-mono">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge
          variant={val === 'in_progress' ? 'primary' : val === 'dispatched' ? 'warning' : 'success'}
          size="sm"
          className="capitalize text-[10px]"
        >
          {val.replace('_', ' ')}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Service Requests & Work Orders
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Live tracking and historical logs of all operations and field maintenance orders.
        </p>
      </div>

      <Card variant="default" className="p-5 space-y-4">
        <div className="w-64">
          <Input
            placeholder="Search work orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs"
          />
        </div>
        <Table columns={columns} data={filtered} emptyMessage="No service orders found." />
      </Card>
    </div>
  );
};

export default CustomerServicesPage;
