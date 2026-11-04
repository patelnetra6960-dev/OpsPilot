import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Plus } from 'lucide-react';
import { Card, Badge, Button, Modal, Input } from '../../components/ui/index.js';
import { useDispatch } from 'react-redux';
import { addToast } from '../../store/uiSlice.js';
import { PROTOTYPE_PROJECTS } from '../../data/prototypeData.js';

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const projectData = PROTOTYPE_PROJECTS.find((p) => p.id === id) || PROTOTYPE_PROJECTS[0];

  const [milestones, setMilestones] = useState(projectData.milestones);
  const [modalOpen, setModalOpen] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('2026-12-01');

  const toggleMilestone = (mId) => {
    setMilestones(
      milestones.map((m) => {
        if (m.id === mId) {
          const next = m.status === 'completed' ? 'in_progress' : 'completed';
          dispatch(
            addToast({
              type: next === 'completed' ? 'success' : 'info',
              title: next === 'completed' ? 'Milestone Completed' : 'Milestone In Progress',
              message: m.title
            })
          );
          return { ...m, status: next };
        }
        return m;
      })
    );
  };

  const handleAddMilestone = (e) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    const newM = {
      id: `m-${Date.now()}`,
      title: newMilestoneTitle,
      status: 'pending',
      date: newMilestoneDate
    };

    setMilestones([...milestones, newM]);
    setModalOpen(false);
    setNewMilestoneTitle('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Milestone Added',
        message: newM.title
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Back Navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/projects')}
          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-400 font-mono">Back to Projects Directory</span>
      </div>

      {/* Project Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
              {projectData.id}
            </span>
            <Badge variant="success" size="sm" className="capitalize">
              {projectData.status.replace('_', ' ')}
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {projectData.name}
          </h1>
          <p className="text-xs text-slate-500">
            Client Partner: <strong>{projectData.client}</strong> • Lead: {projectData.lead}
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>Add Milestone</span>
        </Button>
      </div>

      {/* Grid: Milestones & Burndown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Milestone Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <Card variant="default" className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Project Milestone Timeline
            </h2>
            <p className="text-xs text-slate-400">
              Click a milestone checkmark to update delivery status in real time.
            </p>

            <div className="space-y-3 pt-2">
              {milestones.map((milestone, idx) => {
                const isCompleted = milestone.status === 'completed';
                return (
                  <div
                    key={milestone.id}
                    onClick={() => toggleMilestone(milestone.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isCompleted
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                        : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div>
                        <div
                          className={`text-xs font-semibold ${
                            isCompleted
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {milestone.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Target Due: {milestone.date}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={isCompleted ? 'success' : 'neutral'}
                      size="sm"
                      className="capitalize text-[10px]"
                    >
                      {milestone.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right: Financials & Team (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card variant="default" className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Budget Burndown & Velocity
            </h2>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                <span className="text-slate-400 block text-[10px]">Total Contract</span>
                <span className="font-mono font-bold text-base text-slate-900 dark:text-white">
                  {projectData.budget}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                <span className="text-slate-400 block text-[10px]">Incurred Expenses</span>
                <span className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400">
                  {projectData.spent}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Overall Progress:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {projectData.progress}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  style={{ width: `${projectData.progress}%` }}
                  className="bg-indigo-600 h-full rounded-full"
                />
              </div>
            </div>
          </Card>

          <Card variant="default" className="p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Assigned Field Crew
            </h2>

            <div className="space-y-2">
              {projectData.team.map((member, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {member.name}
                      </div>
                      <div className="text-[10px] text-slate-400">{member.role}</div>
                    </div>
                  </div>

                  <Badge variant="neutral" size="sm">
                    On Assignment
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Milestone Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Project Milestone"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddMilestone}>
              Append Milestone
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddMilestone} className="space-y-4 text-xs">
          <Input
            label="Milestone Scope Title"
            placeholder="e.g. Phase 5: High Voltage System Interconnect"
            value={newMilestoneTitle}
            onChange={(e) => setNewMilestoneTitle(e.target.value)}
            required
          />

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Target Deadline
            </label>
            <input
              type="date"
              value={newMilestoneDate}
              onChange={(e) => setNewMilestoneDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectDetailPage;
