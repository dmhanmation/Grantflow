import {
  OpportunityWorkspace,
  StaffMember,
  WorkspaceTask,
  BlockerReason,
  TaskStatus,
  OrgDepartment,
  OrgProfile,
  DepartmentReviewStatus
} from '../types';
import { calculateDaysRemaining, getDaysDifference } from './dateUtils';
import { sortStaffByHierarchy } from './staffHierarchy';

export interface TaskBottleneckInfo {
  task: WorkspaceTask;
  assignedStaff: string;
  assignedStaffId?: string;
  department: string;
  departmentId?: string;
  departmentHeadName?: string;
  departmentHeadId?: string;
  isOverdue: boolean;
  daysOverdue: number;
  isBlocked: boolean;
  blockerReason?: BlockerReason;
  blockerNotes?: string;
  reviewStatus?: DepartmentReviewStatus;
  reviewNote?: string;
}

export interface ProposalBottleneckDiagnosis {
  status: 'ON TRACK' | 'AT RISK' | 'OVERDUE' | 'BLOCKED' | 'COMPLETED';
  statusBadgeClass: string;
  headline: string;
  detailedDiagnosis: string;
  bottlenecks: TaskBottleneckInfo[];
  primaryBottleneckStaff?: string;
  primaryBottleneckDept?: string;
  primaryBottleneckDeptHead?: string;
  escalationLevel?: 'None' | 'Task Owner' | 'Department Head' | 'Proposal Lead' | 'Programme Manager' | 'Executive Director';
  escalationRecipients: string[];
  requiresImmediateIntervention: boolean;
  departmentBreakdown: Array<{
    departmentName: string;
    departmentHeadName?: string;
    totalTasks: number;
    completedTasks: number;
    pendingReviewTasks: number;
    returnedTasks: number;
    overdueTasks: number;
    blockedTasks: number;
    status: 'COMPLETED' | 'ON TRACK' | 'PENDING REVIEW' | 'OVERDUE' | 'BLOCKED';
  }>;
}

export const DEFAULT_HIGH_WORKLOAD_THRESHOLD = 4;

export interface StaffAccountabilityRecord {
  staff: StaffMember;
  departmentName: string;
  departmentHeadName: string;
  isDepartmentHead: boolean;
  activeProposalsCount: number;
  leadProposalsCount: number;
  totalTasks: number;
  completedTasks: number;
  completedOnTime: number;
  dueThisWeek: number;
  overdueTasks: number;
  blockedTasks: number;
  pendingReviewCount: number; // For HoD review or awaiting their approval
  returnedForRevisionCount: number;
  incompleteTasksCount: number;
  isHighWorkload: boolean;
  workloadThreshold: number;
  status: 'ON TRACK' | 'AT RISK' | 'OVERDUE' | 'BLOCKED';
  statusBadgeClass: string;
  assignedWorkspaces: Array<{
    workspaceId: string;
    workspaceTitle: string;
    donor: string;
    stage: string;
    isProposalLead: boolean;
    isReviewer: boolean;
    isApprover: boolean;
    tasks: WorkspaceTask[];
  }>;
}

export interface DepartmentAccountabilitySummary {
  department: OrgDepartment;
  staffMembers: StaffMember[];
  headStaff?: StaffMember;
  totalAssignedTasks: number;
  completedTasks: number;
  pendingReviewTasks: number;
  returnedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  activeProposalsInvolved: number;
  status: 'ON TRACK' | 'ACTION REQUIRED' | 'OVERDUE' | 'BLOCKED';
  statusBadgeClass: string;
}

/**
 * Resolves staff department and line manager from staff directory and departments
 */
