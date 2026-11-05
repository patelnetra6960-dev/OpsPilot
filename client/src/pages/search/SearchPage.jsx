import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Download,
  Filter,
  Calendar,
  ArrowUpDown,
  FileText,
  Users,
  Briefcase,
  Boxes,
  CreditCard,
  Inbox,
  Building2,
  Activity,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink
} from 'lucide-react';
import {
  useGlobalSearchQuery,
  useExportDataMutation,
  SEARCHABLE_ENTITIES,
  EXPORTABLE_ENTITIES
} from '../../features/search/index.js';

export const SearchPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const userRole = (user?.role || 'employee').toLowerCase();
  const isCustomer = userRole === 'customer';
  const isEmployee = userRole === 'employee';

  // Filter available entities based on role
  const availableEntities = useMemo(() => {
    return SEARCHABLE_ENTITIES.filter((e) => {
      if (isCustomer) {
        return !['employees', 'customers', 'tasks', 'inventory'].includes(e.value);
      }
      if (isEmployee) {
        return e.value !== 'invoices';
      }
      return true;
    });
  }, [isCustomer, isEmployee]);

  const availableExportEntities = useMemo(() => {
    return EXPORTABLE_ENTITIES.filter((e) => {
      if (isCustomer) {
        return !['employees', 'customers', 'tasks', 'inventory'].includes(e.value);
      }
      if (isEmployee) {
        return e.value !== 'invoices';
      }
      return true;
    });
  }, [isCustomer, isEmployee]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Export panel states
  const [exportEntity, setExportEntity] = useState(availableExportEntities[0]?.value || 'projects');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportLimit, setExportLimit] = useState(500);

  // Debounce search input
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
    clearTimeout(window._searchDebounceTimer);
    window._searchDebounceTimer = setTimeout(() => {
      setDebouncedSearch(val);
    }, 300);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedType('all');
    setStatusFilter('');
    setPriorityFilter('');
    setFromDate('');
    setToDate('');
    setSortBy('created_at');
    setSortOrder('desc');
    setPage(1);
  };

  // Query hook
  const queryParams = useMemo(() => {
    const params = {
      q: debouncedSearch,
      type: selectedType,
      sortBy,
      sortOrder,
      page,
      limit: pageSize
    };
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;
    return params;
  }, [
    debouncedSearch,
    selectedType,
    statusFilter,
    priorityFilter,
    fromDate,
    toDate,
    sortBy,
    sortOrder,
    page,
    pageSize
  ]);

  const { data: searchResult, isLoading, isFetching } = useGlobalSearchQuery(queryParams);
  const exportMutation = useExportDataMutation();

  const results = searchResult?.data || [];
  const pagination = searchResult?.pagination || {
    page: 1,
    limit: pageSize,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false
  };

  const handleExport = () => {
    exportMutation.mutate({
      entity: exportEntity,
      format: exportFormat,
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      search: debouncedSearch || undefined,
      limit: exportLimit
    });
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'employees':
        return <Users className="w-4 h-4 text-sky-500" />;
      case 'customers':
        return <Building2 className="w-4 h-4 text-emerald-500" />;
      case 'projects':
        return <Briefcase className="w-4 h-4 text-indigo-500" />;
      case 'tasks':
        return <Activity className="w-4 h-4 text-purple-500" />;
      case 'service_requests':
        return <Inbox className="w-4 h-4 text-amber-500" />;
      case 'inventory':
        return <Boxes className="w-4 h-4 text-cyan-500" />;
      case 'invoices':
        return <CreditCard className="w-4 h-4 text-rose-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-500" />;
    }
  };

  const getPriorityBadgeClass = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800';
      case 'high':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'low':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
      case 'active':
      case 'paid':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'in_progress':
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'cancelled':
      case 'overdue':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Global Search & Data Export
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Query cross-entity domain records with multi-field filtering and RFC 4180 CSV export.
          </p>
        </div>

        {/* Export Action Card */}
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl shadow-sm">
          <select
            value={exportEntity}
            onChange={(e) => setExportEntity(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {availableExportEntities.map((ent) => (
              <option key={ent.value} value={ent.value}>
                {ent.label}
              </option>
            ))}
          </select>

          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="csv">CSV (Spreadsheet)</option>
            <option value="json">JSON Dataset</option>
          </select>

          <select
            value={exportLimit}
            onChange={(e) => setExportLimit(Number(e.target.value))}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="100">100 max</option>
            <option value="500">500 max</option>
            <option value="1000">1000 max</option>
          </select>

          <button
            type="button"
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            {exportMutation.isPending ? 'Exporting...' : 'Export Data'}
          </button>
        </div>
      </div>

      {/* Main Search Bar & Category Pills */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Type keyword, employee name, client, SKU, task title, invoice number..."
            className="w-full pl-11 pr-10 py-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setDebouncedSearch('');
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Entity Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {availableEntities.map((ent) => {
            const isActive = selectedType === ent.value;
            return (
              <button
                key={ent.value}
                type="button"
                onClick={() => {
                  setSelectedType(ent.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {ent.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-indigo-500" />
            Advanced Multi-Field Filters
          </div>

          {(statusFilter || priorityFilter || fromDate || toDate || debouncedSearch) && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Reset All Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-3">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="todo">To Do</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
              <option value="low_stock">Low Stock</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              To Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              Sort Order
            </label>
            <div className="flex items-center gap-1">
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="created_at">Date Created</option>
                <option value="title">Title / Name</option>
                <option value="status">Status</option>
                <option value="priority">Priority</option>
              </select>

              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Header with Counts & Loading Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-slate-900 dark:text-white">{results.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-white">{pagination.totalItems}</strong> matching records
          </span>
          {isFetching && (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-500 ml-1" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <span>Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* Results List / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-medium">Scanning multi-tenant records...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="py-20 px-4 text-center">
            <Search className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              No matching records found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              We couldn't find any domain items matching your search query or active filter parameters.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.map((item) => (
              <div
                key={`${item.entity_type}-${item.id}`}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                    {getEntityIcon(item.entity_type)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {item.entity_type.replace(/_/g, ' ')}
                      </span>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {item.subtitle}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                      {item.status && (
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      )}

                      {item.priority && (
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-medium capitalize ${getPriorityBadgeClass(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                      )}

                      {item.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.date}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => item.url && navigate(item.url)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 transition"
                  >
                    <span>View Record</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              Page <strong className="text-slate-900 dark:text-white">{pagination.page}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white">{pagination.totalPages}</strong>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPreviousPage}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </button>

              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNextPage}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
