import React, { useState, useMemo } from 'react';
import { OpportunityWorkspace, WorkspaceTask, StaffMember, OrgDepartment, DepartmentReviewStatus } from '../types';
import { calculateDaysRemaining, formatDeadline, getTaskUrgencyInfo, TaskUrgencyInfo } from '../utils/dateUtils';
import {
  Briefcase,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  UserCheck,
  Building2,
  Search,
  Filter,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Flame,
  FileText,
  AlertCircle,
  Copy,
  Check,
  Bell,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Calendar,
  Activity,
  ThumbsUp,
  UserPlus,
  Users,
  ArrowRightLeft,
  RefreshCw,
  Info
} from 'lucide-react';

interface DepartmentalTaskReviewProps {
  opportunities: OpportunityWorkspace[];
  staffDirectory?: StaffMember[];
  selectedLeadName?: string;
  onSelectWorkspace: (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => void;
  onUpdateWorkspace?: (updated: OpportunityWorkspace) => void;
}

export const DepartmentalTaskReview: React.FC<DepartmentalTaskReviewProps> = ({
  opportunities,
  staffDirectory = [],
  selectedLeadName = '',
  onSelectWorkspace,
  onUpdateWorkspace
}) => {
  // Filter state
  const [selectedProposalId, setSelectedProposalId] = useState<string>('ALL');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_HOD' | 'REVISION' | 'DRAFTING' | 'APPROVED' | 'OVERDUE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Nudge / Notification feedback state
  const [nudgedTaskIds, setNudgedTaskIds] = useState<Record<string, { timestamp: string; message: string }>>({});
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [activeNudgeModalTask, setActiveNudgeModalTask] = useState<{
    workspace: OpportunityWorkspace;
    task: WorkspaceTask;
    hodName: string;
  } | null>(null);
  const [customNudgeMessage, setCustomNudgeMessage] = useState<string>('');

  // Reassignment Modal state
  const [activeReassignModalTask, setActiveReassignModalTask] = useState<{
    workspace: OpportunityWorkspace;
    task: WorkspaceTask;
    departmentName: string;
    hodName: string;
  } | null>(null);
  const [targetAssigneeName, setTargetAssigneeName] = useState<string>('');
  const [reassignDeptFilter, setReassignDeptFilter] = useState<string>('ALL');
  const [reassignStaffSearch, setReassignStaffSearch] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('Workload capacity rebalance');
  const [customReassignNote, setCustomReassignNote] = useState<string>('');
  const [adjustedDueDate, setAdjustedDueDate] = useState<string>('');
  const [syncDepartmentToAssignee, setSyncDepartmentToAssignee] = useState<boolean>(true);
  const [resetReviewStatus, setResetReviewStatus] = useState<boolean>(false);
  const [reassignedSuccessFeedback, setReassignedSuccessFeedback] = useState<{
    taskId: string;
    taskTitle: string;
    assignee: string;
    timestamp: string;
  } | null>(null);

  // Compute active workload count for each staff member across active proposals to identify capacity
  const staffWorkloadMap = useMemo(() => {
    const counts: Record<string, { totalActive: number; pendingHoD: number; overdue: number }> = {};
    staffDirectory.forEach(staff => {
      counts[staff.fullName] = { totalActive: 0, pendingHoD: 0, overdue: 0 };
    });

    opportunities.forEach(opp => {
      if (opp.stage !== 'Awarded' && opp.stage !== 'Rejected') {
        (opp.tasks || []).forEach(t => {
          if (!t.completed && t.assignedTo) {
            if (!counts[t.assignedTo]) {
              counts[t.assignedTo] = { totalActive: 0, pendingHoD: 0, overdue: 0 };
            }
            counts[t.assignedTo].totalActive++;
            if (t.departmentReviewStatus === 'Submitted to Department Head') {
              counts[t.assignedTo].pendingHoD++;
            }
            const urgency = getTaskUrgencyInfo(t.dueDate, t.completed);
            if (urgency.isOverdue) {
              counts[t.assignedTo].overdue++;
            }
          }
        });
      }
    });

    return counts;
  }, [opportunities, staffDirectory]);

  // Filter active proposals coordinated by the lead (or all active proposals if selected)
  const leadProposals = useMemo(() => {
    return opportunities.filter(o => {
      const isLead = (o.proposalLead || o.leadStaff) === selectedLeadName;
      const isActive = o.stage !== 'Awarded' && o.stage !== 'Rejected';
      return isActive && isLead;
    });
  }, [opportunities, selectedLeadName]);

  // If lead has no proposals, fallback to all active opportunities
  const relevantProposals = useMemo(() => {
    if (leadProposals.length > 0) return leadProposals;
    return opportunities.filter(o => o.stage !== 'Awarded' && o.stage !== 'Rejected');
  }, [leadProposals, opportunities]);

  // Currently scoped proposals based on proposal dropdown
  const scopedProposals = useMemo(() => {
    if (selectedProposalId === 'ALL') {
      return relevantProposals;
    }
    return relevantProposals.filter(p => p.id === selectedProposalId);
  }, [relevantProposals, selectedProposalId]);

  // Helper to resolve department and HoD for any task
  const resolveTaskDepartmentAndHoD = (task: WorkspaceTask, workspace: OpportunityWorkspace) => {
    const assignedStaff = staffDirectory.find(s => s.fullName === task.assignedTo);
    const departmentName = task.departmentName || assignedStaff?.department || 'Programmes';
    
    // Find department head
    let hodName = task.departmentHeadName || assignedStaff?.lineManagerName || '';
    if (!hodName) {
      const staffHoD = staffDirectory.find(s => s.department === departmentName && (s.isDepartmentHead || s.role === 'DepartmentHead'));
      if (staffHoD) {
        hodName = staffHoD.fullName;
      } else {
        hodName = 'Department Head';
      }
    }

    return { departmentName, hodName };
  };

  // Compile all tasks across scoped proposals with enriched metadata
  const allDepartmentTasks = useMemo(() => {
    const results: {
      workspace: OpportunityWorkspace;
      task: WorkspaceTask;
      departmentName: string;
      hodName: string;
      reviewStatus: DepartmentReviewStatus;
      urgency: TaskUrgencyInfo;
      isPendingHoD: boolean;
      isRevision: boolean;
      isApproved: boolean;
      isDrafting: boolean;
    }[] = [];

    scopedProposals.forEach(workspace => {
      const tasks = workspace.tasks || [];
      tasks.forEach(task => {
        const { departmentName, hodName } = resolveTaskDepartmentAndHoD(task, workspace);
        const reviewStatus = task.departmentReviewStatus || (task.completed ? 'Approved' : 'Drafting');
        const urgency = getTaskUrgencyInfo(task.dueDate, task.completed);
        const isPendingHoD = task.departmentReviewStatus === 'Submitted to Department Head' && !task.completed;
        const isRevision = task.departmentReviewStatus === 'Returned for Revision' && !task.completed;
        const isApproved = task.departmentReviewStatus === 'Approved' || task.departmentReviewStatus === 'Department Approved' || task.completed;
        const isDrafting = !task.completed && (!task.departmentReviewStatus || task.departmentReviewStatus === 'Drafting');

        results.push({
          workspace,
          task,
          departmentName,
          hodName,
          reviewStatus,
          urgency,
          isPendingHoD,
          isRevision,
          isApproved,
          isDrafting
        });
      });
    });

    return results;
  }, [scopedProposals, staffDirectory]);

  // Aggregate statistics across all department tasks
  const stats = useMemo(() => {
    let total = allDepartmentTasks.length;
    let pendingHoD = 0;
    let inRevision = 0;
    let drafting = 0;
    let approved = 0;
    let overdue = 0;

    allDepartmentTasks.forEach(t => {
      if (t.isPendingHoD) pendingHoD++;
      else if (t.isRevision) inRevision++;
      else if (t.isApproved) approved++;
      else if (t.isDrafting) drafting++;

      if (t.urgency.isOverdue && !t.isApproved) overdue++;
    });

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    return {
      total,
      pendingHoD,
      inRevision,
      drafting,
      approved,
      overdue,
      approvalRate
    };
  }, [allDepartmentTasks]);

  // Grouped by Department
  const departmentBreakdown = useMemo(() => {
    const deptMap = new Map<string, {
      departmentName: string;
      tasks: typeof allDepartmentTasks;
      pendingHoDCount: number;
      revisionCount: number;
      approvedCount: number;
      draftingCount: number;
      overdueCount: number;
      hodName: string;
    }>();

    allDepartmentTasks.forEach(item => {
      const dept = item.departmentName;
      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          departmentName: dept,
          tasks: [],
          pendingHoDCount: 0,
          revisionCount: 0,
          approvedCount: 0,
          draftingCount: 0,
          overdueCount: 0,
          hodName: item.hodName
        });
      }

      const entry = deptMap.get(dept)!;
      entry.tasks.push(item);
      if (item.isPendingHoD) entry.pendingHoDCount++;
      else if (item.isRevision) entry.revisionCount++;
      else if (item.isApproved) entry.approvedCount++;
      else if (item.isDrafting) entry.draftingCount++;

      if (item.urgency.isOverdue && !item.isApproved) entry.overdueCount++;
    });

