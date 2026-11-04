import { useState } from 'react';
import {
  Users,
  CalendarCheck,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  MapPin,
  Filter
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Badge, Button, Modal } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const ManagerDashboardPage = () => {
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeWorkOrderModal, setActiveWorkOrderModal] = useState(null);

  // Field Technicians Status
  const [technicians] = useState([
    {
      id: 'tech-1',
      name: 'David Kim',
      role: 'Senior Technician',
      status: 'on_site',
      location: 'Metro Distribution Center Bay 4',
      work_order: 'WO-8421 (Hydraulic Lift Inspection)',
      eta: 'On Site since 09:15 AM',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
    },
    {
      id: 'tech-2',
      name: 'Emily Davis',
      role: 'Fleet Logistics Specialist',
      status: 'en_route',
      location: 'En route to Apex Cargo Terminal',
      work_order: 'WO-8424 (Cold Chain Sensor Calibration)',
      eta: 'ETA: 15 mins (Traffic Normal)',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'
    },
    {
      id: 'tech-3',
      name: 'Carlos Mendez',
      role: 'Maintenance Lead',
      status: 'on_break',
      location: 'Acme Central Depot',
      work_order: 'Break scheduled (Meal Period)',
      eta: 'Resuming at 01:30 PM',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'
    },
    {
      id: 'tech-4',
      name: 'Aisha Patel',
      role: 'Quality & Safety Inspector',
      status: 'on_site',
      location: 'Harbor Gate 12 Warehouse',
      work_order: 'WO-8419 (Safety Protocol Audit)',
      eta: 'On Site since 10:00 AM',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'
    }
  ]);

  // Timesheets awaiting manager approval
  const [timesheets, setTimesheets] = useState([
    {
      id: 'ts-101',
      employee: 'David Kim',
      date: 'Yesterday (Nov 3)',
      hours: '8.5 hrs',
      overtime: '+0.5 hr OT',
      shift: 'Day Shift (08:00 - 16:30)',
      notes: 'Extended shift to finalize emergency hydraulic pump replacement.'
    },
    {
      id: 'ts-102',
      employee: 'Emily Davis',
      date: 'Yesterday (Nov 3)',
      hours: '9.0 hrs',
      overtime: '+1.0 hr OT',
      shift: 'Day Shift (07:30 - 16:30)',
      notes: 'Highway delay during return dispatch.'
    },
    {
      id: 'ts-103',
      employee: 'Carlos Mendez',
      date: 'Yesterday (Nov 3)',
      hours: '8.0 hrs',
      overtime: 'None',
      shift: 'Standard Shift (08:00 - 16:00)',
      notes: 'Scheduled maintenance completed on schedule.'
    }
  ]);

  const handleApproveTimesheet = (id, name) => {
    setTimesheets(timesheets.filter((t) => t.id !== id));
    dispatch(
      addToast({
        type: 'success',
        title: 'Timesheet Approved',
        message: `Approved timesheet hours for ${name}`
      })
    );
  };

  const handleRejectTimesheet = (id, name) => {
    setTimesheets(timesheets.filter((t) => t.id !== id));
    dispatch(
      addToast({
        type: 'warning',
        title: 'Timesheet Sent for Revision',
        message: `Timesheet for ${name} flagged for correction`
      })
    );
  };

  const filteredTechs =
    filterStatus === 'all' ? technicians : technicians.filter((t) => t.status === filterStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Users className="w-3 h-3" />
            <span>Field Team & Operations Dispatch</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Operations Manager Command
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Real-time field personnel monitoring, dispatch status, and pending timesheet approvals
            for {currentTenant?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              dispatch(
                addToast({
                  type: 'info',
                  title: 'Shift Broadcast',
                  message: 'Roster notification broadcast sent to 14 active team members'
                })
              );
            }}
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            <span>Broadcast Alert</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setActiveWorkOrderModal(true);
            }}
          >
            <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
            <span>Assign Field Job</span>
          </Button>
        </div>
      </div>

      {/* Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'On-Duty Personnel',
            value: '14 / 18',
            sub: '4 on scheduled leave',
            icon: Users,
            color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
          },
          {
            title: 'Active Dispatches',
            value: '8 Jobs',
            sub: '6 on-site, 2 en-route',
            icon: Send,
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
          },
          {
            title: 'Pending Timesheets',
            value: timesheets.length,
            sub: 'Requires manager sign-off',
            icon: Clock,
            color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
          },
          {
            title: 'Shift Attendance Rate',
            value: '98.5%',
            sub: '0 unexcused absences',
            icon: CheckCircle2,
            color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60'
          }
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card key={idx} variant="elevated" className="p-4 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {kpi.title}
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {kpi.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</div>
              </div>
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${kpi.color}`}
              >
                <Icon className="w-5 h-5" />
              </div>
            </Card>
          );
        })}
      </div>

      {/* Live Field Dispatch Board & Status */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Field Dispatch Board</span>
            </h2>
            <p className="text-xs text-slate-500">
              Active technicians on assignment across enterprise sites.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
              {['all', 'on_site', 'en_route', 'on_break'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-lg font-medium capitalize transition ${
                    filterStatus === status
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTechs.map((tech) => (
            <div
              key={tech.id}
              className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={tech.avatar}
                    alt={tech.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/20"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {tech.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{tech.role}</div>
                  </div>
                </div>

                <Badge
                  variant={
                    tech.status === 'on_site'
                      ? 'success'
                      : tech.status === 'en_route'
                        ? 'primary'
                        : 'warning'
                  }
                  size="sm"
                  className="capitalize"
                >
                  {tech.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  {tech.work_order}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{tech.location}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-mono">{tech.eta}</span>
                <button
                  type="button"
                  onClick={() => {
                    dispatch(
                      addToast({
                        type: 'info',
                        title: 'Radio Ping Sent',
                        message: `Dispatched status ping to ${tech.name}`
                      })
                    );
                  }}
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Ping Technician
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Pending Timesheets Review Queue */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Pending Timesheet Approvals</span>
              {timesheets.length > 0 && (
                <Badge variant="warning" size="sm">
                  {timesheets.length} Pending
                </Badge>
              )}
            </h2>
            <p className="text-xs text-slate-500">
              Verify logged hours, overtime reasons, and manager approval compliance.
            </p>
          </div>

          {timesheets.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTimesheets([]);
                dispatch(
                  addToast({
                    type: 'success',
                    title: 'Batch Approval Complete',
                    message: 'All pending timesheets approved for payroll export'
                  })
                );
              }}
            >
              Approve All Pending
            </Button>
          )}
        </div>

        {timesheets.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              All Timesheets Reviewed
            </div>
            <div className="text-xs text-slate-500">
              No pending approval requests in queue for this tenant.
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {timesheets.map((ts) => (
              <div
                key={ts.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {ts.employee}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">• {ts.date}</span>
                    <Badge variant="neutral" size="sm">
                      {ts.shift}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-3">
                    <span>
                      Total Logged: <strong>{ts.hours}</strong>
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      {ts.overtime}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic mt-0.5">{ts.notes}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700"
                    onClick={() => handleRejectTimesheet(ts.id, ts.employee)}
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1" />
                    <span>Reject</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApproveTimesheet(ts.id, ts.employee)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    <span>Approve</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal for Assign Field Job */}
      <Modal
        isOpen={Boolean(activeWorkOrderModal)}
        onClose={() => setActiveWorkOrderModal(false)}
        title="Quick Dispatch Work Order"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setActiveWorkOrderModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setActiveWorkOrderModal(false);
                dispatch(
                  addToast({
                    type: 'success',
                    title: 'Work Order Dispatched',
                    message: 'Assigned to David Kim with SMS notification dispatched'
                  })
                );
              }}
            >
              Confirm Dispatch
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Work Order Code & Title
            </label>
            <input
              type="text"
              defaultValue="WO-8495: Express Cargo Loading Bay Inspection"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select Field Technician
            </label>
            <select className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              <option>David Kim (Senior Technician - On Site)</option>
              <option>Emily Davis (Fleet Logistics Specialist)</option>
              <option>Carlos Mendez (Maintenance Lead)</option>
              <option>Aisha Patel (Quality & Safety Inspector)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Site Destination
            </label>
            <input
              type="text"
              defaultValue="Acme Logistics Terminal 2, Dock 14"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Priority
            </label>
            <select className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              <option>Normal (Within 4 hours)</option>
              <option>High Priority (Within 60 mins)</option>
              <option>Critical Emergency (Immediate)</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManagerDashboardPage;
