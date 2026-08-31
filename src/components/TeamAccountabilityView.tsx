import React, { useState, useMemo } from 'react';
import { OpportunityWorkspace, StaffMember, WorkspaceTask, TaskStatus, BlockerReason } from '../types';
import {
  getStaffAccountabilitySummary,
  computeTaskEffectiveStatus,
  StaffAccountabilityRecord,
  DEFAULT_HIGH_WORKLOAD_THRESHOLD
} from '../utils/accountabilityUtils';
import { calculateDaysRemaining, formatDeadline, getDaysDifference } from '../utils/dateUtils';
import {
  Users,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  ArrowRight,
  Folder,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  UserX,
  Mail,
  Building,
  Briefcase,
  AlertCircle,
  Calendar,
  Check,
  X,
  Flame
} from 'lucide-react';

interface TeamAccountabilityViewProps {
  opportunities: OpportunityWorkspace[];
  staffDirectory: StaffMember[];
  onSelectWorkspace: (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => void;
  onUpdateOpportunities: (updated: OpportunityWorkspace[]) => void;
  onNavigateToStaffProfile: () => void;
}

export const TeamAccountabilityView: React.FC<TeamAccountabilityViewProps> = ({
  opportunities,
  staffDirectory,
  onSelectWorkspace,
  onUpdateOpportunities,
  onNavigateToStaffProfile
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [workloadThreshold, setWorkloadThreshold] = useState<number>(DEFAULT_HIGH_WORKLOAD_THRESHOLD);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [expandedStaffIds, setExpandedStaffIds] = useState<Record<string, boolean>>({});

  // Reassignment Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [taskToReassign, setTaskToReassign] = useState<{
    workspaceId: string;
    task: WorkspaceTask;
    currentAssignee: string;
  } | null>(null);
  const [targetStaffName, setTargetStaffName] = useState('');

  // Calculate summary stats
  const staffSummaries = useMemo(() => {
    return getStaffAccountabilitySummary(staffDirectory, opportunities, workloadThreshold);
  }, [staffDirectory, opportunities, workloadThreshold]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set(staffDirectory.map(s => s.department).filter(Boolean));
    return Array.from(set);
  }, [staffDirectory]);

