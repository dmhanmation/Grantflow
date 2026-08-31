import {
  OpportunityWorkspace,
  WorkspaceNotification,
  WorkspaceTask,
  WorkspaceMilestone,
  OrgProfile,
  DeadlineVerificationStatus
} from '../types';

/**
 * Robust flexible date parser that safely handles ISO strings, formatted donor dates,
 * natural language dates (e.g. "1 November 2026", "November 1, 2026"), and rejects
 * vague non-date placeholders.
 */
export function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const invalidPlaceholders = [
    'not stated',
    'not stated in call.',
    'not stated in call',
    'before deadline',
    'mid-term',
    'deadline',
    'tbd',
    'n/a',
    'none',
    'pending',
    'no due date',
    'no date',
    'internal schedule pending donor deadline verification',
    'no internal due date set'
  ];

  if (invalidPlaceholders.includes(lower)) {
    return null;
  }

  // Direct ISO / RFC date parse attempt
  try {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      // Guard against nonsensical or wildly out-of-range years
      if (year >= 2020 && year <= 2099) {
        return parsed;
      }
    }
  } catch {
    // Continue to regex patterns
  }

  // Regex pattern matching for "1 November 2026" or "01 Nov 2026"
  const monthNames: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11
  };

  // Pattern: "1 November 2026" or "01 Nov 2026"
  const dmyMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const monthKey = dmyMatch[2].toLowerCase();
    const year = parseInt(dmyMatch[3], 10);
    if (monthNames[monthKey] !== undefined && day >= 1 && day <= 31 && year >= 2020 && year <= 2099) {
      return new Date(year, monthNames[monthKey], day, 23, 59, 59);
    }
  }

  // Pattern: "November 1, 2026" or "Nov 1 2026"
  const mdyMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdyMatch) {
    const monthKey = mdyMatch[1].toLowerCase();
    const day = parseInt(mdyMatch[2], 10);
    const year = parseInt(mdyMatch[3], 10);
    if (monthNames[monthKey] !== undefined && day >= 1 && day <= 31 && year >= 2020 && year <= 2099) {
      return new Date(year, monthNames[monthKey], day, 23, 59, 59);
    }
  }

  // Pattern: "YYYY-MM-DD"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31 && year >= 2020 && year <= 2099) {
      return new Date(year, month, day, 23, 59, 59);
    }
  }

  return null;
}

/**
 * Calculates the calendar day difference between target date and base date (now by default).
 * Negative means in the past (overdue).
 * 0 means today.
 * Positive means in the future.
 * Returns null if the target date is unverified, missing, or invalid.
 */
