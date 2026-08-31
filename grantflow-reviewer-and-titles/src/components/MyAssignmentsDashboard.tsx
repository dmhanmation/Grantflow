import React, { useState, useMemo } from 'react';
import {
  OpportunityWorkspace,
  StaffMember,
  WorkspaceTask,
  ApplicationSection,
  OpportunityOfficerAssignment,
  TaskStatus,
  AssignmentStatus,
  OrgProfile,
  AppUser
} from '../types';
import { formatDeadline, getDaysDifference, getTaskUrgencyInfo } from '../utils/dateUtils';
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  FileCheck,
  Calendar,
  AlertCircle,
  FileText,
  UserCheck,
  Filter,
  Check,
  Edit2,
  ChevronRight,
  RefreshCw,
  FolderOpen
} from 'lucide-react';

interface MyAssignmentsDashboardProps {
  currentUser?: AppUser;
  staffDirectory: StaffMember[];
  opportunities: OpportunityWorkspace[];
  orgProfile?: OrgProfile;
  onSelectWorkspace: (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => void;
  onUpdateWorkspace?: (updated: OpportunityWorkspace) => void;
}

export const MyAssignmentsDashboard: React.FC<MyAssignmentsDashboardProps> = ({
  currentUser,
  staffDirectory = [],
  opportunities = [],
  orgProfile,
  onSelectWorkspace,
  onUpdateWorkspace
}) => {
  const defaultStaff = useMemo(() => {
    if (currentUser?.staffId) {
      const match = staffDirectory.find(s => s.id === currentUser.staffId);
      if (match) return match;
    }
    if (currentUser?.fullName) {
      const match = staffDirectory.find(s => s.fullName.toLowerCase() === currentUser.fullName.toLowerCase());
      if (match) return match;
    }
    return staffDirectory[0] || null;
  }, [currentUser, staffDirectory]);

  const [selectedStaffId, setSelectedStaffId] = useState<string>(defaultStaff?.id || '');

  React.useEffect(() => {
    if (!selectedStaffId && defaultStaff?.id) {
      setSelectedStaffId(defaultStaff.id);
    }
  }, [defaultStaff, selectedStaffId]);

  // Access control: only Admin, ProposalLead, DepartmentHead, FinalApprover or demo users can switch perspective
  const canSwitchPerspective = useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.isDemoUser) return true;
    const role = currentUser.role || '';
    const roles = currentUser.roles || [];
    return (
      role === 'Admin' ||
      role === 'ProposalLead' ||
      role === 'DepartmentHead' ||
      role === 'FinalApprover' ||
      roles.includes('Admin') ||
      roles.includes('ProposalLead') ||
      roles.includes('DepartmentHead') ||
      roles.includes('FinalApprover')
    );
  }, [currentUser]);

  const selectedStaff = useMemo(() => {
    if (!canSwitchPerspective && defaultStaff) {
      return defaultStaff;
    }
    return staffDirectory.find(s => s.id === selectedStaffId) || defaultStaff;
  }, [staffDirectory, selectedStaffId, defaultStaff, canSwitchPerspective]);

  const [taskStatusFilter, setTaskStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUBMITTED' | 'COMPLETED'>('ALL');
  const [reassignTaskTarget, setReassignTaskTarget] = useState<{ task: WorkspaceTask; workspace: OpportunityWorkspace } | null>(null);
  const [reassignStaffChoice, setReassignStaffChoice] = useState<string>('');
  const [deadlineTaskTarget, setDeadlineTaskTarget] = useState<{ task: WorkspaceTask; workspace: OpportunityWorkspace } | null>(null);
  const [newDeadlineInput, setNewDeadlineInput] = useState<string>('');

  // 1. FILTER ASSIGNED OPPORTUNITIES FOR SELECTED STAFF
  const assignedOpportunities = useMemo(() => {
    if (!selectedStaff) return [];
    const staffName = selectedStaff.fullName.toLowerCase().trim();
    const staffId = selectedStaff.id;

    return opportunities.filter(ws => {
      const isLead = (ws.proposalLead || ws.leadStaff || '').toLowerCase().trim() === staffName;
      const isReviewer = (ws.reviewer || '').toLowerCase().trim() === staffName;
      const isApprover = (ws.finalApprover || '').toLowerCase().trim() === staffName;
      const isOfficer = (ws.assignedOfficers || []).some(
        o => o.staffId === staffId || o.staffName.toLowerCase().trim() === staffName
      );
      return isLead || isReviewer || isApprover || isOfficer;
    });
  }, [opportunities, selectedStaff]);

  // 2. FILTER ASSIGNED TASKS FOR SELECTED STAFF
  const assignedTasks = useMemo(() => {
    if (!selectedStaff) return [];
    const staffName = selectedStaff.fullName.toLowerCase().trim();
    const staffId = selectedStaff.id;
    const list: Array<{ task: WorkspaceTask; workspace: OpportunityWorkspace }> = [];

    opportunities.forEach(ws => {
      (ws.tasks || []).forEach(t => {
        const isDirectAssigned =
          (t.assignedStaffId && t.assignedStaffId === staffId) ||
          (t.assignedTo && t.assignedTo.toLowerCase().trim() === staffName);

        if (isDirectAssigned) {
          list.push({ task: t, workspace: ws });
        }
      });
    });

    return list;
  }, [opportunities, selectedStaff]);

  // 3. FILTER ASSIGNED PROPOSAL SECTIONS FOR SELECTED STAFF
  const assignedSections = useMemo(() => {
    if (!selectedStaff) return [];
    const staffName = selectedStaff.fullName.toLowerCase().trim();
    const staffId = selectedStaff.id;
    const list: Array<{ section: ApplicationSection; workspace: OpportunityWorkspace }> = [];

    opportunities.forEach(ws => {
      (ws.applicationSections || []).forEach(sec => {
        const isAssigned =
          (sec.assignedStaffId && sec.assignedStaffId === staffId) ||
          (sec.assignedStaff && sec.assignedStaff.toLowerCase().trim() === staffName);

        if (isAssigned) {
          list.push({ section: sec, workspace: ws });
        }
      });
    });

    return list;
  }, [opportunities, selectedStaff]);

  // Status-filtered tasks
  const filteredTasks = useMemo(() => {
    return assignedTasks.filter(item => {
      const status = item.task.status || (item.task.completed ? 'Completed' : 'Not Started');
      const isCompleted = item.task.completed || status === 'Completed' || status === 'Complete';
      const isSubmitted = status === 'Submitted for Review' || item.task.departmentReviewStatus === 'Submitted to Department Head';

      if (taskStatusFilter === 'ACTIVE') return !isCompleted && !isSubmitted;
      if (taskStatusFilter === 'SUBMITTED') return isSubmitted && !isCompleted;
      if (taskStatusFilter === 'COMPLETED') return isCompleted;
      return true;
    });
  }, [assignedTasks, taskStatusFilter]);

  const handleUpdateTaskStatus = (ws: OpportunityWorkspace, taskId: string, nextStatus: TaskStatus) => {
    if (!onUpdateWorkspace) return;
    const isComplete = nextStatus === 'Completed' || nextStatus === 'Complete';
    const isSubmitted = nextStatus === 'Submitted for Review';

    const updatedTasks = ws.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: nextStatus,
          completed: isComplete,
          completedAt: isComplete ? (t.completedAt || new Date().toISOString()) : undefined,
          departmentReviewStatus: isSubmitted
            ? ('Submitted to Department Head' as const)
            : isComplete
            ? ('Approved' as const)
            : t.departmentReviewStatus,
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    onUpdateWorkspace({
      ...ws,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString()
    });
  };

  const handleExecuteTaskReassignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignTaskTarget || !reassignStaffChoice || !onUpdateWorkspace) return;

    const matchedStaff = staffDirectory.find(s => s.fullName === reassignStaffChoice);
    const { task, workspace } = reassignTaskTarget;

    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          assignedTo: reassignStaffChoice,
          assignedStaffId: matchedStaff?.id,
          departmentName: matchedStaff?.department || t.departmentName,
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    onUpdateWorkspace({
      ...workspace,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString()
    });

    setReassignTaskTarget(null);
  };

  const handleExecuteTaskDeadlineChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineTaskTarget || !newDeadlineInput || !onUpdateWorkspace) return;

    const { task, workspace } = deadlineTaskTarget;

    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === task.id) {
        return {
          ...t,
          dueDate: newDeadlineInput.trim(),
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    onUpdateWorkspace({
      ...workspace,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString()
    });

    setDeadlineTaskTarget(null);
  };

  if (!selectedStaff) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
        <Users className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No Staff Directory Records</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Add real staff members in the Organisation Profile to activate individual staff assignment dashboards.
        </p>
      </div>
    );
  }

  const activeTaskCount = assignedTasks.filter(t => !t.task.completed && t.task.status !== 'Completed' && t.task.status !== 'Complete').length;
  const completedTaskCount = assignedTasks.filter(t => t.task.completed || t.task.status === 'Completed' || t.task.status === 'Complete').length;
  const submittedTaskCount = assignedTasks.filter(t => t.task.status === 'Submitted for Review' || t.task.departmentReviewStatus === 'Submitted to Department Head').length;

  return (
    <div className="space-y-6" id="my-assignments-dashboard">
      {/* HEADER WITH STAFF PERSPECTIVE SWITCHER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
              {selectedStaff.fullName.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  Assignments Dashboard
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                  {selectedStaff.role || selectedStaff.functionalRole || 'Officer'}
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                {selectedStaff.fullName}
              </h2>
              <p className="text-xs text-slate-500">
                {selectedStaff.jobTitle} • <strong className="text-slate-700">{selectedStaff.department}</strong>{selectedStaff.email ? ` • ${selectedStaff.email}` : ''}
              </p>
            </div>
          </div>

          {/* Perspective Selector (Admin/Managers) or Locked View (Ordinary Staff) */}
          {canSwitchPerspective ? (
            <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="text-xs">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Staff Perspective:
                </label>
                <select
                  id="staff-perspective-select"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                >
                  {staffDirectory.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      {staff.fullName} ({staff.department} — {staff.role || 'Officer'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Assigned View:
                </span>
                <span className="font-bold text-slate-800">
                  {selectedStaff.fullName} (Workload)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Assigned Opportunities
            </span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">
              {assignedOpportunities.length}
            </span>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
              Active Deliverables
            </span>
            <span className="text-xl font-extrabold text-blue-900 mt-0.5 block">
              {activeTaskCount}
            </span>
          </div>

          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
              Under Review
            </span>
            <span className="text-xl font-extrabold text-amber-900 mt-0.5 block">
              {submittedTaskCount}
            </span>
          </div>

          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              Completed Tasks
            </span>
            <span className="text-xl font-extrabold text-emerald-900 mt-0.5 block">
              {completedTaskCount}
            </span>
          </div>
        </div>
      </div>

      {/* 1. ASSIGNED OPPORTUNITIES SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              Assigned Funding Opportunities ({assignedOpportunities.length})
            </h3>
            <p className="text-xs text-slate-500">
              Proposals where {selectedStaff.fullName} is designated as Proposal Lead, Internal Reviewer, Approver, or assigned Officer.
            </p>
          </div>
        </div>

        {assignedOpportunities.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
            <Briefcase className="w-6 h-6 text-slate-400 mx-auto" />
            <div className="text-xs font-bold text-slate-700">No Funding Opportunities Assigned</div>
            <p className="text-[11px] text-slate-500">
              {selectedStaff.fullName} has not been designated as lead or officer on any active proposals.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedOpportunities.map(ws => {
              const staffName = selectedStaff.fullName.toLowerCase().trim();
              const isLead = (ws.proposalLead || ws.leadStaff || '').toLowerCase().trim() === staffName;
              const isReviewer = (ws.reviewer || '').toLowerCase().trim() === staffName;
              const isApprover = (ws.finalApprover || '').toLowerCase().trim() === staffName;
              const matchedOfficer = (ws.assignedOfficers || []).find(
                o => o.staffId === selectedStaff.id || o.staffName.toLowerCase().trim() === staffName
              );

              const roleLabel = isLead
                ? 'Proposal Lead'
                : isReviewer
                ? 'Internal Reviewer'
                : isApprover
                ? 'Final Approver'
                : matchedOfficer?.responsibility || 'Assigned Officer';

              const diff = getDaysDifference(ws.deadline);

              return (
                <div
                  key={ws.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white hover:shadow-xs transition flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {roleLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {ws.stage}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{ws.title}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">{ws.donor} • {ws.fundingAmount || 'Grant'}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Deadline: {formatDeadline(ws.deadline)}
                      </span>
                      {diff !== null && (
                        <span className={`font-bold ${diff < 0 ? 'text-rose-600' : diff <= 7 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d left`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {ws.tasks.filter(t => t.assignedTo === selectedStaff.fullName).length} tasks assigned
                    </span>
                    <button
                      onClick={() => onSelectWorkspace(ws, 'overview')}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                    >
                      Open Workspace →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. ASSIGNED PROPOSAL TASKS SECTION */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              Assigned Proposal Tasks & Deliverables ({assignedTasks.length})
            </h3>
            <p className="text-xs text-slate-500">
              Individual actionable deliverables assigned to {selectedStaff.fullName} across all proposal workspaces.
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTaskStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${taskStatusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              All ({assignedTasks.length})
            </button>
            <button
              onClick={() => setTaskStatusFilter('ACTIVE')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${taskStatusFilter === 'ACTIVE' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
            >
              Active ({activeTaskCount})
            </button>
            <button
              onClick={() => setTaskStatusFilter('SUBMITTED')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${taskStatusFilter === 'SUBMITTED' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600'}`}
            >
              In Review ({submittedTaskCount})
            </button>
            <button
              onClick={() => setTaskStatusFilter('COMPLETED')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${taskStatusFilter === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'}`}
            >
              Completed ({completedTaskCount})
            </button>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <CheckCircle2 className="w-7 h-7 text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700">No Tasks Match Filter</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              No tasks currently match this status filter for {selectedStaff.fullName}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
            {filteredTasks.map(({ task, workspace }) => {
              const diff = getDaysDifference(task.dueDate);
              const isDone = task.completed || task.status === 'Completed' || task.status === 'Complete';
              const isSubmitted = task.status === 'Submitted for Review' || task.departmentReviewStatus === 'Submitted to Department Head';
              const isInProg = task.status === 'In Progress';
              const currentStatus: TaskStatus = task.status || (isDone ? 'Completed' : 'Not Started');

              return (
                <div
                  key={task.id}
                  className={`p-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isDone ? 'bg-slate-50/60 opacity-80' : 'bg-white hover:bg-slate-50/40'
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {task.title}
                      </span>
                      {task.priority && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          task.priority === 'High' ? 'bg-rose-100 text-rose-800' : task.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                        }`}>{task.priority}</span>
                      )}
                      {task.section && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600">
                          {task.section}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-700">{workspace.title}</span>
                      <span>•</span>
                      <span>Donor: {workspace.donor}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Due: {task.dueDate || 'Workspace deadline'}
                      </span>
                      {diff !== null && !isDone && (
                        <span className={`font-bold ${diff < 0 ? 'text-rose-600' : diff <= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                          ({diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d left`})
                        </span>
                      )}
                    </div>

                    {task.notes && (
                      <p className="text-[11px] text-slate-600 italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                        Instructions: &quot;{task.notes}&quot;
                      </p>
                    )}
                  </div>

                  {/* Status Dropdown & Manager Actions */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <select
                      value={currentStatus}
                      onChange={(e) => handleUpdateTaskStatus(workspace, task.id, e.target.value as TaskStatus)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isSubmitted
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : isInProg
                          ? 'bg-blue-50 text-blue-800 border-blue-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Submitted for Review">Submitted for Review</option>
                      <option value="Completed">Completed</option>
                      <option value="Blocked">Blocked</option>
                    </select>

                    <button
                      onClick={() => {
                        setReassignTaskTarget({ task, workspace });
                        setReassignStaffChoice(task.assignedTo);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                      title="Reassign to another staff member"
                    >
                      Reassign
                    </button>

                    <button
                      onClick={() => {
                        setDeadlineTaskTarget({ task, workspace });
                        setNewDeadlineInput(task.dueDate || '');
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                      title="Change task deadline"
                    >
                      Deadline
                    </button>

                    <button
                      onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Open in workspace"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. ASSIGNED PROPOSAL SECTIONS */}
      {assignedSections.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Assigned Narrative Sections ({assignedSections.length})
            </h3>
            <p className="text-xs text-slate-500">
              Specific donor application questions where {selectedStaff.fullName} is drafting content.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedSections.map(({ section, workspace }) => (
              <div
                key={section.id}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-white transition space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {section.sectionKey || 'Section'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {section.reviewStatus || 'Drafting'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2">
                    {section.title}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {workspace.title} {section.wordLimit ? `• Limit: ${section.wordLimit} words` : ''}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {section.draftResponse ? `${section.draftResponse.trim().split(/\s+/).filter(Boolean).length} words drafted` : 'No draft yet'}
                  </span>
                  <button
                    onClick={() => onSelectWorkspace(workspace, 'application')}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    Draft in Workspace →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REASSIGN TASK MODAL */}
      {reassignTaskTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Reassign Proposal Task
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reassign <strong>&quot;{reassignTaskTarget.task.title}&quot;</strong> to another real staff member:
            </p>

            <form onSubmit={handleExecuteTaskReassignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">New Assignee *</label>
                <select
                  value={reassignStaffChoice}
                  onChange={(e) => setReassignStaffChoice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                  required
                >
                  {staffDirectory.map((s) => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName} ({s.department}) — {s.jobTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignTaskTarget(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Reassign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE TASK DEADLINE MODAL */}
      {deadlineTaskTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Change Task Due Date
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update the target deadline for <strong>&quot;{deadlineTaskTarget.task.title}&quot;</strong>:
            </p>

            <form onSubmit={handleExecuteTaskDeadlineChange} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">New Due Date *</label>
                <input
                  type="date"
                  required
                  value={newDeadlineInput}
                  onChange={(e) => setNewDeadlineInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeadlineTaskTarget(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Update Due Date
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
