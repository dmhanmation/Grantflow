import React, { useState, useEffect, useRef } from 'react';
import {
  OpportunityWorkspace,
  PipelineStage,
  WorkspaceDocument,
  WorkspaceTask,
  SubmissionRecord,
  OutcomeRecord,
  AgentReadinessAlert,
  StaffMember,
  TaskStatus,
  AssignmentStatus,
  OpportunityOfficerAssignment,
  BlockerReason,
  OpportunityActivityEvent,
  OrgProfile,
  DonorApplicationTemplateSource,
  ApplicationSection,
  DonorSubmissionFormat
} from '../types';
import {
  calculateDaysRemaining,
  formatDeadline,
  formatDate,
  getTaskUrgencyInfo,
  getMilestoneUrgencyInfo,
  getDaysDifference,
  normalizeVerificationStatus,
  sanitizeOpportunityWorkspace
} from '../utils/dateUtils';
import { getProposalBottleneck, computeTaskEffectiveStatus } from '../utils/accountabilityUtils';
import { resolveChain, isApprovedForSubmission } from '../utils/approvalChain';
import { ProgressDonutChart } from './ProgressDonutChart';
import { ApplicationWorkspaceTab } from './ApplicationWorkspaceTab';
import { ApplicationSetupModal } from './ApplicationSetupModal';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Send,
  Calendar,
  DollarSign,
  User,
  Users,
  UserCheck,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileText,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Award,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FolderCheck,
  ChevronRight,
  Filter,
  AlertCircle,
  XCircle,
  ListTodo,
  ShieldAlert,
  Building,
  Briefcase,
  History,
  UserPlus,
  Lock,
  ArrowUpDown
} from 'lucide-react';