export function getStaffDetails(
  staffNameOrId: string,
  staffDirectory: StaffMember[] = [],
  departments: OrgDepartment[] = []
): {
  member?: StaffMember;
  department: string;
  departmentId?: string;
  departmentHeadName: string;
  departmentHeadId?: string;
  lineManager: string;
  isActive: boolean;
} {
  if (!staffNameOrId) {
    return {
      department: 'Grants / Resource Mobilisation',
      departmentHeadName: 'Sarah Okafor (Head of Programmes)',
      lineManager: 'Sarah Okafor (Head of Programmes)',
      isActive: true
    };
  }

  const clean = staffNameOrId.toLowerCase().trim();
  const found = staffDirectory.find(
    s => s.id.toLowerCase() === clean || s.fullName.toLowerCase() === clean || clean.includes(s.fullName.toLowerCase())
  );

  if (found) {
    // Find department head
    let deptHead = found.lineManagerName || 'Executive Director';
    let deptHeadId = found.lineManagerId;

    if (found.departmentId && departments.length > 0) {
      const dept = departments.find(d => d.id === found.departmentId || d.name.toLowerCase() === found.department.toLowerCase());
      if (dept) {
        deptHead = dept.headStaffName;
        deptHeadId = dept.headStaffId;
      }
    }

    return {
      member: found,
      department: found.department,
      departmentId: found.departmentId,
      departmentHeadName: deptHead,
      departmentHeadId: deptHeadId,
      lineManager: found.lineManagerName || deptHead,
      isActive: found.status === 'Active'
    };
  }

  return {
    department: 'General Operations',
    departmentHeadName: 'Department Head',
    lineManager: 'Executive Management',
    isActive: true
  };
}

/**
 * Evaluates dynamically if a task is overdue, blocked, or in progress
 */
export function computeTaskEffectiveStatus(task: WorkspaceTask): TaskStatus {
  if (task.completed) return 'Complete';
  if (task.status === 'Blocked') return 'Blocked';

  const diff = getDaysDifference(task.dueDate);
  if (diff !== null && diff < 0) {
    return 'Overdue';
  }
  if (task.status) return task.status;
  return 'In Progress';
}

/**
 * Distinguishes proposal lead responsibility from individual department bottlenecks.
 * Correctly attributes responsibility to the contributing Officer and their Department Head / Line Manager.
 */