    return Array.from(deptMap.values());
  }, [allDepartmentTasks]);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return allDepartmentTasks.filter(item => {
      // Dept filter
      if (selectedDeptFilter !== 'ALL' && item.departmentName !== selectedDeptFilter) {
        return false;
      }

      // Status filter
      if (statusFilter === 'PENDING_HOD' && !item.isPendingHoD) return false;
      if (statusFilter === 'REVISION' && !item.isRevision) return false;
      if (statusFilter === 'DRAFTING' && !item.isDrafting) return false;
      if (statusFilter === 'APPROVED' && !item.isApproved) return false;
      if (statusFilter === 'OVERDUE' && (!item.urgency.isOverdue || item.isApproved)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.task.title.toLowerCase().includes(q);
        const matchesSection = item.task.section?.toLowerCase().includes(q);
        const matchesAssignee = item.task.assignedTo?.toLowerCase().includes(q);
        const matchesHoD = item.hodName.toLowerCase().includes(q);
        const matchesWorkspace = item.workspace.title.toLowerCase().includes(q);
        const matchesDept = item.departmentName.toLowerCase().includes(q);

        return matchesTitle || matchesSection || matchesAssignee || matchesHoD || matchesWorkspace || matchesDept;
      }

      return true;
    });
  }, [allDepartmentTasks, selectedDeptFilter, statusFilter, searchQuery]);

  // Tasks specifically pending HoD approval across all proposals
  const pendingHodQueue = useMemo(() => {
    return allDepartmentTasks.filter(t => t.isPendingHoD);
  }, [allDepartmentTasks]);

  // Handler to send a quick nudge/reminder to HoD
  const handleOpenNudgeModal = (workspace: OpportunityWorkspace, task: WorkspaceTask, hodName: string) => {
    setActiveNudgeModalTask({ workspace, task, hodName });
    setCustomNudgeMessage(`Hi ${hodName}, could you please conduct the departmental sign-off review for "${task.title}" under ${workspace.title}? We are targeting final package synthesis.`);
  };

  const handleSendNudge = () => {
    if (!activeNudgeModalTask) return;
    const { workspace, task, hodName } = activeNudgeModalTask;

    const now = new Date().toISOString();
    setNudgedTaskIds(prev => ({
      ...prev,
      [task.id]: {
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        message: customNudgeMessage
      }
    }));

    // If onUpdateWorkspace is available, record an activity in the workspace
    if (onUpdateWorkspace) {
      const updatedTasks = (workspace.tasks || []).map(t => {
        if (t.id === task.id) {
          return {
            ...t,
            notes: t.notes
              ? `${t.notes}\n[${now.split('T')[0]}] Proposal Lead Reminder sent to HoD ${hodName}: "${customNudgeMessage}"`
              : `[${now.split('T')[0]}] Proposal Lead Reminder sent to HoD ${hodName}: "${customNudgeMessage}"`,
            lastUpdated: now
          };
        }
        return t;
      });

      const updatedWorkspace: OpportunityWorkspace = {
        ...workspace,
        tasks: updatedTasks,
        lastUpdated: now
      };

      onUpdateWorkspace(updatedWorkspace);
    }

    setActiveNudgeModalTask(null);
  };

  // Available staff members filtered for reassignment selection
  const selectableStaffList = useMemo(() => {
    return staffDirectory.filter(staff => {
      if (staff.status === 'Inactive') return false;
      if (reassignDeptFilter !== 'ALL' && staff.department !== reassignDeptFilter) {
        return false;
      }
      if (reassignStaffSearch.trim()) {
        const q = reassignStaffSearch.toLowerCase();
        const matchName = staff.fullName.toLowerCase().includes(q);
        const matchDept = staff.department.toLowerCase().includes(q);
        const matchTitle = (staff.jobTitle || '').toLowerCase().includes(q);
        return matchName || matchDept || matchTitle;
      }
      return true;
    });
  }, [staffDirectory, reassignDeptFilter, reassignStaffSearch]);

  // Handler to open the Reassign Deliverable modal
  const handleOpenReassignModal = (workspace: OpportunityWorkspace, task: WorkspaceTask, departmentName: string, hodName: string) => {
    setActiveReassignModalTask({ workspace, task, departmentName, hodName });
    setTargetAssigneeName(task.assignedTo || '');
    setReassignDeptFilter('ALL');
    setReassignStaffSearch('');
    setReassignReason('Workload capacity rebalance');
    setCustomReassignNote('');
    setAdjustedDueDate(task.dueDate || '');
    setSyncDepartmentToAssignee(true);
    setResetReviewStatus(task.departmentReviewStatus === 'Returned for Revision');
  };

  // Handler to execute reassignment
  const handleConfirmReassignment = () => {
    if (!activeReassignModalTask || !targetAssigneeName) return;
    const { workspace, task, departmentName: currentDept, hodName: currentHoD } = activeReassignModalTask;

    const newStaff = staffDirectory.find(s => s.fullName === targetAssigneeName);
    const newDept = syncDepartmentToAssignee && newStaff?.department ? newStaff.department : currentDept;

    // Resolve new HoD if department changed
    let newHod = currentHoD;
    if (syncDepartmentToAssignee && newStaff?.department && newStaff.department !== currentDept) {
      const staffHoD = staffDirectory.find(s => s.department === newDept && (s.isDepartmentHead || s.role === 'DepartmentHead'));
      if (staffHoD) newHod = staffHoD.fullName;
    }

    const now = new Date().toISOString();
    const dateStr = now.split('T')[0];
    const prevAssignee = task.assignedTo || 'Unassigned';
    const handoverLog = `[${dateStr}] 🔄 Reassigned from ${prevAssignee} to ${targetAssigneeName} by Proposal Lead (${selectedLeadName}). Reason: ${reassignReason}${customReassignNote ? ` - Note: "${customReassignNote}"` : ''}`;

    const updatedTask: WorkspaceTask = {
      ...task,
      assignedTo: targetAssigneeName,
      assignedStaffId: newStaff?.id,
      departmentName: newDept,
      departmentHeadName: newHod,
      dueDate: adjustedDueDate || task.dueDate,
      departmentReviewStatus: resetReviewStatus ? 'Drafting' : (task.departmentReviewStatus || 'Drafting'),
      notes: task.notes ? `${task.notes}\n${handoverLog}` : handoverLog,
      lastUpdated: now
    };

    if (onUpdateWorkspace) {
      const updatedTasks = (workspace.tasks || []).map(t => (t.id === task.id ? updatedTask : t));
      const updatedWorkspace: OpportunityWorkspace = {
        ...workspace,
        tasks: updatedTasks,
        lastUpdated: now
      };
      onUpdateWorkspace(updatedWorkspace);
    }

    setReassignedSuccessFeedback({
      taskId: task.id,
      taskTitle: task.title,
      assignee: targetAssigneeName,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setTimeout(() => {
      setReassignedSuccessFeedback(null);
    }, 6000);

    setActiveReassignModalTask(null);
  };

  // Copy structured departmental review report to clipboard
  const handleCopyReviewSummary = () => {
    let summary = `📋 *GRANTFLOW DEPARTMENTAL TASK REVIEW SUMMARY*\n`;
    summary += `Proposal Lead: ${selectedLeadName}\n`;
    summary += `Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;
    summary += `*OVERVIEW METRICS*\n`;
    summary += `• Total Deliverables: ${stats.total}\n`;
    summary += `• Pending HoD Approval: ${stats.pendingHoD}\n`;
    summary += `• In Revision: ${stats.inRevision}\n`;
    summary += `• HoD Approved: ${stats.approved} (${stats.approvalRate}%)\n`;
    summary += `• Overdue / At Risk: ${stats.overdue}\n\n`;

    summary += `*DEPARTMENTAL BREAKDOWN*\n`;
    departmentBreakdown.forEach(d => {
      summary += `\n📁 *${d.departmentName}* (HoD: ${d.hodName})\n`;
      summary += `  - Approved: ${d.approvedCount}/${d.tasks.length}\n`;
      if (d.pendingHoDCount > 0) summary += `  - ⏳ Pending HoD Review: ${d.pendingHoDCount}\n`;
      if (d.revisionCount > 0) summary += `  - ⚠️ In Revision: ${d.revisionCount}\n`;
      if (d.overdueCount > 0) summary += `  - 🚨 Overdue: ${d.overdueCount}\n`;
    });

    if (pendingHodQueue.length > 0) {
      summary += `\n*SECTIONS AWAITING HOD APPROVAL (${pendingHodQueue.length})*\n`;
      pendingHodQueue.forEach((item, idx) => {
        summary += `${idx + 1}. [${item.departmentName}] ${item.task.title} (${item.workspace.title})\n`;
        summary += `   Officer: ${item.task.assignedTo} | Approver: ${item.hodName} | Due: ${item.task.dueDate}\n`;
      });
    }

    navigator.clipboard.writeText(summary).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 3000);
    });
  };

  return (
    <div id="departmental-task-review-interface" className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md space-y-4">
        {/* Success toast notification for reassignment */}
        {reassignedSuccessFeedback && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl flex items-center justify-between gap-3 text-xs text-emerald-200 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Task <strong>"{reassignedSuccessFeedback.taskTitle}"</strong> successfully reassigned to <strong>{reassignedSuccessFeedback.assignee}</strong> at {reassignedSuccessFeedback.timestamp}.
              </span>
            </div>
            <button
              onClick={() => setReassignedSuccessFeedback(null)}
              className="text-emerald-300 hover:text-white font-bold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-400" />
                Real-Time Cross-Departmental Matrix
              </span>
              <span className="text-xs text-slate-300">
                Tracking Multi-Unit Contributions & HoD Quality Sign-Offs
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-indigo-400" />
              Departmental Task Review
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Real-time oversight for Proposal Leads. Verify that Finance, Programmes, M&E, and Operations deliverables are reviewed and signed off by their respective Line Managers before final proposal synthesis.
            </p>
          </div>

          {/* Action buttons on top banner */}
          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0 flex-wrap">
            <button
              onClick={handleCopyReviewSummary}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center gap-1.5 shadow-2xs"
              title="Copy formatted status report for Slack or internal check-ins"
            >
              {copiedSummary ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied Summary!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                  <span>Copy Status Report</span>
                </>
              )}
            </button>

            {/* Proposal Scope Selector */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 px-3 py-1.5 rounded-xl">
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Scope:</span>
              <select
                value={selectedProposalId}
                onChange={e => setSelectedProposalId(e.target.value)}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  All Coordinated Grants ({relevantProposals.length})
                </option>
                {relevantProposals.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                    {p.title} ({p.donor})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Real-time KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-800/80 text-slate-100">
          <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Sections</span>
            <div className="text-xl font-extrabold text-white">{stats.total}</div>
            <span className="text-[10px] text-slate-400">Across {scopedProposals.length} proposal{scopedProposals.length !== 1 ? 's' : ''}</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'PENDING_HOD' ? 'ALL' : 'PENDING_HOD')}
            className={`rounded-xl p-3 space-y-0.5 transition cursor-pointer border ${
              statusFilter === 'PENDING_HOD' || stats.pendingHoD > 0
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 ring-1 ring-amber-400/40'
                : 'bg-slate-800/70 border-slate-700/60'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Pending HoD
            </span>
            <div className="text-xl font-extrabold text-amber-300 flex items-center justify-between">
              <span>{stats.pendingHoD}</span>
              {stats.pendingHoD > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                  Action
                </span>
              )}
            </div>
            <span className="text-[10px] text-amber-200/80">Awaiting supervisor</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'REVISION' ? 'ALL' : 'REVISION')}
            className={`rounded-xl p-3 space-y-0.5 transition cursor-pointer border ${
              statusFilter === 'REVISION' || stats.inRevision > 0
                ? 'bg-orange-500/20 border-orange-400/40 text-orange-200'
                : 'bg-slate-800/70 border-slate-700/60'
            }`}
          >
            <span className="text-[10px] font-bold text-orange-300 uppercase tracking-wider flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-orange-400" />
              In Revision
            </span>
            <div className="text-xl font-extrabold text-orange-300">{stats.inRevision}</div>
            <span className="text-[10px] text-orange-200/80">Feedback returned</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'DRAFTING' ? 'ALL' : 'DRAFTING')}
            className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 space-y-0.5 cursor-pointer hover:border-slate-500 transition"
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Drafting</span>
            <div className="text-xl font-extrabold text-white">{stats.drafting}</div>
            <span className="text-[10px] text-slate-400">Under officer prep</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
            className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 space-y-0.5 cursor-pointer hover:border-emerald-500 transition"
          >
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              HoD Approved
            </span>
            <div className="text-xl font-extrabold text-emerald-300">{stats.approved}</div>
            <span className="text-[10px] text-emerald-400/80">Ready for synthesis</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
            className={`rounded-xl p-3 space-y-0.5 transition cursor-pointer border ${
              stats.overdue > 0
                ? 'bg-rose-500/20 border-rose-400/40 text-rose-200 ring-1 ring-rose-400/40'
                : 'bg-slate-800/70 border-slate-700/60'
            }`}
          >
            <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              Overdue
            </span>
            <div className="text-xl font-extrabold text-rose-300">{stats.overdue}</div>
            <span className="text-[10px] text-rose-200/80">Deliverable delay</span>
          </div>
        </div>
      </div>

      {/* PENDING HOD APPROVALS QUEUE (High Priority Action Panel) */}
      {pendingHodQueue.length > 0 && (
        <div className="bg-amber-50/70 border-2 border-amber-300 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                <Clock className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                  Sections Pending HoD Quality Approval ({pendingHodQueue.length})
                </h4>
                <p className="text-xs text-amber-800">
                  These deliverables have been submitted by drafting officers and are awaiting Line Manager / Department Head sign-off.
                </p>
              </div>
            </div>

            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 border border-amber-300 self-start sm:self-center">
              Requires HoD Action
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingHodQueue.map(({ workspace, task, departmentName, hodName, urgency }) => {
              const daysRem = calculateDaysRemaining(workspace.deadline);
              const isUrgent = daysRem !== null && daysRem <= 7;
              const hasNudged = nudgedTaskIds[task.id];

              return (
                <div
                  key={task.id}
                  className="bg-white border border-amber-200 hover:border-amber-400 rounded-xl p-4 shadow-2xs transition space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {departmentName}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                          ⏳ Waiting for HoD
                        </span>
                        {isUrgent && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 text-rose-600" />
                            {daysRem}d to deadline
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-slate-900 text-sm">
                        {task.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Proposal: <strong className="text-slate-700">{workspace.title}</strong> ({workspace.donor})
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition shrink-0 flex items-center gap-1"
                    >
                      <span>Workspace</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Officer and Approver Line Info */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold uppercase block">Drafted By:</span>
                      <span className="font-bold text-slate-800">{task.assignedTo || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-700 font-semibold uppercase block">Awaiting HoD Sign-off:</span>
                      <span className="font-bold text-amber-950 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        {hodName}
                      </span>
                    </div>
                  </div>

                  {/* Submission draft preview if present */}
                  {task.submissionDraftText && (
                    <div className="p-2 rounded bg-amber-50/50 border border-amber-200 text-[11px] text-slate-700 line-clamp-2 italic">
                      "{task.submissionDraftText}"
                    </div>
                  )}

                  {/* Nudge & Action Toolbar */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <div className="text-[11px] text-slate-500">
                      Due: <strong className={urgency.isOverdue ? 'text-rose-600 font-bold' : 'text-slate-700'}>{formatDeadline(task.dueDate)}</strong>
                    </div>

                    {hasNudged ? (
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Reminder sent at {hasNudged.timestamp}
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenNudgeModal(workspace, task, hodName)}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-2xs"
                      >
                        <Send className="w-3 h-3" />
                        <span>Nudge {hodName}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DEPARTMENT READINESS SUMMARY MATRIX */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              Cross-Departmental Readiness Overview
            </h4>
            <p className="text-xs text-slate-500">
              Departmental progress and HoD sign-off velocity across active sections
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Overall Sign-Off Velocity: <strong className="text-indigo-600 font-bold">{stats.approvalRate}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {departmentBreakdown.map(dept => {
            const isFullyApproved = dept.tasks.length > 0 && dept.approvedCount === dept.tasks.length;
            const completionPct = dept.tasks.length > 0 ? Math.round((dept.approvedCount / dept.tasks.length) * 100) : 0;

            return (
              <div
                key={dept.departmentName}
                onClick={() => setSelectedDeptFilter(selectedDeptFilter === dept.departmentName ? 'ALL' : dept.departmentName)}
                className={`p-4 rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between gap-3 ${
                  selectedDeptFilter === dept.departmentName
                    ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-400 shadow-xs'
                    : isFullyApproved
                    ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                    : dept.pendingHoDCount > 0
                    ? 'bg-amber-50/40 border-amber-200 hover:border-amber-300'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 text-sm">{dept.departmentName}</span>
                    {dept.tasks.length === 0 ? (
                      <span className="text-[10px] font-semibold text-slate-400">
                        0 Tasks Assigned
                      </span>
                    ) : isFullyApproved ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 flex items-center gap-0.5">
                        <Check className="w-3 h-3 text-emerald-600" />
                        100% HoD Signed
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-600">
                        {dept.approvedCount}/{dept.tasks.length} Signed
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-500" />
                    <span>HoD: <strong>{dept.hodName}</strong></span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isFullyApproved ? 'bg-emerald-500' : completionPct >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>

                {/* Sub-status counters */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/60 flex-wrap gap-1">
                  {dept.pendingHoDCount > 0 ? (
                    <span className="text-amber-800 font-bold bg-amber-100/80 px-1.5 py-0.5 rounded">
                      ⏳ {dept.pendingHoDCount} in HoD review
                    </span>
                  ) : dept.revisionCount > 0 ? (
                    <span className="text-orange-800 font-bold bg-orange-100/80 px-1.5 py-0.5 rounded">
                      ⚠️ {dept.revisionCount} in revision
                    </span>
                  ) : dept.draftingCount > 0 ? (
                    <span className="text-slate-600 font-medium">
                      📝 {dept.draftingCount} drafting
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">
                      ✓ All cleared
                    </span>
                  )}

                  {dept.overdueCount > 0 && (
                    <span className="text-rose-700 font-bold">
                      {dept.overdueCount} overdue
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SEARCH AND FILTER TOOLBAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          {/* Keyword Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search section, deliverable, staff officer, or HoD..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Department Filter Dropdown */}
          <select
            value={selectedDeptFilter}
            onChange={e => setSelectedDeptFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Departments ({departmentBreakdown.length})</option>
            {departmentBreakdown.map(d => (
              <option key={d.departmentName} value={d.departmentName}>
                {d.departmentName} ({d.tasks.length})
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 shrink-0">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-slate-50 border border-slate-200'
            }`}
          >
            All ({allDepartmentTasks.length})
          </button>

          <button
            onClick={() => setStatusFilter('PENDING_HOD')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
              statusFilter === 'PENDING_HOD'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <span>⏳ Pending HoD</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900 font-bold">
              {stats.pendingHoD}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('REVISION')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
              statusFilter === 'REVISION'
                ? 'bg-orange-600 text-white font-bold'
                : 'text-orange-800 bg-orange-50 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            <span>⚠️ In Revision</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-orange-200 text-orange-900 font-bold">
              {stats.inRevision}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            ✓ Approved ({stats.approved})
          </button>

          <button
            onClick={() => setStatusFilter('OVERDUE')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              statusFilter === 'OVERDUE'
                ? 'bg-rose-600 text-white font-bold'
                : 'text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Overdue ({stats.overdue})
          </button>
        </div>
      </div>

      {/* SECTION & DELIVERABLE CARDS LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
          <span>Active Department Deliverables ({filteredTasks.length})</span>
          <span>Showing real-time supervisory status</span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-white border border-dashed border-slate-200 rounded-xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <h5 className="text-sm font-bold text-slate-800">No Deliverables Found</h5>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No tasks match your current combination of department, proposal, and review status filters.
            </p>
            <button
              onClick={() => {
                setSelectedDeptFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-indigo-600 font-bold hover:underline mt-1"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredTasks.map(({ workspace, task, departmentName, hodName, isPendingHoD, isRevision, isApproved, urgency }) => {
              const hasNudged = nudgedTaskIds[task.id];

              return (
                <div
                  key={task.id}
                  className={`p-4 bg-white border rounded-xl shadow-2xs transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isPendingHoD
                      ? 'border-amber-300 hover:border-amber-400 bg-amber-50/20'
                      : isRevision
                      ? 'border-orange-300 hover:border-orange-400 bg-orange-50/20'
                      : urgency.isOverdue && !isApproved
                      ? 'border-rose-300 hover:border-rose-400 bg-rose-50/20'
                      : isApproved
                      ? 'border-slate-200 hover:border-emerald-300'
                      : 'border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  {/* Left Column: Title, Section & Proposal */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {departmentName}
                      </span>

                      {/* Status Badges */}
                      {isPendingHoD && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          Pending HoD Quality Approval
                        </span>
                      )}
                      {isRevision && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-orange-600" />
                          Returned for Revision by Line Manager
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          HoD Sign-off Approved
                        </span>
                      )}
                      {!isPendingHoD && !isRevision && !isApproved && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          Drafting In Progress
                        </span>
                      )}

                      {urgency.isOverdue && !isApproved && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Overdue
                        </span>
                      )}
                    </div>

                    <div className="font-bold text-slate-900 text-sm">
                      {task.title}
                    </div>

                    <div className="text-slate-500 text-xs flex items-center gap-2 flex-wrap">
                      <span>Proposal: <strong className="text-slate-700">{workspace.title}</strong></span>
                      <span>•</span>
                      <span>Donor: {workspace.donor}</span>
                      <span>•</span>
                      <span className={urgency.isOverdue && !isApproved ? 'text-rose-600 font-bold' : ''}>
                        Target Due: {formatDeadline(task.dueDate)}
                      </span>
                    </div>

                    {/* Review Note / Supervisor Feedback snippet */}
                    {task.reviewNote && (
                      <div className="mt-1 p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                        <strong>Line Manager Note ({hodName}):</strong> {task.reviewNote}
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Officer & Line Manager */}
                  <div className="flex items-center gap-4 text-xs shrink-0 self-start md:self-center border-t md:border-t-0 md:border-l md:border-r border-slate-100 pt-2 md:pt-0 md:px-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Drafted By</span>
                      <span className="font-bold text-slate-800">{task.assignedTo || 'Unassigned'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">Supervisor (HoD)</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        {hodName}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center flex-wrap">
                    {isPendingHoD && !hasNudged && (
                      <button
                        onClick={() => handleOpenNudgeModal(workspace, task, hodName)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-2xs"
                        title={`Send prompt to ${hodName} to accelerate sign-off`}
                      >
                        <Send className="w-3 h-3" />
                        <span>Nudge HoD</span>
                      </button>
                    )}

                    {hasNudged && (
                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        ✓ Nudged
                      </span>
                    )}

                    <button
                      onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg border border-indigo-200 transition flex items-center gap-1"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nudge / Reminder Modal */}
      {activeNudgeModalTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Send className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Send Follow-up to {activeNudgeModalTask.hodName}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Requesting Department Head sign-off for proposal deliverable
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveNudgeModalTask(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong>Deliverable:</strong> {activeNudgeModalTask.task.title}</div>
              <div><strong>Proposal:</strong> {activeNudgeModalTask.workspace.title}</div>
              <div><strong>Assigned Officer:</strong> {activeNudgeModalTask.task.assignedTo}</div>
              <div><strong>Target Deadline:</strong> {formatDeadline(activeNudgeModalTask.task.dueDate)}</div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">
                Message / Reminder Note:
              </label>
              <textarea
                value={customNudgeMessage}
                onChange={e => setCustomNudgeMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setActiveNudgeModalTask(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendNudge}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Reminder</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
