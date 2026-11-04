import { useState } from 'react';
import { Building2, Plus, Search, Mail } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const ClientsPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New client form state
  const [clientName, setClientName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [clients, setClients] = useState([
    {
      id: 'cli-01',
      name: 'Metro Retail Distribution Co.',
      contact: 'Olivia Parker',
      email: 'olivia@metrologistics.com',
      phone: '+1 (555) 234-8901',
      active_jobs: 2,
      tier: 'enterprise',
      status: 'active'
    },
    {
      id: 'cli-02',
      name: 'Pacific Freight Express',
      contact: 'Marcus Vance',
      email: 'marcus@pacificfreight.com',
      phone: '+1 (555) 345-1209',
      active_jobs: 5,
      tier: 'growth',
      status: 'active'
    },
    {
      id: 'cli-03',
      name: 'Harbor Cold Chain Logistics',
      contact: 'David Miller',
      email: 'dmiller@harborcold.com',
      phone: '+1 (555) 456-7890',
      active_jobs: 1,
      tier: 'starter',
      status: 'active'
    }
  ]);

  const handleCreateClient = (e) => {
    e.preventDefault();
    if (!clientName.trim() || !contactName.trim()) return;

    const newClient = {
      id: `cli-${Date.now()}`,
      name: clientName,
      contact: contactName,
      email: email,
      phone: phone || '+1 (555) 000-0000',
      active_jobs: 0,
      tier: 'growth',
      status: 'active'
    };

    setClients([newClient, ...clients]);
    setModalOpen(false);
    setClientName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setAddress('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Client Account Created',
        message: `${newClient.name} added to ${currentTenant?.name}`
      })
    );
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: 'name',
      label: 'Client Company',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Mail className="w-3 h-3" />
            <span>{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: 'contact',
      label: 'Primary Contact',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-medium text-xs text-slate-800 dark:text-slate-200">{val}</div>
          <div className="text-[10px] text-slate-400">{row.phone}</div>
        </div>
      )
    },
    {
      key: 'active_jobs',
      label: 'Active Dispatches',
      sortable: true,
      render: (val) => <span className="font-mono text-xs">{val} orders</span>
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => (
        <Badge variant={val === 'active' ? 'success' : 'neutral'} size="sm" className="capitalize">
          {val}
        </Badge>
      )
    },
    {
      key: 'id',
      label: 'Actions',
      render: (_, row) => (
        <button
          type="button"
          onClick={() => {
            dispatch(
              addToast({
                type: 'info',
                title: 'Client Profile',
                message: `Opening service account for ${row.name}`
              })
            );
          }}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
        >
          View Account
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Building2 className="w-3 h-3" />
            <span>Client Accounts & Partners</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Clients & Accounts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enterprise customer directory, service contracts, and client portal permissions for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>Add Client</span>
        </Button>
      </div>

      {/* Main Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="w-64">
            <Input
              placeholder="Search clients, contacts, emails..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs"
            />
          </div>
          <span className="text-xs text-slate-400">
            {filteredClients.length} clients registered
          </span>
        </div>

        <Table columns={columns} data={filteredClients} emptyMessage="No clients found." />
      </Card>

      {/* Add Client Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Enterprise Client Account"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateClient}>
              Save Client
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
          <Input
            label="Client Company Name"
            placeholder="e.g. Metro Retail Logistics LLC"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
          />

          <Input
            label="Primary Contact Person"
            placeholder="e.g. Olivia Parker"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Email"
              type="email"
              placeholder="olivia@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Contact Phone"
              placeholder="+1 (555) 000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <Input
            label="Service Delivery Address"
            placeholder="Warehouse Bay, City, State"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};

export default ClientsPage;