export function getProposalBottleneck(
  workspace: OpportunityWorkspace,
  staffDirectory: StaffMember[] = [],
  departments: OrgDepartment[] = []
): ProposalBottleneckDiagnosis {
  const isArchived =
    workspace.stage === 'Awarded' ||
    workspace.stage === 'Rejected' ||
    workspace.stage === 'Submitted' ||
    workspace.stage === 'Awaiting Decision';

  if (isArchived) {
    return {
      status: 'COMPLETED',
      statusBadgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      headline: `Opportunity is currently in ${workspace.stage} stage.`,
      detailedDiagnosis: workspace.submissionRecord?.submittedAt
        ? `Submitted by ${workspace.submissionRecord.recordedBy} on ${new Date(workspace.submissionRecord.submittedAt).toLocaleDateString()}.`
        : `Proposal cycle completed or awaiting donor response.`,
      bottlenecks: [],
      escalationRecipients: [],
      requiresImmediateIntervention: false,
      departmentBreakdown: []
    };
  }

  const daysRemaining = calculateDaysRemaining(workspace.deadline);
  const tasks = workspace.tasks || [];
  const mandatoryDocs = workspace.documentsChecklist?.filter(d => d.mandatory) || [];
  const missingDocs = mandatoryDocs.filter(d => d.status === 'Missing' || d.status === 'Drafting');

  const bottlenecks: TaskBottleneckInfo[] = [];

  tasks.forEach(t => {
    if (t.completed) return;
    const effStatus = computeTaskEffectiveStatus(t);
    const diff = getDaysDifference(t.dueDate);
    const isOverdue = diff !== null && diff < 0;
    const daysOverdue = isOverdue ? Math.abs(diff!) : 0;
    const isBlocked = effStatus === 'Blocked' || Boolean(t.blockerReason);
    const isReturned = t.departmentReviewStatus === 'Returned for Revision';

    if (isOverdue || isBlocked || isReturned) {
      const details = getStaffDetails(t.assignedTo, staffDirectory, departments);
      bottlenecks.push({
        task: t,
        assignedStaff: t.assignedTo,
        assignedStaffId: t.assignedStaffId || details.member?.id,
        department: t.departmentName || details.department,
        departmentId: t.departmentId || details.departmentId,
        departmentHeadName: t.departmentHeadName || details.departmentHeadName,
        departmentHeadId: t.departmentHeadId || details.departmentHeadId,
        isOverdue,
        daysOverdue,
        isBlocked,
        blockerReason: t.blockerReason,
        blockerNotes: t.blockerNotes,
        reviewStatus: t.departmentReviewStatus,
        reviewNote: t.reviewNote
      });
    }
  });

  // Calculate Department Breakdown
  const deptMap = new Map<string, {
    departmentName: string;
    departmentHeadName?: string;
    totalTasks: number;
    completedTasks: number;
    pendingReviewTasks: number;
    returnedTasks: number;
    overdueTasks: number;
    blockedTasks: number;
  }>();

  tasks.forEach(t => {
    const details = getStaffDetails(t.assignedTo, staffDirectory, departments);
    const dName = t.departmentName || details.department || 'General';
    const existing = deptMap.get(dName) || {
      departmentName: dName,
      departmentHeadName: t.departmentHeadName || details.departmentHeadName,
      totalTasks: 0,
      completedTasks: 0,
      pendingReviewTasks: 0,
      returnedTasks: 0,
      overdueTasks: 0,
      blockedTasks: 0
    };

    existing.totalTasks++;
    if (t.completed) {
      existing.completedTasks++;
    } else {
      const eff = computeTaskEffectiveStatus(t);
      const diff = getDaysDifference(t.dueDate);
      if (t.departmentReviewStatus === 'Submitted to Department Head') {
        existing.pendingReviewTasks++;
      } else if (t.departmentReviewStatus === 'Returned for Revision') {
        existing.returnedTasks++;
      }
      if (eff === 'Blocked' || t.blockerReason) {
        existing.blockedTasks++;
      } else if (eff === 'Overdue' || (diff !== null && diff < 0)) {
        existing.overdueTasks++;
      }
    }
    deptMap.set(dName, existing);
  });

  const departmentBreakdown = Array.from(deptMap.values()).map(d => {
    let status: 'COMPLETED' | 'ON TRACK' | 'PENDING REVIEW' | 'OVERDUE' | 'BLOCKED' = 'ON TRACK';
    if (d.overdueTasks > 0) status = 'OVERDUE';
    else if (d.blockedTasks > 0) status = 'BLOCKED';
    else if (d.returnedTasks > 0) status = 'BLOCKED';
    else if (d.pendingReviewTasks > 0) status = 'PENDING REVIEW';
    else if (d.completedTasks === d.totalTasks && d.totalTasks > 0) status = 'COMPLETED';

    return {
      ...d,
      status
    };
  });

  const leadName = workspace.proposalLead || workspace.leadStaff || 'Proposal Lead';
  const reviewerName = workspace.intermediateReviewer || workspace.reviewer || 'Sarah Okafor (Head of Programmes)';
  const approverName = workspace.finalApprover || 'Chinedu Adeyemi (Executive Director)';

  // Case 1: Critical near-deadline proposal with overdue or blocked items (<= 3 days)
  if (daysRemaining !== null && daysRemaining <= 3 && (bottlenecks.length > 0 || missingDocs.length > 0)) {
    const overdueList = bottlenecks.filter(b => b.isOverdue);
    const blockedList = bottlenecks.filter(b => b.isBlocked);

    let bottleneckDesc = '';
    const primary = bottlenecks[0];
    if (overdueList.length > 0) {
      const b = overdueList[0];
      bottleneckDesc = `"${b.task.title}" assigned to ${b.assignedStaff} (${b.department}) is ${b.daysOverdue}d overdue`;
    } else if (blockedList.length > 0) {
      const b = blockedList[0];
      bottleneckDesc = `"${b.task.title}" assigned to ${b.assignedStaff} is BLOCKED (${b.blockerReason || 'External Dependency'})`;
    } else {
      bottleneckDesc = `${missingDocs.length} mandatory documentation item(s) incomplete`;
    }

    return {
      status: 'AT RISK',
      statusBadgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
      headline: `Urgent Escalation: ${bottleneckDesc} with ${daysRemaining} day(s) until submission deadline.`,
      detailedDiagnosis: `Proposal is at critical risk due to unresolved contribution in the ${primary?.department || 'Documentation'} Department (Lead: ${primary?.departmentHeadName || 'Line Manager'}). Proposal Lead (${leadName}), Department Head (${primary?.departmentHeadName || 'HoD'}), and Executive Director (${approverName}) must intervene immediately.`,
      bottlenecks,
      primaryBottleneckStaff: primary?.assignedStaff,
      primaryBottleneckDept: primary?.department,
      primaryBottleneckDeptHead: primary?.departmentHeadName,
      escalationLevel: 'Executive Director',
      escalationRecipients: [
        primary?.assignedStaff || 'Staff Member',
        primary?.departmentHeadName || 'Department Head',
        leadName,
        reviewerName,
        approverName
      ].filter(Boolean),
      requiresImmediateIntervention: true,
      departmentBreakdown
    };
  }

  // Case 2: Overdue Tasks exist
  const overdueTasks = bottlenecks.filter(b => b.isOverdue);
  if (overdueTasks.length > 0) {
    const primary = overdueTasks[0];
    const isLeadTask = primary.assignedStaff.toLowerCase().includes(leadName.toLowerCase());

    const headline = isLeadTask
      ? `Proposal at risk — "${primary.task.title}" assigned to Proposal Lead (${primary.assignedStaff}) is ${primary.daysOverdue} day(s) overdue.`
      : `Proposal at risk — "${primary.task.title}" assigned to ${primary.assignedStaff} (${primary.department}) is ${primary.daysOverdue} day(s) overdue.`;

    // Escalation tier: Department Head is alerted first!
    const isApproaching = daysRemaining !== null && daysRemaining <= 7;
    const escalationLevel = isApproaching ? 'Programme Manager' : 'Department Head';

    return {
      status: 'OVERDUE',
      statusBadgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-semibold',
      headline,
      detailedDiagnosis: `The bottleneck is in the ${primary.department} Department under line manager ${primary.departmentHeadName || 'Department Head'}. Staff member ${primary.assignedStaff} is accountable for completing "${primary.task.title}". Proposal Lead ${leadName} coordinates the overall package.`,
      bottlenecks,
      primaryBottleneckStaff: primary.assignedStaff,
      primaryBottleneckDept: primary.department,
      primaryBottleneckDeptHead: primary.departmentHeadName,
      escalationLevel,
      escalationRecipients: [
        primary.assignedStaff,
        primary.departmentHeadName || 'Department Head',
        leadName
      ].filter(Boolean),
      requiresImmediateIntervention: isApproaching,
      departmentBreakdown
    };
  }

  // Case 3: Blocked Tasks or Returned for Revision
  const blockedTasks = bottlenecks.filter(b => b.isBlocked || b.reviewStatus === 'Returned for Revision');
  if (blockedTasks.length > 0) {
    const primary = blockedTasks[0];
    const isReturned = primary.reviewStatus === 'Returned for Revision';
    const reasonText = isReturned
      ? ` [Returned by ${primary.departmentHeadName || 'Department Head'}: "${primary.reviewNote || 'Revisions required'}"]`
      : primary.blockerReason
      ? ` [${primary.blockerReason}]`
      : '';
    const notesText = primary.blockerNotes ? `: "${primary.blockerNotes}"` : '';

    return {
      status: 'BLOCKED',
      statusBadgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold',
      headline: isReturned
        ? `Revision Required — "${primary.task.title}" returned by ${primary.departmentHeadName || 'Department Head'}${reasonText}`
        : `Task Blocked — "${primary.task.title}" assigned to ${primary.assignedStaff} (${primary.department})${reasonText}${notesText}`,
      detailedDiagnosis: isReturned
        ? `Department Head ${primary.departmentHeadName || 'Line Manager'} requested revisions from ${primary.assignedStaff}. Once revised, ${primary.assignedStaff} must resubmit for department approval.`
        : `Task owner ${primary.assignedStaff} in ${primary.department} has flagged an active blocker (${primary.blockerReason || 'Dependency'}). Line manager ${primary.departmentHeadName || 'HoD'} support required to unblock.`,
      bottlenecks,
      primaryBottleneckStaff: primary.assignedStaff,
      primaryBottleneckDept: primary.department,
      primaryBottleneckDeptHead: primary.departmentHeadName,
      escalationLevel: 'Department Head',
      escalationRecipients: [primary.assignedStaff, primary.departmentHeadName || 'Department Head', leadName].filter(Boolean),
      requiresImmediateIntervention: true,
      departmentBreakdown
    };
  }

  // Case 4: No Overdue or Blocked tasks, on track
  const incompleteCount = tasks.filter(t => !t.completed).length;
  const pendingHodCount = tasks.filter(t => t.departmentReviewStatus === 'Submitted to Department Head').length;

  return {
    status: 'ON TRACK',
    statusBadgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold',
    headline: pendingHodCount > 0
      ? `Proposal is progressing smoothly (${pendingHodCount} item(s) awaiting Department Head review).`
      : `Proposal is ON TRACK under Proposal Lead ${leadName}.`,
    detailedDiagnosis: `All ${tasks.length - incompleteCount}/${tasks.length} tasks across ${departmentBreakdown.length} departments are progressing within scheduled timelines (${daysRemaining !== null ? `${daysRemaining} days remaining` : 'no deadline'}).`,
    bottlenecks: [],
    escalationLevel: 'None',
    escalationRecipients: [],
    requiresImmediateIntervention: false,
    departmentBreakdown
  };
}