interface WorkspaceViewProps {
  workspace: OpportunityWorkspace;
  staffDirectory?: StaffMember[];
  orgProfile?: OrgProfile;
  onUpdateWorkspace: (updated: OpportunityWorkspace) => void;
  onDeleteWorkspace?: (workspaceId: string) => void;
  onBackToList: () => void;
  initialTab?: string;
  highlightedTaskId?: string;
}

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  workspace,
  staffDirectory = [],
  orgProfile,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onBackToList,
  initialTab,
  highlightedTaskId
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'application' | 'team' | 'documents' | 'tasks' | 'questions' | 'notes' | 'audit' | 'submission'>(
    (initialTab as any) || 'overview'
  );
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Filters for tasks
  const [taskFilter, setTaskFilter] = useState<'ALL' | 'OVERDUE' | 'BLOCKED' | 'DUE_SOON' | 'COMPLETED'>('ALL');
  const [taskStaffFilter, setTaskStaffFilter] = useState<string>('ALL');
  const [taskDeptFilter, setTaskDeptFilter] = useState<string>('ALL');
  const [taskReviewFilter, setTaskReviewFilter] = useState<string>('ALL');

  const highlightedTaskRef = useRef<HTMLDivElement>(null);

  // Sync initial tab when changed from props
  useEffect(() => {
    if (initialTab && ['overview', 'team', 'documents', 'tasks', 'questions', 'notes', 'audit', 'submission'].includes(initialTab)) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  // Scroll to highlighted task if present
  useEffect(() => {
    if ((activeTab === 'tasks' || activeTab === 'team') && highlightedTaskId && highlightedTaskRef.current) {
      highlightedTaskRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeTab, highlightedTaskId]);

  // Leadership Edit Modal
  const [showLeadershipModal, setShowLeadershipModal] = useState(false);
  const [leadStaffInput, setLeadStaffInput] = useState(workspace.proposalLead || workspace.leadStaff || '');
  const [wsChainOverride, setWsChainOverride] = useState<string[]>(
    workspace.approvalChain || orgProfile.approvalChain || ['DepartmentHead', 'ProposalLead', 'FinalApprover']
  );
  const [reviewerInput, setReviewerInput] = useState(workspace.reviewer || '');
  const [approverInput, setApproverInput] = useState(workspace.finalApprover || orgProfile.defaultFinalApproverName || '');

  // Edit Deadline State
  const [showEditDeadlineModal, setShowEditDeadlineModal] = useState(false);
  const [editDeadlineInput, setEditDeadlineInput] = useState(workspace.deadline || '');
  const [editDeadlineSnippet, setEditDeadlineSnippet] = useState(workspace.deadlineToSourceSnippet || '');

  // Assign Officer Modal State
  const [showAssignOfficerModal, setShowAssignOfficerModal] = useState(false);
  const [editingOfficerId, setEditingOfficerId] = useState<string | null>(null);
  const [officerStaffName, setOfficerStaffName] = useState(staffDirectory?.[0]?.fullName || '');
  const [officerResponsibility, setOfficerResponsibility] = useState('');
  const [officerDeadline, setOfficerDeadline] = useState(workspace.deadline || '');
  const [officerInstructions, setOfficerInstructions] = useState('');
  const [officerStatus, setOfficerStatus] = useState<AssignmentStatus>('Not Started');

  // Quick Action Modals for Assigned Officers
  const [reassignOfficerTarget, setReassignOfficerTarget] = useState<OpportunityOfficerAssignment | null>(null);
  const [newOfficerChoice, setNewOfficerChoice] = useState('');
  const [deadlineOfficerTarget, setDeadlineOfficerTarget] = useState<OpportunityOfficerAssignment | null>(null);
  const [newOfficerDeadlineInput, setNewOfficerDeadlineInput] = useState('');
  const [reviewOfficerTarget, setReviewOfficerTarget] = useState<OpportunityOfficerAssignment | null>(null);
  const [reviewOfficerStatusChoice, setReviewOfficerStatusChoice] = useState<AssignmentStatus>('Completed');
  const [reviewOfficerNotes, setReviewOfficerNotes] = useState('');

  // Task Edit Modal State
  const [editingTaskTarget, setEditingTaskTarget] = useState<WorkspaceTask | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState('');
  const [editTaskAssignee, setEditTaskAssignee] = useState('');
  const [editTaskDueDate, setEditTaskDueDate] = useState('');
  const [editTaskPriority, setEditTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [editTaskStatus, setEditTaskStatus] = useState<TaskStatus>('Not Started');
  const [editTaskNotes, setEditTaskNotes] = useState('');

  // New task form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(workspace.proposalLead || '');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [newTaskSection, setNewTaskSection] = useState('');

  // Blocker Modal state
  const [blockerModalTask, setBlockerModalTask] = useState<WorkspaceTask | null>(null);
  const [blockerReasonChoice, setBlockerReasonChoice] = useState<BlockerReason>('Missing Finance budget');
  const [blockerNotesInput, setBlockerNotesInput] = useState('');

  // Reassign Task Modal State
  const [reassignTaskTarget, setReassignTaskTarget] = useState<WorkspaceTask | null>(null);
  const [newAssigneeChoice, setNewAssigneeChoice] = useState('');

  // Line Manager / Department Head Revision Modal State
  const [revisionModalTask, setRevisionModalTask] = useState<WorkspaceTask | null>(null);
  const [revisionNoteInput, setRevisionNoteInput] = useState('');

  // New document form state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<WorkspaceDocument['category']>('Technical Proposal');
  const [newDocMandatory, setNewDocMandatory] = useState(true);

  // New note state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteAuthor, setNoteAuthor] = useState(workspace.proposalLead || '');

  // Submission record modal
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [subDate, setSubDate] = useState(new Date().toISOString().split('T')[0]);
  const [subMethod, setSubMethod] = useState(workspace.extraction?.submissionMethod || '');
  const [subConfNumber, setSubConfNumber] = useState('');
  const [subExpectedDecision, setSubExpectedDecision] = useState('');
  const [subRecordedBy, setSubRecordedBy] = useState(workspace.proposalLead || '');
  const [subNotes, setSubNotes] = useState('');

  // Outcome record modal
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [outcomeStatus, setOutcomeStatus] = useState<'Awarded' | 'Rejected'>('Awarded');
  const [outcomeDate, setOutcomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [outcomeAmount, setOutcomeAmount] = useState(workspace.fundingAmount || '');
  const [outcomeFeedback, setOutcomeFeedback] = useState('');

  // Agent re-evaluation loading
  const [isEvaluating, setIsEvaluating] = useState(false);

  const daysRemaining = calculateDaysRemaining(workspace.deadline);
  const proposalLeadName = workspace.proposalLead || workspace.leadStaff || 'Unassigned';
  const reviewerName = workspace.reviewer || 'Unassigned';
  const approverName = workspace.finalApprover || orgProfile.defaultFinalApproverName || 'Unassigned';

  // Proposal bottleneck diagnosis
  const bottleneckDiagnosis = getProposalBottleneck(workspace, staffDirectory);

  // Pipeline stages list
  const pipelineStages: PipelineStage[] = [
    'Identified',
    'Assessing',
    'Go / No-Go',
    'Preparing Application',
    'Internal Review',
    'Ready for Submission',
    'Submitted',
    'Awaiting Decision',
    'Awarded',
    'Rejected'
  ];

  // Helper to log audit event
  const createAuditEvent = (action: string, details: string, category: OpportunityActivityEvent['category'] = 'general', targetId?: string) => {
    const event: OpportunityActivityEvent = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      actor: proposalLeadName,
      details,
      category,
      targetId
    };
    return event;
  };

  const handleSaveDeadline = () => {
    const trimmedVal = editDeadlineInput.trim();
    if (!trimmedVal) return;

    const isNotStated = trimmedVal.toLowerCase().includes('not stated');
    const newStatus = isNotStated ? 'Not Stated in Source' : 'Human Verified';

    const updatedOpp: OpportunityWorkspace = {
      ...workspace,
      deadline: trimmedVal,
      deadlineVerificationStatus: newStatus,
      deadlineToSourceSnippet: editDeadlineSnippet.trim() || undefined,
      criticalFacts: workspace.criticalFacts
        ? {
            ...workspace.criticalFacts,
            applicationDeadline: {
              value: trimmedVal,
              sourceSnippet: editDeadlineSnippet.trim() || '',
              sourceReference: 'Human Verified in Workspace',
              verificationStatus: newStatus
            }
          }
        : undefined
    };

    const sanitized = sanitizeOpportunityWorkspace(updatedOpp);
    onUpdateWorkspace(sanitized);
    setShowEditDeadlineModal(false);
  };

  // Officer Assignment Handlers
  const handleOpenAssignOfficer = () => {
    setEditingOfficerId(null);
    setOfficerStaffName(staffDirectory?.[0]?.fullName || '');
    setOfficerResponsibility('Lead Proposal Writer');
    setOfficerDeadline(workspace.deadline || '');
    setOfficerInstructions('');
    setOfficerStatus('Not Started');
    setShowAssignOfficerModal(true);
  };

  const handleOpenEditOfficer = (officer: OpportunityOfficerAssignment) => {
    setEditingOfficerId(officer.id);
    setOfficerStaffName(officer.staffName);
    setOfficerResponsibility(officer.responsibility);
    setOfficerDeadline(officer.deadline);
    setOfficerInstructions(officer.instructions || '');
    setOfficerStatus(officer.status);
    setShowAssignOfficerModal(true);
  };

  const handleSaveOfficerAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerStaffName.trim() || !officerResponsibility.trim()) return;

    const matchedStaff = staffDirectory.find(s => s.fullName.toLowerCase() === officerStaffName.trim().toLowerCase());
    const existing = workspace.assignedOfficers || [];

    let updatedOfficers: OpportunityOfficerAssignment[];
    if (editingOfficerId) {
      updatedOfficers = existing.map(o => {
        if (o.id === editingOfficerId) {
          return {
            ...o,
            staffId: matchedStaff?.id || o.staffId,
            staffName: officerStaffName.trim(),
            staffEmail: matchedStaff?.email || o.staffEmail,
            department: matchedStaff?.department || o.department || 'Programmes',
            responsibility: officerResponsibility.trim(),
            deadline: officerDeadline.trim() || workspace.deadline,
            instructions: officerInstructions.trim() || undefined,
            status: officerStatus,
            lastUpdated: new Date().toISOString()
          };
        }
        return o;
      });
    } else {
      const newOfficer: OpportunityOfficerAssignment = {
        id: `officer-${Date.now()}`,
        staffId: matchedStaff?.id || `staff-${Date.now()}`,
        staffName: officerStaffName.trim(),
        staffEmail: matchedStaff?.email,
        department: matchedStaff?.department || 'Programmes',
        responsibility: officerResponsibility.trim(),
        deadline: officerDeadline.trim() || workspace.deadline,
        instructions: officerInstructions.trim() || undefined,
        status: officerStatus,
        assignedBy: proposalLeadName,
        assignedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };
      updatedOfficers = [...existing, newOfficer];
    }

    const audit = createAuditEvent(
      'Officer Assigned',
      `${editingOfficerId ? 'Updated assignment for' : 'Assigned'} ${officerStaffName} as "${officerResponsibility}" (Deadline: ${officerDeadline || 'Workspace deadline'}).`,
      'assignment'
    );

    const updatedWorkspace: OpportunityWorkspace = {
      ...workspace,
      assignedOfficers: updatedOfficers,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };

    onUpdateWorkspace(sanitizeOpportunityWorkspace(updatedWorkspace));
    setShowAssignOfficerModal(false);
  };

  const handleRemoveOfficerAssignment = (id: string) => {
    const existing = workspace.assignedOfficers || [];
    const removedOfficer = existing.find(o => o.id === id);
    const updatedOfficers = existing.filter(o => o.id !== id);

    const audit = createAuditEvent(
      'Officer Assignment Removed',
      `Removed proposal assignment for ${removedOfficer?.staffName || 'officer'}.`,
      'assignment'
    );

    const updatedWorkspace: OpportunityWorkspace = {
      ...workspace,
      assignedOfficers: updatedOfficers,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(sanitizeOpportunityWorkspace(updatedWorkspace));
  };

  const handleConfirmReassignOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignOfficerTarget || !newOfficerChoice.trim()) return;

    const matchedStaff = staffDirectory.find(s => s.fullName.toLowerCase() === newOfficerChoice.trim().toLowerCase());
    const existing = workspace.assignedOfficers || [];
    const updatedOfficers = existing.map(o => {
      if (o.id === reassignOfficerTarget.id) {
        return {
          ...o,
          staffId: matchedStaff?.id || o.staffId,
          staffName: newOfficerChoice.trim(),
          staffEmail: matchedStaff?.email || o.staffEmail,
          department: matchedStaff?.department || o.department,
          lastUpdated: new Date().toISOString()
        };
      }
      return o;
    });

    const audit = createAuditEvent(
      'Officer Reassigned',
      `Reassigned "${reassignOfficerTarget.responsibility}" from ${reassignOfficerTarget.staffName} to ${newOfficerChoice}.`,
      'assignment'
    );

    onUpdateWorkspace(sanitizeOpportunityWorkspace({
      ...workspace,
      assignedOfficers: updatedOfficers,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    }));
    setReassignOfficerTarget(null);
  };

  const handleConfirmChangeOfficerDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineOfficerTarget || !newOfficerDeadlineInput.trim()) return;

    const existing = workspace.assignedOfficers || [];
    const updatedOfficers = existing.map(o => {
      if (o.id === deadlineOfficerTarget.id) {
        return {
          ...o,
          deadline: newOfficerDeadlineInput.trim(),
          lastUpdated: new Date().toISOString()
        };
      }
      return o;
    });

    const audit = createAuditEvent(
      'Officer Deadline Changed',
      `Updated deadline for ${deadlineOfficerTarget.staffName} (${deadlineOfficerTarget.responsibility}) to ${newOfficerDeadlineInput}.`,
      'assignment'
    );

    onUpdateWorkspace(sanitizeOpportunityWorkspace({
      ...workspace,
      assignedOfficers: updatedOfficers,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    }));
    setDeadlineOfficerTarget(null);
  };

  const handleConfirmReviewOfficerStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOfficerTarget) return;

    const existing = workspace.assignedOfficers || [];
    const updatedOfficers = existing.map(o => {
      if (o.id === reviewOfficerTarget.id) {
        return {
          ...o,
          status: reviewOfficerStatusChoice,
          submissionNotes: reviewOfficerNotes.trim() || o.submissionNotes,
          submittedAt: reviewOfficerStatusChoice === 'Submitted for Review' || reviewOfficerStatusChoice === 'Completed' ? (o.submittedAt || new Date().toISOString()) : o.submittedAt,
          lastUpdated: new Date().toISOString()
        };
      }
      return o;
    });

    const audit = createAuditEvent(
      'Officer Progress Reviewed',
      `Updated status for ${reviewOfficerTarget.staffName} (${reviewOfficerTarget.responsibility}) to ${reviewOfficerStatusChoice}.`,
      'assignment'
    );

    onUpdateWorkspace(sanitizeOpportunityWorkspace({
      ...workspace,
      assignedOfficers: updatedOfficers,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    }));
    setReviewOfficerTarget(null);
  };

  // Task Edit & Status Handlers
  const handleOpenEditTask = (task: WorkspaceTask) => {
    setEditingTaskTarget(task);
    setEditTaskTitle(task.title);
    setEditTaskAssignee(task.assignedTo);
    setEditTaskDueDate(task.dueDate || '');
    setEditTaskPriority(task.priority || 'Medium');
    setEditTaskStatus(task.status || 'Not Started');
    setEditTaskNotes(task.notes || '');
  };

  const handleSaveEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskTarget || !editTaskTitle.trim()) return;

    const matchedStaff = staffDirectory.find(s => s.fullName === editTaskAssignee);
    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === editingTaskTarget.id) {
        const isComplete = editTaskStatus === 'Completed' || editTaskStatus === 'Complete';
        return {
          ...t,
          title: editTaskTitle.trim(),
          assignedTo: editTaskAssignee.trim() || t.assignedTo,
          assignedStaffId: matchedStaff?.id || t.assignedStaffId,
          departmentName: matchedStaff?.department || t.departmentName,
          dueDate: editTaskDueDate.trim() || t.dueDate,
          priority: editTaskPriority,
          status: editTaskStatus,
          completed: isComplete,
          completedAt: isComplete ? (t.completedAt || new Date().toISOString()) : undefined,
          notes: editTaskNotes.trim() || undefined,
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    const audit = createAuditEvent(
      'Task Updated',
      `Updated task "${editTaskTitle.trim()}" (Assignee: ${editTaskAssignee}, Status: ${editTaskStatus}, Due: ${editTaskDueDate}).`,
      'task',
      editingTaskTarget.id
    );

    const updated = {
      ...workspace,
      tasks: updatedTasks,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(sanitizeOpportunityWorkspace(updated));
    setEditingTaskTarget(null);
  };

  // Stage change handler with Submission Readiness Gate
  const handleStageChange = (newStage: PipelineStage) => {
    if (newStage === 'Ready for Submission' || newStage === 'Submitted') {
      const sections = workspace.applicationSections || [];
      const mandatoryDocs = workspace.documentsChecklist.filter(d => d.mandatory);
      const readyDocs = mandatoryDocs.filter(d => d.status === 'Ready' || d.status === 'Signed');

      const allQuestionsApproved =
        sections.length > 0 &&
        sections.every(s => isApprovedForSubmission(s.reviewStatus));
      const allDocsReady = readyDocs.length === mandatoryDocs.length;
      const limitsSatisfied = sections.every(s => {
        if (!s.wordLimit) return true;
        const words = s.draftResponse.trim().split(/\s+/).filter(Boolean).length;
        return words <= s.wordLimit;
      });

      if (!allQuestionsApproved || !allDocsReady || !limitsSatisfied) {
        const issues: string[] = [];
        if (!allQuestionsApproved) issues.push('All mandatory donor questions must be completed and approved by Department Heads.');
        if (!allDocsReady) issues.push(`${mandatoryDocs.length - readyDocs.length} mandatory supporting document(s) are still missing or unverified.`);
        if (!limitsSatisfied) issues.push('One or more application sections exceed the donor word limit.');

        const proceed = window.confirm(
          `Submission Gate Warning:\n\n` +
            issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n') +
            `\n\nGrantFlow recommends resolving these items before declaring the proposal Ready for Submission.\n\nProceed anyway?`
        );
        if (!proceed) return;
      }
    }

    const audit = createAuditEvent('Stage Changed', `Moved pipeline stage from "${workspace.stage}" to "${newStage}".`, 'stage');
    const updated = {
      ...workspace,
      stage: newStage,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
  };

  // Update Proposal Leadership
  const handleSaveLeadership = (e: React.FormEvent) => {
    e.preventDefault();
    const audit = createAuditEvent(
      'Leadership Assigned',
      `Updated roles: Lead: ${leadStaffInput}, Reviewer: ${reviewerInput}, Approver: ${approverInput}.`,
      'assignment'
    );
    const updated: OpportunityWorkspace = {
      ...workspace,
      proposalLead: leadStaffInput,
      leadStaff: leadStaffInput,
      reviewer: reviewerInput,
      finalApprover: approverInput,
      approvalChain: wsChainOverride as any,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
    setShowLeadershipModal(false);
  };

  // Toggle task completion
  const handleToggleTask = (taskId: string) => {
    let completedState = false;
    let taskTitle = '';

    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === taskId) {
        completedState = !t.completed;
        taskTitle = t.title;
        return {
          ...t,
          completed: completedState,
          status: completedState ? ('Complete' as TaskStatus) : ('In Progress' as TaskStatus),
          blockerReason: completedState ? undefined : t.blockerReason,
          blockerNotes: completedState ? undefined : t.blockerNotes,
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    const audit = createAuditEvent(
      completedState ? 'Task Completed' : 'Task Reopened',
      `Task "${taskTitle}" marked as ${completedState ? 'Complete' : 'In Progress'}.`,
      'task',
      taskId
    );

    const updated = {
      ...workspace,
      tasks: updatedTasks,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
  };

  // Add task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const assignedStaffMember = staffDirectory.find(s => s.fullName === newTaskAssignee);
    const assignedDept = assignedStaffMember?.department;
    const assignedHoD = assignedStaffMember?.reportsTo;

    const newTask: WorkspaceTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      assignedTo: newTaskAssignee.trim() || proposalLeadName,
      assignedStaffId: assignedStaffMember?.id,
      departmentName: assignedDept,
      departmentHeadName: assignedHoD,
      departmentReviewStatus: 'Drafting',
      dueDate: newTaskDueDate || 'Before deadline',
      priority: newTaskPriority,
      completed: false,
      status: 'Not Started',
      section: newTaskSection.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    const audit = createAuditEvent(
      'Task Created',
      `Created task "${newTask.title}" assigned to ${newTask.assignedTo} (Dept: ${assignedDept || 'General'}, Due: ${newTask.dueDate}).`,
      'task',
      newTask.id
    );

    const updated = {
      ...workspace,
      tasks: [...workspace.tasks, newTask],
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskSection('');
    setShowAddTask(false);
  };

  // Set / Clear Task Blocker
  const handleSaveBlocker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockerModalTask) return;

    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === blockerModalTask.id) {
        return {
          ...t,
          status: 'Blocked' as TaskStatus,
          blockerReason: blockerReasonChoice,
          blockerNotes: blockerNotesInput.trim() || undefined,
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    const audit = createAuditEvent(
      'Task Blocked',
      `Task "${blockerModalTask.title}" flagged as Blocked: ${blockerReasonChoice} (${blockerNotesInput || 'No details'}).`,
      'blocker',
      blockerModalTask.id
    );

    const updated = {
      ...workspace,
      tasks: updatedTasks,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
    setBlockerModalTask(null);
    setBlockerNotesInput('');
  };

  const handleResolveBlocker = (taskId: string, taskTitle: string) => {
    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'In Progress' as TaskStatus,
          blockerReason: undefined,
          blockerNotes: undefined,
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    const audit = createAuditEvent(
      'Blocker Resolved',
      `Blocker cleared on "${taskTitle}". Resumed to In Progress.`,
      'blocker',
      taskId
    );

    const updated = {
      ...workspace,
      tasks: updatedTasks,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
  };

  // Reassign Task
  const handleExecuteReassign = () => {
    if (!reassignTaskTarget || !newAssigneeChoice) return;

    const targetStaff = staffDirectory.find(s => s.fullName === newAssigneeChoice);

    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === reassignTaskTarget.id) {
        return {
          ...t,
          assignedTo: newAssigneeChoice,
          assignedStaffId: targetStaff?.id,
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    const audit = createAuditEvent(
      'Task Reassigned',
      `Reassigned "${reassignTaskTarget.title}" from ${reassignTaskTarget.assignedTo} to ${newAssigneeChoice}.`,
      'assignment',
      reassignTaskTarget.id
    );

    const updated = {
      ...workspace,
      tasks: updatedTasks,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
    setReassignTaskTarget(null);
  };

  // Department Review Workflow Actions
  const handleSubmitForDepartmentReview = (taskId: string) => {
    let taskTitle = '';
    let hodName = '';
    let dept = '';

    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === taskId) {
        taskTitle = t.title;
        hodName = t.departmentHeadName || 'Line Manager';
        dept = t.departmentName || 'Department';
        return {
          ...t,
          departmentReviewStatus: 'Submitted to Department Head' as const,
          status: 'In Progress' as TaskStatus,
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    const audit = createAuditEvent(
      'Submitted for Department Review',
      `Officer submitted task "${taskTitle}" (${dept}) for Line Manager review by ${hodName}.`,
      'task',
      taskId
    );

    const updated = {
      ...workspace,
      tasks: updatedTasks,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
  };

  const handleApproveDepartmentTask = (taskId: string, approvalNote?: string) => {
    let taskTitle = '';
    let hodName = '';
    let dept = '';

    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === taskId) {
        taskTitle = t.title;
        hodName = t.departmentHeadName || 'Department Head';
        dept = t.departmentName || 'Department';
        return {
          ...t,
          completed: true,
          status: 'Complete' as TaskStatus,
          departmentReviewStatus: 'Approved' as const,
          reviewNote: approvalNote || 'Approved by Line Manager / Department Head.',
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    const audit = createAuditEvent(
      'Department Review Approved',
      `Department Head (${hodName}) approved task "${taskTitle}" for ${dept} contribution.`,
      'task',
      taskId
    );

    const updated = {
      ...workspace,
      tasks: updatedTasks,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
  };

  const handleSaveTaskRevision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionModalTask) return;

    let hodName = revisionModalTask.departmentHeadName || 'Department Head';
    let dept = revisionModalTask.departmentName || 'Department';

    const updatedTasks = workspace.tasks.map(t => {
      if (t.id === revisionModalTask.id) {
        return {
          ...t,
          completed: false,
          status: 'In Progress' as TaskStatus,
          departmentReviewStatus: 'Returned for Revision' as const,
          reviewNote: revisionNoteInput.trim() || 'Please revise based on department review feedback.',
          lastUpdated: new Date().toISOString()
        };
      }
      return t;
    });

    const audit = createAuditEvent(
      'Task Returned for Revision',
      `Department Head (${hodName}) returned "${revisionModalTask.title}" (${dept}) for revisions: "${revisionNoteInput.trim()}".`,
      'task',
      revisionModalTask.id
    );

    const updated = {
      ...workspace,
      tasks: updatedTasks,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
    setRevisionModalTask(null);
    setRevisionNoteInput('');
  };

  // Document status change
  const handleDocStatusChange = (docId: string, newStatus: WorkspaceDocument['status']) => {
    let docName = '';
    const updatedDocs = workspace.documentsChecklist.map(d => {
      if (d.id === docId) {
        docName = d.name;
        return { ...d, status: newStatus, lastUpdated: new Date().toISOString() };
      }
      return d;
    });

    const audit = createAuditEvent(
      'Document Status Updated',
      `Document "${docName}" updated to ${newStatus}.`,
      'document',
      docId
    );

    const updated = {
      ...workspace,
      documentsChecklist: updatedDocs,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
  };

  // Add document
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const newDoc: WorkspaceDocument = {
      id: `doc-${Date.now()}`,
      name: newDocName.trim(),
      category: newDocCategory,
      mandatory: newDocMandatory,
      status: 'Missing',
      assignedTo: proposalLeadName,
      lastUpdated: new Date().toISOString()
    };

    const audit = createAuditEvent(
      'Document Requirement Added',
      `Added requirement for "${newDoc.name}" (${newDoc.mandatory ? 'Mandatory' : 'Optional'}).`,
      'document',
      newDoc.id
    );

    const updated = {
      ...workspace,
      documentsChecklist: [...workspace.documentsChecklist, newDoc],
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
    setNewDocName('');
    setShowAddDoc(false);
  };

  // Add internal note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const newNote = {
      id: `note-${Date.now()}`,
      author: noteAuthor.trim() || proposalLeadName,
      timestamp: new Date().toISOString(),
      content: newNoteContent.trim()
    };

    const updated = {
      ...workspace,
      internalNotes: [newNote, ...workspace.internalNotes],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
    setNewNoteContent('');
  };

  // Toggle milestone
  const handleToggleMilestone = (milestoneId: string) => {
    const updatedMilestones = workspace.milestones.map(m =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const updated = { ...workspace, milestones: updatedMilestones, updatedAt: new Date().toISOString() };
    onUpdateWorkspace(updated);
  };

  // Change milestone date manually
  const handleMilestoneDateChange = (milestoneId: string, newTargetDate: string) => {
    const updatedMilestones = workspace.milestones.map(m =>
      m.id === milestoneId ? { ...m, targetDate: newTargetDate, isManuallyEdited: true } : m
    );
    const audit = createAuditEvent(
      'Milestone Target Date Updated',
      `Target date updated to ${newTargetDate || 'unassigned'} (manual adjustment).`,
      'status',
      milestoneId
    );
    const updated = {
      ...workspace,
      milestones: updatedMilestones,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
  };

  // Change task due date manually
  const handleTaskDueDateChange = (taskId: string, newDueDate: string) => {
    const updatedTasks = workspace.tasks.map(t =>
      t.id === taskId ? { ...t, dueDate: newDueDate, isManuallyEdited: true, lastUpdated: new Date().toISOString() } : t
    );
    const audit = createAuditEvent(
      'Task Due Date Updated',
      `Due date updated to ${newDueDate || 'unassigned'} (manual adjustment).`,
      'task',
      taskId
    );
    const updated = {
      ...workspace,
      tasks: updatedTasks,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };
    onUpdateWorkspace(updated);
  };

  // Toggle question status
  const handleToggleQuestion = (qId: string) => {
    const updatedQuestions = workspace.outstandingQuestions.map(q =>
      q.id === qId ? { ...q, status: q.status === 'Open' ? ('Resolved' as const) : ('Open' as const) } : q
    );
    const updated = { ...workspace, outstandingQuestions: updatedQuestions, updatedAt: new Date().toISOString() };
    onUpdateWorkspace(updated);
  };

  // Record submission
  const handleRecordSubmission = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionRecord: SubmissionRecord = {
      submittedAt: new Date(subDate).toISOString(),
      submissionMethod: subMethod,
      confirmationNumber: subConfNumber || `CONF-${Math.floor(100000 + Math.random() * 900000)}`,
      submittedDocuments: workspace.documentsChecklist.filter(d => d.status === 'Ready' || d.status === 'Signed').map(d => d.name),
      expectedDecisionDate: subExpectedDecision || undefined,
      recordedBy: subRecordedBy,
      notes: subNotes
    };

    const audit = createAuditEvent(
      'Proposal Submitted',
      `Official submission recorded via ${subMethod} (Ref: ${submissionRecord.confirmationNumber}) by ${subRecordedBy}.`,
      'submission'
    );

    const updated: OpportunityWorkspace = {
      ...workspace,
      stage: 'Awaiting Decision',
      submissionRecord,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString(),
      readinessAlert: {
        level: 'INFO',
        headline: 'Application officially submitted. Opportunity moved to "Awaiting Decision".',
        details: `Submitted via ${subMethod} (Ref: ${submissionRecord.confirmationNumber}) by Lead: ${proposalLeadName}.`,
        recommendedActions: [
          'Store all final submitted files in institutional cloud archive.',
          subExpectedDecision ? `Calendar decision review for ${subExpectedDecision}.` : 'Monitor donor portal for award notification.'
        ],
        evaluatedAt: new Date().toISOString()
      }
    };

    onUpdateWorkspace(updated);
    setShowSubmissionModal(false);
  };

  // Record outcome
  const handleRecordOutcome = (e: React.FormEvent) => {
    e.preventDefault();
    const outcomeRecord: OutcomeRecord = {
      decisionDate: outcomeDate,
      outcome: outcomeStatus,
      grantAmountAwarded: outcomeStatus === 'Awarded' ? outcomeAmount : undefined,
      feedbackNotes: outcomeFeedback
    };

    const audit = createAuditEvent(
      'Outcome Recorded',
      `Donor decision recorded: ${outcomeStatus.toUpperCase()}${outcomeStatus === 'Awarded' ? ` (${outcomeAmount})` : ''}.`,
      'outcome'
    );

    const updated: OpportunityWorkspace = {
      ...workspace,
      stage: outcomeStatus,
      outcomeRecord,
      auditTrail: [audit, ...(workspace.auditTrail || [])],
      updatedAt: new Date().toISOString()
    };

    onUpdateWorkspace(updated);
    setShowOutcomeModal(false);
  };

  // Re-evaluate readiness
  const handleEvaluateReadiness = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      const missingMandatory = workspace.documentsChecklist.filter(d => d.mandatory && d.status !== 'Ready' && d.status !== 'Signed');
      const overdueTasks = workspace.tasks.filter(t => !t.completed && getTaskUrgencyInfo(t.dueDate, t.completed).isOverdue);
      const blockedTasks = workspace.tasks.filter(t => !t.completed && t.status === 'Blocked');
      const totalDays = calculateDaysRemaining(workspace.deadline);

      let newAlert: AgentReadinessAlert;

      if (totalDays !== null && totalDays <= 3 && (missingMandatory.length > 0 || overdueTasks.length > 0 || blockedTasks.length > 0)) {
        newAlert = {
          level: 'CRITICAL',
          headline: `High Escalation Risk: Deadline in ${totalDays} day(s) with ${blockedTasks.length} blocked and ${overdueTasks.length} overdue task(s).`,
          details: `Mandatory documents pending: ${missingMandatory.map(d => d.name).join(', ') || 'None'}. Executive intervention required to unblock departmental deliverables.`,
          recommendedActions: [
            `Escalate blocked items directly to Department Heads and ${approverName}.`,
            'Convene daily 15-minute submission standup with proposal lead team.',
            'Prepare draft documents for early compliance pre-check.'
          ],
          evaluatedAt: new Date().toISOString()
        };
      } else if (missingMandatory.length > 0 || overdueTasks.length > 0 || blockedTasks.length > 0) {
        newAlert = {
          level: 'WARNING',
          headline: `Attention Required: ${overdueTasks.length} task(s) overdue and ${blockedTasks.length} blocked item(s).`,
          details: `${missingMandatory.length} mandatory document(s) still require finalisation. Lead ${proposalLeadName} coordinating with department assignees.`,
          recommendedActions: [
            'Follow up on outstanding budget sign-off and partner letters.',
            'Ensure technical narrative sections undergo peer review.'
          ],
          evaluatedAt: new Date().toISOString()
        };
      } else {
        newAlert = {
          level: 'READY',
          headline: 'Application Ready for Internal Review & Submission Sign-Off',
          details: `All ${workspace.documentsChecklist.length} cataloged documents and ${workspace.tasks.length} preparation tasks are marked complete.`,
          recommendedActions: [
            `Obtain formal sign-off from Final Approver (${approverName}).`,
            'Perform final packaging and upload via submission portal.',
            'Click "Record Submission" once the confirmation receipt is received.'
          ],
          evaluatedAt: new Date().toISOString()
        };
      }

      const updated = {
        ...workspace,
        readinessAlert: newAlert,
        updatedAt: new Date().toISOString()
      };
      onUpdateWorkspace(updated);
      setIsEvaluating(false);
    }, 600);
  };

  // Metrics for Progress Donut
  const completedTasks = workspace.tasks.filter(t => t.completed);
  const mandatoryDocs = workspace.documentsChecklist.filter(d => d.mandatory);
  const readyMandatoryDocs = mandatoryDocs.filter(d => d.status === 'Ready' || d.status === 'Signed');
  const readyAllDocs = workspace.documentsChecklist.filter(d => d.status === 'Ready' || d.status === 'Signed');
  const readyDocs = readyMandatoryDocs;

  // Filtered Tasks list
  const filteredTasks = workspace.tasks.filter(task => {
    // Status Filter
    if (taskFilter === 'OVERDUE') {
      const urgency = getTaskUrgencyInfo(task.dueDate, task.completed);
      if (task.completed || !urgency.isOverdue) return false;
    } else if (taskFilter === 'BLOCKED') {
      if (task.completed || task.status !== 'Blocked') return false;
    } else if (taskFilter === 'DUE_SOON') {
      const urgency = getTaskUrgencyInfo(task.dueDate, task.completed);
      if (task.completed || !['due_today', 'due_soon'].includes(urgency.status)) return false;
    } else if (taskFilter === 'COMPLETED') {
      if (!task.completed) return false;
    }

    // Staff Filter
    if (taskStaffFilter !== 'ALL' && task.assignedTo !== taskStaffFilter) {
      return false;
    }

    // Department Filter
    if (taskDeptFilter !== 'ALL') {
      const staffMember = staffDirectory.find(s => s.fullName === task.assignedTo);
      const taskDept = task.departmentName || staffMember?.department || 'General';
      if (taskDept !== taskDeptFilter) {
        return false;
      }
    }

    // Review Status Filter
    if (taskReviewFilter !== 'ALL') {
      const reviewStatus = task.departmentReviewStatus || (task.completed ? 'Approved' : 'Drafting');
      if (reviewStatus !== taskReviewFilter) {
        return false;
      }
    }

    return true;
  });

  // Unique staff assignees across tasks
  const uniqueAssignees = Array.from(new Set(workspace.tasks.map(t => t.assignedTo).filter(Boolean)));
  // Unique departments across tasks
  const uniqueDepartments = Array.from(
    new Set(
      workspace.tasks
        .map(t => t.departmentName || staffDirectory.find(s => s.fullName === t.assignedTo)?.department)
        .filter(Boolean)
    )
  ) as string[];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <button
          onClick={onBackToList}
          className="flex items-center gap-1 hover:text-slate-800 transition font-medium"
        >
          ← Back to Pipelines & Opportunities
        </button>

        <div className="flex items-center gap-3">
          <span className="text-slate-400">ID: {workspace.id}</span>
          <span>•</span>
          <span className="text-slate-400">Last updated: {formatDate(workspace.updatedAt)}</span>
        </div>
      </div>

      {/* Main Workspace Header Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                {workspace.donor}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                {workspace.thematicArea}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 text-slate-700">
                {workspace.countryScope}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 leading-tight">
              {workspace.title}
            </h1>

            {/* Financials & Deadline */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1 font-semibold text-slate-900">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                {workspace.fundingAmount} {workspace.currency}
              </span>
              <span className="flex items-center gap-1 font-semibold text-slate-900">
                <Calendar className="w-3.5 h-3.5 text-rose-600" />
                Donor Deadline: {formatDeadline(workspace.deadline, workspace.deadlineVerificationStatus)}
              </span>
              {workspace.deadlineVerificationStatus && (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                    normalizeVerificationStatus(workspace.deadlineVerificationStatus) === 'Confirmed from Source'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : normalizeVerificationStatus(workspace.deadlineVerificationStatus) === 'Human Verified'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : normalizeVerificationStatus(workspace.deadlineVerificationStatus) === 'Needs Verification'
                      ? 'bg-amber-100 text-amber-950 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {normalizeVerificationStatus(workspace.deadlineVerificationStatus) === 'Confirmed from Source' && (
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" />
                  )}
                  {normalizeVerificationStatus(workspace.deadlineVerificationStatus) === 'Human Verified' && (
                    <UserCheck className="w-2.5 h-2.5 text-blue-700" />
                  )}
                  {normalizeVerificationStatus(workspace.deadlineVerificationStatus) === 'Needs Verification' && (
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                  )}
                  {normalizeVerificationStatus(workspace.deadlineVerificationStatus) === 'Not Stated in Source' && (
                    <HelpCircle className="w-2.5 h-2.5 text-slate-500" />
                  )}
                  {normalizeVerificationStatus(workspace.deadlineVerificationStatus)}
                </span>
              )}
              <button
                onClick={() => {
                  setEditDeadlineInput(workspace.deadline || '');
                  setEditDeadlineSnippet(workspace.deadlineToSourceSnippet || '');
                  setShowEditDeadlineModal(true);
                }}
                className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
                title="Edit / Verify Application Deadline"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            </div>
            {workspace.deadlineToSourceSnippet && (
              <p className="text-[11px] text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded border border-slate-200/70 max-w-2xl">
                Source: &quot;{workspace.deadlineToSourceSnippet}&quot;
              </p>
            )}

            {/* PROPOSAL LEADERSHIP POD — show only roles that are in the active chain
                and only when they are assigned to someone distinct from the previous role */}
            <div className="pt-2 flex items-center gap-2 flex-wrap">
              {/* Proposal Lead is always shown */}
              <div className="flex items-center gap-2 bg-indigo-50/70 border border-indigo-200/80 px-3 py-1.5 rounded-lg text-xs">
                <UserCheck className="w-4 h-4 text-indigo-700" />
                <span className="text-indigo-600 font-semibold">Proposal Lead:</span>
                <strong className="text-slate-900">{proposalLeadName}</strong>
              </div>

              {/* Reviewer: only show if Reviewer is in the active chain AND is someone different */}
              {resolveChain(orgProfile.approvalChain, workspace.approvalChain).includes('Reviewer') &&
                reviewerName !== 'Unassigned' &&
                reviewerName !== proposalLeadName && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-400 font-medium">Reviewer:</span>
                  <strong className="text-slate-800">{reviewerName}</strong>
                </div>
              )}

              {/* Approver: only show if assigned and different from proposal lead */}
              {approverName !== 'Unassigned' && approverName !== proposalLeadName && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
                  <span className="text-slate-400 font-medium">Final Approver:</span>
                  <strong className="text-slate-800">{approverName}</strong>
                </div>
              )}

              <button
                onClick={() => {
                  setLeadStaffInput(proposalLeadName);
                  setReviewerInput(reviewerName);
                  setApproverInput(approverName);
                  setShowLeadershipModal(true);
                }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-slate-100 transition"
                title="Edit Proposal Leadership Roles"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right Header: Mini Progress Donut + Days Countdown & Action Box */}
          <div className="flex flex-col sm:flex-row lg:flex-row items-start sm:items-center gap-4 shrink-0 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            {/* Header Mini Progress Donut */}
            <div className="flex items-center gap-3 pr-2 sm:border-r border-slate-200">
              <ProgressDonutChart
                completedTasks={completedTasks.length}
                totalTasks={workspace.tasks.length}
                readyDocs={readyAllDocs.length}
                totalDocs={workspace.documentsChecklist.length}
                mandatoryReadyDocs={readyMandatoryDocs.length}
                totalMandatoryDocs={mandatoryDocs.length}
                size="sm"
                showLegend={false}
                onNavigateTab={tab => setActiveTab(tab as any)}
              />
              <div className="flex flex-col text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Readiness
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('tasks')}
                  className="font-bold text-emerald-700 hover:underline text-left text-[11px] flex items-center gap-1 mt-0.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  {completedTasks.length}/{workspace.tasks.length} Tasks
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className="font-bold text-indigo-700 hover:underline text-left text-[11px] flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                  {readyAllDocs.length}/{workspace.documentsChecklist.length} Docs
                </button>
              </div>
            </div>

            {/* Days Countdown & Submission Action Box */}
            <div className="flex flex-col items-start sm:items-end gap-2.5 shrink-0">
              {daysRemaining !== null ? (
                <div
                  className={`px-3.5 py-1.5 rounded-lg text-center border font-bold flex items-center gap-2 ${
                    daysRemaining <= 3
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : daysRemaining <= 7
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <div className="text-left">
                    <div className="text-sm font-extrabold leading-none">
                      {daysRemaining > 0 ? `${daysRemaining} Days Left` : 'Deadline Today / Passed'}
                    </div>
                    <div className="text-[9px] font-normal uppercase tracking-wider">
                      {daysRemaining <= 3 ? 'URGENT WATCH' : 'Time Remaining'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                  {formatDeadline(workspace.deadline, workspace.deadlineVerificationStatus)}
                </div>
              )}

              {/* Quick Action Button */}
              {workspace.stage !== 'Submitted' && workspace.stage !== 'Awaiting Decision' && workspace.stage !== 'Awarded' && workspace.stage !== 'Rejected' ? (
                <button
                  onClick={() => setShowSubmissionModal(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Record Submission
                </button>
              ) : (
                <button
                  onClick={() => setShowOutcomeModal(true)}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5"
                >
                  <Award className="w-3.5 h-3.5" />
                  Update Donor Outcome
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Stage Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Application Pipeline Stage:
            </span>
            <select
              value={workspace.stage}
              onChange={e => handleStageChange(e.target.value as PipelineStage)}
              className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-md px-2.5 py-1 focus:ring-2 focus:ring-indigo-500"
            >
              {pipelineStages.map(stg => (
                <option key={stg} value={stg}>
                  {stg}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-5 md:grid-cols-10 gap-1 text-center">
            {pipelineStages.map((stage, idx) => {
              const currentIdx = pipelineStages.indexOf(workspace.stage);
              const isCurrent = stage === workspace.stage;
              const isPast = idx < currentIdx;

              return (
                <button
                  key={stage}
                  onClick={() => handleStageChange(stage)}
                  className={`py-1.5 px-1 rounded text-[10px] font-medium transition truncate ${
                    isCurrent
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : isPast
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                  title={`Move to ${stage}`}
                >
                  {stage}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottleneck & Accountability Diagnosis Box */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
          bottleneckDiagnosis.requiresImmediateIntervention
            ? 'bg-rose-50 border-rose-200 text-rose-950'
            : bottleneckDiagnosis.status === 'BLOCKED'
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}
      >
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border ${bottleneckDiagnosis.statusBadgeClass}`}
            >
              {bottleneckDiagnosis.status}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Proposal Lead: <strong className="text-slate-800">{proposalLeadName}</strong>
            </span>
            {bottleneckDiagnosis.primaryBottleneckDept && (
              <span className="text-xs text-slate-500">
                • Bottleneck in <strong>{bottleneckDiagnosis.primaryBottleneckDept}</strong>
              </span>
            )}
          </div>

          <h3 className="text-sm font-bold flex items-center gap-1.5 mt-1">
            {bottleneckDiagnosis.requiresImmediateIntervention && (
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            {bottleneckDiagnosis.headline}
          </h3>

          {bottleneckDiagnosis.bottlenecks.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {bottleneckDiagnosis.bottlenecks.map((b, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-medium bg-white/80 px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1 text-slate-800"
                >
                  <span>📌 {b.task.title}</span>
                  <span className="text-slate-400">|</span>
                  <span>Assigned: {b.assignedStaff}</span>
                  {b.isOverdue && <span className="text-rose-600 font-bold">({b.daysOverdue}d overdue)</span>}
                  {b.isBlocked && <span className="text-amber-700 font-bold">(Blocked)</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('team')}
            className="px-3.5 py-2 text-xs font-bold bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-xs transition flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            View Team Assignments
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderCheck className="w-4 h-4" />
          Readiness & Overview
        </button>

        <button
          onClick={() => setActiveTab('application')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'application'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck className="w-4 h-4 text-indigo-600" />
          <span>Application Workspace</span>
          {workspace.applicationSections && workspace.applicationSections.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              {workspace.applicationSections.filter(s => isApprovedForSubmission(s.reviewStatus)).length}/{workspace.applicationSections.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'team'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team & Assignments</span>
          {(workspace.assignedOfficers || []).length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
              {workspace.assignedOfficers?.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'documents'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Supporting Documents ({readyDocs.length}/{mandatoryDocs.length})
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'tasks'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Preparation Tasks ({completedTasks.length}/{workspace.tasks.length})</span>
          {workspace.tasks.some(t => !t.completed && getTaskUrgencyInfo(t.dueDate, t.completed).isOverdue) && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white animate-pulse">
              {workspace.tasks.filter(t => !t.completed && getTaskUrgencyInfo(t.dueDate, t.completed).isOverdue).length} Overdue
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'questions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Questions & Compliance ({workspace.outstandingQuestions.length})
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'notes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Internal Notes ({workspace.internalNotes.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          Audit Trail ({(workspace.auditTrail || []).length})
        </button>

        {workspace.submissionRecord && (
          <button
            onClick={() => setActiveTab('submission')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'submission'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-emerald-600 hover:text-emerald-800'
            }`}
          >
            <Send className="w-4 h-4" />
            Submission Record ✓
          </button>
        )}
      </div>

      {/* APPLICATION WORKSPACE TAB */}
      {activeTab === 'application' && (
        <ApplicationWorkspaceTab
          workspace={workspace}
          orgProfile={orgProfile || { name: 'My Organisation', country: 'Nigeria', thematicAreas: [] } as OrgProfile}
          onUpdateWorkspace={onUpdateWorkspace}
          onOpenFormatModal={() => setShowFormatModal(true)}
        />
      )}

      {/* TAB 1: READINESS & OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Progress Donut & Quick Metrics Breakdown */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Proposal Readiness & Completion Progress
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time tracking of internal tasks and mandatory document requirements
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-bold ${
                  readyDocs.length === mandatoryDocs.length && completedTasks.length === workspace.tasks.length
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {readyDocs.length === mandatoryDocs.length && completedTasks.length === workspace.tasks.length ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                      All Requirements Met
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      In Progress ({mandatoryDocs.length - readyDocs.length} mandatory docs, {workspace.tasks.length - completedTasks.length} tasks remaining)
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* Donut Chart with interactive legend */}
              <div className="lg:col-span-5 flex justify-center lg:justify-start bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                <ProgressDonutChart
                  completedTasks={completedTasks.length}
                  totalTasks={workspace.tasks.length}
                  readyDocs={readyAllDocs.length}
                  totalDocs={workspace.documentsChecklist.length}
                  mandatoryReadyDocs={readyMandatoryDocs.length}
                  totalMandatoryDocs={mandatoryDocs.length}
                  size="md"
                  showLegend={true}
                  onNavigateTab={tab => setActiveTab(tab as any)}
                />
              </div>

              {/* Progress Detail Cards */}
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Mandatory Documents Progress Card */}
                <div
                  onClick={() => setActiveTab('documents')}
                  className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-xl border border-slate-200 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                      Mandatory Documents
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {readyDocs.length}/{mandatoryDocs.length} Ready
                    </span>
                    <span className="text-xs font-bold text-indigo-600">
                      {mandatoryDocs.length > 0 ? Math.round((readyDocs.length / mandatoryDocs.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{ width: `${mandatoryDocs.length > 0 ? (readyDocs.length / mandatoryDocs.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                    <span>{workspace.documentsChecklist.length} total cataloged files</span>
                    <span className="text-indigo-600 font-semibold group-hover:underline">View checklist →</span>
                  </div>
                </div>

                {/* Tasks Progress Card */}
                <div
                  onClick={() => setActiveTab('tasks')}
                  className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-xl border border-slate-200 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5 text-emerald-600" />
                      Internal Tasks
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl font-extrabold text-slate-900">
                      {completedTasks.length}/{workspace.tasks.length} Done
                    </span>
                    <span className="text-xs font-bold text-emerald-600">
                      {workspace.tasks.length > 0 ? Math.round((completedTasks.length / workspace.tasks.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${workspace.tasks.length > 0 ? (completedTasks.length / workspace.tasks.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-2 flex items-center justify-between">
                    <span>
                      {workspace.tasks.filter(t => !t.completed && getTaskUrgencyInfo(t.dueDate, t.completed).isOverdue).length > 0 ? (
                        <span className="text-rose-600 font-bold">
                          {workspace.tasks.filter(t => !t.completed && getTaskUrgencyInfo(t.dueDate, t.completed).isOverdue).length} overdue
                        </span>
                      ) : (
                        <span>All on schedule</span>
                      )}
                    </span>
                    <span className="text-emerald-600 font-semibold group-hover:underline">View tasks →</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proposal Preparation Milestones */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Proposal Preparation Milestones
              </h3>
              <span className="text-xs text-slate-500">Track key governance gates and draft delivery targets</span>
            </div>

            <div className="space-y-3">
              {workspace.milestones.map(ms => {
                const milestoneUrgency = getMilestoneUrgencyInfo(ms.targetDate, ms.completed);
                return (
                  <div
                    key={ms.id}
                    className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      ms.completed
                        ? 'bg-slate-50/70 border-slate-200 opacity-75'
                        : milestoneUrgency.isOverdue
                        ? 'bg-rose-50/70 border-rose-300'
                        : milestoneUrgency.status === 'due_today'
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={ms.completed}
                        onChange={() => handleToggleMilestone(ms.id)}
                        className="w-4 h-4 mt-0.5 sm:mt-0 text-indigo-600 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-semibold ${ms.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {ms.title}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>
                            {ms.targetDate ? (
                              <>Target: <strong className="text-slate-700">{formatDeadline(ms.targetDate)}</strong></>
                            ) : (
                              <span className="italic text-slate-400">Internal schedule pending donor deadline verification</span>
                            )}
                          </span>
                          {!ms.completed && (
                            <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${milestoneUrgency.badgeClass}`}>
                              {milestoneUrgency.badgeLabel}
                            </span>
                          )}
                          {ms.isManuallyEdited && (
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium border border-indigo-100">
                              Manually Edited
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <input
                        type="date"
                        value={ms.targetDate || ''}
                        onChange={e => handleMilestoneDateChange(ms.id, e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-700 focus:ring-1 focus:ring-indigo-500"
                        title="Set or adjust target date"
                      />
                      <span className={`text-xs font-bold ${ms.completed ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {ms.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TEAM & RESPONSIBILITIES */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Leadership Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Proposal Lead */}
            <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    Primary Coordination
                  </span>
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">
                  Proposal Lead
                </h3>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {proposalLeadName}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Responsible for end-to-end coordination, donor compliance, and on-time draft synthesis.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {workspace.tasks.filter(t => t.assignedTo === proposalLeadName).length} tasks directly assigned
                </span>
                <button
                  onClick={() => setShowLeadershipModal(true)}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Change Lead
                </button>
              </div>
            </div>

            {/* Reviewer */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Technical & Budget Review
                  </span>
                  <ShieldCheck className="w-4 h-4 text-slate-600" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">
                  Internal Reviewer
                </h3>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {reviewerName}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Validates technical logic, indicator alignment, and budget consistency before approval.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Pre-submission gate</span>
                <button
                  onClick={() => setShowLeadershipModal(true)}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Change Reviewer
                </button>
              </div>
            </div>

            {/* Final Approver */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                    Executive Sign-Off
                  </span>
                  <Lock className="w-4 h-4 text-purple-600" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-3">
                  Final Approver
                </h3>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {approverName}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Executive management authority to sign institutional commitment and authorize portal upload.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">Institutional sign-off</span>
                <button
                  onClick={() => setShowLeadershipModal(true)}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Change Approver
                </button>
              </div>
            </div>
          </div>

          {/* ASSIGNED OFFICERS & PROPOSAL RESPONSIBILITIES */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                    Staff Delegation
                  </span>
                  <span className="text-xs text-slate-400">Designated Officers & Technical Workstreams</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Assigned Officers & Proposal Roles
                </h3>
                <p className="text-xs text-slate-500">
                  Assign designated officers to lead narrative drafting, budget formulation, MEAL frameworks, and compliance tasks with individual deadlines and instructions.
                </p>
              </div>

              <button
                onClick={handleOpenAssignOfficer}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign Officer
              </button>
            </div>

            {(!workspace.assignedOfficers || workspace.assignedOfficers.length === 0) ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <Users className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-800">No Dedicated Officers Assigned Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Click <strong>Assign Officer</strong> to assign real staff members from your organisation to lead the budget narrative, technical approach, MEAL framework, or governance compliance.
                </p>
                <button
                  onClick={handleOpenAssignOfficer}
                  className="mt-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assign First Officer
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workspace.assignedOfficers.map((officer) => {
                  const diff = getDaysDifference(officer.deadline);
                  const isCompleted = officer.status === 'Completed';
                  const isSubmitted = officer.status === 'Submitted for Review';
                  const isInProgress = officer.status === 'In Progress';

                  return (
                    <div
                      key={officer.id}
                      className={`rounded-xl border p-4 shadow-xs flex flex-col justify-between transition ${
                        isCompleted
                          ? 'bg-emerald-50/30 border-emerald-200'
                          : isSubmitted
                          ? 'bg-amber-50/30 border-amber-200'
                          : isInProgress
                          ? 'bg-blue-50/30 border-blue-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {officer.staffName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 leading-tight">{officer.staffName}</h4>
                              <p className="text-[11px] text-slate-500">{officer.department}</p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isSubmitted
                                ? 'bg-amber-100 text-amber-900'
                                : isInProgress
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {officer.status}
                          </span>
                        </div>

                        <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-2.5 space-y-1">
                          <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                            Proposal Responsibility
                          </div>
                          <div className="text-xs font-bold text-slate-900">
                            {officer.responsibility}
                          </div>
                          {officer.instructions && (
                            <p className="text-[11px] text-slate-600 italic line-clamp-2 mt-1">
                              &quot;{officer.instructions}&quot;
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {formatDeadline(officer.deadline)}
                          </span>
                          {diff !== null && !isCompleted && (
                            <span
                              className={`font-bold ${
                                diff < 0 ? 'text-rose-600' : diff <= 3 ? 'text-amber-600' : 'text-slate-500'
                              }`}
                            >
                              {diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d left`}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setReassignOfficerTarget(officer);
                              setNewOfficerChoice(officer.staffName);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition"
                            title="Reassign to another staff member"
                          >
                            Reassign
                          </button>
                          <button
                            onClick={() => {
                              setDeadlineOfficerTarget(officer);
                              setNewOfficerDeadlineInput(officer.deadline);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition"
                            title="Change deadline"
                          >
                            Deadline
                          </button>
                          <button
                            onClick={() => {
                              setReviewOfficerTarget(officer);
                              setReviewOfficerStatusChoice(officer.status);
                              setReviewOfficerNotes(officer.submissionNotes || '');
                            }}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded text-[11px] transition"
                            title="Review progress and update status"
                          >
                            Status
                          </button>
                        </div>

                        <button
                          onClick={() => handleRemoveOfficerAssignment(officer.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                          title="Remove assignment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Departmental Line Management & Contribution Sign-Off Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                    Institutional Hierarchy & Supervision
                  </span>
                  <span className="text-xs text-slate-400">Proposal Coordination vs. Staff Line Management</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1">
                  <Building className="w-5 h-5 text-indigo-600" />
                  Departmental Contributions & Line Manager Sign-Off
                </h3>
                <p className="text-xs text-slate-500">
                  Staff produce deliverables under their respective Department Head's supervision. The Proposal Lead ({proposalLeadName}) coordinates the overall synthesis.
                </p>
              </div>
            </div>

            {/* Department Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['Programs', 'Finance', 'M&E', 'Communications'].map(dept => {
                const deptTasks = workspace.tasks.filter(t => {
                  const s = staffDirectory.find(staff => staff.fullName === t.assignedTo);
                  return (t.departmentName || s?.department) === dept;
                });
                const deptStaff = staffDirectory.filter(s => s.department === dept);
                const hod = deptStaff.find(s => s.isDepartmentHead) || {
                  fullName: dept === 'Finance' ? 'Marcus Vance' : dept === 'Programs' ? 'Dr. Sarah Okafor' : dept === 'M&E' ? 'Dr. Sarah Okafor' : 'Elena Rostova',
                  jobTitle: `${dept} Lead / Line Manager`
                };

                const pendingReview = deptTasks.filter(t => t.departmentReviewStatus === 'Submitted to Department Head' && !t.completed);
                const returned = deptTasks.filter(t => t.departmentReviewStatus === 'Returned for Revision');
                const approved = deptTasks.filter(t => t.departmentReviewStatus === 'Approved' || t.completed);
                const drafting = deptTasks.filter(t => !t.completed && (!t.departmentReviewStatus || t.departmentReviewStatus === 'Drafting'));

                const isFullyApproved = deptTasks.length > 0 && approved.length === deptTasks.length;

                return (
                  <div
                    key={dept}
                    className={`p-4 rounded-xl border transition ${
                      deptTasks.length === 0
                        ? 'bg-slate-50/50 border-slate-200 opacity-60'
                        : isFullyApproved
                        ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200'
                        : returned.length > 0
                        ? 'bg-amber-50/40 border-amber-300'
                        : pendingReview.length > 0
                        ? 'bg-blue-50/40 border-blue-300'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        {dept}
                      </span>
                      {deptTasks.length === 0 ? (
                        <span className="text-[10px] text-slate-400">No tasks</span>
                      ) : isFullyApproved ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          HoD Approved
                        </span>
                      ) : pendingReview.length > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {pendingReview.length} Pending HoD
                        </span>
                      ) : returned.length > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-900">
                          {returned.length} In Revision
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-200 text-slate-700">
                          {drafting.length} Drafting
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-xs">
                      <div className="text-[11px] text-slate-500">
                        Line Manager: <strong className="text-slate-800">{hod.fullName}</strong>
                      </div>
                      <div className="text-[10px] text-slate-400">{hod.jobTitle}</div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                      <span>{deptTasks.length} assigned deliverable{deptTasks.length === 1 ? '' : 's'}</span>
                      <span className="font-semibold text-slate-900">{approved.length}/{deptTasks.length} sign-offs</span>
                    </div>

                    {/* Quick filter button */}
                    {deptTasks.length > 0 && (
                      <button
                        onClick={() => {
                          setTaskDeptFilter(dept);
                          setActiveTab('tasks');
                        }}
                        className="mt-2 w-full text-center py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50/50 rounded transition"
                      >
                        View {dept} Tasks →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Task Responsibility Matrix */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-indigo-600" />
                  Task Responsibility & Departmental Accountability Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Detailed view of operational assignments, department bottlenecks, and blocker status.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddTask(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Assign Task
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3">Task Name</th>
                    <th className="py-3 px-3">Assigned Staff</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Blocker / Dependency</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workspace.tasks.map(task => {
                    const effStatus = computeTaskEffectiveStatus(task);
                    const diff = getDaysDifference(task.dueDate);
                    const staffRec = staffDirectory.find(s => s.fullName === task.assignedTo);

                    return (
                      <tr
                        key={task.id}
                        className={`hover:bg-slate-50/60 transition ${
                          task.completed
                            ? 'bg-slate-50/30 text-slate-400'
                            : effStatus === 'Overdue'
                            ? 'bg-rose-50/40 text-slate-900'
                            : effStatus === 'Blocked'
                            ? 'bg-amber-50/40 text-slate-900'
                            : 'text-slate-800'
                        }`}
                      >
                        {/* Task Title */}
                        <td className="py-3 px-3 font-semibold max-w-[240px]">
                          <div className={`line-clamp-2 ${task.completed ? 'line-through text-slate-400' : ''}`}>
                            {task.title}
                          </div>
                          {task.section && (
                            <span className="font-mono text-[9px] bg-slate-100 px-1 py-0.2 rounded text-slate-500 mt-0.5 inline-block">
                              {task.section}
                            </span>
                          )}
                        </td>

                        {/* Assignee */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{task.assignedTo}</div>
                          {staffRec && (
                            <div className="text-[10px] text-slate-500">
                              {staffRec.department}
                            </div>
                          )}
                        </td>

                        {/* Due Date */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-medium">{formatDeadline(task.dueDate)}</div>
                          {diff !== null && !task.completed && (
                            <div
                              className={`text-[10px] font-bold ${
                                diff < 0 ? 'text-rose-600' : diff <= 3 ? 'text-amber-600' : 'text-slate-400'
                              }`}
                            >
                              {diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d left`}
                            </div>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                              task.priority === 'High'
                                ? 'bg-rose-100 text-rose-800'
                                : task.priority === 'Medium'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {task.priority}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
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
                        </td>

                        {/* Blocker Reason */}
                        <td className="py-3 px-3 max-w-[200px]">
                          {task.blockerReason ? (
                            <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-1.5 rounded">
                              <strong>⚠️ {task.blockerReason}</strong>
                              {task.blockerNotes && <p className="text-[10px] text-slate-600 mt-0.5">{task.blockerNotes}</p>}
                            </div>
                          ) : task.notes ? (
                            <span className="text-[11px] text-slate-500 italic">{task.notes}</span>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleTask(task.id)}
                              className={`p-1.5 rounded border text-xs font-semibold ${
                                task.completed
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                              }`}
                              title={task.completed ? 'Mark Incomplete' : 'Mark Complete'}
                            >
                              {task.completed ? 'Reopen' : 'Done ✓'}
                            </button>

                            {!task.completed && (
                              task.status === 'Blocked' ? (
                                <button
                                  onClick={() => handleResolveBlocker(task.id, task.title)}
                                  className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold"
                                  title="Unblock Task"
                                >
                                  Unblock
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setBlockerModalTask(task);
                                    setBlockerReasonChoice('Missing Finance budget');
                                    setBlockerNotesInput(task.notes || '');
                                  }}
                                  className="px-2 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded text-[11px] font-semibold"
                                  title="Flag as Blocked"
                                >
                                  Flag Blocked
                                </button>
                              )
                            )}

                            <button
                              onClick={() => {
                                setReassignTaskTarget(task);
                                setNewAssigneeChoice(task.assignedTo);
                              }}
                              className="px-2 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[11px] font-semibold"
                              title="Reassign to another staff member"
                            >
                              Reassign
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPORTING DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Required Supporting Documents Checklist</h3>
              <p className="text-xs text-slate-500">Track mandatory attachments, financial annexes, and partner letters</p>
            </div>
            <button
              onClick={() => setShowAddDoc(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Document Requirement
            </button>
          </div>

          {showAddDoc && (
            <form onSubmit={handleAddDocument} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add Document Requirement</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Document Name (e.g. 3-Year Detailed Line-Item Budget)"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs md:col-span-2"
                  required
                />
                <select
                  value={newDocCategory}
                  onChange={e => setNewDocCategory(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs"
                >
                  <option value="Technical Proposal">Technical Proposal</option>
                  <option value="Financial / Budget">Financial / Budget</option>
                  <option value="Legal & Governance">Legal & Governance</option>
                  <option value="M&E Plan">M&E Plan</option>
                  <option value="Partner & Staffing">Partner & Staffing</option>
                  <option value="Safeguarding & Policies">Safeguarding & Policies</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={newDocMandatory}
                    onChange={e => setNewDocMandatory(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  Mandatory Submission Requirement
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddDoc(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold"
                  >
                    Save Requirement
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {workspace.documentsChecklist.map(doc => (
              <div
                key={doc.id}
                className="p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{doc.name}</span>
                    {doc.mandatory && (
                      <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-50 text-rose-700 border border-rose-200">
                        MANDATORY
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                      {doc.category}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-3">
                    <span>Responsible: {doc.assignedTo || proposalLeadName}</span>
                    {doc.format && <span>• Format: {doc.format}</span>}
                    {doc.templateUrl && (
                      <span>• <a href={doc.templateUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">Template Available</a></span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <select
                    value={doc.status}
                    onChange={e => handleDocStatusChange(doc.id, e.target.value as any)}
                    className={`text-xs font-bold rounded-lg px-3 py-1.5 border transition ${
                      doc.status === 'Ready' || doc.status === 'Signed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : doc.status === 'Under Review' || doc.status === 'Drafting'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    <option value="Missing">❌ Missing</option>
                    <option value="Drafting">✍️ Drafting</option>
                    <option value="Under Review">🔍 Under Review</option>
                    <option value="Signed">✍️ Signed</option>
                    <option value="Ready">✅ Ready for Upload</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TASKS CHECKLIST */}
      {activeTab === 'tasks' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Internal Preparation Tasks</h3>
              <p className="text-xs text-slate-500">Actionable assignments with staff responsibility, urgency alerts, and due dates</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="add-task-btn"
                onClick={() => setShowAddTask(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
            </div>
          </div>

          {/* Task Filtering Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-400 flex items-center gap-1 text-[11px] font-medium mr-1">
                <Filter className="w-3 h-3" />
                Filter:
              </span>
              <button
                onClick={() => setTaskFilter('ALL')}
                className={`px-3 py-1 rounded-full font-medium transition ${
                  taskFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Tasks ({workspace.tasks.length})
              </button>
              <button
                onClick={() => setTaskFilter('OVERDUE')}
                className={`px-3 py-1 rounded-full font-medium flex items-center gap-1 transition ${
                  taskFilter === 'OVERDUE'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                <span>🚨 Overdue</span>
                <span className="font-bold">
                  ({workspace.tasks.filter(t => !t.completed && getTaskUrgencyInfo(t.dueDate, t.completed).isOverdue).length})
                </span>
              </button>
              <button
                onClick={() => setTaskFilter('BLOCKED')}
                className={`px-3 py-1 rounded-full font-medium flex items-center gap-1 transition ${
                  taskFilter === 'BLOCKED'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <span>⚠️ Blocked</span>
                <span className="font-bold">
                  ({workspace.tasks.filter(t => !t.completed && t.status === 'Blocked').length})
                </span>
              </button>
              <button
                onClick={() => setTaskFilter('DUE_SOON')}
                className={`px-3 py-1 rounded-full font-medium flex items-center gap-1 transition ${
                  taskFilter === 'DUE_SOON'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <span>⏰ Due Soon</span>
                <span className="font-bold">
                  ({workspace.tasks.filter(t => !t.completed && ['due_today', 'due_soon'].includes(getTaskUrgencyInfo(t.dueDate, t.completed).status)).length})
                </span>
              </button>
              <button
                onClick={() => setTaskFilter('COMPLETED')}
                className={`px-3 py-1 rounded-full font-medium flex items-center gap-1 transition ${
                  taskFilter === 'COMPLETED'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <span>✓ Completed</span>
                <span className="font-bold">({workspace.tasks.filter(t => t.completed).length})</span>
              </button>
            </div>

            {/* Staff, Department & Review Filters */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Department Filter */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px] font-medium">Dept:</span>
                <select
                  value={taskDeptFilter}
                  onChange={(e) => setTaskDeptFilter(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="ALL">All Depts</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Review Status Filter */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px] font-medium">Review:</span>
                <select
                  value={taskReviewFilter}
                  onChange={(e) => setTaskReviewFilter(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700"
                >
                  <option value="ALL">All Review States</option>
                  <option value="Drafting">Drafting</option>
                  <option value="Submitted to Department Head">Submitted to HoD</option>
                  <option value="Returned for Revision">Returned for Revision</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>

              {/* Staff Filter Dropdown */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 text-[11px] font-medium">Staff:</span>
                <select
                  value={taskStaffFilter}
                  onChange={(e) => setTaskStaffFilter(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 max-w-[130px]"
                >
                  <option value="ALL">All Staff</option>
                  {uniqueAssignees.map(staff => (
                    <option key={staff} value={staff}>{staff}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {showAddTask && (
            <form onSubmit={handleAddTask} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Add Internal Task</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Task title (e.g. Align M&E framework indicators)"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs md:col-span-2"
                  required
                />
                <select
                  value={newTaskAssignee}
                  onChange={e => setNewTaskAssignee(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                >
                  {staffDirectory.map(s => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName} ({s.department})
                    </option>
                  ))}
                  {!staffDirectory.some(s => s.fullName === newTaskAssignee) && (
                    <option value={newTaskAssignee}>{newTaskAssignee}</option>
                  )}
                </select>
                <select
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs bg-white"
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-600 font-medium">Due Date:</label>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={e => setNewTaskDueDate(e.target.value)}
                    className="px-3 py-1 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddTask(false)}
                    className="px-3 py-1 text-xs text-slate-600 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-semibold"
                  >
                    Save Task
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-2.5">
            {filteredTasks.map(task => {
              const urgency = getTaskUrgencyInfo(task.dueDate, task.completed);
              const isTarget = highlightedTaskId === task.id;
              const staffMember = staffDirectory.find(s => s.fullName === task.assignedTo);
              const deptName = task.departmentName || staffMember?.department || 'General';
              const hodName = task.departmentHeadName || staffMember?.reportsTo || 'Line Manager';
              const revStatus = task.departmentReviewStatus || (task.completed ? 'Approved' : 'Drafting');

              return (
                <div
                  key={task.id}
                  ref={isTarget ? highlightedTaskRef : undefined}
                  className={`p-3.5 rounded-lg border transition ${
                    isTarget
                      ? 'ring-2 ring-indigo-600 border-indigo-500 bg-indigo-50/40 shadow-xs'
                      : task.completed || revStatus === 'Approved'
                      ? 'bg-slate-50/70 border-slate-200 opacity-90'
                      : revStatus === 'Submitted to Department Head'
                      ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-100'
                      : revStatus === 'Returned for Revision'
                      ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200'
                      : urgency.isOverdue
                      ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-200'
                      : task.status === 'Blocked'
                      ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-200'
                      : urgency.status === 'due_today'
                      ? 'bg-amber-50/50 border-amber-300'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => handleToggleTask(task.id)}
                        className="w-4 h-4 mt-0.5 text-indigo-600 rounded cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </span>

                          {/* Department Review Status Badge */}
                          {revStatus === 'Submitted to Department Head' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 text-blue-600" />
                              Pending HoD Review ({hodName})
                            </span>
                          )}
                          {revStatus === 'Returned for Revision' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                              Revision Requested by {hodName}
                            </span>
                          )}
                          {revStatus === 'Approved' && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                              HoD Approved
                            </span>
                          )}

                          {!task.completed && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md flex items-center gap-1 ${urgency.badgeClass}`}>
                              {urgency.status === 'overdue' && <AlertCircle className="w-2.5 h-2.5" />}
                              {urgency.badgeLabel}
                            </span>
                          )}
                          {task.status === 'Blocked' && !task.completed && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500 text-white flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Blocked: {task.blockerReason}
                            </span>
                          )}
                        </div>

                        {/* Reviewer Note if returned */}
                        {task.reviewNote && revStatus === 'Returned for Revision' && (
                          <div className="text-xs text-amber-900 bg-amber-50 p-2 rounded mt-1.5 border border-amber-200">
                            <strong>Feedback from {hodName}:</strong> {task.reviewNote}
                          </div>
                        )}

                        {task.blockerNotes && !task.completed && (
                          <p className="text-xs text-amber-800 bg-amber-50/80 p-2 rounded mt-1.5 border border-amber-200/80">
                            <strong>Blocker details:</strong> {task.blockerNotes}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800 flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-400" />
                            {task.assignedTo}
                          </span>
                          <span>•</span>
                          <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                            <Building className="w-2.5 h-2.5 text-slate-400" />
                            {deptName}
                          </span>
                          <span>•</span>
                          <span className="text-[11px] text-slate-500">
                            Line Manager: <strong className="text-slate-700">{hodName}</strong>
                          </span>
                          <span>•</span>
                          <span className={`font-medium flex items-center gap-1 ${urgency.isOverdue ? 'text-rose-700 font-semibold' : ''}`}>
                            <span>📅 Due:</span>
                            {task.dueDate ? (
                              <strong>{task.dueDate}</strong>
                            ) : (
                              <span className="italic text-slate-400">No internal due date set</span>
                            )}
                          </span>
                          {task.isManuallyEdited && (
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded font-medium border border-indigo-100">
                              Manually Edited
                            </span>
                          )}
                          {task.section && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                                {task.section}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Controls & Line Manager Reviews */}
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                      <input
                        type="date"
                        value={task.dueDate || ''}
                        onChange={e => handleTaskDueDateChange(task.id, e.target.value)}
                        className="px-2 py-1 text-xs border border-slate-200 rounded bg-slate-50 text-slate-700 focus:ring-1 focus:ring-indigo-500"
                        title="Set or adjust task due date"
                      />
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                          task.priority === 'High'
                            ? 'bg-rose-100 text-rose-800'
                            : task.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {task.priority}
                      </span>

                      {/* Line Manager / HoD Review Action Buttons */}
                      {!task.completed && revStatus !== 'Approved' && (
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                          {revStatus !== 'Submitted to Department Head' && (
                            <button
                              onClick={() => handleSubmitForDepartmentReview(task.id)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-semibold transition flex items-center gap-1"
                              title={`Submit work to Line Manager (${hodName}) for quality check`}
                            >
                              <span>Submit to Line Manager</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}

                          <button
                            onClick={() => handleApproveDepartmentTask(task.id)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                            title={`Approve as Line Manager (${hodName})`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>

                          <button
                            onClick={() => {
                              setRevisionModalTask(task);
                              setRevisionNoteInput(task.reviewNote || '');
                            }}
                            className="px-2 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold transition"
                            title={`Return to ${task.assignedTo} with comments`}
                          >
                            Return ↩
                          </button>
                        </div>
                      )}

                      {!task.completed && (
                        task.status === 'Blocked' ? (
                          <button
                            onClick={() => handleResolveBlocker(task.id, task.title)}
                            className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded text-[11px] font-bold"
                          >
                            Resolve Blocker
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setBlockerModalTask(task);
                              setBlockerReasonChoice('Missing Finance budget');
                              setBlockerNotesInput(task.notes || '');
                            }}
                            className="px-2 py-1 bg-slate-50 text-slate-600 hover:bg-amber-50 hover:text-amber-800 border border-slate-200 rounded text-[11px] font-medium"
                          >
                            Flag Blocked
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTasks.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No tasks match the selected filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: QUESTIONS & COMPLIANCE */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-600" />
              Outstanding Questions & Donor Clarifications
            </h3>

            {workspace.outstandingQuestions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No outstanding donor queries flagged.</p>
            ) : (
              <div className="space-y-3">
                {workspace.outstandingQuestions.map(q => (
                  <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">❓ {q.question}</p>
                      <button
                        onClick={() => handleToggleQuestion(q.id)}
                        className={`px-2 py-0.5 text-xs font-bold rounded ${
                          q.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {q.status}
                      </button>
                    </div>
                    {q.answer && (
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 font-medium">
                        💡 <strong>Resolution:</strong> {q.answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Compliance Checklist
            </h3>
            <div className="space-y-2">
              {workspace.requirementsChecklist.map(req => (
                <div key={req.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{req.title}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{req.notes}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    req.status === 'MET'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : req.status === 'IN_PROGRESS'
                      ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                      : req.status === 'BLOCKED'
                      ? 'bg-rose-100 text-rose-950 border border-rose-300'
                      : 'bg-amber-100 text-amber-950 border border-amber-300'
                  }`}>
                    {req.status === 'MET' && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                    {req.status === 'BLOCKED' && <XCircle className="w-3 h-3 text-rose-700" />}
                    {req.status === 'IN_PROGRESS' && <Clock className="w-3 h-3 text-indigo-700" />}
                    {req.status === 'PENDING' && <AlertTriangle className="w-3 h-3 text-amber-700" />}
                    {req.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: INTERNAL NOTES */}
      {activeTab === 'notes' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Internal Team Coordination Notes
          </h3>

          <form onSubmit={handleAddNote} className="space-y-3">
            <textarea
              rows={3}
              placeholder="Record coordination update, meeting decisions, or technical notes..."
              value={newNoteContent}
              onChange={e => setNewNoteContent(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
              required
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <span>Author:</span>
                <input
                  type="text"
                  value={noteAuthor}
                  onChange={e => setNoteAuthor(e.target.value)}
                  className="px-2 py-1 border border-slate-300 rounded text-xs"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                Post Note
              </button>
            </div>
          </form>

          <div className="space-y-3 pt-3 border-t border-slate-100">
            {workspace.internalNotes.map(note => (
              <div key={note.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-bold text-slate-800">👤 {note.author}</span>
                  <span className="text-[11px]">{formatDate(note.timestamp)}</span>
                </div>
                <p className="text-slate-700 leading-relaxed pt-1">{note.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Institutional Proposal Audit Trail & Activity History
              </h3>
              <p className="text-xs text-slate-500">
                Immutable event record documenting task reassignments, blockers, readiness evaluations, and stage migrations.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {(workspace.auditTrail || []).length} Recorded Events
            </span>
          </div>

          <div className="space-y-3">
            {(workspace.auditTrail || []).map((event) => (
              <div
                key={event.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900">{event.action}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        event.category === 'blocker'
                          ? 'bg-amber-100 text-amber-900'
                          : event.category === 'submission'
                          ? 'bg-emerald-100 text-emerald-900'
                          : event.category === 'assignment'
                          ? 'bg-indigo-100 text-indigo-900'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {event.category || 'general'}
                    </span>
                  </div>
                  <p className="text-slate-700">{event.details}</p>
                  <div className="text-[11px] text-slate-400">
                    Logged by: <strong className="text-slate-600">{event.actor}</strong>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                  {formatDate(event.timestamp)}
                </div>
              </div>
            ))}

            {(!workspace.auditTrail || workspace.auditTrail.length === 0) && (
              <div className="text-center py-8 text-slate-400 text-xs">
                No activity events recorded yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 8: SUBMISSION RECORD (When submitted) */}
      {activeTab === 'submission' && workspace.submissionRecord && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-base font-bold">Proposal Successfully Submitted</h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                Archived submission record for institutional memory and donor audit readiness.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Submission Date</span>
              <p className="text-sm font-bold text-slate-900">{formatDate(workspace.submissionRecord.submittedAt)}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Confirmation Ref #</span>
              <p className="text-sm font-bold text-indigo-700">{workspace.submissionRecord.confirmationNumber}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Submission Channel</span>
              <p className="text-sm font-semibold text-slate-900">{workspace.submissionRecord.submissionMethod}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Submitted By (Lead Staff)</span>
              <p className="text-sm font-semibold text-slate-900">{workspace.submissionRecord.recordedBy}</p>
            </div>
          </div>

          {workspace.submissionRecord.submittedDocuments && (
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Catalog of Submitted Attachments
              </h4>
              <div className="space-y-1.5">
                {workspace.submissionRecord.submittedDocuments.map((docName, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs flex items-center gap-2">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-semibold text-slate-800">{docName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Leadership Assignments */}
      {showLeadershipModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Assign Proposal Leadership Roles
              </h3>
              <button onClick={() => setShowLeadershipModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeadership} className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Proposal Lead (Required) *
                </label>
                <select
                  value={leadStaffInput}
                  onChange={(e) => setLeadStaffInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
                >
                  {staffDirectory.map(s => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName} — {s.jobTitle} ({s.department})
                    </option>
                  ))}
                  {!staffDirectory.some(s => s.fullName === leadStaffInput) && (
                    <option value={leadStaffInput}>{leadStaffInput}</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Primarily responsible for coordinating the application.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Internal Reviewer
                </label>
                <select
                  value={reviewerInput}
                  onChange={(e) => setReviewerInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
                >
                  {staffDirectory.map(s => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName} — {s.jobTitle} ({s.department})
                    </option>
                  ))}
                  {!staffDirectory.some(s => s.fullName === reviewerInput) && (
                    <option value={reviewerInput}>{reviewerInput}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Final Approver
                </label>
                <select
                  value={approverInput}
                  onChange={(e) => setApproverInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
                >
                  {staffDirectory.map(s => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName} — {s.jobTitle} ({s.department})
                    </option>
                  ))}
                  {!staffDirectory.some(s => s.fullName === approverInput) && (
                    <option value={approverInput}>{approverInput}</option>
                  )}
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block font-bold text-slate-700">Approval Path for this Application</label>
                <p className="text-[11px] text-slate-400">Override the org-wide chain for this proposal only. Final Approver is always required.</p>
                {(['DepartmentHead', 'ProposalLead', 'Reviewer'] as const).map(stage => {
                  const label = stage === 'DepartmentHead' ? 'Dept Head / Line Manager' : stage === 'ProposalLead' ? 'Proposal Lead' : 'Internal Reviewer';
                  const active = wsChainOverride.includes(stage);
                  return (
                    <label key={stage} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-[11px] font-semibold transition ${active ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                      <input type="checkbox" checked={active} onChange={() => {
                        const next = active ? wsChainOverride.filter((s: string) => s !== stage) : [...wsChainOverride.filter((s: string) => s !== 'FinalApprover'), stage, 'FinalApprover'];
                        const ORDER = ['DepartmentHead', 'ProposalLead', 'Reviewer', 'FinalApprover'];
                        setWsChainOverride(ORDER.filter(s => next.includes(s)));
                      }} className="accent-indigo-600" />
                      {label}
                    </label>
                  );
                })}
                <div className="text-[10px] text-slate-500 pt-1">
                  Active path: Proposal Team → {wsChainOverride.map((s: string) => s === 'DepartmentHead' ? 'Dept Head' : s === 'ProposalLead' ? 'Proposal Lead' : s === 'Reviewer' ? 'Reviewer' : 'Final Sign-off').join(' → ')}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLeadershipModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  Update Leadership
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Flag Task Blocker */}
      {blockerModalTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Flag Task Blocker
              </h3>
              <button onClick={() => setBlockerModalTask(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlocker} className="py-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Task</span>
                <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {blockerModalTask.title}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Blocker Category *</label>
                <select
                  value={blockerReasonChoice}
                  onChange={(e) => setBlockerReasonChoice(e.target.value as BlockerReason)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
                >
                  <option value="Missing Finance budget">Missing Finance budget / costings</option>
                  <option value="Awaiting partner NGO input">Awaiting partner NGO input / letter</option>
                  <option value="Management sign-off pending">Management sign-off pending</option>
                  <option value="External donor clarification needed">External donor clarification needed</option>
                  <option value="Staff capacity constraint">Staff capacity constraint</option>
                  <option value="Other">Other Operational Blocker</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Blocker Notes & Next Action</label>
                <textarea
                  rows={3}
                  placeholder="Explain what is required to resolve this blocker..."
                  value={blockerNotesInput}
                  onChange={(e) => setBlockerNotesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setBlockerModalTask(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                >
                  Confirm Blocker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Reassign Task */}
      {reassignTaskTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                Reassign Task Assignee
              </h3>
              <button onClick={() => setReassignTaskTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block mb-1">Task</span>
                <p className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {reassignTaskTarget.title}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select New Assignee</label>
                <select
                  value={newAssigneeChoice}
                  onChange={(e) => setNewAssigneeChoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
                >
                  {staffDirectory.map(s => (
                    <option key={s.id} value={s.fullName}>
                      {s.fullName} — {s.jobTitle} ({s.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassignTaskTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReassign}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Confirm Reassignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Record Submission */}
      {showSubmissionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-5 h-5 text-emerald-600" />
                Record Official Grant Submission
              </h3>
              <button onClick={() => setShowSubmissionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordSubmission} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Submission Date</label>
                <input
                  type="date"
                  value={subDate}
                  onChange={e => setSubDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Submission Channel / Method</label>
                <input
                  type="text"
                  value={subMethod}
                  onChange={e => setSubMethod(e.target.value)}
                  placeholder="e.g. EU PROSPECT Portal, USAID Grants.gov"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Donor Confirmation / Reference #</label>
                <input
                  type="text"
                  value={subConfNumber}
                  onChange={e => setSubConfNumber(e.target.value)}
                  placeholder="e.g. GRANT-2025-0987-EU"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recorded By (Staff)</label>
                <input
                  type="text"
                  value={subRecordedBy}
                  onChange={e => setSubRecordedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSubmissionModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save & Move to Awaiting Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Record Donor Outcome */}
      {showOutcomeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Record Donor Decision Outcome
              </h3>
              <button onClick={() => setShowOutcomeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordOutcome} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Donor Outcome Decision</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 font-bold text-emerald-700">
                    <input
                      type="radio"
                      name="outcome"
                      value="Awarded"
                      checked={outcomeStatus === 'Awarded'}
                      onChange={() => setOutcomeStatus('Awarded')}
                    />
                    Awarded (Grant Won)
                  </label>
                  <label className="flex items-center gap-1.5 font-bold text-rose-700">
                    <input
                      type="radio"
                      name="outcome"
                      value="Rejected"
                      checked={outcomeStatus === 'Rejected'}
                      onChange={() => setOutcomeStatus('Rejected')}
                    />
                    Rejected (Not Selected)
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Decision Date</label>
                <input
                  type="date"
                  value={outcomeDate}
                  onChange={e => setOutcomeDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              {outcomeStatus === 'Awarded' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Grant Amount Awarded</label>
                  <input
                    type="text"
                    value={outcomeAmount}
                    onChange={e => setOutcomeAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Donor Feedback & Key Learnings</label>
                <textarea
                  rows={3}
                  value={outcomeFeedback}
                  onChange={e => setOutcomeFeedback(e.target.value)}
                  placeholder="Record donor debrief comments, review scores, or institutional takeaways for future rounds..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Save Outcome & Update History
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Return Task for Revision (Line Manager / Department Head) */}
      {revisionModalTask && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider">
                  Line Manager Supervision & Quality Check
                </span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-1">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Return Task for Revision
                </h3>
              </div>
              <button
                onClick={() => setRevisionModalTask(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="font-semibold text-slate-800">{revisionModalTask.title}</div>
              <div className="text-slate-500 flex items-center gap-2">
                <span>Assignee: <strong>{revisionModalTask.assignedTo}</strong></span>
                <span>•</span>
                <span>Department: <strong>{revisionModalTask.departmentName || 'Department'}</strong></span>
              </div>
              <div className="text-[11px] text-slate-400">
                Department Head: <strong>{revisionModalTask.departmentHeadName || 'Line Manager'}</strong>
              </div>
            </div>

            <form onSubmit={handleSaveTaskRevision} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Revision Feedback & Actionable Guidance:
                </label>
                <textarea
                  rows={4}
                  value={revisionNoteInput}
                  onChange={e => setRevisionNoteInput(e.target.value)}
                  placeholder="Specify what needs to be changed or refined (e.g. 'Please align unit costs with the latest procurement rate card and add justification for vehicle hire')..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Returning this task will flag it as <strong>Returned for Revision</strong>, notify the officer ({revisionModalTask.assignedTo}) on their dashboard and notifications center, and record the feedback in the proposal audit trail.
              </p>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRevisionModalTask(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  <span>Return to Officer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Deadline & Verification Modal */}
      {showEditDeadlineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Verify / Edit Application Deadline
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set the single source of truth for all milestone schedules and deadline watches.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEditDeadlineModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Application Deadline
                </label>
                <input
                  type="text"
                  value={editDeadlineInput}
                  onChange={e => setEditDeadlineInput(e.target.value)}
                  placeholder="e.g. 2026-11-01T23:59:59Z, 1 November 2026, or 'Not Stated in Source'"
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-medium"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter an ISO date (e.g. 2026-11-01), formatted date (e.g. 1 November 2026), or &quot;Not Stated in Source&quot;.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Exact Supporting Quotation (Optional)
                </label>
                <textarea
                  value={editDeadlineSnippet}
                  onChange={e => setEditDeadlineSnippet(e.target.value)}
                  placeholder="e.g. 'All applications must be submitted no later than 5:00 PM EST on November 1, 2026 via the online portal.'"
                  rows={3}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition font-medium"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-blue-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Automatic Backwards Rescheduling
                </div>
                <p className="text-[11px] text-blue-700">
                  Saving will set the verification status to <strong>Human Verified</strong> and automatically adjust all internal milestones and tasks backwards from this deadline.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditDeadlineModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDeadline}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Save & Update Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Format Configuration Modal */}
      <ApplicationSetupModal
        isOpen={showFormatModal}
        onClose={() => setShowFormatModal(false)}
        donorName={workspace.donor}
        opportunityTitle={workspace.title}
        extractedSections={workspace.extraction?.proposalSections || []}
        orgProfile={
          orgProfile ||
          ({
            name: 'My Organisation',
            country: 'Nigeria',
            thematicAreas: []
          } as OrgProfile)
        }
        onConfirm={(templateSource, sections) => {
          const formatMap: Record<string, DonorSubmissionFormat> = {
            DOCX: 'docx',
            XLSX: 'xlsx',
            PDF: 'non_fillable_pdf',
            PORTAL_FORM: 'portal',
            CALL_SECTIONS: 'none',
            NONE: 'none'
          };
          const submissionFormat: DonorSubmissionFormat =
            formatMap[templateSource.fileFormat || ''] ||
            (templateSource.type === 'paste_questions' ? 'portal' : 'docx');

          const audit = createAuditEvent(
            'Application Format Configured',
            `Configured application format (${templateSource.sourceLabel || templateSource.type}) with ${sections.length} structured donor questions. Detected format: ${submissionFormat}.`,
            'general'
          );
          const updated = {
            ...workspace,
            submissionFormat,
            templateSource,
            applicationSections: sections,
            auditTrail: [audit, ...(workspace.auditTrail || [])],
            updatedAt: new Date().toISOString()
          };
          onUpdateWorkspace(updated);
        }}
      />

      {/* ========================================================================= */}
      {/* ASSIGN OFFICER MODAL */}
      {/* ========================================================================= */}
      {showAssignOfficerModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                {editingOfficerId ? 'Edit Officer Assignment' : 'Assign Proposal Officer'}
              </h3>
              <button
                onClick={() => setShowAssignOfficerModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOfficerAssignment} className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Select Staff Member *
                </label>
                {staffDirectory.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                    No staff members found in this organisation. Please add staff in Organisation Profile &gt; Team Directory first.
                  </div>
                ) : (
                  <select
                    required
                    value={officerStaffName}
                    onChange={(e) => setOfficerStaffName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                  >
                    {staffDirectory.map((staff) => (
                      <option key={staff.id} value={staff.fullName}>
                        {staff.fullName} — {staff.jobTitle} ({staff.department}) [{staff.role || staff.functionalRole || 'Officer'}]
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Responsibility / Proposal Role *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Proposal Writer, Budget Narrative & Costing, MEAL Plan Lead..."
                  value={officerResponsibility}
                  onChange={(e) => setOfficerResponsibility(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    'Lead Proposal Writer',
                    'Budget Narrative & Costing',
                    'Needs Assessment & Problem Statement',
                    'MEAL Plan Lead',
                    'Technical Approach Co-Author',
                    'Compliance & Safeguarding'
                  ].map((sugg) => (
                    <button
                      key={sugg}
                      type="button"
                      onClick={() => setOfficerResponsibility(sugg)}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Assignment Deadline
                  </label>
                  <input
                    type="date"
                    value={officerDeadline}
                    onChange={(e) => setOfficerDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Assignment Status
                  </label>
                  <select
                    value={officerStatus}
                    onChange={(e) => setOfficerStatus(e.target.value as AssignmentStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Submitted for Review">Submitted for Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Optional Instructions & Guidance
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Please consult the institutional document repository for our latest child safeguarding policy and align with the donor's 500-word limit."
                  value={officerInstructions}
                  onChange={(e) => setOfficerInstructions(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAssignOfficerModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={staffDirectory.length === 0}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-1.5 transition"
                >
                  <Check className="w-4 h-4" />
                  {editingOfficerId ? 'Update Assignment' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REASSIGN OFFICER MODAL */}
      {/* ========================================================================= */}
      {reassignOfficerTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Reassign Proposal Responsibility
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Reassign <strong>{reassignOfficerTarget.responsibility}</strong> (currently assigned to {reassignOfficerTarget.staffName}) to another real staff member:
            </p>

            <form onSubmit={handleConfirmReassignOfficer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">New Assignee *</label>
                <select
                  value={newOfficerChoice}
                  onChange={(e) => setNewOfficerChoice(e.target.value)}
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
                  onClick={() => setReassignOfficerTarget(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Reassign Officer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHANGE OFFICER DEADLINE MODAL */}
      {/* ========================================================================= */}
      {deadlineOfficerTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              Change Assignment Deadline
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update the target deadline for <strong>{deadlineOfficerTarget.staffName}</strong> ({deadlineOfficerTarget.responsibility}):
            </p>

            <form onSubmit={handleConfirmChangeOfficerDeadline} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">New Target Deadline *</label>
                <input
                  type="date"
                  required
                  value={newOfficerDeadlineInput}
                  onChange={(e) => setNewOfficerDeadlineInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeadlineOfficerTarget(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Update Deadline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVIEW OFFICER PROGRESS & STATUS MODAL */}
      {/* ========================================================================= */}
      {reviewOfficerTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              Review Progress & Status
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Update progress for <strong>{reviewOfficerTarget.staffName}</strong> ({reviewOfficerTarget.responsibility}):
            </p>

            <form onSubmit={handleConfirmReviewOfficerStatus} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Status *</label>
                <select
                  value={reviewOfficerStatusChoice}
                  onChange={(e) => setReviewOfficerStatusChoice(e.target.value as AssignmentStatus)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Submitted for Review">Submitted for Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Submission / Progress Notes</label>
                <textarea
                  rows={3}
                  placeholder="Add feedback, submission links, or notes on completion..."
                  value={reviewOfficerNotes}
                  onChange={(e) => setReviewOfficerNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewOfficerTarget(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Save Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT INDIVIDUAL TASK MODAL */}
      {/* ========================================================================= */}
      {editingTaskTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-indigo-600" />
                Edit Proposal Task
              </h3>
              <button
                onClick={() => setEditingTaskTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditTask} className="py-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTaskTitle}
                  onChange={(e) => setEditTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Assigned Staff Member *</label>
                  <select
                    value={editTaskAssignee}
                    onChange={(e) => setEditTaskAssignee(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    {staffDirectory.map((s) => (
                      <option key={s.id} value={s.fullName}>
                        {s.fullName} ({s.department})
                      </option>
                    ))}
                    {!staffDirectory.some(s => s.fullName === editTaskAssignee) && (
                      <option value={editTaskAssignee}>{editTaskAssignee}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Due Date</label>
                  <input
                    type="date"
                    value={editTaskDueDate}
                    onChange={(e) => setEditTaskDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Priority</label>
                  <select
                    value={editTaskPriority}
                    onChange={(e) => setEditTaskPriority(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Task Status</label>
                  <select
                    value={editTaskStatus}
                    onChange={(e) => setEditTaskStatus(e.target.value as TaskStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Submitted for Review">Submitted for Review</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Instructions / Notes</label>
                <textarea
                  rows={3}
                  value={editTaskNotes}
                  onChange={(e) => setEditTaskNotes(e.target.value)}
                  placeholder="Add specific instructions, deliverables, or guidance for this task..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTaskTarget(null)}
                  className="px-4 py-2 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
