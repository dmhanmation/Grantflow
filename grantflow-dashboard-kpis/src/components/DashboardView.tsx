import React, { useState, useMemo } from 'react';
import { OpportunityWorkspace, PipelineStage, StaffMember, OrgProfile, AppUser } from '../types';
import { calculateDaysRemaining, formatDeadline, getTaskUrgencyInfo, generateWorkspaceNotifications } from '../utils/dateUtils';
import { ProposalAccountabilityPanel } from './ProposalAccountabilityPanel';
import { DepartmentRoleDashboard } from './DepartmentRoleDashboard';
import { MyDepartmentResponsibilities } from './MyDepartmentResponsibilities';
import { PersonalizedRoleDashboard } from './PersonalizedRoleDashboard';
import { MyAssignmentsDashboard } from './MyAssignmentsDashboard';
import {
  Sparkles,
  Clock,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  Plus,
  ArrowRight,
  TrendingUp,
  FolderOpen,
  Filter,
  Check,
  Bell,
  AlertCircle,
  CheckSquare,
  Users,
  ShieldAlert,
  UserCheck,
  ShieldCheck
} from 'lucide-react';

interface DashboardViewProps {
  opportunities: OpportunityWorkspace[];
  staffDirectory?: StaffMember[];
  orgProfile?: OrgProfile;
  currentUser?: AppUser;
  onSelectWorkspace: (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => void;
  onUpdateWorkspace?: (updated: OpportunityWorkspace) => void;
  onDeleteWorkspace?: (workspaceId: string) => void;
  onNavigateToAnalyze: () => void;
  onNavigateToAccountability?: () => void;
  onNavigateToProfile?: (tab?: string) => void;
  onInviteStaff?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  opportunities,
  staffDirectory = [],
  orgProfile,
  currentUser,
  onSelectWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  onNavigateToAnalyze,
  onNavigateToAccountability,
  onNavigateToProfile,
  onInviteStaff
}) => {
  const [filterStage, setFilterStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'list' | 'pipeline'>('list');
  const [onlyAttentionFilter, setOnlyAttentionFilter] = useState<boolean>(false);

  // Admins have no personal assignments or single department, so the staff-facing
  // preview panels only confuse them. Show those to staff only.
  const isAdmin = Boolean(currentUser?.role === 'Admin' || currentUser?.roles?.includes('Admin'));

  const effectiveOpportunities = opportunities;

  // Generate real-time notifications including Document Library expiry scans
  const allNotifications = generateWorkspaceNotifications(effectiveOpportunities, orgProfile);
  const overdueNotifications = allNotifications.filter(n => n.category === 'overdue_task');
  const dueSoonNotifications = allNotifications.filter(
    n => n.category === 'task_due_today' || n.category === 'task_due_soon'
  );
  const criticalDeadlines = allNotifications.filter(n => n.category === 'critical_deadline');
  const escalationAlerts = allNotifications.filter(n => n.category === 'escalation_alert');
  
  // Document Library Expiry Monitoring (< 30 days & expired)
  const totalDocsCount = (orgProfile?.documentLibrary || []).length;
  const expiringDocs30Days = allNotifications.filter(
    n => (n.category === 'document_expiring_soon' && n.daysDiff <= 30) || n.category === 'document_expired'
  );
  const docReviewAlerts = allNotifications.filter(n => n.category === 'document_review_due');

  // KPI Calculations
  const activeOpportunities = effectiveOpportunities.filter(
    o => o.stage !== 'Awarded' && o.stage !== 'Rejected'
  );

  const preparingCount = effectiveOpportunities.filter(
    o => o.stage === 'Preparing Application' || o.stage === 'Internal Review' || o.stage === 'Ready for Submission'
  ).length;

  const awaitingDecisionCount = effectiveOpportunities.filter(
    o => o.stage === 'Awaiting Decision' || o.stage === 'Submitted'
  ).length;

  const awardedCount = effectiveOpportunities.filter(o => o.stage === 'Awarded').length;
  const rejectedCount = effectiveOpportunities.filter(o => o.stage === 'Rejected').length;

  // Deadlines this month (within 30 days)
  const deadlinesThisMonth = effectiveOpportunities.filter(o => {
    const days = calculateDaysRemaining(o.deadline);
    return days !== null && days >= 0 && days <= 30 && o.stage !== 'Awarded' && o.stage !== 'Rejected';
  });

  // Calculate overdue tasks per workspace
  const getWorkspaceUrgencyMeta = (opp: OpportunityWorkspace) => {
    const incompleteTasks = opp.tasks?.filter(t => !t.completed) || [];
    const overdueTasks = incompleteTasks.filter(t => {
      const info = getTaskUrgencyInfo(t.dueDate, t.completed);
      return info.isOverdue;
    });
    const blockedTasks = incompleteTasks.filter(t => t.status === 'Blocked');
    const dueTodayTasks = incompleteTasks.filter(t => {
      const info = getTaskUrgencyInfo(t.dueDate, t.completed);
      return info.status === 'due_today';
    });
    const dueSoonTasks = incompleteTasks.filter(t => {
      const info = getTaskUrgencyInfo(t.dueDate, t.completed);
      return info.status === 'due_soon';
    });
    const daysRemaining = calculateDaysRemaining(opp.deadline);
    const hasCriticalDeadline = daysRemaining !== null && daysRemaining <= 7 && opp.stage !== 'Awarded' && opp.stage !== 'Rejected';

    return {
      incompleteCount: incompleteTasks.length,
      overdueCount: overdueTasks.length,
      blockedCount: blockedTasks.length,
      dueTodayCount: dueTodayTasks.length,
      dueSoonCount: dueSoonTasks.length,
      daysRemaining,
      hasCriticalDeadline,
      needsAttention: overdueTasks.length > 0 || blockedTasks.length > 0 || dueTodayTasks.length > 0 || hasCriticalDeadline
    };
  };

  // Urgent Deadline Watch items (sorted by urgency)
  const urgentDeadlineWatch = [...activeOpportunities]
    .map(o => {
      const meta = getWorkspaceUrgencyMeta(o);
      const mandatoryDocs = o.documentsChecklist?.filter(d => d.mandatory) || [];
      const missingDocs = mandatoryDocs.filter(d => d.status !== 'Ready' && d.status !== 'Signed');
      return {
        workspace: o,
        meta,
        days: meta.daysRemaining,
        missingDocsCount: missingDocs.length,
        incompleteTasksCount: meta.incompleteCount,
        overdueTasksCount: meta.overdueCount,
        blockedTasksCount: meta.blockedCount
      };
    })
    .filter(item => item.days !== null && item.days >= 0)
    .sort((a, b) => {
      if (a.overdueTasksCount > 0 && b.overdueTasksCount === 0) return -1;
      if (b.overdueTasksCount > 0 && a.overdueTasksCount === 0) return 1;
      return (a.days ?? 999) - (b.days ?? 999);
    });

  // Filtered List
  const filteredOpportunities = effectiveOpportunities.filter(o => {
    const matchesStage = filterStage === 'ALL' || o.stage === filterStage;
    const matchesSearch =
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.donor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.proposalLead && o.proposalLead.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.thematicArea?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (onlyAttentionFilter) {
      const meta = getWorkspaceUrgencyMeta(o);
      return matchesStage && matchesSearch && meta.needsAttention;
    }

    return matchesStage && matchesSearch;
  });

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

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* First-run welcome: shown only until the first department is configured */}
      {(orgProfile?.departments?.length || 0) === 0 && onNavigateToProfile && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 font-bold">1</div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Welcome to GrantFlow. Start by setting up your organisation.</h3>
              <p className="text-xs text-amber-800 mt-0.5 max-w-2xl">
                Before you scout or write proposals, set up your Org Profile: your details, departments, and staff. It only takes a few minutes and everything else builds on it.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToProfile('details')}
            className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            Set Up Org Profile
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner with Fast Action */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
              Nonprofit Grant Management & Accountability
            </span>
            {escalationAlerts.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/30 text-rose-200 border border-rose-400/40 animate-pulse flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                {escalationAlerts.length} Management Escalation{escalationAlerts.length > 1 ? 's' : ''}
              </span>
            )}
            {expiringDocs30Days.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-300" />
                {expiringDocs30Days.length} Expiring/Expired Doc{expiringDocs30Days.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            GrantFlow Management Dashboard
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            Automating the administrative and analytical pipeline around funding calls.
            From Gemini requirement extraction to real-time staff accountability, document expiry monitoring, and bottleneck escalation.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3 flex-wrap">
          {onNavigateToAccountability && (
            <button
              onClick={onNavigateToAccountability}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-indigo-300" />
              Staff Workload
            </button>
          )}
          {onNavigateToProfile && (
            <button
              onClick={() => onNavigateToProfile('documents')}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-amber-300" />
              Doc Library
            </button>
          )}
          <button
            id="dashboard-analyze-call-btn"
            onClick={onNavigateToAnalyze}
            className="px-5 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Analyse Funding Call
          </button>
        </div>
      </div>

      {/* MY ASSIGNMENTS DASHBOARD (staff only — admins have no personal assignments) */}
      {!isAdmin && (
        <MyAssignmentsDashboard
          currentUser={currentUser}
          staffDirectory={staffDirectory}
          opportunities={effectiveOpportunities}
          orgProfile={orgProfile}
          onSelectWorkspace={onSelectWorkspace}
          onUpdateWorkspace={onUpdateWorkspace}
        />
      )}

      {/* PERSONALIZED USER DASHBOARD (Role-tailored tasks, reviews, and proposals) */}
      {currentUser && orgProfile && (
        <PersonalizedRoleDashboard
          currentUser={currentUser}
          organization={orgProfile}
          opportunities={effectiveOpportunities}
          onSelectWorkspace={onSelectWorkspace}
          onUpdateWorkspace={onUpdateWorkspace || (() => {})}
          onOpenOrgSettings={() => onNavigateToProfile && onNavigateToProfile('details')}
          onInviteStaff={onInviteStaff}
        />
      )}

      {/* MY DEPARTMENT RESPONSIBILITIES (staff only) */}
      {!isAdmin && (
        <MyDepartmentResponsibilities
          opportunities={effectiveOpportunities}
          staffDirectory={staffDirectory}
          orgProfile={orgProfile}
          onSelectWorkspace={onSelectWorkspace}
          onNavigateToProfile={onNavigateToProfile}
        />
      )}

      {/* ROLE PERSPECTIVES (staff only) */}
      {!isAdmin && (
        <DepartmentRoleDashboard
          opportunities={effectiveOpportunities}
          staffDirectory={staffDirectory}
          onSelectWorkspace={onSelectWorkspace}
          onUpdateWorkspace={onUpdateWorkspace}
        />
      )}

      {/* PROPOSAL ACCOUNTABILITY & BOTTLENECK RADAR (Real-time monitoring panel) */}
      <ProposalAccountabilityPanel
        opportunities={effectiveOpportunities}
        staffDirectory={staffDirectory}
        onSelectWorkspace={onSelectWorkspace}
        onNavigateToAccountability={onNavigateToAccountability || (() => {})}
      />

      {/* AGENTIC DOCUMENT EXPIRY & COMPLIANCE RADAR (30-day proactive scan) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              expiringDocs30Days.length > 0
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {expiringDocs30Days.length > 0 ? (
                <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Agentic Document Expiry & Compliance Radar
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  30-Day Auto Scan
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Continuous background scanning of statutory registrations, audit statements, and institutional policies
              </p>
            </div>
          </div>

          {onNavigateToProfile && (
            <button
              onClick={() => onNavigateToProfile('documents')}
              className="px-3.5 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <FolderOpen className="w-4 h-4" />
              Manage Document Library →
            </button>
          )}
        </div>

        {totalDocsCount === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  No Institutional Documents or Compliance Forms Uploaded Yet
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Upload your statutory registration, tax clearance, audit statements, and governance policies to activate compliance tracking.
                </span>
              </div>
            </div>
            {onNavigateToProfile && (
              <button
                onClick={() => onNavigateToProfile('documents')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shrink-0 transition self-start sm:self-auto"
              >
                Upload Documents →
              </button>
            )}
          </div>
        ) : expiringDocs30Days.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-900 block">
                  All {totalDocsCount} Uploaded Documents & Statutory Policies are Compliant
                </span>
                <span className="text-[11px] text-emerald-700 block mt-0.5">
                  No documents in your library expire within the next 30 days.
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 px-2.5 py-1 bg-emerald-100 rounded-lg">
              100% Up to Date
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {expiringDocs30Days.map(alert => {
                const isExpired = alert.daysDiff < 0;
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition ${
                      isExpired
                        ? 'bg-rose-50/80 border-rose-300 ring-1 ring-rose-200'
                        : alert.daysDiff <= 7
                        ? 'bg-rose-50/50 border-rose-300'
                        : 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200/50'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          isExpired
                            ? 'bg-rose-700 text-white'
                            : alert.daysDiff <= 7
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-600 text-white'
                        }`}>
                          {isExpired
                            ? `EXPIRED (${Math.abs(alert.daysDiff)}d AGO)`
                            : alert.daysDiff === 0
                            ? 'EXPIRES TODAY'
                            : `EXPIRES IN ${alert.daysDiff} DAYS`}
                        </span>

                        <span className="text-[11px] font-bold text-slate-600">
                          Due: {alert.dueDateStr}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                        {alert.title.replace(/^Institutional Document Expired: |^Document Expiring (Today|in \d+ days?): /, '')}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {alert.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-slate-600 font-medium truncate">
                        👤 Custodian: <strong className="text-slate-800">{alert.assignee || 'Unassigned'}</strong>
                      </span>
                      {onNavigateToProfile && (
                        <button
                          onClick={() => onNavigateToProfile('documents')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg shadow-2xs transition shrink-0 flex items-center gap-1"
                        >
                          Update Version →
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* High-Level KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Overdue Tasks Alert KPI */}
        <div className={`p-4 rounded-xl border shadow-xs transition ${
          overdueNotifications.length > 0
            ? 'bg-rose-50/90 border-rose-300 ring-1 ring-rose-200'
            : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">Overdue Tasks</span>
            {overdueNotifications.length > 0 && <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />}
          </div>
          <span className="text-2xl font-black text-rose-700 mt-1 block">{overdueNotifications.length}</span>
          <span className="text-[10px] text-rose-700/80 mt-0.5 block">
            {overdueNotifications.length > 0 ? 'Requires intervention' : 'All tasks on schedule'}
          </span>
        </div>

        {/* Deadlines This Month */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">Due in 30 Days</span>
          <span className="text-2xl font-black text-amber-800 mt-1 block">{deadlinesThisMonth.length}</span>
          <span className="text-[10px] text-amber-700/80 mt-0.5 block">Upcoming deadlines</span>
        </div>

        {/* Active Grants */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Grants</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{activeOpportunities.length}</span>
          <span className="text-[10px] text-slate-500 mt-0.5 block">In active pipeline</span>
        </div>

        {/* Awarded */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">Awarded</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{awardedCount}</span>
          <span className="text-[10px] text-emerald-700/80 mt-0.5 block">Grants won</span>
        </div>

      </div>

      {/* CLEAN WORKSPACE ONBOARDING QUICK ACTIONS BANNER */}
      {opportunities.length === 0 && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              <Sparkles className="w-3.5 h-3.5" />
              Clean Organisation Workspace Initialised
            </div>
            <h3 className="text-lg font-bold text-white">Get Started with GrantFlow</h3>
            <p className="text-xs text-indigo-200 leading-relaxed">
              Your workspace is ready. Analyse a live donor call, invite your staff, or upload institutional compliance documents to begin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onNavigateToAnalyze}
              className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Analyse First Funding Call
            </button>
            <button
              onClick={() => onNavigateToProfile?.('staff')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Set Up Team
            </button>
            <button
              onClick={() => onNavigateToProfile?.('documents')}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 transition flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Add Organisation Documents
            </button>
          </div>
        </div>
      )}

      {/* DEADLINE WATCH SECTION (with Proposal Lead displayed) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-rose-600" />
              Deadline & Task Readiness Watch
            </h2>
          </div>
          <span className="text-xs font-medium text-slate-500">
            Real-time urgency tracker, staff accountability & outstanding requirements
          </span>
        </div>

        {urgentDeadlineWatch.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <Clock className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Urgent Deadlines or Active Proposals</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Analyse a donor call or create an application workspace to monitor deadlines and team tasks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {urgentDeadlineWatch.slice(0, 3).map(({ workspace, meta, days, missingDocsCount, incompleteTasksCount, overdueTasksCount, blockedTasksCount }) => {
              const proposalLead = workspace.proposalLead || workspace.leadStaff || 'Unassigned';
              return (
                <div
                  key={workspace.id}
                  onClick={() => onSelectWorkspace(workspace)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    overdueTasksCount > 0 || blockedTasksCount > 0
                      ? 'bg-rose-50/40 border-rose-300 hover:bg-rose-50 hover:border-rose-400'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {workspace.donor}
                    </span>
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        days !== null && days <= 3
                          ? 'bg-rose-100 text-rose-800'
                          : days !== null && days <= 7
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      <Clock className="w-3 h-3" />
                      {days} days remaining
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                    {workspace.title}
                  </h3>

                  {/* Proposal Lead Chip */}
                  <div className="flex items-center gap-1 text-xs text-indigo-700 font-semibold bg-indigo-50/80 px-2 py-1 rounded-md border border-indigo-100 w-fit">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Lead: {proposalLead}</span>
                  </div>
                </div>

                {/* Overdue / Blocked Task Visual Alert Pill */}
                {(overdueTasksCount > 0 || blockedTasksCount > 0) && (
                  <div className="p-2 rounded-lg bg-rose-100/80 border border-rose-300 flex items-center justify-between text-xs text-rose-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
                      {overdueTasksCount > 0 && `${overdueTasksCount} Overdue Task${overdueTasksCount > 1 ? 's' : ''}`}
                      {overdueTasksCount > 0 && blockedTasksCount > 0 && ' • '}
                      {blockedTasksCount > 0 && `${blockedTasksCount} Blocked`}
                    </span>
                    <span className="text-[11px] underline">Inspect →</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Outstanding Requirements:</span>
                    <strong className={missingDocsCount > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700'}>
                      {missingDocsCount} docs • {incompleteTasksCount} tasks
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Stage: {workspace.stage}</span>
                    <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                      Open Workspace →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* View Switcher and Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Grant Opportunities & Pipeline</h2>
              {onlyAttentionFilter && (
                <span className="text-[11px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md border border-rose-200">
                  Filtered by Attention Needed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Manage all institutional proposals with clear ownership from identification to award</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Table View
              </button>
              <button
                onClick={() => setViewMode('pipeline')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                  viewMode === 'pipeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Pipeline Kanban
              </button>
            </div>

            {/* Overdue/Attention Filter Toggle */}
            <button
              onClick={() => setOnlyAttentionFilter(!onlyAttentionFilter)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition flex items-center gap-1.5 ${
                onlyAttentionFilter
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Show only opportunities with overdue tasks or upcoming deadlines"
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${onlyAttentionFilter ? 'text-white' : 'text-rose-600'}`} />
              Needs Attention ({opportunities.filter(o => getWorkspaceUrgencyMeta(o).needsAttention).length})
            </button>

            {/* Stage Filter */}
            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
            >
              <option value="ALL">All Stages ({opportunities.length})</option>
              {pipelineStages.map(stg => (
                <option key={stg} value={stg}>
                  {stg} ({opportunities.filter(o => o.stage === stg).length})
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search title, donor, lead..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs w-48 lg:w-64"
              />
            </div>
          </div>
        </div>

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[10px]">
                <tr>
                  <th className="p-3 border-b border-slate-200">Donor & Opportunity</th>
                  <th className="p-3 border-b border-slate-200">Proposal Lead</th>
                  <th className="p-3 border-b border-slate-200">Task & Deadline Status</th>
                  <th className="p-3 border-b border-slate-200">Grant Value</th>
                  <th className="p-3 border-b border-slate-200">Deadline</th>
                  <th className="p-3 border-b border-slate-200">Stage</th>
                  <th className="p-3 border-b border-slate-200">Documents</th>
                  <th className="p-3 border-b border-slate-200 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      No grant opportunities match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredOpportunities.map(opp => {
                    const days = calculateDaysRemaining(opp.deadline);
                    const meta = getWorkspaceUrgencyMeta(opp);
                    const mandatoryDocs = opp.documentsChecklist?.filter(d => d.mandatory) || [];
                    const readyDocs = mandatoryDocs.filter(d => d.status === 'Ready' || d.status === 'Signed');
                    const lead = opp.proposalLead || opp.leadStaff || 'Unassigned';

                    return (
                      <tr
                        key={opp.id}
                        onClick={() => onSelectWorkspace(opp)}
                        className={`hover:bg-slate-50 cursor-pointer transition ${
                          meta.overdueCount > 0 ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        <td className="p-3 font-semibold text-slate-900 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-indigo-700 block">{opp.donor}</span>
                          </div>
                          <span className="line-clamp-1">{opp.title}</span>
                        </td>

                        {/* Proposal Lead Column */}
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-bold text-slate-800">{lead}</span>
                          </div>
                        </td>

                        {/* Visual Task & Deadline Flag Column */}
                        <td className="p-3">
                          {meta.overdueCount > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                {meta.overdueCount} Overdue Task{meta.overdueCount > 1 ? 's' : ''}
                              </span>
                            </div>
                          ) : meta.blockedCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              {meta.blockedCount} Blocked
                            </span>
                          ) : meta.dueTodayCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {meta.dueTodayCount} Task Due Today
                            </span>
                          ) : meta.dueSoonCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-800 border border-orange-200">
                              {meta.dueSoonCount} Due Soon
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              On Schedule
                            </span>
                          )}
                        </td>

                        <td className="p-3 font-bold text-slate-900">{opp.fundingAmount}</td>
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 block">
                            {formatDeadline(opp.deadline, opp.deadlineVerificationStatus)}
                          </span>
                          {days !== null && (
                            <span
                              className={`text-[10px] font-bold ${
                                days <= 3 ? 'text-rose-600' : days <= 7 ? 'text-amber-600' : 'text-slate-500'
                              }`}
                            >
                              {days > 0 ? `${days} days left` : 'Due / Passed'}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-800 rounded-md border border-slate-200">
                            {opp.stage}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-slate-700 text-xs">
                            {readyDocs.length}/{mandatoryDocs.length} Docs Ready
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onSelectWorkspace(opp);
                            }}
                            className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded transition"
                          >
                            Workspace →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PIPELINE KANBAN VIEW */}
        {viewMode === 'pipeline' && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[1200px]">
              {pipelineStages.map(stage => {
                const stageOpps = filteredOpportunities.filter(o => o.stage === stage);

                return (
                  <div key={stage} className="w-72 shrink-0 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                        {stage}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold bg-slate-200 text-slate-700 rounded-full">
                        {stageOpps.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {stageOpps.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400 italic">No grants in this stage</div>
                      ) : (
                        stageOpps.map(opp => {
                          const days = calculateDaysRemaining(opp.deadline);
                          const meta = getWorkspaceUrgencyMeta(opp);
                          const lead = opp.proposalLead || opp.leadStaff || 'Unassigned';

                          return (
                            <div
                              key={opp.id}
                              onClick={() => onSelectWorkspace(opp)}
                              className={`p-3 bg-white rounded-lg border transition cursor-pointer space-y-2 ${
                                meta.overdueCount > 0
                                  ? 'border-rose-300 hover:border-rose-500 shadow-xs ring-1 ring-rose-200'
                                  : 'border-slate-200 hover:border-indigo-400 hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-indigo-600 uppercase block truncate">
                                  {opp.donor}
                                </span>
                                {meta.overdueCount > 0 && (
                                  <span className="text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                                    🚨 {meta.overdueCount} OVERDUE
                                  </span>
                                )}
                              </div>

                              <h4 className="text-xs font-bold text-slate-900 line-clamp-2">
                                {opp.title}
                              </h4>

                              <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                <UserCheck className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="font-semibold">{lead}</span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                                <span>{opp.fundingAmount}</span>
                                {days !== null && (
                                  <span className={`font-bold ${days <= 3 ? 'text-rose-600' : 'text-slate-500'}`}>
                                    {days}d left
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