/**
 * Summarizes workload and accountability for all staff members
 */
export function getStaffAccountabilitySummary(
  staffDirectory: StaffMember[],
  opportunities: OpportunityWorkspace[],
  departments: OrgDepartment[] = [],
  workloadThreshold: number = DEFAULT_HIGH_WORKLOAD_THRESHOLD
): StaffAccountabilityRecord[] {
  const activeOpportunities = opportunities.filter(
    o => o.stage !== 'Awarded' && o.stage !== 'Rejected'
  );

  return sortStaffByHierarchy(staffDirectory).map(staff => {
    const assignedWorkspaces: StaffAccountabilityRecord['assignedWorkspaces'] = [];
    let totalTasks = 0;
    let completedTasks = 0;
    let completedOnTime = 0;
    let dueThisWeek = 0;
    let overdueTasks = 0;
    let blockedTasks = 0;
    let pendingReviewCount = 0;
    let returnedForRevisionCount = 0;
    let leadProposalsCount = 0;

    const details = getStaffDetails(staff.id, staffDirectory, departments);

    activeOpportunities.forEach(opp => {
      const isLead =
        (opp.proposalLead && opp.proposalLead.toLowerCase().includes(staff.fullName.toLowerCase())) ||
        (opp.leadStaff && opp.leadStaff.toLowerCase().includes(staff.fullName.toLowerCase()));
      const isReviewer = Boolean(
        (opp.reviewer && opp.reviewer.toLowerCase().includes(staff.fullName.toLowerCase())) ||
        (opp.intermediateReviewer && opp.intermediateReviewer.toLowerCase().includes(staff.fullName.toLowerCase()))
      );
      const isApprover = Boolean(
        opp.finalApprover && opp.finalApprover.toLowerCase().includes(staff.fullName.toLowerCase())
      );

      if (isLead) {
        leadProposalsCount++;
      }

      // Filter tasks assigned to this staff member
      const memberTasks = (opp.tasks || []).filter(t => {
        if (!t.assignedTo) return false;
        const cleanAssignee = t.assignedTo.toLowerCase();
        const cleanName = staff.fullName.toLowerCase();
        return cleanAssignee.includes(cleanName) || (t.assignedStaffId && t.assignedStaffId === staff.id);
      });

      // Also if this staff is a Department Head, check if they have items awaiting their review in this proposal
      const hodPendingTasks = staff.isDepartmentHead
        ? (opp.tasks || []).filter(t => {
            const isHeadForTask =
              (t.departmentHeadId && t.departmentHeadId === staff.id) ||
              (t.departmentHeadName && t.departmentHeadName.toLowerCase().includes(staff.fullName.toLowerCase()));
            return isHeadForTask && t.departmentReviewStatus === 'Submitted to Department Head';
          })
        : [];

      if (isLead || isReviewer || isApprover || memberTasks.length > 0 || hodPendingTasks.length > 0) {
        assignedWorkspaces.push({
          workspaceId: opp.id,
          workspaceTitle: opp.title,
          donor: opp.donor,
          stage: opp.stage,
          isProposalLead: isLead,
          isReviewer,
          isApprover,
          tasks: memberTasks
        });
      }

      // HoD pending reviews count
      if (staff.isDepartmentHead) {
        pendingReviewCount += hodPendingTasks.length;
      }

      memberTasks.forEach(task => {
        totalTasks++;
        if (task.completed) {
          completedTasks++;
          if (task.completedOnTime !== false) {
            completedOnTime++;
          }
        } else {
          const effStatus = computeTaskEffectiveStatus(task);
          const diff = getDaysDifference(task.dueDate);

          if (task.departmentReviewStatus === 'Returned for Revision') {
            returnedForRevisionCount++;
          }

          if (effStatus === 'Blocked' || task.blockerReason) {
            blockedTasks++;
          } else if (effStatus === 'Overdue' || (diff !== null && diff < 0)) {
            overdueTasks++;
          } else if (diff !== null && diff >= 0 && diff <= 7) {
            dueThisWeek++;
          }
        }
      });
    });

    const isHighWorkload = totalTasks >= workloadThreshold;
    const incompleteTasksCount = totalTasks - completedTasks;

    // Determine status
    let status: StaffAccountabilityRecord['status'] = 'ON TRACK';
    let statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

    if (overdueTasks > 0) {
      status = 'OVERDUE';
      statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    } else if (blockedTasks > 0 || returnedForRevisionCount > 0) {
      status = 'BLOCKED';
      statusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    } else if (dueThisWeek > 3 || (staff.isDepartmentHead && pendingReviewCount > 2)) {
      status = 'AT RISK';
      statusBadgeClass = 'bg-orange-50 text-orange-800 border-orange-200';
    }

    return {
      staff,
      departmentName: staff.department || details.department,
      departmentHeadName: details.departmentHeadName,
      isDepartmentHead: Boolean(staff.isDepartmentHead),
      activeProposalsCount: assignedWorkspaces.length,
      leadProposalsCount,
      totalTasks,
      completedTasks,
      completedOnTime,
      dueThisWeek,
      overdueTasks,
      blockedTasks,
      pendingReviewCount,
      returnedForRevisionCount,
      incompleteTasksCount,
      isHighWorkload,
      workloadThreshold,
      status,
      statusBadgeClass,
      assignedWorkspaces
    };
  });
}

