import { useState } from 'react';
import { Boxes, Plus, Search } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal, Table } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { PROTOTYPE_INVENTORY } from '../../data/prototypeData.js';

export const InventoryPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);

  const [inventory, setInventory] = useState(PROTOTYPE_INVENTORY);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New Part State
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Hydraulics');
  const [location, setLocation] = useState('Warehouse Central • Aisle 1, Bin A-01');
  const [quantity, setQuantity] = useState('10');
  const [unitCost, setUnitCost] = useState('45.00');

  const handleCreatePart = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPart = {
      sku: sku || `PRT-${Math.floor(100 + Math.random() * 900)}`,
      name: name,
      category: category,
      location: location,
      inStock: Number(quantity),
      reorderLevel: 5,
      unitCost: `$${Number(unitCost).toFixed(2)}`,
      status:
        Number(quantity) > 5 ? 'in_stock' : Number(quantity) > 0 ? 'low_stock' : 'out_of_stock'
    };

    setInventory([newPart, ...inventory]);
    setModalOpen(false);
    setName('');
    setSku('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Inventory Item Added',
        message: `${newPart.name} added to ${currentTenant?.name} registry`
      })
    );
  };

  const handleAdjustStock = (partSku, delta) => {
    setInventory(
      inventory.map((item) => {
        if (item.sku === partSku) {
          const nextStock = Math.max(0, item.inStock + delta);
          const nextStatus =
            nextStock > item.reorderLevel
              ? 'in_stock'
              : nextStock > 0
                ? 'low_stock'
                : 'out_of_stock';
          return { ...item, inStock: nextStock, status: nextStatus };
        }
        return item;
      })
    );
  };

  const filteredInventory = inventory.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const columns = [
    {
      key: 'sku',
      label: 'SKU Code',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
          {val}
        </span>
      )
    },
    {
      key: 'name',
      label: 'Item / Component',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-semibold text-xs text-slate-900 dark:text-white">{val}</div>
          <div className="text-[10px] text-slate-400 font-mono">{row.location}</div>
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: (val) => (
        <Badge variant="neutral" size="sm" className="text-[10px]">
          {val}
        </Badge>
      )
    },
    {
      key: 'inStock',
      label: 'In Stock (Units)',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs">{val}</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleAdjustStock(row.sku, -1)}
              className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-xs"
            >
              -
            </button>
            <button
              type="button"
              onClick={() => handleAdjustStock(row.sku, 1)}
              className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-xs"
            >
              +
            </button>
          </div>
        </div>
      )
    },
    {
      key: 'unitCost',
      label: 'Unit Cost',
      sortable: true,
      render: (val) => <span className="font-mono text-xs text-slate-500">{val}</span>
    },
    {
      key: 'status',
      label: 'Availability',
      render: (val) => (
        <Badge
          variant={val === 'in_stock' ? 'success' : val === 'low_stock' ? 'warning' : 'danger'}
          size="sm"
          className="capitalize text-[10px]"
        >
          {val.replace(/_/g, ' ')}
        </Badge>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Boxes className="w-3 h-3" />
            <span>Warehouse Parts & Asset Inventory</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Inventory & Spare Parts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time tracking of replacement components, reorder thresholds, and bin locations for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>Add Spare Part</span>
        </Button>
      </div>

      {/* Main Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="w-48 sm:w-72">
            <Input
              placeholder="Search part name, SKU, or aisle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
              className="text-xs"
            />
          </div>

          <div className="w-48">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Categories' },
                { value: 'Hydraulics', label: 'Hydraulics' },
                { value: 'IoT & Sensors', label: 'IoT & Sensors' },
                { value: 'Electrical', label: 'Electrical' },
                { value: 'Fleet & Engine', label: 'Fleet & Engine' },
                { value: 'Safety & PPE', label: 'Safety & PPE' }
              ]}
            />
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredInventory}
          emptyMessage="No spare parts found in inventory."
        />
      </Card>

      {/* Add Part Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Register Spare Part / Component"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreatePart}>
              Save to Inventory
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreatePart} className="space-y-4 text-xs">
          <Input
            label="Item Description / Component Name"
            placeholder="e.g. 24V Solenoid Directional Valve"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU Code"
              placeholder="e.g. VAL-SOL-024"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />

            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: 'Hydraulics', label: 'Hydraulics' },
                { value: 'IoT & Sensors', label: 'IoT & Sensors' },
                { value: 'Electrical', label: 'Electrical' },
                { value: 'Fleet & Engine', label: 'Fleet & Engine' },
                { value: 'Safety & PPE', label: 'Safety & PPE' }
              ]}
            />
          </div>

          <Input
            label="Storage Bin / Aisle Location"
            placeholder="Warehouse Central • Aisle 3, Bin C-02"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Initial Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />

            <Input
              label="Unit Cost ($ USD)"
              type="number"
              step="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
