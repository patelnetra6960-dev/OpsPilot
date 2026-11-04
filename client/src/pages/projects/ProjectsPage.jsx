import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Plus, Search, ArrowRight } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Badge, Button, Input, Select, Modal } from '../../components/ui/index.js';
import { addToast } from '../../store/uiSlice.js';
import { PROTOTYPE_PROJECTS } from '../../data/prototypeData.js';

export const ProjectsPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentTenant } = useSelector((state) => state.tenant);

  const [projects, setProjects] = useState(PROTOTYPE_PROJECTS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);

  // New Project Form State
  const [projectName, setProjectName] = useState('');
  const [client, setClient] = useState('Metro Retail Distribution Co.');
  const [budget, setBudget] = useState('75000');
  const [targetDate, setTargetDate] = useState('2026-12-31');

  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const newProject = {
      id: `PRJ-2026-0${projects.length + 1}`,
      name: projectName,
      client: client,
      status: 'in_progress',
      health: 'on_track',
      progress: 10,
      budget: `$${Number(budget).toLocaleString()}`,
      spent: '$0',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: targetDate,
      lead: 'Sarah Chen',
      team: [
        {
          name: 'David Kim',
          role: 'Field Tech',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        }
      ],
      description: 'Operations field project provisioned via OpsPilot Project Manager.',
      milestones: [
        {
          id: 'm1',
          title: 'Phase 1: Initial Discovery & Permitting',
          status: 'in_progress',
          date: targetDate
        }
      ]
    };

    setProjects([newProject, ...projects]);
    setModalOpen(false);
    setProjectName('');

    dispatch(
      addToast({
        type: 'success',
        title: 'Project Created',
        message: `${newProject.name} initiated for ${client}`
      })
    );
  };

  const filteredProjects = projects.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.client.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 mb-1">
            <Briefcase className="w-3 h-3" />
            <span>Multi-Tenant Operations Projects</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Projects & Milestones
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track multi-phase enterprise client installations, budgets, and milestone schedules for{' '}
            {currentTenant?.name}.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>New Project</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search projects or clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5 text-slate-400" />}
            className="text-xs"
          />
        </div>

        <div className="w-full sm:w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Projects' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' }
            ]}
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredProjects.map((project) => (
          <Card
            key={project.id}
            variant="default"
            className="p-6 space-y-5 hover:border-indigo-500/50 hover:shadow-xl transition flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {project.id}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5 leading-snug">
                    {project.name}
                  </h3>
                  <div className="text-xs text-slate-500 mt-1">{project.client}</div>
                </div>

                <Badge
                  variant={
                    project.health === 'on_track'
                      ? 'success'
                      : project.health === 'at_risk'
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                  className="capitalize shrink-0"
                >
                  {project.health.replace('_', ' ')}
                </Badge>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {project.description}
              </p>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Completion:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {project.progress}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${project.progress}%` }}
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Financial & Schedule Highlights */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <span className="text-slate-400 block text-[10px]">Budget Allocated</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {project.budget}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Spent: {project.spent}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850">
                  <span className="text-slate-400 block text-[10px]">Target Deadline</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                    {project.targetDate}
                  </span>
                  <span className="text-[10px] text-emerald-500 block">
                    {project.milestones.filter((m) => m.status === 'completed').length} /{' '}
                    {project.milestones.length} Milestones
                  </span>
                </div>
              </div>
            </div>

            {/* Footer with Team & View Action */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center -space-x-2">
                {project.team.map((member, i) => (
                  <img
                    key={i}
                    src={member.avatar}
                    alt={member.name}
                    title={`${member.name} (${member.role})`}
                    className="w-7 h-7 rounded-full object-cover ring-2 ring-white dark:ring-slate-900"
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={() => navigate(`/projects/${project.id}`)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Project Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* New Project Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Client Project"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateProject}>
              Initialize Project
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
          <Input
            label="Project Name"
            placeholder="e.g. Automated Sorter Installation Bay 4"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
          />

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Client Account
            </label>
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option>Metro Retail Distribution Co.</option>
              <option>Pacific Freight Express</option>
              <option>Harbor Cold Chain Logistics</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Budget ($ USD)"
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              required
            />

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Target Completion Date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-transparent text-slate-900 dark:text-white"
                required
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
