import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Boxes,
  Search,
  Plus,
  Wrench,
  Truck,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  History,
  DollarSign,
  Layers,
  ShoppingBag,
  Eye,
  RefreshCw,
  Check
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import {
  useInventoryItemsQuery,
  useInventoryStatsQuery,
  useCreateInventoryItemMutation,
  useStockInMutation,
  useStockOutMutation,
  useAdjustStockMutation,
  useStockTransactionsQuery,
  useAssetsQuery,
  useAssetStatsQuery,
  useCreateAssetMutation,
  useAssignAssetMutation,
  useAddMaintenanceLogMutation,
  useSuppliersQuery,
  useSupplierStatsQuery,
  useCreateSupplierMutation,
  useSupplierPurchasesQuery,
  useCreatePurchaseOrderMutation,
  useReceivePurchaseOrderMutation,
  inventoryItemCreateSchema,
  stockInSchema,
  stockOutSchema,
  stockAdjustSchema,
  assetCreateSchema,
  assetAssignSchema,
  assetMaintenanceSchema,
  supplierCreateSchema,
  purchaseOrderCreateSchema
} from '../../features/inventory/index.js';
import { useEmployeesQuery } from '../../features/workforce/index.js';
import {
  Badge,
  Button,
  Card,
  Modal,
  Drawer,
  EmptyState,
  SkeletonTable
} from '../../components/ui/index.js';
import { FormInput, FormSelect, FormTextarea } from '../../components/form/index.js';

