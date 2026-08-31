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

export const PersonalizedRoleDashboard: React.FC<PersonalizedRoleDashboardProps> = ({
  currentUser,
  organization,
  opportunities,
  onSelectWorkspace,
  onUpdateWorkspace,
  onOpenOrgSettings,
  onInviteStaff
}) => {
  // Allow toggling perspectives if user has multiple roles or is Admin / Demo user
  const availableRoles: UserRole[] = useMemo(() => {
    const rolesSet = new Set<UserRole>(currentUser.roles || [currentUser.role]);
    if (currentUser.role === 'Admin' || currentUser.isDemoUser) {
      rolesSet.add('Admin');
      rolesSet.add('DepartmentHead');
      rolesSet.add('Officer');
      rolesSet.add('ProposalLead');
      rolesSet.add('FinalApprover');
    }
    return Array.from(rolesSet);
  }, [currentUser]);

  const [activeRolePerspective, setActiveRolePerspective] = useState<UserRole>(currentUser.role);
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

  // === 4. FINAL APPROVER WORKSPACES ===
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
                {currentUser.jobTitle || currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {currentUser.departmentName || organization.name} • {organization.name}
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
                  : r === 'FinalApprover'
                  ? 'Approver'
                  : 'Officer'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PERSPECTIVE 1: OFFICER / CONTRIBUTOR */}
      {activeRolePerspective === 'Officer' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Officer Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                My Active Tasks
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {officerPendingTasks.length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Returned for Revision
              </span>
              <span className={`text-2xl font-black mt-1 block ${officerReturnedTasks.length > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {officerReturnedTasks.length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Blocked Items
              </span>
              <span className={`text-2xl font-black mt-1 block ${officerBlockedTasks.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {officerBlockedTasks.length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Completed & Approved
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {officerTasks.filter(t => t.task.departmentReviewStatus === 'Department Approved').length}
              </span>
            </div>
          </div>

          {/* Returned Tasks Banner */}
          {officerReturnedTasks.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Action Required: {officerReturnedTasks.length} Task(s) Returned by Department Head for Revision</span>
              </div>
              <div className="space-y-1.5">
                {officerReturnedTasks.map(({ task, workspace }) => (
                  <div
                    key={task.id}
                    className="p-3 bg-white border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{task.title}</span>
                      <p className="text-[11px] text-amber-800 font-medium mt-0.5">
                        Feedback: {task.departmentReviewNote || 'Please update content per guidelines.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0"
                    >
                      Open Task
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Officer Task Roster */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Proposal Work Items</h3>
                <p className="text-xs text-slate-500">Draft your assigned sections and submit them to your Department Head for review.</p>
              </div>
            </div>

            {officerTasks.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                You have no tasks currently assigned in active proposals.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {officerTasks.map(({ task, workspace }) => (
                  <div key={task.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{task.title}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                          {workspace.title}
                        </span>
                        {task.departmentReviewStatus && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              task.departmentReviewStatus === 'Department Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : task.departmentReviewStatus === 'Submitted to Department Head'
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {task.departmentReviewStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{task.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {task.departmentReviewStatus !== 'Submitted to Department Head' &&
                        task.departmentReviewStatus !== 'Department Approved' && (
                          <button
                            type="button"
                            onClick={() => handleOfficerSubmitForReview(workspace, task.id)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Submit to HoD
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                      >
                        Open Workspace
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERSPECTIVE 2: DEPARTMENT HEAD (HoD) */}
      {activeRolePerspective === 'DepartmentHead' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Department Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Department Queue:
            </span>
            <select
              value={selectedDeptFilter}
              onChange={e => setSelectedDeptFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
            >
              {(organization.departments || []).map(d => (
                <option key={d.id} value={d.name}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* HoD Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Pending HoD Review
              </span>
              <span className={`text-2xl font-black mt-1 block ${deptPendingReviews.length > 0 ? 'text-indigo-600' : 'text-slate-900'}`}>
                {deptPendingReviews.length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Department Tasks
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {deptAllTasks.length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Approved Deliverables
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {deptAllTasks.filter(t => t.task.departmentReviewStatus === 'Department Approved').length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Department Staff
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {(organization.staffDirectory || []).filter(s => s.department === selectedDeptFilter).length}
              </span>
            </div>
          </div>

          {/* HoD Review Queue */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Department Review Queue ({selectedDeptFilter})
              </h3>
              <p className="text-xs text-slate-500">
                Technical and budget deliverables submitted by your officers requiring Department Head approval before final review.
              </p>
            </div>

            {deptPendingReviews.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <span>
                  {activeWorkspaces.length === 0
                    ? 'No active proposals or departmental tasks pending review.'
                    : `All ${selectedDeptFilter} deliverables are up to date and reviewed.`}
                </span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {deptPendingReviews.map(({ task, workspace }) => (
                  <div key={task.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{task.title}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">
                          {workspace.title}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold">
                          Assigned: {task.assignedTo || 'Officer'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{task.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleHoDReturnTask(workspace, task.id)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Return
                      </button>
                      <button
                        type="button"
                        onClick={() => handleHoDApproveTask(workspace, task.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve (HoD)
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERSPECTIVE 3: PROPOSAL LEAD */}
      {activeRolePerspective === 'ProposalLead' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                My Coordinated Proposals
              </span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {leadWorkspaces.length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Ready for Final Sign-Off
              </span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">
                {leadWorkspaces.filter(ws => (ws.tasks || []).every(t => t.departmentReviewStatus === 'Department Approved')).length}
              </span>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Urgent Deadlines (&lt; 14 Days)
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">
                {leadWorkspaces.filter(ws => calculateDaysRemaining(ws.deadline) <= 14 && calculateDaysRemaining(ws.deadline) >= 0).length}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">My Proposals & Department Progress</h3>
                <p className="text-xs text-slate-500">Track cross-department contributions and ensure all sections obtain HoD approval.</p>
              </div>
            </div>

            <div className="space-y-3">
              {leadWorkspaces.map(ws => {
                const totalTasks = (ws.tasks || []).length;
                const approvedTasks = (ws.tasks || []).filter(t => t.departmentReviewStatus === 'Department Approved').length;
                const percent = totalTasks > 0 ? Math.round((approvedTasks / totalTasks) * 100) : 0;
                const daysLeft = calculateDaysRemaining(ws.deadline);

                return (
                  <div
                    key={ws.id}
                    className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{ws.title}</span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 rounded text-[10px] font-bold">
                          {ws.donor}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <span>Deadline: <strong className="text-slate-800">{formatDeadline(ws.deadline)}</strong> ({daysLeft} days remaining)</span>
                        <span>HoD Approvals: <strong className="text-indigo-700">{approvedTasks}/{totalTasks}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-9 text-right">{percent}%</span>

                      <button
                        type="button"
                        onClick={() => onSelectWorkspace(ws, 'tasks')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        Manage Proposal
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PERSPECTIVE 4: FINAL APPROVER */}
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

      {/* PERSPECTIVE 5: ORGANISATION ADMIN */}
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
