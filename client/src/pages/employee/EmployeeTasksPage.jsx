import { useState } from 'react';
import { CheckCircle2, MapPin, Square as EmptySquare } from 'lucide-react';
import { Card, Badge } from '../../components/ui/index.js';
import { useDispatch } from 'react-redux';
import { addToast } from '../../store/uiSlice.js';

export const EmployeeTasksPage = () => {
  const dispatch = useDispatch();

  const [tasks, setTasks] = useState([
    {
      id: 1,
      title: 'Vehicle Fleet Pre-Trip Inspection',
      order: 'WO-8421',
      site: 'Dock 4 Loading Bay',
      priority: 'high',
      due: '09:00 AM',
      completed: true
    },
    {
      id: 2,
      title: 'Hydraulic Lift Pressure Calibration',
      order: 'WO-8424',
      site: 'Terminal Cold Room B',
      priority: 'urgent',
      due: '01:30 PM',
      completed: false
    },
    {
      id: 3,
      title: 'Submit Daily Hazardous Materials Log',
      order: 'WO-8430',
      site: 'Harbor Gate 12 Workshop',
      priority: 'normal',
      due: '04:00 PM',
      completed: false
    }
  ]);

  const toggleTask = (id) => {
    setTasks(
      tasks.map((t) => {
        if (t.id === id) {
          const next = !t.completed;
          dispatch(
            addToast({
              type: next ? 'success' : 'info',
              title: next ? 'Task Completed' : 'Task Reopened',
              message: `${t.title} status updated`
            })
          );
          return { ...t, completed: next };
        }
        return t;
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Assigned Tasks & Work Orders
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Field checklist items, maintenance orders, and proof-of-work signoffs.
        </p>
      </div>

      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            variant="default"
            className={`p-4 transition cursor-pointer flex items-center justify-between gap-4 ${
              task.completed ? 'opacity-70 bg-slate-50 dark:bg-slate-900/40' : ''
            }`}
            onClick={() => toggleTask(task.id)}
          >
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Toggle task completion">
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
                <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                  <span>{task.order}</span>
                  <span>•</span>
                  <span>Due by {task.due}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{task.site}</span>
                  </span>
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
              className="capitalize text-[10px]"
            >
              {task.priority}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EmployeeTasksPage;
