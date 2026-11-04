import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  Users,
  DollarSign,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Button, Select } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { PROTOTYPE_ANALYTICS } from '../../data/prototypeData.js';

export const AnalyticsPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [timeWindow, setTimeWindow] = useState('Quarter');

  const { kpis, utilizationByDepartment, monthlyRevenueVsExpense, workOrdersByStatus } =
    PROTOTYPE_ANALYTICS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <BarChart3 className="w-3 h-3" />
            <span>Executive Analytics & Operations Telemetry</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Operations Analytics
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Workforce efficiency, dispatch velocity, SLA compliance, and financial margin reporting
            for {currentTenant?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-36">
            <Select
              value={timeWindow}
              onChange={(e) => setTimeWindow(e.target.value)}
              options={[
                { value: 'Month', label: 'Past 30 Days' },
                { value: 'Quarter', label: 'Current Quarter' },
                { value: 'Year', label: 'Year to Date' }
              ]}
            />
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              dispatch(
                addToast({
                  type: 'success',
                  title: 'Executive PDF Generated',
                  message: `Exported ${timeWindow} operational summary for ${currentTenant?.name}`
                })
              );
            }}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export Report</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="elevated" className="p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">
              Workforce Utilization
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {kpis.workforceUtilization}
            </div>
            <div className="text-[11px] text-emerald-500 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{kpis.workforceTrend}</span>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">SLA Fulfillment</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {kpis.slaCompliance}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">{kpis.slaTrend}</div>
          </div>
        </Card>

        <Card variant="elevated" className="p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Mean Time to Resolve</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {kpis.meanTimeToResolve}
            </div>
            <div className="text-[11px] text-emerald-500 mt-1">{kpis.mttrTrend}</div>
          </div>
        </Card>

        <Card variant="elevated" className="p-5 space-y-3">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Operating Margin</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {kpis.netProfitMargin}
            </div>
            <div className="text-[11px] text-purple-500 mt-1">{kpis.marginTrend}</div>
          </div>
        </Card>
      </div>

      {/* Visual Chart Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Monthly Revenue vs Operations Cost Chart (7 cols) */}
        <div className="lg:col-span-7">
          <Card variant="default" className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Revenue vs Operating Expense Flow
                </h2>
                <p className="text-xs text-slate-500">6-Month historical billing and labor cost</p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-indigo-600" />
                  <span className="text-slate-600 dark:text-slate-400">Billed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-slate-300 dark:bg-slate-700" />
                  <span className="text-slate-600 dark:text-slate-400">Labor/Fuel</span>
                </span>
              </div>
            </div>

            <div className="h-60 flex items-end justify-between gap-3 pt-6 px-2">
              {monthlyRevenueVsExpense.map((item, idx) => {
                const max = 100000;
                const revHeight = (item.revenue / max) * 100;
                const expHeight = (item.expense / max) * 100;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                  >
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      <div
                        style={{ height: `${revHeight}%` }}
                        className="w-1/2 rounded-t-lg bg-indigo-600 hover:bg-indigo-500 transition-all cursor-pointer relative group"
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded font-mono pointer-events-none transition whitespace-nowrap">
                          ${(item.revenue / 1000).toFixed(0)}k
                        </div>
                      </div>
                      <div
                        style={{ height: `${expHeight}%` }}
                        className="w-1/2 rounded-t-lg bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 transition-all cursor-pointer relative group"
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] py-0.5 px-1.5 rounded font-mono pointer-events-none transition whitespace-nowrap">
                          ${(item.expense / 1000).toFixed(0)}k
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">{item.month}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: Departmental Utilization & Work Order Breakdown (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="default" className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Workforce Capacity by Department
            </h2>

            <div className="space-y-3">
              {utilizationByDepartment.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.dept}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {item.rate}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${item.rate}%` }}
                      className={`h-full rounded-full ${
                        item.rate >= item.target ? 'bg-indigo-600' : 'bg-amber-500'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="default" className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Work Order Resolution Distribution
            </h2>

            <div className="space-y-2.5">
              {workOrdersByStatus.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {item.label}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {item.count} orders
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