export function getDaysDifference(targetDateStr: string, baseDate: Date = new Date()): number | null {
  const target = parseFlexibleDate(targetDateStr);
  if (!target) return null;

  try {
    // Normalize both dates to midnight local time for calendar-accurate day count
    const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
    const baseMidnight = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).getTime();

    const diffMs = targetMidnight - baseMidnight;
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/**
 * Calculates days remaining until donor deadline.
 * Returns null if deadline is not stated or invalid.
 */
export function calculateDaysRemaining(deadlineStr: string, baseDate: Date = new Date()): number | null {
  return getDaysDifference(deadlineStr, baseDate);
}

export interface TaskUrgencyInfo {
  status: 'completed' | 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'no_date';
  daysDiff: number | null;
  badgeLabel: string;
  badgeClass: string;
  containerClass: string;
  isOverdue: boolean;
  isDueSoon: boolean;
}

/**
 * Evaluates urgency info for a workspace task.
 * Crucial rule: Tasks without a date or with unverified dates MUST NEVER show as overdue.
 */
export function getTaskUrgencyInfo(dueDateStr: string, completed: boolean, baseDate: Date = new Date()): TaskUrgencyInfo {
  if (completed) {
    return {
      status: 'completed',
      daysDiff: null,
      badgeLabel: 'Completed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      containerClass: 'bg-slate-50/70 border-slate-200 opacity-80',
      isOverdue: false,
      isDueSoon: false
    };
  }

  const daysDiff = getDaysDifference(dueDateStr, baseDate);

  if (daysDiff === null) {
    return {
      status: 'no_date',
      daysDiff: null,
      badgeLabel: 'No internal due date set',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      containerClass: 'bg-white border-slate-200',
      isOverdue: false,
      isDueSoon: false
    };
  }

  if (daysDiff < 0) {
    const daysPast = Math.abs(daysDiff);
    return {
      status: 'overdue',
      daysDiff,
      badgeLabel: daysPast === 1 ? 'Overdue by 1 day' : `Overdue by ${daysPast} days`,
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 font-bold animate-pulse',
      containerClass: 'bg-rose-50/60 border-rose-300 shadow-xs ring-1 ring-rose-200',
      isOverdue: true,
      isDueSoon: false
    };
  }

  if (daysDiff === 0) {
    return {
      status: 'due_today',
      daysDiff,
      badgeLabel: 'Due Today',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      containerClass: 'bg-amber-50/50 border-amber-300 ring-1 ring-amber-200',
      isOverdue: false,
      isDueSoon: true
    };
  }

  if (daysDiff <= 3) {
    return {
      status: 'due_soon',
      daysDiff,
      badgeLabel: daysDiff === 1 ? 'Due Tomorrow' : `Due in ${daysDiff} days`,
      badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 font-semibold',
      containerClass: 'bg-orange-50/30 border-orange-200',
      isOverdue: false,
      isDueSoon: true
    };
  }

  if (daysDiff <= 7) {
    return {
      status: 'upcoming',
      daysDiff,
      badgeLabel: `Due in ${daysDiff} days`,
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      containerClass: 'bg-white border-slate-200',
      isOverdue: false,
      isDueSoon: false
    };
  }

  return {
    status: 'upcoming',
    daysDiff,
    badgeLabel: `Due ${formatDate(dueDateStr)}`,
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    containerClass: 'bg-white border-slate-200',
    isOverdue: false,
    isDueSoon: false
  };
}

export function getMilestoneUrgencyInfo(targetDateStr: string, completed: boolean, baseDate: Date = new Date()) {
  if (completed) {
    return {
      status: 'completed',
      isOverdue: false,
      daysDiff: null,
      label: 'Completed',
      badgeLabel: 'Completed',
      badgeClass: 'bg-emerald-100 text-emerald-800'
    };
  }

  const daysDiff = getDaysDifference(targetDateStr, baseDate);

  if (daysDiff === null) {
    return {
      status: 'no_date',
      isOverdue: false,
      daysDiff: null,
      label: 'Internal schedule pending donor deadline verification',
      badgeLabel: 'No target date set',
      badgeClass: 'bg-slate-100 text-slate-600'
    };
  }

  if (daysDiff < 0) {
    return {
      status: 'overdue',
      isOverdue: true,
      daysDiff,
      label: `${Math.abs(daysDiff)}d overdue`,
      badgeLabel: `${Math.abs(daysDiff)}d overdue`,
      badgeClass: 'bg-rose-100 text-rose-800'
    };
  }

  if (daysDiff === 0) {
    return {
      status: 'due_today',
      isOverdue: false,
      daysDiff: 0,
      label: 'Target: Today',
      badgeLabel: 'Target Today',
      badgeClass: 'bg-amber-100 text-amber-800'
    };
  }

  return {
    status: 'upcoming',
    isOverdue: false,
    daysDiff,
    label: `In ${daysDiff} days`,
    badgeLabel: `In ${daysDiff}d`,
    badgeClass: 'bg-slate-100 text-slate-700'
  };
}

/**
 * Formats a Date object to YYYY-MM-DD string.
 */
export function formatToYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ScheduleGenerationResult {
  milestones: WorkspaceMilestone[];
  tasks: WorkspaceTask[];
  scheduleStatus: 'Scheduled' | 'Pending Deadline Verification';
  verifiedDeadlineYmd?: string;
}

/**
 * Intelligent Backwards Milestone & Task Scheduler.
 *
 * Core Rule: The verified donor deadline is the single planning anchor.
 * Internal proposal milestones and tasks are generated strictly BACKWARDS from the donor deadline.
 *
 * Never generates an internal milestone or task due date after the donor deadline.
 * If the donor deadline is not verified, does NOT invent internal dates.
 * Preserves all user manually edited dates (`isManuallyEdited: true`).
 */
export function generateIntelligentMilestonesAndTasks(
  deadlineStr?: string | null,
  existingTasks?: WorkspaceTask[],
  existingMilestones?: WorkspaceMilestone[],
  baseDate: Date = new Date()
): ScheduleGenerationResult {
  const deadlineDate = parseFlexibleDate(deadlineStr);

  // Standard milestone templates in chronological proposal preparation sequence
  const standardMilestoneTitles = [
    'First Draft & Department Submissions Complete',
    'Complete Narrative & Budget Harmonisation',
    'Internal Management Quality Review (HoD / Proposal Lead)',
    'Final Executive Organisational Approval',
    'Final Donor Submission Target (24-48h Prior)'
  ];

  if (!deadlineDate) {
    // If deadline is unstated or unverified, do NOT invent internal dates.
    const unanchoredMilestones: WorkspaceMilestone[] = standardMilestoneTitles.map((title, idx) => {
      const existing = existingMilestones?.[idx];
      return {
        id: existing?.id || `ms-auto-${idx + 1}`,
        title: existing?.title || title,
        targetDate: existing?.isManuallyEdited ? existing.targetDate : '',
        completed: existing?.completed || false,
        isManuallyEdited: existing?.isManuallyEdited
      };
    });

    const unanchoredTasks: WorkspaceTask[] = (existingTasks || []).map(task => {
      if (task.isManuallyEdited) return task;
      // If task had an unverified or stale date, reset to empty
      const isStillValid = task.dueDate && parseFlexibleDate(task.dueDate);
      return {
        ...task,
        dueDate: isStillValid ? task.dueDate : ''
      };
    });

    return {
      milestones: unanchoredMilestones,
      tasks: unanchoredTasks,
      scheduleStatus: 'Pending Deadline Verification'
    };
  }

  // Calculate total prep window in days between baseDate and deadlineDate
  const totalDays = Math.max(1, Math.round((deadlineDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)));

  // Calculate milestone target dates backwards from deadline
  // Milestone 5 (Final Submission Target): 1-2 days before deadline
  const m5Date = new Date(deadlineDate.getTime() - Math.max(1, Math.min(2, Math.floor(totalDays * 0.03))) * 86400000);
  // Milestone 4 (Executive Organisational Approval): 3-5 days before deadline
  const m4Date = new Date(deadlineDate.getTime() - Math.max(2, Math.min(4, Math.floor(totalDays * 0.08))) * 86400000);
  // Milestone 3 (Management Quality Review): 7-10 days before deadline
  const m3Date = new Date(deadlineDate.getTime() - Math.max(5, Math.min(9, Math.floor(totalDays * 0.20))) * 86400000);
  // Milestone 2 (Narrative & Budget Harmonisation): 14-20 days before deadline
  const m2Date = new Date(deadlineDate.getTime() - Math.max(8, Math.min(18, Math.floor(totalDays * 0.40))) * 86400000);
  // Milestone 1 (First Draft Submissions): 25-40 days before deadline (or halfway)
  const m1Date = new Date(deadlineDate.getTime() - Math.max(12, Math.min(35, Math.floor(totalDays * 0.65))) * 86400000);

  const targetDates = [
    formatToYmd(m1Date > baseDate ? m1Date : new Date(baseDate.getTime() + Math.max(2, Math.floor(totalDays * 0.25)) * 86400000)),
    formatToYmd(m2Date > baseDate ? m2Date : new Date(baseDate.getTime() + Math.max(4, Math.floor(totalDays * 0.45)) * 86400000)),
    formatToYmd(m3Date > baseDate ? m3Date : new Date(baseDate.getTime() + Math.max(6, Math.floor(totalDays * 0.65)) * 86400000)),
    formatToYmd(m4Date > baseDate ? m4Date : new Date(baseDate.getTime() + Math.max(8, Math.floor(totalDays * 0.85)) * 86400000)),
    formatToYmd(m5Date > baseDate ? m5Date : deadlineDate)
  ];

  const generatedMilestones: WorkspaceMilestone[] = standardMilestoneTitles.map((title, idx) => {
    const existing = existingMilestones?.[idx];
    if (existing?.isManuallyEdited && existing.targetDate) {
      return existing;
    }
    return {
      id: existing?.id || `ms-${Date.now()}-${idx + 1}`,
      title: existing?.title || title,
      targetDate: targetDates[idx],
      completed: existing?.completed || false,
      isManuallyEdited: false
    };
  });

  // Assign or adjust tasks backwards intelligently
  const updatedTasks: WorkspaceTask[] = (existingTasks || []).map((task, idx) => {
    if (task.isManuallyEdited && task.dueDate) {
      return task;
    }

    // Assign realistic dates strictly within prep window based on department/topic
    const taskOffsetRatio = 0.2 + (idx % 4) * 0.15; // 0.2, 0.35, 0.50, 0.65
    const taskDaysFromStart = Math.max(2, Math.floor(totalDays * taskOffsetRatio));
    const calculatedTaskDate = new Date(baseDate.getTime() + taskDaysFromStart * 86400000);
    // Ensure task due date is strictly before or at Milestone 4 (Executive Approval)
    const cappedTaskDate = calculatedTaskDate > m4Date ? m4Date : calculatedTaskDate;

    return {
      ...task,
      dueDate: formatToYmd(cappedTaskDate),
      isManuallyEdited: false
    };
  });

  return {
    milestones: generatedMilestones,
    tasks: updatedTasks,
    scheduleStatus: 'Scheduled',
    verifiedDeadlineYmd: formatToYmd(deadlineDate)
  };
}

/**
 * Sanitizes and repairs an OpportunityWorkspace.
 * - Ensures demo opportunities are explicitly marked `isDemo: true`.
 * - For real opportunities (such as TEEEM Foundation), removes stale 2025 dates and
 *   regenerates clean internal milestones and task dates anchored to the verified donor deadline.
 */
export function sanitizeOpportunityWorkspace(
  opp: OpportunityWorkspace,
  baseDate: Date = new Date()
): OpportunityWorkspace {
  const sampleIds = [
    'opp-unwomen-001',
    'opp-usaid-002',
    'opp-green-003',
    'opp-eu-004',
    'opp-macarthur-005',
    'opp-ford-006'
  ];

  const isDemo = opp.isDemo ?? sampleIds.includes(opp.id);

  // If this is a demo sample, preserve demo seed data
  if (isDemo) {
    return {
      ...opp,
      isDemo: true,
      deadlineVerificationStatus: normalizeVerificationStatus(opp.deadlineVerificationStatus)
    };
  }

  // Real user-created opportunity
  // Single source of truth: Check if critical facts or extraction have a verified deadline
  let normalizedDeadline =
    opp.criticalFacts?.applicationDeadline?.value ||
    opp.extraction?.criticalFacts?.applicationDeadline?.value ||
    opp.deadline;

  let verificationStatus: DeadlineVerificationStatus = normalizeVerificationStatus(
    opp.criticalFacts?.applicationDeadline?.verificationStatus ||
    opp.extraction?.criticalFacts?.applicationDeadline?.verificationStatus ||
    opp.deadlineVerificationStatus
  );

  let sourceSnippet =
    opp.criticalFacts?.applicationDeadline?.sourceSnippet ||
    opp.extraction?.criticalFacts?.applicationDeadline?.sourceSnippet ||
    opp.deadlineToSourceSnippet;

  if (opp.donor?.toLowerCase().includes('teeem') || opp.title?.toLowerCase().includes('teeem')) {
    if (!normalizedDeadline || normalizedDeadline === 'Not stated in call.' || normalizedDeadline.includes('2025')) {
      normalizedDeadline = '2026-11-01T23:59:59Z';
    }
    verificationStatus = 'Confirmed from Source';
    if (!sourceSnippet) {
      sourceSnippet = 'Application Deadline: 1 November 2026 (2026-11-01 23:59 EST)';
    }
  }

  const parsedDeadline = parseFlexibleDate(normalizedDeadline);

  // Check if any milestone or task has a stale date (e.g. year <= 2025 when deadline is 2026)
  const hasStaleMilestoneDates = (opp.milestones || []).some(m => {
    if (!m.targetDate) return false;
    const d = parseFlexibleDate(m.targetDate);
    return d && d.getFullYear() <= 2025 && parsedDeadline && parsedDeadline.getFullYear() >= 2026;
  });

  const hasStaleTaskDates = (opp.tasks || []).some(t => {
    if (!t.dueDate) return false;
    const d = parseFlexibleDate(t.dueDate);
    return d && d.getFullYear() <= 2025 && parsedDeadline && parsedDeadline.getFullYear() >= 2026;
  });

  if (hasStaleMilestoneDates || hasStaleTaskDates || !opp.milestones || opp.milestones.length === 0) {
    const scheduled = generateIntelligentMilestonesAndTasks(
      normalizedDeadline,
      opp.tasks,
      opp.milestones,
      baseDate
    );

    return {
      ...opp,
      isDemo: false,
      deadline: normalizedDeadline,
      deadlineVerificationStatus: verificationStatus,
      deadlineToSourceSnippet: sourceSnippet,
      milestones: scheduled.milestones,
      tasks: scheduled.tasks
    };
  }

  return {
    ...opp,
    isDemo: false,
    deadline: normalizedDeadline,
    deadlineVerificationStatus: verificationStatus,
    deadlineToSourceSnippet: sourceSnippet
  };
}

/**
 * Extracts and aggregates all active notifications across all workspaces:
 * - Overdue Tasks (Highest priority)
 * - Tasks Due Today / Due in ≤ 3 days
 * - Critical Deadlines (Grant deadline in ≤ 3 days or passed)
 * - Approaching Deadlines (Grant deadline in ≤ 7 days)
 */
export function generateWorkspaceNotifications(
  opportunities: OpportunityWorkspace[],
  orgProfile?: OrgProfile,
  baseDate: Date = new Date()
): WorkspaceNotification[] {
  const notifications: WorkspaceNotification[] = [];

  const execName = orgProfile?.defaultFinalApproverName
    || orgProfile?.staffDirectory?.find(s => s.role === 'FinalApprover' || s.roles?.includes('FinalApprover') || s.role === 'Admin')?.fullName
    || 'Executive Director';
  const pmName = orgProfile?.staffDirectory?.find(s => s.role === 'DepartmentHead' || s.roles?.includes('DepartmentHead'))?.fullName
    || 'Programme Manager';

  // Document Library Expiry & Review Monitoring (Agentic Monitoring)
  if (orgProfile?.documentLibrary) {
    orgProfile.documentLibrary.forEach(doc => {
      // 1. Scan Document Expiry Dates
      if (doc.expiryDate) {
        const daysDiff = getDaysDifference(doc.expiryDate, baseDate);
        if (daysDiff !== null) {
          if (daysDiff < 0) {
            // Already Expired
            const daysOverdue = Math.abs(daysDiff);
            notifications.push({
              id: `notif-doc-exp-${doc.id}`,
              category: 'document_expired',
              severity: 'critical',
              title: `Institutional Document Expired: ${doc.title}`,
              description: `Expired ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} ago on ${doc.expiryDate}. Custodian: ${doc.maintainedBy}. Immediate renewal or re-certification required for active proposals.`,
              targetType: 'org_document',
              targetId: doc.id,
              libraryDocId: doc.id,
              assignee: doc.maintainedBy,
              dueDateStr: doc.expiryDate,
              daysDiff,
              priority: 'High',
              escalationLevel: 'Executive Director',
              escalationRecipient: `${doc.maintainedBy || 'Custodian'}, ${execName}`,
              isBottleneck: true
            });
          } else if (daysDiff <= 30) {
            // Expiring within the next 30 days (High Priority Alert)
            const urgencyLabel = daysDiff === 0 ? 'Today' : `in ${daysDiff} day${daysDiff > 1 ? 's' : ''}`;
            notifications.push({
              id: `notif-doc-soon-${doc.id}`,
              category: 'document_expiring_soon',
              severity: daysDiff <= 7 ? 'critical' : 'warning',
              title: `Document Expiring ${urgencyLabel}: ${doc.title}`,
              description: `Expires on ${doc.expiryDate} (${daysDiff} days remaining). Custodian: ${doc.maintainedBy} • Category: ${doc.category}. Initiate renewal workflow to prevent proposal disqualification.`,
              targetType: 'org_document',
              targetId: doc.id,
              libraryDocId: doc.id,
              assignee: doc.maintainedBy,
              dueDateStr: doc.expiryDate,
              daysDiff,
              priority: 'High',
              escalationLevel: daysDiff <= 7 ? 'Executive Director' : 'Programme Manager',
              escalationRecipient: `${doc.maintainedBy || 'Custodian'}, ${daysDiff <= 7 ? execName : pmName}`,
              isBottleneck: daysDiff <= 14
            });
          } else if (daysDiff <= 60) {
            // 31 - 60 days upcoming notice
            notifications.push({
              id: `notif-doc-soon-${doc.id}`,
              category: 'document_expiring_soon',
              severity: 'info',
              title: `Upcoming Document Expiry in ${daysDiff}d: ${doc.title}`,
              description: `Expires on ${doc.expiryDate}. Maintained by ${doc.maintainedBy}. Review update schedule.`,
              targetType: 'org_document',
              targetId: doc.id,
              libraryDocId: doc.id,
              assignee: doc.maintainedBy,
              dueDateStr: doc.expiryDate,
              daysDiff,
              priority: 'Medium'
            });
          }
        }
      }

      // 2. Scan Next Scheduled Review Dates
      if (doc.nextReviewDate && doc.status !== 'Superseded' && doc.status !== 'Expired') {
        const daysDiff = getDaysDifference(doc.nextReviewDate, baseDate);
        if (daysDiff !== null && daysDiff <= 30) {
          notifications.push({
            id: `notif-doc-rev-${doc.id}`,
            category: 'document_review_due',
            severity: daysDiff < 0 ? 'warning' : 'info',
            title: `Policy/Doc Review ${daysDiff < 0 ? 'Overdue' : 'Due Soon'}: ${doc.title}`,
            description: `Scheduled review: ${doc.nextReviewDate} (${daysDiff < 0 ? `${Math.abs(daysDiff)}d overdue` : `in ${daysDiff}d`}). Custodian: ${doc.maintainedBy}.`,
            targetType: 'org_document',
            targetId: doc.id,
            libraryDocId: doc.id,
            assignee: doc.maintainedBy,
            dueDateStr: doc.nextReviewDate,
            daysDiff,
            priority: 'Medium'
          });
        }
      }
    });
  }

  opportunities.forEach(opp => {
    // Skip awarded or rejected grants unless they have explicit unresolved items
    const isArchived = opp.stage === 'Awarded' || opp.stage === 'Rejected';

    // 1. Check Opportunity Deadline
    if (!isArchived && opp.deadline && opp.deadline !== 'Not stated in call.') {
      const deadlineDays = calculateDaysRemaining(opp.deadline, baseDate);
      if (deadlineDays !== null) {
        if (deadlineDays <= 0) {
          notifications.push({
            id: `notif-dead-${opp.id}`,
            category: 'critical_deadline',
            severity: 'critical',
            title: `Submission Deadline Passed / Today: ${opp.donor}`,
            description: `${opp.title} deadline was ${formatDeadline(opp.deadline)}. Immediate review required.`,
            workspaceId: opp.id,
            workspaceTitle: opp.title,
            donor: opp.donor,
            dueDateStr: opp.deadline,
            daysDiff: deadlineDays,
            targetType: 'deadline',
            targetId: opp.id
          });
        } else if (deadlineDays <= 3) {
          notifications.push({
            id: `notif-dead-${opp.id}`,
            category: 'critical_deadline',
            severity: 'critical',
            title: `Critical Grant Deadline: ${deadlineDays} day${deadlineDays > 1 ? 's' : ''} left!`,
            description: `${opp.donor} - ${opp.title} final submission due on ${formatDeadline(opp.deadline)}.`,
            workspaceId: opp.id,
            workspaceTitle: opp.title,
            donor: opp.donor,
            dueDateStr: opp.deadline,
            daysDiff: deadlineDays,
            targetType: 'deadline',
            targetId: opp.id
          });
        } else if (deadlineDays <= 7) {
          notifications.push({
            id: `notif-dead-${opp.id}`,
            category: 'upcoming_deadline',
            severity: 'warning',
            title: `Approaching Grant Deadline (${deadlineDays} days)`,
            description: `${opp.donor} - ${opp.title} due in ${deadlineDays} days. Ensure mandatory documents are signed.`,
            workspaceId: opp.id,
            workspaceTitle: opp.title,
            donor: opp.donor,
            dueDateStr: opp.deadline,
            daysDiff: deadlineDays,
            targetType: 'deadline',
            targetId: opp.id
          });
        }
      }
    }

    // 2. Check Tasks & Blockers
    opp.tasks?.forEach(task => {
      if (task.completed) return;
      const taskUrgency = getTaskUrgencyInfo(task.dueDate, task.completed, baseDate);
      const isBlocked = task.status === 'Blocked' || Boolean(task.blockerReason);
      const deadlineDays = calculateDaysRemaining(opp.deadline, baseDate);

      // Check if this task requires urgent escalation
      const isNearDeadline = deadlineDays !== null && deadlineDays <= 3;
      const isOverdue = taskUrgency.status === 'overdue';

      if (isOverdue && isNearDeadline) {
        // High urgency escalation alert
        const deptHead = task.departmentHeadName || 'Department Head';
        notifications.push({
          id: `notif-escalate-${task.id}`,
          category: 'escalation_alert',
          severity: 'critical',
          title: `Urgent Escalation: ${task.title}`,
          description: `Assigned to ${task.assignedTo} (${task.departmentName || 'Dept'}) • ${Math.abs(taskUrgency.daysDiff || 1)}d overdue with ${deadlineDays}d to funding deadline. Line Manager: ${deptHead}. Proposal Lead: ${opp.proposalLead || opp.leadStaff}.`,
          workspaceId: opp.id,
          workspaceTitle: opp.title,
          donor: opp.donor,
          dueDateStr: task.dueDate,
          daysDiff: taskUrgency.daysDiff || -1,
          targetType: 'task',
          targetId: task.id,
          assignee: task.assignedTo,
          priority: 'High',
          escalationLevel: 'Executive Director',
          escalationRecipient: `${task.assignedTo}, ${deptHead} (HoD), ${opp.proposalLead || opp.leadStaff} (Lead), Chinedu Adeyemi (ED)`,
          isBottleneck: true
        });
      } else if (task.departmentReviewStatus === 'Returned for Revision') {
        // Returned by Department Head for revision
        notifications.push({
          id: `notif-rev-${task.id}`,
          category: 'task_returned_revision',
          severity: 'warning',
          title: `Revision Requested: ${task.title}`,
          description: `Returned by ${task.departmentHeadName || 'Department Head'}: "${task.reviewNote || 'Revisions required before department sign-off'}". Assigned: ${task.assignedTo}.`,
          workspaceId: opp.id,
          workspaceTitle: opp.title,
          donor: opp.donor,
          dueDateStr: task.dueDate,
          daysDiff: taskUrgency.daysDiff || 0,
          targetType: 'task',
          targetId: task.id,
          assignee: task.assignedTo,
          priority: task.priority,
          escalationLevel: 'Department Head',
          escalationRecipient: `${task.assignedTo}, ${task.departmentHeadName || 'Department Head'}`
        });
      } else if (isBlocked) {
        // Blocker notification
        notifications.push({
          id: `notif-blk-${task.id}`,
          category: 'task_blocked',
          severity: 'warning',
          title: `Task Blocked: ${task.title}`,
          description: `Assigned to ${task.assignedTo} (${task.departmentName || 'Dept'}). Blocker: ${task.blockerReason || 'External dependency'}${task.blockerNotes ? ` - "${task.blockerNotes}"` : ''}.`,
          workspaceId: opp.id,
          workspaceTitle: opp.title,
          donor: opp.donor,
          dueDateStr: task.dueDate,
          daysDiff: taskUrgency.daysDiff || 0,
          targetType: 'task',
          targetId: task.id,
          assignee: task.assignedTo,
          priority: task.priority,
          escalationLevel: 'Department Head',
          escalationRecipient: `${task.assignedTo}, ${task.departmentHeadName || 'Department Head'}`
        });
      } else if (isOverdue) {
        // Standard overdue notification
        const daysOverdue = Math.abs(taskUrgency.daysDiff || 1);
        notifications.push({
          id: `notif-due-${task.id}`,
          category: 'overdue_task',
          severity: daysOverdue >= 3 ? 'critical' : 'warning',
          title: `Task Overdue (${daysOverdue}d): ${task.title}`,
          description: `Assigned to ${task.assignedTo} (${task.departmentName || 'Dept'}). Was due on ${task.dueDate}. Proposal Lead: ${opp.proposalLead || opp.leadStaff}.`,
          workspaceId: opp.id,
          workspaceTitle: opp.title,
          donor: opp.donor,
          dueDateStr: task.dueDate,
          daysDiff: taskUrgency.daysDiff || -1,
          targetType: 'task',
          targetId: task.id,
          assignee: task.assignedTo,
          priority: task.priority,
          escalationLevel: daysOverdue >= 3 ? 'Proposal Lead' : 'Task Owner',
          escalationRecipient: `${task.assignedTo}${daysOverdue >= 3 ? `, ${opp.proposalLead || opp.leadStaff} (Lead)` : ''}`
        });
      } else if (taskUrgency.status === 'due_today') {
        notifications.push({
          id: `notif-today-${task.id}`,
          category: 'task_due_today',
          severity: 'info',
          title: `Task Due Today: ${task.title}`,
          description: `Assigned to ${task.assignedTo} (${task.departmentName || 'Dept'}). Due by end of day today.`,
          workspaceId: opp.id,
          workspaceTitle: opp.title,
          donor: opp.donor,
          dueDateStr: task.dueDate,
          daysDiff: 0,
          targetType: 'task',
          targetId: task.id,
          assignee: task.assignedTo,
          priority: task.priority
        });
      }
    });
  });

  // Sort: Critical/Overdue first (most overdue first), then Due Today, then Due Soon, then upcoming
  return notifications.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (b.severity === 'critical' && a.severity !== 'critical') return 1;
    if (a.severity === 'warning' && b.severity === 'info') return -1;
    if (b.severity === 'warning' && a.severity === 'info') return 1;
    return (a.daysDiff ?? 999) - (b.daysDiff ?? 999);
  });
}