  // Filtered summaries
  const filteredSummaries = useMemo(() => {
    return staffSummaries.filter(summary => {
      const s = summary.staff;
      const matchesSearch =
        s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.department.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = departmentFilter === 'ALL' || s.department === departmentFilter;
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'HIGH_WORKLOAD'
          ? summary.isHighWorkload
          : summary.status === statusFilter;

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [staffSummaries, searchQuery, departmentFilter, statusFilter]);

  // Global KPIs
  const totalTasks = staffSummaries.reduce((sum, s) => sum + s.totalTasks, 0);
  const totalCompleted = staffSummaries.reduce((sum, s) => sum + s.completedTasks, 0);
  const totalOverdue = staffSummaries.reduce((sum, s) => sum + s.overdueTasks, 0);
  const totalBlocked = staffSummaries.reduce((sum, s) => sum + s.blockedTasks, 0);
  const totalDueThisWeek = staffSummaries.reduce((sum, s) => sum + s.dueThisWeek, 0);
  const totalHighWorkload = staffSummaries.filter(s => s.isHighWorkload).length;

  const toggleExpand = (staffId: string) => {
    setExpandedStaffIds(prev => ({
      ...prev,
      [staffId]: !prev[staffId]
    }));
  };

  const handleOpenReassignModal = (workspaceId: string, task: WorkspaceTask, currentAssignee: string) => {
    setTaskToReassign({ workspaceId, task, currentAssignee });
    const firstOther = staffDirectory.find(s => s.status === 'Active' && s.fullName !== currentAssignee);
    setTargetStaffName(firstOther ? firstOther.fullName : '');
    setReassignModalOpen(true);
  };

  const handleExecuteReassign = () => {
    if (!taskToReassign || !targetStaffName) return;

    const newStaff = staffDirectory.find(s => s.fullName === targetStaffName);

    const updatedOpportunities = opportunities.map(opp => {
      if (opp.id !== taskToReassign.workspaceId) return opp;

      const updatedTasks = (opp.tasks || []).map(t => {
        if (t.id !== taskToReassign.task.id) return t;
        return {
          ...t,
          assignedTo: targetStaffName,
          assignedStaffId: newStaff?.id,
          lastUpdated: new Date().toISOString()
        };
      });

      const auditEvent = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'Task Reassigned',
        actor: 'Management / Accountability Center',
        details: `Reassigned "${taskToReassign.task.title}" from ${taskToReassign.currentAssignee} to ${targetStaffName}.`,
        category: 'assignment' as const,
        targetId: taskToReassign.task.id
      };

      return {
        ...opp,
        tasks: updatedTasks,
        auditTrail: [auditEvent, ...(opp.auditTrail || [])],
        updatedAt: new Date().toISOString()
      };
    });

    onUpdateOpportunities(updatedOpportunities);
    setReassignModalOpen(false);
    setTaskToReassign(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Management & Team Accountability
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-medium">Workload, On-Time Delivery & Bottlenecks</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-1">
            <Users className="w-6 h-6 text-indigo-600" />
            Team Workload & Accountability Matrix
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Monitor staff task assignments across all funding calls, identify capacity overload and bottlenecks without undue blame, and balance team workloads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToStaffProfile}
            className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 shadow-2xs"
          >
            <Building className="w-3.5 h-3.5 text-slate-500" />
            Staff Directory & Roles
          </button>
        </div>
      </div>

      {/* High-Level Accountability Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Tasks</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalTasks}</div>
          <div className="text-xs text-slate-500 mt-1">Across active pipelines</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{totalCompleted}</div>
          <div className="text-xs text-slate-500 mt-1">
            {totalTasks > 0 ? `${Math.round((totalCompleted / totalTasks) * 100)}% completion rate` : 'No tasks'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Due This Week</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-700 mt-2">{totalDueThisWeek}</div>
          <div className="text-xs text-slate-500 mt-1">Next 7 days</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Overdue Tasks</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-700 mt-2">{totalOverdue}</div>
          <div className="text-xs text-rose-600 font-medium mt-1">Require immediate focus</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Blocked Tasks</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{totalBlocked}</div>
          <div className="text-xs text-amber-700 font-medium mt-1">Awaiting partner / approval</div>
        </div>

        {/* High Workload KPI Card */}
        <div
          id="kpi-high-workload-card"
          onClick={() => setStatusFilter(statusFilter === 'HIGH_WORKLOAD' ? 'ALL' : 'HIGH_WORKLOAD')}
          className={`p-4 rounded-xl border shadow-xs cursor-pointer transition ${
            totalHighWorkload > 0
              ? 'bg-amber-50/50 border-amber-300 hover:bg-amber-50 ring-1 ring-amber-200/80'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
          title="Click to filter staff with high workload"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
              High Workload
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-800 mt-2">
            {totalHighWorkload} <span className="text-xs font-normal text-slate-500">staff</span>
          </div>
          <div className="text-xs text-amber-700 font-medium mt-1">
            ≥ {workloadThreshold} tasks assigned
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff name, job title, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Workload Threshold Selector */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <span className="text-slate-600 font-semibold whitespace-nowrap">High Workload Cap:</span>
            <select
              id="workload-threshold-selector"
              value={workloadThreshold}
              onChange={(e) => setWorkloadThreshold(Number(e.target.value))}
              className="px-2 py-1 text-xs rounded border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              title="Set the task count threshold that triggers high workload warnings"
            >
              <option value={3}>≥ 3 tasks</option>
              <option value={4}>≥ 4 tasks (Standard)</option>
              <option value={5}>≥ 5 tasks (High)</option>
              <option value={6}>≥ 6 tasks (Heavy)</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="HIGH_WORKLOAD">⚠️ High Workload (≥ {workloadThreshold} Tasks)</option>
              <option value="ON TRACK">On Track</option>
              <option value="AT RISK">At Risk</option>
              <option value="OVERDUE">Overdue Tasks</option>
              <option value="BLOCKED">Blocked Tasks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Cards Grid */}
      <div className="space-y-4">
        {filteredSummaries.map((summary) => {
          const s = summary.staff;
          const isExpanded = Boolean(expandedStaffIds[s.id]);

          return (
            <div
              key={s.id}
              id={`staff-card-${s.id}`}
              className={`bg-white border rounded-xl shadow-xs transition overflow-hidden ${
                summary.status === 'OVERDUE'
                  ? 'border-rose-200'
                  : summary.status === 'BLOCKED'
                  ? 'border-amber-200'
                  : summary.isHighWorkload
                  ? 'border-amber-300/80 ring-1 ring-amber-200/50'
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header Summary */}
              <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Staff Profile Info */}
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shrink-0 shadow-xs relative ${
                      s.status === 'Inactive'
                        ? 'bg-slate-100 text-slate-400'
                        : summary.status === 'OVERDUE'
                        ? 'bg-rose-100 text-rose-700'
                        : summary.status === 'BLOCKED'
                        ? 'bg-amber-100 text-amber-800'
                        : summary.isHighWorkload
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {s.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    {summary.isHighWorkload && (
                      <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px] font-bold shadow-xs"
                        title={`High Workload: ${summary.totalTasks} tasks assigned`}
                      >
                        !
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base font-bold text-slate-900">{s.fullName}</h2>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${summary.statusBadgeClass}`}
                      >
                        {summary.status}
                      </span>

                      {/* High Workload Warning Indicator Badge */}
                      {summary.isHighWorkload && (
                        <span
                          id={`high-workload-warning-badge-${s.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs"
                          title={`${s.fullName} is assigned ${summary.totalTasks} total tasks across active proposals, exceeding the high workload threshold (≥ ${workloadThreshold}).`}
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>High Workload ({summary.totalTasks} tasks)</span>
                        </span>
                      )}

                      {s.status === 'Inactive' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive Staff
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-1 flex-wrap">
                      <span className="font-medium text-slate-700">{s.jobTitle}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {s.department}
                      </span>
                      {s.email ? (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Mail className="w-3 h-3" />
                            {s.email}
                          </span>
                        </>
                      ) : null}
                    </div>

                    {s.lineManagerName && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        Reports to: <strong className="text-slate-700">{s.lineManagerName}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Accountability Metrics Pod */}
                <div className="flex items-center gap-3 flex-wrap lg:justify-end">
                  {/* Lead Proposals */}
                  <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-lg text-center min-w-[70px]">
                    <div className="text-sm font-bold text-slate-900">{summary.leadProposalsCount}</div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Lead Prop.</div>
                  </div>

                  {/* Active / Total Tasks with High Workload Warning Styling */}
                  <div
                    id={`metric-total-tasks-${s.id}`}
                    className={`px-3 py-2 rounded-lg text-center min-w-[75px] border transition ${
                      summary.isHighWorkload
                        ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-200/70'
                        : 'bg-slate-50 border-slate-200/80'
                    }`}
                    title={
                      summary.isHighWorkload
                        ? `High Workload Warning: ${summary.totalTasks} tasks exceeds threshold of ${workloadThreshold}`
                        : `${summary.totalTasks} total tasks assigned`
                    }
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span className={`text-sm font-bold ${summary.isHighWorkload ? 'text-amber-900' : 'text-indigo-700'}`}>
                        {summary.totalTasks}
                      </span>
                      {summary.isHighWorkload && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Total Tasks</div>
                    {summary.isHighWorkload && (
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100/90 px-1 rounded block mt-0.5 tracking-tight">
                        High Load
                      </span>
                    )}
                  </div>

                  {/* Completed */}
                  <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-lg text-center min-w-[70px]">
                    <div className="text-sm font-bold text-emerald-700">
                      {summary.completedTasks}/{summary.totalTasks}
                    </div>
                    <div className="text-[10px] font-semibold text-slate-500 uppercase">Done</div>
                  </div>

                  {/* Overdue */}
                  {summary.overdueTasks > 0 && (
                    <div className="bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg text-center min-w-[70px]">
                      <div className="text-sm font-bold text-rose-700">{summary.overdueTasks}</div>
                      <div className="text-[10px] font-bold text-rose-700 uppercase">Overdue</div>
                    </div>
                  )}

                  {/* Blocked */}
                  {summary.blockedTasks > 0 && (
                    <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg text-center min-w-[70px]">
                      <div className="text-sm font-bold text-amber-800">{summary.blockedTasks}</div>
                      <div className="text-[10px] font-bold text-amber-800 uppercase">Blocked</div>
                    </div>
                  )}

                  {/* Due This Week */}
                  {summary.dueThisWeek > 0 && (
                    <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg text-center min-w-[70px]">
                      <div className="text-sm font-bold text-blue-700">{summary.dueThisWeek}</div>
                      <div className="text-[10px] font-bold text-blue-700 uppercase">Due 7d</div>
                    </div>
                  )}

                  {/* Expand / Collapse Button */}
                  <button
                    onClick={() => toggleExpand(s.id)}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition flex items-center gap-1 text-xs font-semibold"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'View Tasks & Proposals'}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Detailed Breakdown */}
              {isExpanded && (
                <div className="bg-slate-50 border-t border-slate-200 p-5 space-y-4">
                  {/* High Workload Advisory Banner */}
                  {summary.isHighWorkload && (
                    <div
                      id={`workload-advisory-${s.id}`}
                      className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex items-start gap-2.5 text-xs text-amber-900"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold flex items-center gap-1.5 flex-wrap">
                          <span>Workload Capacity Warning:</span>
                          <span className="font-medium text-amber-800">
                            {summary.totalTasks} assigned tasks exceeds the threshold of {workloadThreshold} tasks ({summary.incompleteTasksCount} active/incomplete tasks across {summary.assignedWorkspaces.length} proposals).
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 mt-1">
                          To maintain proposal quality and prevent bottlenecks, management can reassign tasks to other team members using the "Reassign" button on individual tasks below.
                        </p>
                      </div>
                    </div>
                  )}

                  {summary.assignedWorkspaces.length === 0 ? (
                    <div className="text-xs text-slate-500 py-3 text-center">
                      No active proposals or tasks currently assigned to {s.fullName}.
                    </div>
                  ) : (
                    summary.assignedWorkspaces.map(w => {
                      const opp = opportunities.find(o => o.id === w.workspaceId);
                      if (!opp) return null;

                      return (
                        <div
                          key={w.workspaceId}
                          className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  {w.donor}
                                </span>
                                <span className="text-xs font-bold text-slate-900">{w.workspaceTitle}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                                {w.isProposalLead && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">
                                    Proposal Lead
                                  </span>
                                )}
                                {w.isReviewer && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                    Reviewer
                                  </span>
                                )}
                                {w.isApprover && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                    Final Approver
                                  </span>
                                )}
                                <span>• Stage: {w.stage}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => onSelectWorkspace(opp, 'team')}
                              className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline self-start sm:self-auto"
                            >
                              <span>Open Workspace</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Specific Tasks in this Opportunity */}
                          {w.tasks.length === 0 ? (
                            <p className="text-xs text-slate-400 italic">
                              Acting as leadership role (no individual operational sub-tasks assigned).
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {w.tasks.map(task => {
                                const effStatus = computeTaskEffectiveStatus(task);
                                const diff = getDaysDifference(task.dueDate);

                                return (
                                  <div
                                    key={task.id}
                                    className={`p-3 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                                      task.completed
                                        ? 'bg-slate-50/50 border-slate-200 text-slate-500'
                                        : effStatus === 'Overdue'
                                        ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                                        : effStatus === 'Blocked'
                                        ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                                        : 'bg-white border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <div className="space-y-1 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-bold ${task.completed ? 'line-through text-slate-400' : ''}`}>
                                          {task.title}
                                        </span>
                                      </div>

                                      {task.blockerReason && (
                                        <div className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3" />
                                          Blocker: {task.blockerReason} {task.blockerNotes ? `(${task.blockerNotes})` : ''}
                                        </div>
                                      )}

                                      {task.notes && !task.blockerReason && (
                                        <div className="text-[11px] text-slate-500">
                                          Notes: {task.notes}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0">
                                      <div className="text-right">
                                        <div className="font-semibold text-[11px]">
                                          Due: {formatDeadline(task.dueDate)}
                                        </div>
                                        {diff !== null && !task.completed && (
                                          <div
                                            className={`text-[10px] font-bold ${
                                              diff < 0 ? 'text-rose-600' : diff <= 3 ? 'text-amber-600' : 'text-slate-400'
                                            }`}
                                          >
                                            {diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d left`}
                                          </div>
                                        )}
                                      </div>

                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                          task.completed
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : effStatus === 'Overdue'
                                            ? 'bg-rose-600 text-white'
                                            : effStatus === 'Blocked'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-indigo-100 text-indigo-800'
                                        }`}
                                      >
                                        {effStatus}
                                      </span>

                                      {/* Reassign Action */}
                                      <button
                                        onClick={() => handleOpenReassignModal(opp.id, task, s.fullName)}
                                        className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-semibold transition"
                                        title="Reassign this task to another staff member"
                                      >
                                        Reassign
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reassignment Modal */}
      {reassignModalOpen && taskToReassign && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                Reassign Task Responsibility
              </h3>
              <button
                onClick={() => setReassignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Task Title</span>
                <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {taskToReassign.task.title}
                </p>
              </div>

              <div>
                <span className="text-slate-500 font-semibold block mb-1">Current Assignee</span>
                <p className="text-slate-700 font-medium">
                  {taskToReassign.currentAssignee}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Select New Responsible Staff Member
                </label>
                <select
                  value={targetStaffName}
                  onChange={(e) => setTargetStaffName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  {staffDirectory
                    .filter(s => s.status === 'Active')
                    .map(s => (
                      <option key={s.id} value={s.fullName}>
                        {s.fullName} — {s.jobTitle} ({s.department})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  This update will be permanently recorded in the opportunity audit trail.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setReassignModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReassign}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
