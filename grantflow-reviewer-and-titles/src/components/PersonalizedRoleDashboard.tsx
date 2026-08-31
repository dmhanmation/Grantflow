import React, { useState, useMemo } from 'react';
import {
  OpportunityWorkspace,
  StaffMember,
  WorkspaceTask,
  AppUser,
  UserRole,
  OrgProfile,
  DepartmentReviewStatus
} from '../types';
import { calculateDaysRemaining, formatDeadline, getDaysDifference } from '../utils/dateUtils';
import { sortStaffByHierarchy } from '../utils/staffHierarchy';
import {
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  Users,
  Layers,
  FileCheck,
  FolderOpen,
  Sparkles,
  AlertCircle,
  FileText,
  UserCheck,
  Send,
  RotateCcw,
  Check
} from 'lucide-react';

interface PersonalizedRoleDashboardProps {
  currentUser: AppUser;
  organization: OrgProfile;
  opportunities: OpportunityWorkspace[];
  onSelectWorkspace: (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => void;
  onUpdateWorkspace: (updated: OpportunityWorkspace) => void;
  onOpenOrgSettings?: () => void;
  onInviteStaff?: () => void;
}

// ---- OfficerWorkTable: lean filterable My Work list for Officers ----
type WorkFilter = 'all' | 'active' | 'returned' | 'in_review' | 'completed';

const STATUS_FILTER_LABELS: Record<WorkFilter, string> = {
  all: 'All',
  active: 'Active',
  returned: 'Returned',
  in_review: 'In Review',
  completed: 'Completed'
};

const formatRoleLabel = (role?: UserRole | string) => {
  switch (role) {
    case 'ProposalLead': return 'Proposal Lead';
    case 'DepartmentHead': return 'Department Head';
    case 'FinalApprover': return 'Final Approver';
    case 'Reviewer': return 'Internal Reviewer';
    default: return role || 'Officer';
  }
};

interface OfficerWorkTableProps {
  officerTasks: Array<{ task: WorkspaceTask; workspace: OpportunityWorkspace }>;
  onSelectWorkspace: (ws: OpportunityWorkspace, tab?: string, taskId?: string) => void;
  onSubmitForReview: (ws: OpportunityWorkspace, taskId: string) => void;
}

const OfficerWorkTable: React.FC<OfficerWorkTableProps> = ({
  officerTasks,
  onSelectWorkspace,
  onSubmitForReview
}) => {
  const [workFilter, setWorkFilter] = React.useState<WorkFilter>('all');

  const filteredTasks = officerTasks.filter(({ task }) => {
    if (workFilter === 'all') return true;
    if (workFilter === 'active') return !task.completed && task.departmentReviewStatus !== 'Returned for Revision' && task.departmentReviewStatus !== 'Submitted to Department Head' && task.departmentReviewStatus !== 'Department Approved';
    if (workFilter === 'returned') return task.departmentReviewStatus === 'Returned for Revision';
    if (workFilter === 'in_review') return task.departmentReviewStatus === 'Submitted to Department Head';
    if (workFilter === 'completed') return task.completed || task.departmentReviewStatus === 'Department Approved';
    return true;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Header + filters */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Assigned Work</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Assigned tasks across all active proposals</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {(Object.keys(STATUS_FILTER_LABELS) as WorkFilter[]).map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setWorkFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${workFilter === f ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {STATUS_FILTER_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Task rows */}
      {filteredTasks.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400">
          {officerTasks.length === 0
            ? 'No tasks currently assigned to you in active proposals.'
            : `No tasks match the "${STATUS_FILTER_LABELS[workFilter]}" filter.`}
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {filteredTasks.map(({ task, workspace }) => {
            const daysRemaining = task.dueDate ? Math.round((new Date(task.dueDate).getTime() - Date.now()) / 86400000) : null;
            const isOverdue = daysRemaining !== null && daysRemaining < 0 && !task.completed;
            const isDueSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 7 && !task.completed;
            const isReturned = task.departmentReviewStatus === 'Returned for Revision';
            const isInReview = task.departmentReviewStatus === 'Submitted to Department Head';
            const isApproved = task.departmentReviewStatus === 'Department Approved' || task.completed;
            const isBlocked = Boolean(task.blockedReason || task.status === 'BLOCKED');

            return (
              <div key={task.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Task name + proposal chip */}
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate">{task.title}</span>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold truncate max-w-[180px]">
                      {workspace.title}
                    </span>
                  </div>

                  {/* Status row */}
                  <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                    {/* Review status badge */}
                    {isApproved && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">Approved</span>
                    )}
                    {isInReview && (
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">In Review</span>
                    )}
                    {isReturned && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">Returned</span>
                    )}
                    {isBlocked && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold">Blocked</span>
                    )}
                    {/* Due date */}
                    {daysRemaining !== null && !isApproved && (
                      <span className={`text-[10px] font-semibold ${isOverdue ? 'text-rose-700' : isDueSoon ? 'text-amber-700' : 'text-slate-500'}`}>
                        {isOverdue ? `Overdue by ${Math.abs(daysRemaining)}d` : daysRemaining === 0 ? 'Due today' : `Due in ${daysRemaining}d`}
                      </span>
                    )}
                    {/* Revision feedback */}
                    {isReturned && task.departmentReviewNote && (
                      <span className="text-[10px] text-amber-800 italic">"{task.departmentReviewNote}"</span>
                    )}
                  </div>

                  {/* Task description */}
                  {task.description && (
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{task.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {!isApproved && !isInReview && (
                    <button
                      type="button"
                      onClick={() => onSubmitForReview(workspace, task.id)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Submit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                  >
                    Open
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const PersonalizedRoleDashboard: React.FC<PersonalizedRoleDashboardProps> = ({
  currentUser,
  organization,
  opportunities,
  onSelectWorkspace,
  onUpdateWorkspace,
  onOpenOrgSettings,
  onInviteStaff
}) => {
  // Show role perspective tabs based on the user's actual assigned roles only.
  // Admins have their own dedicated dashboard (AdminSetupDashboard) — they do not
  // appear here. This component is rendered only for non-Admin users.
  const availableRoles: UserRole[] = useMemo(() => {
    const rolesSet = new Set<UserRole>(currentUser.roles || [currentUser.role]);
    // Demo users can explore all operational perspectives
    if (currentUser.isDemoUser) {
      rolesSet.add('DepartmentHead');
      rolesSet.add('Officer');
      rolesSet.add('ProposalLead');
      rolesSet.add('Reviewer');
      rolesSet.add('FinalApprover');
    }
    // Never expose Admin as a perspective here — Admin uses AdminSetupDashboard
    rolesSet.delete('Admin');
    return Array.from(rolesSet);
  }, [currentUser]);

  const [activeRolePerspective, setActiveRolePerspective] = useState<UserRole>(
    currentUser.role === 'Admin' ? 'Officer' : currentUser.role
  );
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>(currentUser.departmentName || 'Programmes');

  // Filtered active proposals
  const activeWorkspaces = useMemo(() => {
    return opportunities.filter(o => o.stage !== 'Awarded' && o.stage !== 'Rejected');
  }, [opportunities]);

  // === 1. OFFICER METRICS & TASKS ===
  const officerTasks = useMemo(() => {
    const tasks: Array<{ task: WorkspaceTask; workspace: OpportunityWorkspace }> = [];
    opportunities.forEach(ws => {
      (ws.tasks || []).forEach(t => {
        const isAssigned =
          t.assignedStaffId === currentUser.staffId ||
          t.assignedTo?.toLowerCase() === currentUser.fullName.toLowerCase() ||
          t.assignedTo?.toLowerCase().includes(currentUser.fullName.toLowerCase().split(' ')[0]) ||
          (currentUser.isDemoUser && t.department === 'Programmes');

        if (isAssigned) {
          tasks.push({ task: t, workspace: ws });
        }
      });
    });
    return tasks;
  }, [opportunities, currentUser]);

  const officerPendingTasks = officerTasks.filter(t => !t.task.completed);
  const officerReturnedTasks = officerTasks.filter(t => t.task.departmentReviewStatus === 'Returned for Revision');
  const officerBlockedTasks = officerTasks.filter(t => t.task.blockedReason || t.task.status === 'BLOCKED');

  const currentStaffMember = useMemo(() => {
    return (organization.staffDirectory || []).find(s =>
      (currentUser.staffId && s.id === currentUser.staffId) ||
      (s.email && currentUser.email && s.email.toLowerCase() === currentUser.email.toLowerCase())
    );
  }, [organization.staffDirectory, currentUser.staffId, currentUser.email]);

  const lineManagerName = currentStaffMember?.lineManagerName || 'Not assigned';

  // === 2. DEPARTMENT HEAD METRICS & REVIEW QUEUE ===
  const deptPendingReviews = useMemo(() => {
    const list: Array<{ task: WorkspaceTask; workspace: OpportunityWorkspace }> = [];
    opportunities.forEach(ws => {
      (ws.tasks || []).forEach(t => {
        const deptMatch =
          t.department?.toLowerCase() === selectedDeptFilter.toLowerCase() ||
          t.department?.toLowerCase() === (currentUser.departmentName || '').toLowerCase();

        const isAwaitingReview =
          t.departmentReviewStatus === 'Submitted to Department Head' ||
          (t.completed && t.departmentReviewStatus !== 'Department Approved');

        if (deptMatch && isAwaitingReview) {
          list.push({ task: t, workspace: ws });
        }
      });
    });
    return list;
  }, [opportunities, selectedDeptFilter, currentUser]);

  const deptAllTasks = useMemo(() => {
    const list: Array<{ task: WorkspaceTask; workspace: OpportunityWorkspace }> = [];
    opportunities.forEach(ws => {
      (ws.tasks || []).forEach(t => {
        if (
          t.department?.toLowerCase() === selectedDeptFilter.toLowerCase() ||
          t.department?.toLowerCase() === (currentUser.departmentName || '').toLowerCase()
        ) {
          list.push({ task: t, workspace: ws });
        }
      });
    });
    return list;
  }, [opportunities, selectedDeptFilter, currentUser]);

  // === 3. PROPOSAL LEAD WORKSPACES ===
  const leadWorkspaces = useMemo(() => {
    return activeWorkspaces.filter(ws => {
      const isLead =
        ws.proposalLead?.toLowerCase() === currentUser.fullName.toLowerCase() ||
        ws.leadStaff?.toLowerCase() === currentUser.fullName.toLowerCase() ||
        currentUser.isDemoUser;
      return isLead;
    });
  }, [activeWorkspaces, currentUser]);

  // === 4. INTERNAL REVIEWER WORKSPACES ===
  const reviewerWorkspaces = useMemo(() => {
    return activeWorkspaces.filter(ws => {
      const reviewerNames = [ws.intermediateReviewer, ws.reviewer]
        .filter(Boolean)
        .map(name => String(name).toLowerCase().trim());
      const currentName = currentUser.fullName.toLowerCase().trim();
      return reviewerNames.some(name => name === currentName || name.includes(currentName)) || currentUser.isDemoUser;
    });
  }, [activeWorkspaces, currentUser]);

  // === 5. FINAL APPROVER WORKSPACES ===
  const approverWorkspaces = useMemo(() => {
    return activeWorkspaces.filter(ws => {
      const isApprover =
        ws.finalApprover?.toLowerCase() === currentUser.fullName.toLowerCase() ||
        currentUser.role === 'FinalApprover' ||
        currentUser.isDemoUser;
      return isApprover;
    });
  }, [activeWorkspaces, currentUser]);

  const awaitingFinalSignOff = approverWorkspaces.filter(ws => ws.finalApprovalStatus === 'Pending');

  // Quick Action Handlers for in-dashboard approval workflows
  const handleOfficerSubmitForReview = (ws: OpportunityWorkspace, taskId: string) => {
    const updatedTasks = (ws.tasks || []).map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          departmentReviewStatus: 'Submitted to Department Head' as DepartmentReviewStatus,
          departmentReviewRequestedAt: new Date().toISOString()
        };
      }
      return t;
    });
    onUpdateWorkspace({ ...ws, tasks: updatedTasks });
  };

  const handleHoDApproveTask = (ws: OpportunityWorkspace, taskId: string) => {
    const updatedTasks = (ws.tasks || []).map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: true,
          status: 'COMPLETED' as const,
          departmentReviewStatus: 'Department Approved' as DepartmentReviewStatus,
          departmentApprovedAt: new Date().toISOString(),
          departmentApprovedBy: currentUser.fullName
        };
      }
      return t;
    });
    onUpdateWorkspace({ ...ws, tasks: updatedTasks });
  };

  const handleHoDReturnTask = (ws: OpportunityWorkspace, taskId: string) => {
    const note = window.prompt('Please enter revision instructions for the officer:');
    if (note === null) return;

    const updatedTasks = (ws.tasks || []).map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          completed: false,
          departmentReviewStatus: 'Returned for Revision' as DepartmentReviewStatus,
          departmentReviewNote: note || 'Revisions required by Department Head.'
        };
      }
      return t;
    });
    onUpdateWorkspace({ ...ws, tasks: updatedTasks });
  };

  const handleFinalSignOff = (ws: OpportunityWorkspace) => {
    const note = window.prompt('Enter Executive Sign-Off Note / Submission Authorization:');
    if (note === null) return;

    onUpdateWorkspace({
      ...ws,
      finalApprovalStatus: 'Approved',
      finalApprovedAt: new Date().toISOString(),
      finalApprovedBy: currentUser.fullName,
      finalApprovalNote: note || 'Authorized for donor submission by Executive Signatory.'
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Perspective Bar */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md">
            {currentUser.fullName[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900">{currentUser.fullName}</h2>
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-full text-xs border border-indigo-100">
                {activeRolePerspective === 'Officer'
                  ? (currentUser.jobTitle || 'Officer')
                  : formatRoleLabel(activeRolePerspective)}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {currentUser.departmentName || 'No department assigned'} • Line Manager: {lineManagerName}
            </p>
          </div>
        </div>

        {/* Perspective Switcher */}
        {availableRoles.length > 1 && (
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              View as:
            </span>
            {availableRoles.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveRolePerspective(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeRolePerspective === r
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'Admin'
                  ? 'Admin'
                  : r === 'DepartmentHead'
                  ? 'Dept Head'
                  : r === 'ProposalLead'
                  ? 'Proposal Lead'
                  : r === 'Reviewer'
                  ? 'Reviewer'
                  : r === 'FinalApprover'
                  ? 'Approver'
                  : 'Officer'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PERSPECTIVE 1: OFFICER / CONTRIBUTOR — My Work only */}
      {activeRolePerspective === 'Officer' && (() => {
        const dueSoonTasks = officerPendingTasks.filter(({ task }) => {
          const days = calculateDaysRemaining(task.dueDate);
          return days !== null && days >= 0 && days <= 7;
        });

        return (
          <div className="space-y-5 animate-in fade-in duration-150">

            {/* Four personal indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Tasks</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{officerPendingTasks.length}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Not yet complete</span>
              </div>
              <div className={`p-4 border rounded-2xl shadow-xs ${dueSoonTasks.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Due Soon</span>
                <span className={`text-2xl font-black mt-1 block ${dueSoonTasks.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{dueSoonTasks.length}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Within 7 days</span>
              </div>
              <div className={`p-4 border rounded-2xl shadow-xs ${officerReturnedTasks.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Returned</span>
                <span className={`text-2xl font-black mt-1 block ${officerReturnedTasks.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>{officerReturnedTasks.length}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Needs revision</span>
              </div>
              <div className={`p-4 border rounded-2xl shadow-xs ${officerBlockedTasks.length > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Blocked</span>
                <span className={`text-2xl font-black mt-1 block ${officerBlockedTasks.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{officerBlockedTasks.length}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Awaiting unblock</span>
              </div>
            </div>

            {/* My Work — consolidated task list */}
            <OfficerWorkTable
              officerTasks={officerTasks}
              onSelectWorkspace={onSelectWorkspace}
              onSubmitForReview={handleOfficerSubmitForReview}
            />
          </div>
        );
      })()}

      {/* PERSPECTIVE 2: DEPARTMENT HEAD (HoD) — lean department supervision view */}
      {activeRolePerspective === 'DepartmentHead' && (() => {
        const departmentStaff = (organization.staffDirectory || []).filter(
          s => s.department?.toLowerCase() === selectedDeptFilter.toLowerCase()
        );
        const activeDeptTasks = deptAllTasks.filter(({ task }) => !task.completed && task.departmentReviewStatus !== 'Department Approved');
        const returnedDeptTasks = deptAllTasks.filter(({ task }) => task.departmentReviewStatus === 'Returned for Revision');
        const blockedDeptTasks = activeDeptTasks.filter(({ task }) => Boolean(task.blockerReason || task.blockerNotes) || task.status === 'Blocked');
        const overdueDeptTasks = activeDeptTasks.filter(({ task }) => {
          if (!task.dueDate) return false;
          const days = calculateDaysRemaining(task.dueDate);
          return days !== null && days < 0;
        });
        const atRiskTaskIds = new Set([...blockedDeptTasks, ...overdueDeptTasks].map(({ task }) => task.id));

        return (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Department selector + team management */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department:</span>
                <select
                  value={selectedDeptFilter}
                  onChange={e => setSelectedDeptFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                >
                  {(organization.departments || []).map(d => (
                    <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>
              {onOpenOrgSettings && (
                <button
                  type="button"
                  onClick={onOpenOrgSettings}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Users className="w-4 h-4" />
                  Manage Team
                </button>
              )}
            </div>

            {/* Four department indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className={`p-4 border rounded-2xl shadow-xs ${deptPendingReviews.length > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Pending Review</span>
                <span className={`text-2xl font-black mt-1 block ${deptPendingReviews.length > 0 ? 'text-indigo-700' : 'text-slate-900'}`}>{deptPendingReviews.length}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Awaiting your sign-off</span>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Tasks</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{activeDeptTasks.length}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Across your department</span>
              </div>
              <div className={`p-4 border rounded-2xl shadow-xs ${atRiskTaskIds.size > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Overdue / At Risk</span>
                <span className={`text-2xl font-black mt-1 block ${atRiskTaskIds.size > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{atRiskTaskIds.size}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Needs intervention</span>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Department Staff</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{departmentStaff.length}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Current team</span>
              </div>
            </div>

            {/* Review queue: the Department Head's primary action area */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Department Review Queue</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Submitted deliverables waiting for your approval or revision request.</p>
              </div>

              {deptPendingReviews.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Nothing is waiting for your review.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {deptPendingReviews.map(({ task, workspace }) => (
                    <div key={task.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="font-bold text-xs text-slate-900">{task.title}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">{workspace.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Assigned to {task.assignedTo || 'Officer'}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => handleHoDReturnTask(workspace, task.id)} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1">
                          <RotateCcw className="w-3.5 h-3.5" /> Return
                        </button>
                        <button type="button" onClick={() => handleHoDApproveTask(workspace, task.id)} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
                          <Check className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button type="button" onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition">Inspect</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Compact department work list — no executive or organisation-wide clutter */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Department Work</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Active assignments being handled by your team.</p>
                </div>
                {returnedDeptTasks.length > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">{returnedDeptTasks.length} in revision</span>
                )}
              </div>

              {activeDeptTasks.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">No active department tasks right now.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeDeptTasks.map(({ task, workspace }) => {
                    const days = task.dueDate ? calculateDaysRemaining(task.dueDate) : null;
                    const isBlocked = Boolean(task.blockerReason || task.blockerNotes) || task.status === 'Blocked';
                    const isOverdue = days !== null && days < 0;
                    return (
                      <button
                        key={`${workspace.id}-${task.id}`}
                        type="button"
                        onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                        className="w-full px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-50 transition"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-xs font-bold text-slate-900">{task.title}</span>
                            <span className="text-[10px] text-slate-500">{workspace.title}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">{task.assignedTo || 'Unassigned'}{task.dueDate ? ` • Due ${formatDeadline(task.dueDate)}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {task.departmentReviewStatus === 'Returned for Revision' && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">Revision</span>}
                          {isBlocked && <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">Blocked</span>}
                          {isOverdue && <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold">Overdue</span>}
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* PERSPECTIVE 3: PROPOSAL LEAD — lean coordination view */}
      {activeRolePerspective === 'ProposalLead' && (() => {
        const proposalRows = leadWorkspaces.map(ws => {
          const tasks = ws.tasks || [];
          const approvedTasks = tasks.filter(t => t.departmentReviewStatus === 'Department Approved').length;
          const readiness = tasks.length > 0 ? Math.round((approvedTasks / tasks.length) * 100) : 0;
          const daysLeft = calculateDaysRemaining(ws.deadline);
          const pendingDepartments = Array.from(new Set(
            tasks
              .filter(t => t.departmentReviewStatus !== 'Department Approved')
              .map(t => t.department)
              .filter((d): d is string => Boolean(d))
          ));
          const awaitingHoD = tasks.filter(t => t.departmentReviewStatus === 'Submitted to Department Head').length;
          const blocked = tasks.filter(t => Boolean(t.blockedReason) || t.status === 'BLOCKED').length;
          const overdue = tasks.filter(t => {
            if (t.completed || !t.dueDate) return false;
            const days = calculateDaysRemaining(t.dueDate);
            return days !== null && days < 0;
          }).length;
          const isAtRisk = blocked > 0 || overdue > 0 || (daysLeft !== null && daysLeft >= 0 && daysLeft <= 7);

          let nextAction = 'Review proposal';
          if (blocked > 0) nextAction = 'Resolve blocked items';
          else if (overdue > 0) nextAction = 'Follow up overdue work';
          else if (awaitingHoD > 0) nextAction = 'Follow up HoD reviews';
          else if (pendingDepartments.length > 0) nextAction = `Awaiting ${pendingDepartments.slice(0, 2).join(', ')} input`;
          else if (tasks.length > 0 && approvedTasks === tasks.length) nextAction = 'Send for final sign-off';

          return {
            ws,
            readiness,
            daysLeft,
            pendingDepartments,
            awaitingHoD,
            blocked,
            overdue,
            isAtRisk,
            nextAction
          };
        });

        const dueSoonCount = proposalRows.filter(r => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 14).length;
        const awaitingInputCount = proposalRows.filter(r => r.pendingDepartments.length > 0 || r.awaitingHoD > 0).length;
        const atRiskCount = proposalRows.filter(r => r.isAtRisk).length;
        const attentionRows = proposalRows.filter(r => r.isAtRisk || r.awaitingHoD > 0);

        return (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Four coordination indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Coordinated Proposals</span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">{leadWorkspaces.length}</span>
              </div>
              <div className={`p-4 border rounded-2xl shadow-xs ${dueSoonCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Due Soon</span>
                <span className={`text-2xl font-black mt-1 block ${dueSoonCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{dueSoonCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Within 14 days</span>
              </div>
              <div className={`p-4 border rounded-2xl shadow-xs ${awaitingInputCount > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Awaiting Dept / HoD Input</span>
                <span className={`text-2xl font-black mt-1 block ${awaitingInputCount > 0 ? 'text-indigo-700' : 'text-slate-900'}`}>{awaitingInputCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Proposals waiting on others</span>
              </div>
              <div className={`p-4 border rounded-2xl shadow-xs ${atRiskCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Blocked / At Risk</span>
                <span className={`text-2xl font-black mt-1 block ${atRiskCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{atRiskCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Needs intervention</span>
              </div>
            </div>

            {/* Main coordinated proposals list */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Proposals</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">The applications you lead, with only the coordination information you need.</p>
              </div>

              {proposalRows.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No active proposals are currently assigned to you as Proposal Lead.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {proposalRows.map(({ ws, readiness, daysLeft, pendingDepartments, nextAction, isAtRisk }) => (
                    <div key={ws.id} className="px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{ws.title}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{ws.donor}</span>
                          {isAtRisk && <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">Needs attention</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-slate-500">
                          <span>Deadline: <strong className="text-slate-700">{formatDeadline(ws.deadline)}</strong>{daysLeft !== null ? ` (${daysLeft}d)` : ''}</span>
                          <span>Stage: <strong className="text-slate-700">{ws.stage}</strong></span>
                          <span>Pending: <strong className="text-slate-700">{pendingDepartments.length > 0 ? pendingDepartments.join(', ') : 'None'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Readiness</span><span>{readiness}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${readiness}%` }} />
                          </div>
                        </div>
                        <div className="hidden xl:block w-44 text-[11px] text-slate-600">{nextAction}</div>
                        <button
                          type="button"
                          onClick={() => onSelectWorkspace(ws, 'tasks')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          Open Proposal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Only items that genuinely need coordination attention */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Needs Attention</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Blocked, overdue or waiting on HoD action in proposals you lead.</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${attentionRows.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {attentionRows.length}
                </span>
              </div>

              {attentionRows.length === 0 ? (
                <div className="py-8 text-center text-xs text-emerald-700">Nothing requires urgent coordination right now.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {attentionRows.map(({ ws, blocked, overdue, awaitingHoD, nextAction }) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => onSelectWorkspace(ws, 'tasks')}
                      className="w-full px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-50 transition"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">{ws.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {blocked > 0 && `${blocked} blocked`}
                          {blocked > 0 && (overdue > 0 || awaitingHoD > 0) && ' • '}
                          {overdue > 0 && `${overdue} overdue`}
                          {overdue > 0 && awaitingHoD > 0 && ' • '}
                          {awaitingHoD > 0 && `${awaitingHoD} awaiting HoD review`}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-700">{nextAction} →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* PERSPECTIVE 4: INTERNAL REVIEWER — lean proposal review queue */}
      {activeRolePerspective === 'Reviewer' && (() => {
        const reviewRows = reviewerWorkspaces.map(ws => {
          const tasks = ws.tasks || [];
          const approvedTasks = tasks.filter(t => t.departmentReviewStatus === 'Department Approved').length;
          const readiness = tasks.length > 0 ? Math.round((approvedTasks / tasks.length) * 100) : 0;
          const daysLeft = calculateDaysRemaining(ws.deadline);
          const status = ws.intermediateReviewStatus || 'Pending';
          const blocked = tasks.filter(t => Boolean(t.blockedReason || t.blockerReason || t.blockerNotes) || t.status === 'Blocked' || t.status === 'BLOCKED').length;
          const overdue = tasks.filter(t => {
            if (t.completed || !t.dueDate) return false;
            const days = calculateDaysRemaining(t.dueDate);
            return days !== null && days < 0;
          }).length;
          return { ws, readiness, daysLeft, status, blocked, overdue };
        });

        const pendingCount = reviewRows.filter(r => r.status === 'Pending').length;
        const dueSoonCount = reviewRows.filter(r => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 14).length;
        const reviewedCount = reviewRows.filter(r => r.status === 'Approved').length;
        const returnedCount = reviewRows.filter(r => r.status === 'Returned').length;

        return (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className={`p-4 border rounded-2xl shadow-xs ${pendingCount > 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Awaiting Review</span>
                <span className={`text-2xl font-black mt-1 block ${pendingCount > 0 ? 'text-indigo-700' : 'text-slate-900'}`}>{pendingCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Needs your attention</span>
              </div>
              <div className={`p-4 border rounded-2xl shadow-xs ${dueSoonCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Due Soon</span>
                <span className={`text-2xl font-black mt-1 block ${dueSoonCount > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{dueSoonCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Within 14 days</span>
              </div>
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Reviewed / Returned</span>
                <span className="text-2xl font-black text-emerald-700 mt-1 block">{reviewedCount + returnedCount}</span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">{returnedCount > 0 ? `${reviewedCount} approved, ${returnedCount} returned` : 'Approved reviews'}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Review Queue</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Only proposals assigned to you for internal review.</p>
              </div>

              {reviewRows.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">No active proposals are currently assigned to you for internal review.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reviewRows.map(({ ws, readiness, daysLeft, status, blocked, overdue }) => (
                    <div key={ws.id} className="px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{ws.title}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{ws.donor}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : status === 'Returned' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {status === 'Approved' ? 'Reviewed' : status === 'Returned' ? 'Returned' : 'Awaiting Review'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-slate-500">
                          <span>Proposal Lead: <strong className="text-slate-700">{ws.proposalLead || ws.leadStaff || 'Unassigned'}</strong></span>
                          <span>Deadline: <strong className="text-slate-700">{formatDeadline(ws.deadline)}</strong>{daysLeft !== null ? ` (${daysLeft}d)` : ''}</span>
                          <span>Stage: <strong className="text-slate-700">{ws.stage}</strong></span>
                          {(blocked > 0 || overdue > 0) && <span className="font-bold text-rose-600">{blocked > 0 ? `${blocked} blocked` : ''}{blocked > 0 && overdue > 0 ? ' • ' : ''}{overdue > 0 ? `${overdue} overdue` : ''}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                            <span>Readiness</span><span>{readiness}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${readiness}%` }} />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onSelectWorkspace(ws, 'overview')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          Open Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* PERSPECTIVE 5: FINAL APPROVER */}
      {activeRolePerspective === 'FinalApprover' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Awaiting Final Authorization
              </span>
              <span className="text-2xl font-black text-rose-600 mt-1 block">
                {awaitingFinalSignOff.length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Authorized for Submission
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {approverWorkspaces.filter(ws => ws.finalApprovalStatus === 'Approved').length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Pipeline Opportunities
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {approverWorkspaces.length}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Executive Proposal Sign-Off Queue</h3>
              <p className="text-xs text-slate-500">
                Grants that have completed departmental reviews and require senior executive authorization before submission.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {approverWorkspaces.map(ws => (
                <div key={ws.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{ws.title}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                        {ws.donor}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ws.finalApprovalStatus === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Status: {ws.finalApprovalStatus || 'Pending Sign-Off'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Lead: {ws.proposalLead || ws.leadStaff} • Deadline: <strong>{formatDeadline(ws.deadline)}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ws.finalApprovalStatus !== 'Approved' && (
                      <button
                        type="button"
                        onClick={() => handleFinalSignOff(ws)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        Authorize Submission
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onSelectWorkspace(ws, 'overview')}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                    >
                      Review Dossier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PERSPECTIVE 6: ORGANISATION ADMIN */}
      {activeRolePerspective === 'Admin' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Staff Roster
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {(organization.staffDirectory || []).length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Departments
              </span>
              <span className="text-2xl font-black text-indigo-600 mt-1 block">
                {(organization.departments || []).length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Active Proposals
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {activeWorkspaces.length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Document Library
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {(organization.documentLibrary || []).length}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Organisation Administration Hub</h3>
                <p className="text-xs text-slate-500">Manage staff invitations, department hierarchy, and institutional governance.</p>
              </div>
              <div className="flex gap-2">
                {onInviteStaff && (
                  <button
                    type="button"
                    onClick={onInviteStaff}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <Users className="w-4 h-4" />
                    Manage Staff
                  </button>
                )}
                {onOpenOrgSettings && (
                  <button
                    type="button"
                    onClick={onOpenOrgSettings}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                  >
                    Org Profile & Policies
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Department Setup</span>
                <div className="space-y-1.5">
                  {(organization.departments || []).map(d => (
                    <div key={d.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">{d.name}</span>
                      <span className="text-slate-500 text-[11px]">Head: {d.headStaffName || 'Assigned per role'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Active Staff Roster</span>
                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {sortStaffByHierarchy(organization.staffDirectory || []).map(s => (
                    <div key={s.id} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 block">{s.fullName}</span>
                        <span className="text-[10px] text-slate-500">{s.jobTitle} • {s.department}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold">
                        {s.role || s.functionalRole}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