export const InventoryPage = ({ initialTab }) => {
  const { isOwner, isAdmin, isManager } = useAuth();
  const canManage = isOwner || isAdmin || isManager;
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Determine resolved initial tab from prop, pathname, or query string
  const resolvedTab = useMemo(() => {
    if (initialTab) return initialTab;
    const tabParam = searchParams.get('tab');
    if (tabParam && ['inventory', 'assets', 'suppliers'].includes(tabParam)) return tabParam;
    if (location.pathname.startsWith('/assets')) return 'assets';
    if (location.pathname.startsWith('/suppliers')) return 'suppliers';
    return 'inventory';
  }, [initialTab, searchParams, location.pathname]);

  // Active top-level sub-tab: 'inventory' | 'assets' | 'suppliers'
  const [activeTab, setActiveTab] = useState(resolvedTab);

  useEffect(() => {
    setActiveTab(resolvedTab);
  }, [resolvedTab]);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Selected Entities & Drawers
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  // Modal Open States
  const [createPartModalOpen, setCreatePartModalOpen] = useState(false);
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [registerAssetModalOpen, setRegisterAssetModalOpen] = useState(false);
  const [assignAssetModalOpen, setAssignAssetModalOpen] = useState(false);
  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [createSupplierModalOpen, setCreateSupplierModalOpen] = useState(false);
  const [createPoModalOpen, setCreatePoModalOpen] = useState(false);

  // Active target entity for action modals
  const [targetItem, setTargetItem] = useState(null);
  const [targetAsset, setTargetAsset] = useState(null);

  // Queries
  const inventoryFilters = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      low_stock: lowStockOnly ? true : undefined
    }),
    [debouncedSearch, categoryFilter, statusFilter, lowStockOnly]
  );

  const { data: inventoryItems = [], isLoading: isInventoryLoading } = useInventoryItemsQuery(
    inventoryFilters,
    { enabled: activeTab === 'inventory' }
  );

  const { data: inventoryStats = {} } = useInventoryStatsQuery({
    enabled: activeTab === 'inventory'
  });

  const { data: assets = [], isLoading: isAssetsLoading } = useAssetsQuery(
    {
      search: debouncedSearch || undefined,
      category: categoryFilter !== 'all' ? categoryFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined
    },
    { enabled: activeTab === 'assets' }
  );

  const { data: assetStats = {} } = useAssetStatsQuery({ enabled: activeTab === 'assets' });

  const { data: suppliers = [], isLoading: isSuppliersLoading } = useSuppliersQuery(
    { search: debouncedSearch || undefined },
    { enabled: activeTab === 'suppliers' }
  );

  const { data: supplierStats = {} } = useSupplierStatsQuery({
    enabled: activeTab === 'suppliers'
  });

  const { data: employees = [] } = useEmployeesQuery();

  // Item Drawer Transactions Query
  const { data: itemTransactions = [], isLoading: isTransactionsLoading } =
    useStockTransactionsQuery({ itemId: selectedItem?.id }, { enabled: Boolean(selectedItem?.id) });

  // Supplier Drawer Purchase Orders Query
  const { data: supplierPurchases = [], isLoading: isPurchasesLoading } = useSupplierPurchasesQuery(
    selectedSupplier?.id,
    { enabled: Boolean(selectedSupplier?.id) }
  );

  // Mutations
  const createItemMutation = useCreateInventoryItemMutation();
  const stockInMutation = useStockInMutation();
  const stockOutMutation = useStockOutMutation();
  const adjustMutation = useAdjustStockMutation();
  const createAssetMutation = useCreateAssetMutation();
  const assignAssetMutation = useAssignAssetMutation();
  const addMaintenanceMutation = useAddMaintenanceLogMutation();
  const createSupplierMutation = useCreateSupplierMutation();
  const createPoMutation = useCreatePurchaseOrderMutation();
  const receivePoMutation = useReceivePurchaseOrderMutation();

  // =========================================================================
  // Form Setup: Inventory
  // =========================================================================
  const {
    register: registerItem,
    handleSubmit: handleSubmitItem,
    reset: resetItem,
    formState: { errors: itemErrors, isSubmitting: isCreatingItem }
  } = useForm({
    resolver: zodResolver(inventoryItemCreateSchema),
    defaultValues: {
      sku: '',
      name: '',
      category: 'Hydraulics',
      location: 'Warehouse Central • Aisle 1, Bin A-01',
      in_stock: 10,
      reorder_level: 5,
      unit_cost: 25.0,
      supplier_id: ''
    }
  });

  const {
    register: registerStockIn,
    handleSubmit: handleSubmitStockIn,
    reset: resetStockIn,
    formState: { errors: stockInErrors, isSubmitting: isStockingIn }
  } = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: {
      quantity: 10,
      unit_price: 0,
      reference_type: 'purchase_order',
      reference_note: ''
    }
  });

  const {
    register: registerStockOut,
    handleSubmit: handleSubmitStockOut,
    reset: resetStockOut,
    formState: { errors: stockOutErrors, isSubmitting: isStockingOut }
  } = useForm({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      quantity: 1,
      reference_type: 'work_order',
      reference_note: ''
    }
  });

  const {
    register: registerAdjust,
    handleSubmit: handleSubmitAdjust,
    reset: resetAdjust,
    formState: { errors: adjustErrors, isSubmitting: isAdjusting }
  } = useForm({
    resolver: zodResolver(stockAdjustSchema),
    defaultValues: {
      adjustment_type: 'set_absolute',
      quantity: 0,
      reason: ''
    }
  });

  // =========================================================================
  // Form Setup: Assets
  // =========================================================================
  const {
    register: registerAsset,
    handleSubmit: handleSubmitAsset,
    reset: resetAsset,
    formState: { errors: assetErrors, isSubmitting: isRegisteringAsset }
  } = useForm({
    resolver: zodResolver(assetCreateSchema),
    defaultValues: {
      asset_tag: '',
      name: '',
      category: 'heavy_machinery',
      status: 'available',
      serial_number: '',
      purchase_cost: 15000.0,
      location: 'Warehouse Central • Bay 1',
      department: 'Operations'
    }
  });

  const {
    register: registerAssign,
    handleSubmit: handleSubmitAssign,
    reset: resetAssign,
    formState: { errors: assignErrors, isSubmitting: isAssigningAsset }
  } = useForm({
    resolver: zodResolver(assetAssignSchema),
    defaultValues: {
      assigned_to: '',
      department: 'Field Operations',
      location: 'Depot Lot A',
      notes: ''
    }
  });

  const {
    register: registerMaint,
    handleSubmit: handleSubmitMaint,
    reset: resetMaint,
    formState: { errors: maintErrors, isSubmitting: isLoggingMaint }
  } = useForm({
    resolver: zodResolver(assetMaintenanceSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      type: 'scheduled',
      description: '',
      cost: 250.0,
      performed_by: 'Maintenance Tech'
    }
  });

  // =========================================================================
  // Form Setup: Suppliers & PO
  // =========================================================================
  const {
    register: registerSupplier,
    handleSubmit: handleSubmitSupplier,
    reset: resetSupplier,
    formState: { errors: supplierErrors, isSubmitting: isCreatingSupplier }
  } = useForm({
    resolver: zodResolver(supplierCreateSchema),
    defaultValues: {
      name: '',
      code: '',
      contact_name: '',
      email: '',
      phone: '',
      address: '',
      payment_terms: 'Net 30',
      category: 'Industrial Supplies',
      status: 'preferred'
    }
  });

  const {
    register: registerPo,
    handleSubmit: handleSubmitPo,
    reset: resetPo,
    formState: { errors: poErrors, isSubmitting: isCreatingPo }
  } = useForm({
    resolver: zodResolver(purchaseOrderCreateSchema),
    defaultValues: {
      order_date: new Date().toISOString().split('T')[0],
      items: [
        {
          sku: 'HYD-SEAL-044',
          name: 'Industrial Hydraulic Cylinder Seal Kit',
          quantity: 20,
          unit_price: 38.5
        }
      ],
      notes: 'Replenishment order'
    }
  });

  // =========================================================================
  // Submit Handlers
  // =========================================================================
  const onSubmitCreateItem = async (data) => {
    try {
      await createItemMutation.mutateAsync(data);
      resetItem();
      setCreatePartModalOpen(false);
    } catch {
      // Handled by toast in mutation
    }
  };

  const onSubmitStockIn = async (data) => {
    if (!targetItem) return;
    try {
      await stockInMutation.mutateAsync({ id: targetItem.id, ...data });
      resetStockIn();
      setStockInModalOpen(false);
      setTargetItem(null);
    } catch {
      // Handled by toast in mutation
    }
  };

  const onSubmitStockOut = async (data) => {
    if (!targetItem) return;
    try {
      await stockOutMutation.mutateAsync({ id: targetItem.id, ...data });
      resetStockOut();
      setStockOutModalOpen(false);
      setTargetItem(null);
    } catch {
      // Handled by toast in mutation
    }
  };

  const onSubmitAdjust = async (data) => {
    if (!targetItem) return;
    try {
      await adjustMutation.mutateAsync({ id: targetItem.id, ...data });
      resetAdjust();
      setAdjustModalOpen(false);
      setTargetItem(null);
    } catch {
      // Handled by toast in mutation
    }
  };

  const onSubmitRegisterAsset = async (data) => {
    try {
      await createAssetMutation.mutateAsync(data);
      resetAsset();
      setRegisterAssetModalOpen(false);
    } catch {
      // Handled by toast in mutation
    }
  };

  const onSubmitAssignAsset = async (data) => {
    if (!targetAsset) return;
    try {
      await assignAssetMutation.mutateAsync({ id: targetAsset.id, ...data });
      resetAssign();
      setAssignAssetModalOpen(false);
      setTargetAsset(null);
    } catch {
      // Handled by toast in mutation
    }
  };

  const onSubmitMaintenance = async (data) => {
    if (!targetAsset) return;
    try {
      await addMaintenanceMutation.mutateAsync({ id: targetAsset.id, ...data });
      resetMaint();
      setMaintenanceModalOpen(false);
      setTargetAsset(null);
    } catch {
      // Handled by toast in mutation
    }
  };

  const onSubmitCreateSupplier = async (data) => {
    try {
      await createSupplierMutation.mutateAsync(data);
      resetSupplier();
      setCreateSupplierModalOpen(false);
    } catch {
      // Handled by toast in mutation
    }
  };

  const onSubmitCreatePo = async (data) => {
    if (!selectedSupplier) return;
    try {
      await createPoMutation.mutateAsync({
        supplierId: selectedSupplier.id,
        ...data
      });
      resetPo();
      setCreatePoModalOpen(false);
    } catch {
      // Handled by toast in mutation
    }
  };

  // Helper Badge Color
  const getStatusBadge = (status) => {
    switch (status) {
      case 'in_stock':
        return <Badge variant="success">In Stock</Badge>;
      case 'low_stock':
        return <Badge variant="warning">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge variant="danger">Out of Stock</Badge>;
      case 'available':
        return <Badge variant="success">Available</Badge>;
      case 'assigned':
        return <Badge variant="info">Assigned</Badge>;
      case 'maintenance':
        return <Badge variant="warning">In Service</Badge>;
      case 'retired':
        return <Badge variant="neutral">Retired</Badge>;
      case 'preferred':
        return <Badge variant="success">Preferred</Badge>;
      case 'active':
        return <Badge variant="info">Active</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Inventory, Assets & Suppliers</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Warehouse parts catalog, serial asset tracking, and vendor procurement supply chain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && activeTab === 'inventory' && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setCreatePartModalOpen(true)}
            >
              Add Inventory Part
            </Button>
          )}

          {canManage && activeTab === 'assets' && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setRegisterAssetModalOpen(true)}
            >
              Register Asset
            </Button>
          )}

          {canManage && activeTab === 'suppliers' && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setCreateSupplierModalOpen(true)}
            >
              Add Vendor Supplier
            </Button>
          )}
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => {
            setActiveTab('inventory');
            setSearchTerm('');
          }}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'inventory'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Warehouse Inventory & Stock</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('assets');
            setSearchTerm('');
          }}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'assets'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Equipment & Physical Assets</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('suppliers');
            setSearchTerm('');
          }}
          className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'suppliers'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Vendors & Supply Network</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: WAREHOUSE INVENTORY */}
      {/* ========================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-5">
          {/* Telemetry KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Catalog SKUs</span>
                <Layers className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {inventoryStats.totalSkus ?? inventoryItems.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Unique stock catalog items</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Units</span>
                <Boxes className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {inventoryStats.totalStockUnits ?? 0}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                Units on warehouse floor
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Low-Stock Alerts</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {inventoryStats.lowStockCount ?? 0}
              </div>
              <div className="text-[11px] text-amber-600/80 mt-1">Below minimum threshold</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Inventory Valuation</span>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                ${Number(inventoryStats.totalValuation || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Total asset capitalization</div>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by SKU, part name, warehouse bin location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-44 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Categories</option>
              <option value="Hydraulics">Hydraulics</option>
              <option value="Electrical">Electrical</option>
              <option value="IoT & Sensors">IoT & Sensors</option>
              <option value="Fleet & Engine">Fleet & Engine</option>
              <option value="Safety & PPE">Safety & PPE</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-36 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>

            <button
              type="button"
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                lowStockOnly
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low-Stock Only</span>
            </button>
          </div>

          {/* Inventory Items Table */}
          {isInventoryLoading ? (
            <SkeletonTable rows={5} columns={6} />
          ) : inventoryItems.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No Inventory Items Found"
              description="No parts match the selected search or filter criteria."
              actionLabel={canManage ? 'Add New Part' : undefined}
              onAction={() => setCreatePartModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">SKU Code</th>
                    <th className="py-3 px-4">Part / Component</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Stock Level</th>
                    <th className="py-3 px-4">Unit Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {inventoryItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {item.sku}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.location || 'Warehouse Central'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold text-sm ${
                              item.in_stock <= 0
                                ? 'text-red-600'
                                : item.in_stock <= item.reorder_level
                                  ? 'text-amber-600'
                                  : 'text-slate-900 dark:text-white'
                            }`}
                          >
                            {item.in_stock}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            / min {item.reorder_level}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        ${Number(item.unit_cost || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <>
                              <button
                                type="button"
                                title="Stock In"
                                onClick={() => {
                                  setTargetItem(item);
                                  setStockInModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                title="Stock Out"
                                onClick={() => {
                                  setTargetItem(item);
                                  setStockOutModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                              >
                                <ArrowDownRight className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                title="Adjust Stock"
                                onClick={() => {
                                  setTargetItem(item);
                                  setAdjustModalOpen(true);
                                }}
                                className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            title="Audit Ledger"
                            onClick={() => setSelectedItem(item)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PHYSICAL ASSETS */}
      {/* ========================================================================= */}
      {activeTab === 'assets' && (
        <div className="space-y-5">
          {/* Asset Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Fleet Assets</span>
                <Truck className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {assetStats.totalAssets ?? assets.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Tracked physical units</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">In Service</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {assetStats.inServiceCount ?? 0}
              </div>
              <div className="text-[11px] text-emerald-600/80 mt-1">Available or assigned</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Under Maintenance</span>
                <Wrench className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {assetStats.maintenanceCount ?? 0}
              </div>
              <div className="text-[11px] text-amber-600/80 mt-1">Active repair / calibration</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Fleet Valuation</span>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                ${Number(assetStats.totalValuation || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Total capital acquisition cost</div>
            </Card>
          </div>

          {/* Asset Table */}
          {isAssetsLoading ? (
            <SkeletonTable rows={5} columns={6} />
          ) : assets.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No Assets Registered"
              description="Register physical equipment, machinery, and vehicles to manage custody and service schedules."
              actionLabel={canManage ? 'Register Asset' : undefined}
              onAction={() => setRegisterAssetModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Tag</th>
                    <th className="py-3 px-4">Asset / Machinery</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Custody / Assignment</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Next Service</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {assets.map((asset) => (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {asset.asset_tag}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {asset.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SN: {asset.serial_number || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize">{asset.category.replace('_', ' ')}</span>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(asset.status)}</td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {asset.assigned_to_name || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {asset.location}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {asset.next_service_date || 'None scheduled'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <>
                              <button
                                type="button"
                                title="Assign Asset"
                                onClick={() => {
                                  setTargetAsset(asset);
                                  setAssignAssetModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600"
                              >
                                Assign
                              </button>

                              <button
                                type="button"
                                title="Log Maintenance"
                                onClick={() => {
                                  setTargetAsset(asset);
                                  setMaintenanceModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-600"
                              >
                                Service
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            title="View Maintenance History"
                            onClick={() => setSelectedAsset(asset)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VENDORS & SUPPLIERS */}
      {/* ========================================================================= */}
      {activeTab === 'suppliers' && (
        <div className="space-y-5">
          {/* Supplier Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Suppliers Network</span>
                <Building2 className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {supplierStats.totalSuppliers ?? suppliers.length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Authorized vendor accounts</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Preferred Vendors</span>
                <Check className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                {supplierStats.preferredCount ?? 0}
              </div>
              <div className="text-[11px] text-emerald-600/80 mt-1">Tier-1 contract pricing</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Purchase Orders</span>
                <ShoppingBag className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {supplierStats.totalPurchaseOrders ?? 0}
              </div>
              <div className="text-[11px] text-amber-600/80 mt-1">Procurement orders</div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Total Spend</span>
                <DollarSign className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                ${Number(supplierStats.totalSpend || 0).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Fulfilled order volume</div>
            </Card>
          </div>

          {/* Supplier Table */}
          {isSuppliersLoading ? (
            <SkeletonTable rows={4} columns={6} />
          ) : suppliers.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No Suppliers Registered"
              description="Add material suppliers and parts vendors to initiate purchase orders and automatic inventory replenishment."
              actionLabel={canManage ? 'Add Supplier' : undefined}
              onAction={() => setCreateSupplierModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Vendor Code</th>
                    <th className="py-3 px-4">Supplier Organization</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Contact Person</th>
                    <th className="py-3 px-4">Payment Terms</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {suppliers.map((sup) => (
                    <tr
                      key={sup.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {sup.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {sup.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{sup.address}</div>
                      </td>
                      <td className="py-3 px-4">{sup.category}</td>
                      <td className="py-3 px-4">
                        <div className="text-slate-900 dark:text-white font-medium">
                          {sup.contact_name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{sup.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {sup.payment_terms}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(sup.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplier(sup);
                                setCreatePoModalOpen(true);
                              }}
                              className="px-2 py-1 text-[11px] rounded bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 font-medium"
                            >
                              + Create PO
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedSupplier(sup)}
                            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600"
                            title="View Purchase Orders"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD INVENTORY PART */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createPartModalOpen}
        onClose={() => setCreatePartModalOpen(false)}
        title="Add Inventory Part to Warehouse"
        size="md"
      >
        <form onSubmit={handleSubmitItem(onSubmitCreateItem)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="SKU Code"
              name="sku"
              placeholder="e.g. HYD-VALVE-01"
              register={registerItem}
              errors={itemErrors}
              required
            />

            <FormSelect
              label="Category"
              name="category"
              register={registerItem}
              errors={itemErrors}
              options={[
                { value: 'Hydraulics', label: 'Hydraulics & Seals' },
                { value: 'Electrical', label: 'Electrical & Power' },
                { value: 'IoT & Sensors', label: 'IoT & Telemetry' },
                { value: 'Fleet & Engine', label: 'Fleet & Engine' },
                { value: 'Safety & PPE', label: 'Safety & PPE' },
                { value: 'Mechanical', label: 'Mechanical & Hardware' }
              ]}
            />
          </div>

          <FormInput
            label="Item Description / Component Name"
            name="name"
            placeholder="e.g. 2-Inch High Pressure Check Valve"
            register={registerItem}
            errors={itemErrors}
            required
          />

          <FormInput
            label="Storage Location / Warehouse Bin"
            name="location"
            placeholder="e.g. Warehouse Central • Aisle 4, Bin B-12"
            register={registerItem}
            errors={itemErrors}
          />

          <div className="grid grid-cols-3 gap-3">
            <FormInput
              label="Initial Stock Quantity"
              name="in_stock"
              type="number"
              register={registerItem}
              errors={itemErrors}
            />

            <FormInput
              label="Reorder Level (Min Alert)"
              name="reorder_level"
              type="number"
              register={registerItem}
              errors={itemErrors}
            />

            <FormInput
              label="Unit Cost ($)"
              name="unit_cost"
              type="number"
              step="0.01"
              register={registerItem}
              errors={itemErrors}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setCreatePartModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isCreatingItem}>
              Register Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: STOCK-IN (RECEIVING) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={stockInModalOpen}
        onClose={() => {
          setStockInModalOpen(false);
          setTargetItem(null);
        }}
        title={`Stock-In Receiving: ${targetItem?.sku || ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmitStockIn(onSubmitStockIn)} className="space-y-4 text-xs">
          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
            <div>
              Current Stock:{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {targetItem?.in_stock} units
              </span>
            </div>
            <div>
              Item:{' '}
              <span className="font-medium text-slate-900 dark:text-white">{targetItem?.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Received Quantity"
              name="quantity"
              type="number"
              register={registerStockIn}
              errors={stockInErrors}
              required
            />

            <FormInput
              label="Unit Cost ($)"
              name="unit_price"
              type="number"
              step="0.01"
              register={registerStockIn}
              errors={stockInErrors}
            />
          </div>

          <FormSelect
            label="Transaction Reference Type"
            name="reference_type"
            register={registerStockIn}
            errors={stockInErrors}
            options={[
              { value: 'purchase_order', label: 'Purchase Order Delivery' },
              { value: 'return', label: 'Customer Return' },
              { value: 'manual', label: 'Manual Intake' },
              { value: 'transfer', label: 'Inter-facility Transfer' }
            ]}
          />

          <FormInput
            label="Reference Note / Receipt Code"
            name="reference_note"
            placeholder="e.g. Received from Grainger PO-2026-081"
            register={registerStockIn}
            errors={stockInErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setStockInModalOpen(false);
                setTargetItem(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isStockingIn}>
              Confirm Stock-In
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: STOCK-OUT (DISPATCH) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={stockOutModalOpen}
        onClose={() => {
          setStockOutModalOpen(false);
          setTargetItem(null);
        }}
        title={`Stock-Out Dispatch: ${targetItem?.sku || ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmitStockOut(onSubmitStockOut)} className="space-y-4 text-xs">
          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
            <div>
              Available in Stock:{' '}
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {targetItem?.in_stock} units
              </span>
            </div>
          </div>

          <FormInput
            label="Dispatch Quantity"
            name="quantity"
            type="number"
            register={registerStockOut}
            errors={stockOutErrors}
            required
          />

          <FormSelect
            label="Reason / Dispatch Purpose"
            name="reference_type"
            register={registerStockOut}
            errors={stockOutErrors}
            options={[
              { value: 'work_order', label: 'Field Work Order Installation' },
              { value: 'scrap', label: 'Damaged / Scrapped' },
              { value: 'customer', label: 'Direct Client Supply' },
              { value: 'manual', label: 'General Warehouse Usage' }
            ]}
          />

          <FormInput
            label="Work Order Code / Reference"
            name="reference_note"
            placeholder="e.g. Dispatched for Work Order WO-2026-001"
            register={registerStockOut}
            errors={stockOutErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setStockOutModalOpen(false);
                setTargetItem(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" type="submit" isLoading={isStockingOut}>
              Dispatch Stock
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: ADJUST STOCK */}
      {/* ========================================================================= */}
      <Modal
        isOpen={adjustModalOpen}
        onClose={() => {
          setAdjustModalOpen(false);
          setTargetItem(null);
        }}
        title={`Audit Stock Adjustment: ${targetItem?.sku || ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmitAdjust(onSubmitAdjust)} className="space-y-4 text-xs">
          <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
            Current Count:{' '}
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {targetItem?.in_stock} units
            </span>
          </div>

          <FormSelect
            label="Adjustment Type"
            name="adjustment_type"
            register={registerAdjust}
            errors={adjustErrors}
            options={[
              { value: 'set_absolute', label: 'New Exact Physical Count' },
              { value: 'delta', label: 'Relative Delta (+/-)' }
            ]}
          />

          <FormInput
            label="Count / Quantity"
            name="quantity"
            type="number"
            register={registerAdjust}
            errors={adjustErrors}
            required
          />

          <FormTextarea
            label="Mandatory Audit Reason"
            name="reason"
            rows={3}
            placeholder="e.g. Discrepancy observed during quarterly physical cycle count audit..."
            register={registerAdjust}
            errors={adjustErrors}
            required
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setAdjustModalOpen(false);
                setTargetItem(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isAdjusting}>
              Save Adjustment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: REGISTER ASSET */}
      {/* ========================================================================= */}
      <Modal
        isOpen={registerAssetModalOpen}
        onClose={() => setRegisterAssetModalOpen(false)}
        title="Register Physical Asset"
        size="md"
      >
        <form onSubmit={handleSubmitAsset(onSubmitRegisterAsset)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Asset Tag / ID"
              name="asset_tag"
              placeholder="e.g. AST-2026-081"
              register={registerAsset}
              errors={assetErrors}
              required
            />

            <FormSelect
              label="Asset Category"
              name="category"
              register={registerAsset}
              errors={assetErrors}
              options={[
                { value: 'heavy_machinery', label: 'Heavy Machinery' },
                { value: 'vehicle', label: 'Fleet Vehicle' },
                { value: 'diagnostic_tool', label: 'Diagnostic Tool' },
                { value: 'equipment', label: 'Operational Equipment' },
                { value: 'facility', label: 'Facility Infrastructure' }
              ]}
            />
          </div>

          <FormInput
            label="Asset Name & Model"
            name="name"
            placeholder="e.g. Caterpillar 305E2 Mini Hydraulic Excavator"
            register={registerAsset}
            errors={assetErrors}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Serial Number (VIN / SN)"
              name="serial_number"
              placeholder="e.g. CAT0305E2CR1029"
              register={registerAsset}
              errors={assetErrors}
            />

            <FormInput
              label="Purchase Capital Cost ($)"
              name="purchase_cost"
              type="number"
              step="0.01"
              register={registerAsset}
              errors={assetErrors}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Current Physical Location"
              name="location"
              placeholder="e.g. Facility South Yard Bay 2"
              register={registerAsset}
              errors={assetErrors}
            />

            <FormInput
              label="Operating Department"
              name="department"
              placeholder="e.g. Field Operations"
              register={registerAsset}
              errors={assetErrors}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setRegisterAssetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isRegisteringAsset}>
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 6: ASSIGN ASSET */}
      {/* ========================================================================= */}
      <Modal
        isOpen={assignAssetModalOpen}
        onClose={() => {
          setAssignAssetModalOpen(false);
          setTargetAsset(null);
        }}
        title={`Assign Asset Ownership: ${targetAsset?.asset_tag || ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmitAssign(onSubmitAssignAsset)} className="space-y-4 text-xs">
          <FormSelect
            label="Assign to Workforce Member"
            name="assigned_to"
            register={registerAssign}
            errors={assignErrors}
            options={[
              { value: '', label: 'Select Employee / Technician...' },
              ...employees.map((e) => ({
                value: e.id,
                label: `${e.first_name} ${e.last_name} (${e.department || 'Staff'})`
              }))
            ]}
            required
          />

          <FormInput
            label="Deployment Location"
            name="location"
            placeholder="e.g. Mobile Service Truck #4"
            register={registerAssign}
            errors={assignErrors}
          />

          <FormTextarea
            label="Assignment Notes"
            name="notes"
            rows={2}
            placeholder="Custody handover details..."
            register={registerAssign}
            errors={assignErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setAssignAssetModalOpen(false);
                setTargetAsset(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isAssigningAsset}>
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 7: LOG MAINTENANCE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={maintenanceModalOpen}
        onClose={() => {
          setMaintenanceModalOpen(false);
          setTargetAsset(null);
        }}
        title={`Record Maintenance: ${targetAsset?.asset_tag || ''}`}
        size="sm"
      >
        <form onSubmit={handleSubmitMaint(onSubmitMaintenance)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Service Date"
              name="date"
              type="date"
              register={registerMaint}
              errors={maintErrors}
              required
            />

            <FormSelect
              label="Service Type"
              name="type"
              register={registerMaint}
              errors={maintErrors}
              options={[
                { value: 'scheduled', label: 'Scheduled Maintenance' },
                { value: 'repair', label: 'Breakdown Repair' },
                { value: 'calibration', label: 'Sensor Calibration' },
                { value: 'inspection', label: 'Safety Inspection' }
              ]}
            />
          </div>

          <FormTextarea
            label="Service Actions & Findings"
            name="description"
            rows={3}
            placeholder="Detailed description of repairs, replaced parts, and checks..."
            register={registerMaint}
            errors={maintErrors}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Maintenance Cost ($)"
              name="cost"
              type="number"
              step="0.01"
              register={registerMaint}
              errors={maintErrors}
            />

            <FormInput
              label="Performed By"
              name="performed_by"
              placeholder="e.g. David Kim"
              register={registerMaint}
              errors={maintErrors}
            />
          </div>

          <FormInput
            label="Next Due Date (Optional)"
            name="next_service_due"
            type="date"
            register={registerMaint}
            errors={maintErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => {
                setMaintenanceModalOpen(false);
                setTargetAsset(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isLoggingMaint}>
              Save Service Record
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 8: CREATE SUPPLIER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createSupplierModalOpen}
        onClose={() => setCreateSupplierModalOpen(false)}
        title="Add Vendor Supplier"
        size="md"
      >
        <form onSubmit={handleSubmitSupplier(onSubmitCreateSupplier)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Supplier Company Name"
              name="name"
              placeholder="e.g. Grainger Industrial Supply"
              register={registerSupplier}
              errors={supplierErrors}
              required
            />

            <FormInput
              label="Vendor Code"
              name="code"
              placeholder="e.g. SUP-GRAINGER"
              register={registerSupplier}
              errors={supplierErrors}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Contact Representative"
              name="contact_name"
              placeholder="e.g. Dan Miller"
              register={registerSupplier}
              errors={supplierErrors}
            />

            <FormInput
              label="Contact Email"
              name="email"
              type="email"
              placeholder="orders@vendor.com"
              register={registerSupplier}
              errors={supplierErrors}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Phone Number"
              name="phone"
              placeholder="+1 (800) 555-0199"
              register={registerSupplier}
              errors={supplierErrors}
            />

            <FormSelect
              label="Payment Terms"
              name="payment_terms"
              register={registerSupplier}
              errors={supplierErrors}
              options={[
                { value: 'Net 15', label: 'Net 15 Days' },
                { value: 'Net 30', label: 'Net 30 Days' },
                { value: 'Net 60', label: 'Net 60 Days' },
                { value: 'Due on Receipt', label: 'Due on Receipt' }
              ]}
            />
          </div>

          <FormInput
            label="Corporate / Warehouse Address"
            name="address"
            placeholder="100 Logistics Blvd, Chicago, IL"
            register={registerSupplier}
            errors={supplierErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setCreateSupplierModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isCreatingSupplier}>
              Register Vendor
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 9: CREATE PURCHASE ORDER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={createPoModalOpen}
        onClose={() => setCreatePoModalOpen(false)}
        title={`Create Purchase Order for ${selectedSupplier?.name || 'Vendor'}`}
        size="md"
      >
        <form onSubmit={handleSubmitPo(onSubmitCreatePo)} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="PO Number (Optional)"
              name="po_number"
              placeholder="Auto-generated if blank"
              register={registerPo}
              errors={poErrors}
            />

            <FormInput
              label="Order Date"
              name="order_date"
              type="date"
              register={registerPo}
              errors={poErrors}
            />
          </div>

          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
            <div className="font-semibold text-slate-800 dark:text-slate-200">
              Line Item #1 (Replenishment)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="SKU Code"
                name="items.0.sku"
                placeholder="e.g. HYD-SEAL-044"
                register={registerPo}
                errors={poErrors}
                required
              />

              <FormInput
                label="Item Name"
                name="items.0.name"
                placeholder="e.g. Hydraulic Cylinder Seal Kit"
                register={registerPo}
                errors={poErrors}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormInput
                label="Order Quantity"
                name="items.0.quantity"
                type="number"
                register={registerPo}
                errors={poErrors}
                required
              />

              <FormInput
                label="Unit Price ($)"
                name="items.0.unit_price"
                type="number"
                step="0.01"
                register={registerPo}
                errors={poErrors}
                required
              />
            </div>
          </div>

          <FormTextarea
            label="Procurement Notes"
            name="notes"
            rows={2}
            placeholder="Special instructions or delivery specifications..."
            register={registerPo}
            errors={poErrors}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setCreatePoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isCreatingPo}>
              Submit Purchase Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* DRAWER 1: INVENTORY ITEM TRANSACTIONS LEDGER */}
      {/* ========================================================================= */}
      <Drawer
        isOpen={Boolean(selectedItem)}
        onClose={() => setSelectedItem(null)}
        title={selectedItem?.name || 'Inventory History'}
        size="md"
      >
        {selectedItem && (
          <div className="space-y-5 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">SKU Code</span>
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedItem.sku}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Current Stock</span>
                <div className="font-bold text-slate-900 dark:text-white">
                  {selectedItem.in_stock} units
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Warehouse Location</span>
                <div className="text-slate-700 dark:text-slate-300">
                  {selectedItem.location || 'Warehouse Central'}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Reorder Threshold</span>
                <div className="text-slate-700 dark:text-slate-300">
                  {selectedItem.reorder_level} units
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-500" />
                <span>Immutable Stock Transactions Ledger</span>
              </h4>

              {isTransactionsLoading ? (
                <div className="text-center py-6 text-slate-400">Loading audit history...</div>
              ) : itemTransactions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 border border-dashed rounded-lg">
                  No stock movements recorded yet for this SKU.
                </div>
              ) : (
                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {itemTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              tx.transaction_type === 'inbound'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                : tx.transaction_type === 'outbound'
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                                  : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {tx.transaction_type}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {tx.quantity > 0 && tx.transaction_type === 'inbound' ? '+' : ''}
                            {tx.quantity} units
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {tx.reference_note || tx.reference_type || 'Stock movement'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>By: {tx.performed_by || 'Staff'}</span>
                          <span>•</span>
                          <span>{new Date(tx.created_at).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[11px] text-slate-400">{tx.previous_stock}</span>
                        <span className="text-slate-400 mx-1">→</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {tx.new_stock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ========================================================================= */}
      {/* DRAWER 2: ASSET MAINTENANCE TIMELINE */}
      {/* ========================================================================= */}
      <Drawer
        isOpen={Boolean(selectedAsset)}
        onClose={() => setSelectedAsset(null)}
        title={selectedAsset?.name || 'Asset Details'}
        size="md"
      >
        {selectedAsset && (
          <div className="space-y-5 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Tag</span>
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedAsset.asset_tag}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Status</span>
                <div>{getStatusBadge(selectedAsset.status)}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Assigned To</span>
                <div className="text-slate-900 dark:text-white font-medium">
                  {selectedAsset.assigned_to_name || 'Unassigned'}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Deployment Location</span>
                <div className="text-slate-700 dark:text-slate-300">
                  {selectedAsset.location || 'Depot'}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-amber-500" />
                <span>Service & Maintenance History</span>
              </h4>

              {!selectedAsset.maintenance_history ||
              selectedAsset.maintenance_history.length === 0 ? (
                <div className="text-center py-6 text-slate-400 border border-dashed rounded-lg">
                  No maintenance records logged for this asset.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedAsset.maintenance_history.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                          {log.type}
                        </span>
                        <span className="font-mono text-slate-500">{log.date}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{log.description}</p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span>Cost: ${Number(log.cost || 0).toFixed(2)}</span>
                        <span>Tech: {log.performed_by}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* ========================================================================= */}
      {/* DRAWER 3: SUPPLIER PURCHASE ORDERS */}
      {/* ========================================================================= */}
      <Drawer
        isOpen={Boolean(selectedSupplier)}
        onClose={() => setSelectedSupplier(null)}
        title={selectedSupplier?.name || 'Supplier Orders'}
        size="md"
      >
        {selectedSupplier && (
          <div className="space-y-5 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400">Vendor Code</span>
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedSupplier.code}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Terms</span>
                <div className="text-slate-700 dark:text-slate-300">
                  {selectedSupplier.payment_terms}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Contact</span>
                <div className="text-slate-900 dark:text-white font-medium">
                  {selectedSupplier.contact_name}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Phone</span>
                <div className="text-slate-700 dark:text-slate-300">{selectedSupplier.phone}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-indigo-500" />
                  <span>Purchase Orders & Deliveries</span>
                </h4>
                {canManage && (
                  <Button variant="secondary" size="xs" onClick={() => setCreatePoModalOpen(true)}>
                    + New PO
                  </Button>
                )}
              </div>

              {isPurchasesLoading ? (
                <div className="text-center py-6 text-slate-400">Loading purchase orders...</div>
              ) : supplierPurchases.length === 0 ? (
                <div className="text-center py-6 text-slate-400 border border-dashed rounded-lg">
                  No purchase records for this vendor.
                </div>
              ) : (
                <div className="space-y-3">
                  {supplierPurchases.map((po) => (
                    <div
                      key={po.id}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {po.po_number}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2">{po.order_date}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            po.status === 'received'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {po.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                        {(po.items || []).map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>
                              {it.quantity}x {it.name} ({it.sku})
                            </span>
                            <span className="font-mono">
                              ${Number(it.unit_price || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-bold text-slate-900 dark:text-white">
                          Total: ${Number(po.total_amount || 0).toFixed(2)}
                        </span>

                        {canManage && po.status !== 'received' && (
                          <Button
                            variant="primary"
                            size="xs"
                            onClick={() => receivePoMutation.mutate(po.id)}
                            isLoading={receivePoMutation.isPending}
                          >
                            Receive & Stock In
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default InventoryPage;