/**
 * Summarizes department-level accountability across all active proposals
 */
export function getDepartmentAccountabilitySummary(
  departments: OrgDepartment[],
  staffDirectory: StaffMember[],
  opportunities: OpportunityWorkspace[]
): DepartmentAccountabilitySummary[] {
  const activeOpportunities = opportunities.filter(
    o => o.stage !== 'Awarded' && o.stage !== 'Rejected'
  );

  return departments.map(dept => {
    const deptStaff = staffDirectory.filter(
      s => s.departmentId === dept.id || s.department.toLowerCase() === dept.name.toLowerCase()
    );
    const headStaff = staffDirectory.find(s => s.id === dept.headStaffId);

    let totalAssignedTasks = 0;
    let completedTasks = 0;
    let pendingReviewTasks = 0;
    let returnedTasks = 0;
    let overdueTasks = 0;
    let blockedTasks = 0;
    const involvedWorkspaceIds = new Set<string>();

    activeOpportunities.forEach(opp => {
      let deptInvolvedInOpp = false;

      (opp.tasks || []).forEach(task => {
        const matchesDept =
          task.departmentId === dept.id ||
          (task.departmentName && task.departmentName.toLowerCase() === dept.name.toLowerCase()) ||
          deptStaff.some(s => s.fullName.toLowerCase() === task.assignedTo.toLowerCase() || s.id === task.assignedStaffId);

        if (matchesDept) {
          deptInvolvedInOpp = true;
          totalAssignedTasks++;
          if (task.completed) {
            completedTasks++;
          } else {
            const effStatus = computeTaskEffectiveStatus(task);
            const diff = getDaysDifference(task.dueDate);

            if (task.departmentReviewStatus === 'Submitted to Department Head') {
              pendingReviewTasks++;
            } else if (task.departmentReviewStatus === 'Returned for Revision') {
              returnedTasks++;
            }

            if (effStatus === 'Blocked' || task.blockerReason) {
              blockedTasks++;
            } else if (effStatus === 'Overdue' || (diff !== null && diff < 0)) {
              overdueTasks++;
            }
          }
        }
      });

      if (deptInvolvedInOpp) {
        involvedWorkspaceIds.add(opp.id);
      }
    });

    let status: DepartmentAccountabilitySummary['status'] = 'ON TRACK';
    let statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';

    if (overdueTasks > 0) {
      status = 'OVERDUE';
      statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
    } else if (blockedTasks > 0 || returnedTasks > 0) {
      status = 'BLOCKED';
      statusBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
    } else if (pendingReviewTasks > 0) {
      status = 'ACTION REQUIRED';
      statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
    }

    return {
      department: dept,
      staffMembers: deptStaff,
      headStaff,
      totalAssignedTasks,
      completedTasks,
      pendingReviewTasks,
      returnedTasks,
      overdueTasks,
      blockedTasks,
      activeProposalsInvolved: involvedWorkspaceIds.size,
      status,
      statusBadgeClass
    };
  });
}
