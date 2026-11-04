import { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  CalendarCheck,
  CheckCircle2,
  Play,
  Square,
  ShieldCheck,
  CheckSquare,
  Square as EmptySquare
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Modal } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';

export const EmployeePortalPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentTenant } = useSelector((state) => state.tenant);

  // Digital clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Clock-in state
  const [isClockedIn, setIsClockedIn] = useState(true);
  const [clockInTime, setClockInTime] = useState('08:15 AM');
  const [lastCoords, setLastCoords] = useState('37.7749° N, 122.4194° W (Terminal Bay 4)');
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  // Today's Assigned Tasks checklist
  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Vehicle Fleet Pre-Trip Inspection',
      order: 'WO-8421',
      priority: 'high',
      completed: true,
      due: '09:00 AM'
    },
    {
      id: 2,
      title: 'Hydraulic Lift Pressure Calibration',
      order: 'WO-8424',
      priority: 'urgent',
      completed: false,
      due: '01:30 PM'
    },
    {
      id: 3,
      title: 'Submit Daily Hazardous Materials Log',
      order: 'WO-8430',
      priority: 'normal',
      completed: false,
      due: '04:00 PM'
    }
  ]);

  const handleToggleTask = (id) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === id) {
          const next = !t.completed;
          dispatch(
            addToast({
              type: next ? 'success' : 'info',
              title: next ? 'Task Completed' : 'Task Reopened',
              message: `${t.title} updated`
            })
          );
          return { ...t, completed: next };
        }
        return t;
      })
    );
  };

  const handleToggleClock = () => {
    if (isClockedIn) {
      setIsClockedIn(false);
      dispatch(
        addToast({
          type: 'warning',
          title: 'Clocked Out',
          message: `Shift recorded with GPS timestamp at ${currentTime.toLocaleTimeString()}`
        })
      );
    } else {
      setIsClockedIn(true);
      setClockInTime(currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setLastCoords('37.7749° N, 122.4194° W (Geofence Validated)');
      dispatch(
        addToast({
          type: 'success',
          title: 'Clocked In Successfully',
          message: `Point-in-time GPS geofence verified at ${currentTenant?.name}`
        })
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span>Employee Self-Service Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name?.split(' ')[0] || 'David'}!
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100 max-w-xl">
              Assigned to <strong>{currentTenant?.name}</strong> • Senior Field Technician
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 self-start md:self-auto">
            <Clock className="w-8 h-8 text-indigo-200" />
            <div>
              <div className="text-xl font-mono font-black tracking-tight">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-[11px] text-indigo-200">
                {currentTime.toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Clock-In Widget & Shift Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Clock-In Widget (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="elevated" className="p-6 space-y-5 text-center">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Shift Punch Clock
              </span>
              <Badge variant={isClockedIn ? 'success' : 'neutral'} size="sm">
                {isClockedIn ? '● Active On-Duty' : '○ Off-Duty'}
              </Badge>
            </div>

            <div className="py-4 space-y-2">
              <div className="text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {isClockedIn ? '05:32:18' : '--:--:--'}
              </div>
              <p className="text-xs text-slate-400">
                {isClockedIn
                  ? `Clocked in at ${clockInTime} today`
                  : 'You are currently clocked out'}
              </p>
            </div>

            <Button
              variant={isClockedIn ? 'danger' : 'primary'}
              size="lg"
              className="w-full py-4 rounded-2xl shadow-lg"
              onClick={handleToggleClock}
            >
              {isClockedIn ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  <span>Clock Out & Submit Hours</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  <span>Clock In (Capture GPS & Time)</span>
                </>
              )}
            </Button>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-left space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{lastCoords}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Geofence Policy:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Verified Inside Site Boundary
                </span>
              </div>
            </div>
          </Card>

          {/* Weekly Hours Tally */}
          <Card variant="default" className="p-5 space-y-3">
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Weekly Hours Summary
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850">
                <div className="text-lg font-bold text-slate-900 dark:text-white">34.5</div>
                <div className="text-[10px] text-slate-400">Regular (hrs)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">2.5</div>
                <div className="text-[10px] text-slate-400">Overtime (hrs)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850">
                <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">37.0</div>
                <div className="text-[10px] text-slate-400">Total Week</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Shift Details & Task Checklist (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Next Shift Card */}
          <Card variant="default" className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <CalendarCheck className="w-4 h-4 text-indigo-500" />
                <span>Upcoming Scheduled Shift</span>
              </div>
              <button
                type="button"
                onClick={() => setSwapModalOpen(true)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                Request Shift Swap
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Shift Schedule:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Tomorrow (Nov 5) • 08:00 AM - 04:30 PM
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Day Rota (8.0 Hours Paid + 30m Meal)
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Site Location:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  Acme Logistics Central Distribution Dock 4
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Manager: Sarah Chen</span>
              </div>
            </div>
          </Card>

          {/* Today's Tasks Checklist */}
          <Card variant="default" className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-500" />
                  <span>Assigned Work Orders for Today</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Check off items as completed to update operations in real time.
                </p>
              </div>

              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {tasks.filter((t) => t.completed).length} / {tasks.length} Done
              </span>
            </div>

            <div className="space-y-2">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                    task.completed
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-slate-500'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-slate-400 hover:text-indigo-600 transition"
                      aria-label="Toggle task completion"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <EmptySquare className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    <div>
                      <div
                        className={`text-xs font-semibold ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {task.order} • Due by {task.due}
                      </div>
                    </div>
                  </div>

                  <Badge
                    variant={
                      task.priority === 'urgent'
                        ? 'danger'
                        : task.priority === 'high'
                          ? 'warning'
                          : 'neutral'
                    }
                    size="sm"
                    className="capitalize shrink-0"
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Shift Swap Modal */}
      <Modal
        isOpen={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        title="Request Shift Swap"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSwapModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSwapModalOpen(false);
                dispatch(
                  addToast({
                    type: 'success',
                    title: 'Shift Swap Requested',
                    message: 'Sent swap proposal to Emily Davis for manager approval'
                  })
                );
              }}
            >
              Submit Proposal
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Your Shift to Trade
            </label>
            <input
              type="text"
              readOnly
              value="Tomorrow (Nov 5) • 08:00 AM - 04:30 PM"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-400"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Select Colleague
            </label>
            <select className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
              <option>Emily Davis (Available on Nov 5)</option>
              <option>Carlos Mendez (Available on Nov 5)</option>
              <option>Aisha Patel (Available on Nov 5)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Reason for Request
            </label>
            <textarea
              rows="3"
              placeholder="e.g. Family medical appointment"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeePortalPage;