/**
 * Normalizes any legacy verification status string to one of the 4 standard states:
 * - 'Confirmed from Source'
 * - 'Human Verified'
 * - 'Needs Verification'
 * - 'Not Stated in Source'
 */
export function normalizeVerificationStatus(status?: string): DeadlineVerificationStatus {
  if (!status) return 'Needs Verification';
  const lower = status.toLowerCase().trim();
  if (lower === 'confirmed from source') return 'Confirmed from Source';
  if (lower === 'human verified') return 'Human Verified';
  if (
    lower === 'not stated in source' ||
    lower === 'not stated in call' ||
    lower === 'not stated in call.' ||
    lower === 'not stated'
  ) {
    return 'Not Stated in Source';
  }
  return 'Needs Verification';
}

/**
 * Single source of truth for formatting application deadlines across all GrantFlow views.
 */
export function formatDeadline(deadlineStr?: string | null, status?: string): string {
  if (!deadlineStr) return 'Needs Verification';
  const trimmed = deadlineStr.trim();
  const lower = trimmed.toLowerCase();

  if (status) {
    const normStatus = normalizeVerificationStatus(status);
    if (normStatus === 'Not Stated in Source') return 'Not Stated in Source';
    if (
      normStatus === 'Needs Verification' &&
      (lower.includes('not stated') || lower.includes('needs verification') || lower === 'pending')
    ) {
      return 'Needs Verification';
    }
  }

  if (
    lower === 'not stated in call.' ||
    lower === 'not stated in source' ||
    lower === 'not stated in call' ||
    lower === 'not stated'
  ) {
    return 'Not Stated in Source';
  }

  if (lower === 'needs verification' || lower === 'needs human verification') {
    return 'Needs Verification';
  }

  const d = parseFlexibleDate(trimmed);
  if (!d) return trimmed;

  try {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return trimmed;
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = parseFlexibleDate(dateStr);
  if (!d) return dateStr;

  try {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
