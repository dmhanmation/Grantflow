import React, { useState, useMemo } from 'react';
import { OpportunityWorkspace, StaffMember, OrgProfile, OrgDepartment, WorkspaceTask, TaskStatus } from '../types';
import { calculateDaysRemaining, formatDeadline, getTaskUrgencyInfo, getDaysDifference } from '../utils/dateUtils';
import { sortStaffByHierarchy } from '../utils/staffHierarchy';
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Layers,
  FileCheck,
  ChevronRight,
  Sparkles,
  AlertCircle,
  FolderOpen,
  Calendar,
  Search,
  Filter,
  UserCheck,
  Flame,
  ArrowUpRight,
  FileText,
  BadgeCheck,
  ShieldAlert,
  Send,
  HelpCircle,
  Activity
} from 'lucide-react';

interface MyDepartmentResponsibilitiesProps {
  opportunities: OpportunityWorkspace[];
  staffDirectory?: StaffMember[];
  orgProfile?: OrgProfile;
  onSelectWorkspace: (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => void;
  onNavigateToProfile?: (tab?: string) => void;
}

export const MyDepartmentResponsibilities: React.FC<MyDepartmentResponsibilitiesProps> = ({
  opportunities,
  staffDirectory = [],
  orgProfile,
  onSelectWorkspace,
  onNavigateToProfile
}) => {
  // Available departments from profile or defaults
  const departments: OrgDepartment[] = useMemo(() => {
    if (orgProfile?.departments && orgProfile.departments.length > 0) {
      return orgProfile.departments;
    }
    return [];
  }, [orgProfile]);

  // Selected Department ID or Name
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => {
    return departments[0]?.id || '';
  });

  // Filter and Search inside department
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending_review' | 'revision' | 'drafting' | 'approved' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOfficerFilter, setSelectedOfficerFilter] = useState<string>('ALL');

  // Currently active department
  const currentDept = useMemo(() => {
    return departments.find(d => d.id === selectedDeptId) || departments[0] || null;
  }, [departments, selectedDeptId]);

  // Staff members belonging to this department
  const deptStaff = useMemo(() => {
    if (!currentDept) return [];
    return sortStaffByHierarchy(staffDirectory.filter(s => {
      if (s.departmentId && s.departmentId === currentDept.id) return true;
      if (s.department && s.department.toLowerCase() === currentDept.name.toLowerCase()) return true;
      return false;
    }));
  }, [staffDirectory, currentDept]);

  // Department Head resolution
  const deptHead = useMemo(() => {
    if (!currentDept) return null;
    // 1. By ID in staffDirectory
    if (currentDept.headStaffId) {
      const found = staffDirectory.find(s => s.id === currentDept.headStaffId);
      if (found) return found;
    }
    // 2. By headStaffName
    if (currentDept.headStaffName) {
      const found = staffDirectory.find(s => s.fullName.toLowerCase() === currentDept.headStaffName.toLowerCase());
      if (found) return found;
    }
    // 3. By isDepartmentHead flag in deptStaff
    const headFlag = deptStaff.find(s => s.isDepartmentHead);
    if (headFlag) return headFlag;

    return {
      id: 'head-fallback',
      fullName: currentDept.headStaffName || 'Unassigned',
      jobTitle: `Head of ${currentDept.name}`,
      department: currentDept.name,
      email: '',
      isDepartmentHead: true,
      status: 'Active' as const
    };
  }, [currentDept, staffDirectory, deptStaff]);

  // Active opportunities (not awarded or rejected)
  const activeOpportunities = useMemo(() => {
    return opportunities.filter(o => o.stage !== 'Awarded' && o.stage !== 'Rejected');
  }, [opportunities]);

  // Proposals involving this department
  // A proposal involves this department if:
  // 1. A task is assigned to a staff member in this department OR task.departmentName matches
  // 2. Or proposal lead is from this department
  // 3. Or a required document category matches this department's domain
  const deptProposalData = useMemo(() => {
    const results: {
      workspace: OpportunityWorkspace;
      deptTasks: WorkspaceTask[];
      allTasksCount: number;
      completedTasksCount: number;
      pendingReviewCount: number;
      revisionCount: number;
      overdueTasksCount: number;
      assignedOfficers: string[];
      isLead: boolean;
      daysRemaining: number | null;
      urgencyBadge: { text: string; bg: string; textCol: string; border: string; icon: string };
    }[] = [];

    activeOpportunities.forEach(opp => {
      const allTasks = opp.tasks || [];
      const matchedDeptTasks: WorkspaceTask[] = [];

      allTasks.forEach(task => {
        const assignedStaff = staffDirectory.find(s => s.fullName === task.assignedTo);
        const taskDept = task.departmentName || assignedStaff?.department;
        const taskDeptId = assignedStaff?.departmentId;

        const isMatch =
          (taskDeptId && taskDeptId === currentDept.id) ||
          (taskDept && taskDept.toLowerCase() === currentDept.name.toLowerCase()) ||
          (assignedStaff && deptStaff.some(ds => ds.fullName === assignedStaff.fullName));

        if (isMatch) {
          matchedDeptTasks.push(task);
        }
      });

      const isLead = (opp.proposalLead && deptStaff.some(ds => ds.fullName === opp.proposalLead)) ||
                     (opp.leadStaff && deptStaff.some(ds => ds.fullName === opp.leadStaff)) ||
                     (opp.proposalLead === deptHead.fullName);

      // If department has tasks or is leading
      if (matchedDeptTasks.length > 0 || isLead) {
        const officersSet = new Set<string>();
        let overdueCount = 0;
        let pendingReviewCount = 0;
        let revisionCount = 0;
        let completedCount = 0;

        matchedDeptTasks.forEach(t => {
          if (t.assignedTo) officersSet.add(t.assignedTo);
          if (t.completed) {
            completedCount++;
          } else {
            const urgency = getTaskUrgencyInfo(t.dueDate, t.completed);
            if (urgency.isOverdue) overdueCount++;
            if (t.departmentReviewStatus === 'Submitted to Department Head') pendingReviewCount++;
            if (t.departmentReviewStatus === 'Returned for Revision') revisionCount++;
          }
        });

        const days = calculateDaysRemaining(opp.deadline);

        // Urgency badge calculation
        let badge = {
          text: `${days}d left`,
          bg: 'bg-slate-100',
          textCol: 'text-slate-700',
          border: 'border-slate-200',
          icon: 'clock'
        };

        if (days !== null) {
          if (days <= 3) {
            badge = {
              text: days === 0 ? 'Due Today' : `${days}d - Critical Deadline`,
              bg: 'bg-rose-100 animate-pulse',
              textCol: 'text-rose-800 font-bold',
              border: 'border-rose-300',
              icon: 'flame'
            };
          } else if (days <= 7) {
            badge = {
              text: `${days}d - Urgent`,
              bg: 'bg-amber-100',
              textCol: 'text-amber-800 font-bold',
              border: 'border-amber-300',
              icon: 'alert'
            };
          } else if (days <= 14) {
            badge = {
              text: `${days}d left`,
              bg: 'bg-blue-50',
              textCol: 'text-blue-700 font-semibold',
              border: 'border-blue-200',
              icon: 'calendar'
            };
          } else {
            badge = {
              text: `${days}d remaining`,
              bg: 'bg-emerald-50',
              textCol: 'text-emerald-700 font-medium',
              border: 'border-emerald-200',
              icon: 'check'
            };
          }
        }

        results.push({
          workspace: opp,
          deptTasks: matchedDeptTasks,
          allTasksCount: matchedDeptTasks.length,
          completedTasksCount: completedCount,
          pendingReviewCount,
          revisionCount,
          overdueTasksCount: overdueCount,
          assignedOfficers: Array.from(officersSet),
          isLead,
          daysRemaining: days,
          urgencyBadge: badge
        });
      }
    });

    // Sort by deadline urgency (closest deadline first)
    return results.sort((a, b) => (a.daysRemaining ?? 999) - (b.daysRemaining ?? 999));
  }, [activeOpportunities, currentDept, staffDirectory, deptStaff, deptHead]);

  // Aggregate department task statistics across all proposals
  const deptStats = useMemo(() => {
    let totalTasks = 0;
    let completed = 0;
    let pendingReview = 0;
    let inRevision = 0;
    let drafting = 0;
    let overdue = 0;
    let blocked = 0;

    deptProposalData.forEach(p => {
      p.deptTasks.forEach(t => {
        totalTasks++;
        if (t.completed || t.departmentReviewStatus === 'Approved') {
          completed++;
        } else {
          if (t.status === 'Blocked') blocked++;
          if (t.departmentReviewStatus === 'Submitted to Department Head') pendingReview++;
          else if (t.departmentReviewStatus === 'Returned for Revision') inRevision++;
          else drafting++;

          const urgency = getTaskUrgencyInfo(t.dueDate, t.completed);
          if (urgency.isOverdue) overdue++;
        }
      });
    });

    const completionRate = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    return {
      activeProposalsCount: deptProposalData.length,
      totalTasks,
      completed,
      pendingReview,
      inRevision,
      drafting,
      overdue,
      blocked,
      completionRate
    };
  }, [deptProposalData]);

  // Filtered proposal items based on selected filters
  const filteredProposals = useMemo(() => {
    return deptProposalData.filter(p => {
      // Search matches proposal title or donor or task name
      const matchesSearch =
        !searchQuery.trim() ||
        p.workspace.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.workspace.donor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.deptTasks.some(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

      // Officer filter
      const matchesOfficer =
        selectedOfficerFilter === 'ALL' ||
        p.deptTasks.some(t => t.assignedTo === selectedOfficerFilter);

      // Task status filter
      let matchesStatus = true;
      if (taskFilter === 'pending_review') {
        matchesStatus = p.pendingReviewCount > 0;
      } else if (taskFilter === 'revision') {
        matchesStatus = p.revisionCount > 0;
      } else if (taskFilter === 'drafting') {
        matchesStatus = p.deptTasks.some(t => !t.completed && (!t.departmentReviewStatus || t.departmentReviewStatus === 'Drafting'));
      } else if (taskFilter === 'approved') {
        matchesStatus = p.completedTasksCount > 0;
      } else if (taskFilter === 'overdue') {
        matchesStatus = p.overdueTasksCount > 0;
      }

      return matchesSearch && matchesOfficer && matchesStatus;
    });
  }, [deptProposalData, searchQuery, selectedOfficerFilter, taskFilter]);

  // Helper badge color for department
  const getDeptColorClasses = (colorName?: string) => {
    switch (colorName) {
      case 'emerald':
        return { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', tag: 'bg-emerald-600', ring: 'ring-emerald-500' };
      case 'blue':
        return { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', tag: 'bg-blue-600', ring: 'ring-blue-500' };
      case 'purple':
        return { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200', tag: 'bg-purple-600', ring: 'ring-purple-500' };
      case 'amber':
        return { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', tag: 'bg-amber-600', ring: 'ring-amber-500' };
      case 'cyan':
        return { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200', tag: 'bg-cyan-600', ring: 'ring-cyan-500' };
      case 'rose':
        return { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200', tag: 'bg-rose-600', ring: 'ring-rose-500' };
      default:
        return { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200', tag: 'bg-indigo-600', ring: 'ring-indigo-500' };
    }
  };

  if (departments.length === 0 || !currentDept) {
    return (
      <div id="my-department-responsibilities-panel" className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs text-center space-y-3">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No Departments Configured</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Set up your organisation&apos;s departments and team structure in the Organisation Profile to track departmental responsibilities.
        </p>
        {onNavigateToProfile && (
          <button
            onClick={() => onNavigateToProfile('departments')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            Manage Departments
          </button>
        )}
      </div>
    );
  }

  const currentTheme = getDeptColorClasses(currentDept.color);

  return (
    <div id="my-department-responsibilities-panel" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header & Department Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-600" />
              Institutional Hierarchy & Workload
            </span>
            <span className="text-xs text-slate-500">
              Multi-Department Quality Control & Deadline Tracking
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Department Responsibilities
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl">
            Live overview of grant proposals requiring inputs, technical narratives, budget liquidation, or quality sign-off from your unit.
          </p>
        </div>

        {/* Department Unit Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {departments.map(dept => {
            const isSelected = dept.id === selectedDeptId;
            const theme = getDeptColorClasses(dept.color);
            return (
              <button
                key={dept.id}
                id={`dept-tab-${dept.code.toLowerCase()}`}
                onClick={() => {
                  setSelectedDeptId(dept.id);
                  setSelectedOfficerFilter('ALL');
                  setTaskFilter('all');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 border ${
                  isSelected
                    ? `${theme.bg} ${theme.text} ${theme.border} ring-2 ${theme.ring} shadow-xs`
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/70 border border-slate-300/60 font-black">
                  {dept.code}
                </span>
                <span>{dept.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Department Hierarchy Banner */}
      <div className={`p-5 rounded-xl border ${currentTheme.bg} ${currentTheme.border} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3.5">
          <div className={`w-11 h-11 rounded-xl ${currentTheme.tag} text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0`}>
            {currentDept.code}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                {currentDept.name} Department
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-300">
                {deptStaff.length} Linked Staff Officer{deptStaff.length !== 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xl">
              {currentDept.mandate || 'Primary departmental deliverables and multi-donor proposal contributions.'}
            </p>
            
            {/* Supervisory Hierarchy Chain */}
            <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-700 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[11px] text-slate-500 font-medium">Head of Department (HoD):</span>
                <span className="font-bold text-slate-900">{deptHead.fullName}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold">Sign-Off Authority</span>
              </div>

              {currentDept.deputyStaffName && (
                <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-[11px] text-slate-500 font-medium">Deputy / Alternate:</span>
                  <span className="font-semibold text-slate-800">{currentDept.deputyStaffName}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Profile Navigation */}
        {onNavigateToProfile && (
          <button
            onClick={() => onNavigateToProfile('departments')}
            className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-3.5 py-2 rounded-lg border border-indigo-200 transition flex items-center gap-1.5 shrink-0 self-start md:self-center"
          >
            <span>Configure Unit Hierarchy</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Proposals Involving Unit */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FolderOpen className="w-3 h-3 text-indigo-600" />
            Active Proposals
          </span>
          <div className="text-xl font-extrabold text-slate-900">
            {deptStats.activeProposalsCount}
          </div>
          <span className="text-[10px] text-slate-500">
            Requiring {currentDept.code} input
          </span>
        </div>

        {/* Total Deliverables */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3 h-3 text-slate-600" />
            Unit Deliverables
          </span>
          <div className="text-xl font-extrabold text-slate-900">
            {deptStats.totalTasks}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {deptStats.completed} approved / done
          </span>
        </div>

        {/* Pending HoD Sign-off */}
        <div className={`border rounded-xl p-3.5 space-y-1 transition cursor-pointer ${
          deptStats.pendingReview > 0
            ? 'bg-amber-50/80 border-amber-300 ring-1 ring-amber-300'
            : 'bg-slate-50 border-slate-200'
        }`}
        onClick={() => setTaskFilter(taskFilter === 'pending_review' ? 'all' : 'pending_review')}
        >
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            Pending HoD Review
          </span>
          <div className="text-xl font-extrabold text-amber-900 flex items-center justify-between">
            <span>{deptStats.pendingReview}</span>
            {deptStats.pendingReview > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded">
                Action
              </span>
            )}
          </div>
          <span className="text-[10px] text-amber-700">
            Awaiting HoD quality check
          </span>
        </div>

        {/* In Revision */}
        <div className={`border rounded-xl p-3.5 space-y-1 transition cursor-pointer ${
          deptStats.inRevision > 0
            ? 'bg-orange-50 border-orange-300'
            : 'bg-slate-50 border-slate-200'
        }`}
        onClick={() => setTaskFilter(taskFilter === 'revision' ? 'all' : 'revision')}
        >
          <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-orange-600" />
            In Revision
          </span>
          <div className="text-xl font-extrabold text-orange-900">
            {deptStats.inRevision}
          </div>
          <span className="text-[10px] text-orange-700">
            Returned with feedback
          </span>
        </div>

        {/* Overdue / At Risk */}
        <div className={`border rounded-xl p-3.5 space-y-1 transition cursor-pointer ${
          deptStats.overdue > 0
            ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300'
            : 'bg-slate-50 border-slate-200'
        }`}
        onClick={() => setTaskFilter(taskFilter === 'overdue' ? 'all' : 'overdue')}
        >
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            Overdue / At Risk
          </span>
          <div className="text-xl font-extrabold text-rose-900">
            {deptStats.overdue}
          </div>
          <span className="text-[10px] text-rose-700">
            Past deliverable milestone
          </span>
        </div>

        {/* Review Readiness */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Activity className="w-3 h-3 text-indigo-600" />
            Deliverable Rate
          </span>
          <div className="text-xl font-extrabold text-slate-900">
            {deptStats.completionRate}%
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full ${deptStats.completionRate >= 80 ? 'bg-emerald-500' : deptStats.completionRate >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
              style={{ width: `${deptStats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${currentDept.name} tasks or proposals...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Assigned Officer Dropdown */}
          <select
            value={selectedOfficerFilter}
            onChange={(e) => setSelectedOfficerFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All {currentDept.name} Staff ({deptStaff.length})</option>
            {deptStaff.map(s => (
              <option key={s.id} value={s.fullName}>
                {s.fullName} ({s.jobTitle})
              </option>
            ))}
          </select>
        </div>

        {/* Task Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          <button
            onClick={() => setTaskFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              taskFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 bg-white border border-slate-200'
            }`}
          >
            All ({deptStats.totalTasks})
          </button>
          <button
            onClick={() => setTaskFilter('pending_review')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              taskFilter === 'pending_review'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-amber-800 bg-amber-50 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            HoD Review ({deptStats.pendingReview})
          </button>
          <button
            onClick={() => setTaskFilter('revision')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              taskFilter === 'revision'
                ? 'bg-orange-600 text-white font-bold'
                : 'text-orange-800 bg-orange-50 border border-orange-200 hover:bg-orange-100'
            }`}
          >
            In Revision ({deptStats.inRevision})
          </button>
          <button
            onClick={() => setTaskFilter('overdue')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
              taskFilter === 'overdue'
                ? 'bg-rose-600 text-white font-bold'
                : 'text-rose-800 bg-rose-50 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            Overdue ({deptStats.overdue})
          </button>
        </div>
      </div>

      {/* Active Proposals Involving This Department */}
      {filteredProposals.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">
            No Active Proposals Matching Filters for {currentDept.name}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All department deliverables for active grants are either completed or no tasks match your current search/status criteria.
          </p>
          {(taskFilter !== 'all' || searchQuery || selectedOfficerFilter !== 'ALL') && (
            <button
              onClick={() => {
                setTaskFilter('all');
                setSearchQuery('');
                setSelectedOfficerFilter('ALL');
              }}
              className="text-xs text-indigo-600 font-bold hover:underline mt-2 inline-block"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Active Call Workspaces ({filteredProposals.length})
            </span>
            <span className="text-[11px] text-slate-500">
              Showing deliverables assigned to {currentDept.name} personnel
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredProposals.map(({ workspace, deptTasks, isLead, urgencyBadge, daysRemaining, pendingReviewCount, revisionCount, overdueTasksCount }) => {
              return (
                <div
                  key={workspace.id}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-xl p-5 shadow-xs transition space-y-4"
                >
                  {/* Proposal Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {workspace.donor}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Stage: {workspace.stage}
                        </span>
                        {isLead && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            ★ Led by {currentDept.name} Lead ({workspace.proposalLead})
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-slate-900">
                        {workspace.title}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                        <span>Funding: <strong className="text-slate-800">{workspace.fundingAmount || 'N/A'}</strong></span>
                        <span>•</span>
                        <span>Lead Coordinator: <strong className="text-slate-800">{workspace.proposalLead || 'Unassigned'}</strong></span>
                      </p>
                    </div>

                    {/* Deadline Urgency Countdown & Action Button */}
                    <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                      <div className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 ${urgencyBadge.bg} ${urgencyBadge.textCol} ${urgencyBadge.border}`}>
                        {urgencyBadge.icon === 'flame' && <Flame className="w-3.5 h-3.5 text-rose-600 animate-bounce" />}
                        {urgencyBadge.icon === 'alert' && <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                        {urgencyBadge.icon === 'calendar' && <Calendar className="w-3.5 h-3.5 text-blue-600" />}
                        {urgencyBadge.icon === 'check' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                        {urgencyBadge.icon === 'clock' && <Clock className="w-3.5 h-3.5 text-slate-500" />}
                        <span>{urgencyBadge.text}</span>
                        {workspace.deadline && (
                          <span className="text-[10px] opacity-75">({formatDeadline(workspace.deadline)})</span>
                        )}
                      </div>

                      <button
                        onClick={() => onSelectWorkspace(workspace, 'tasks')}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition border border-indigo-200 flex items-center gap-1"
                      >
                        <span>Open Workspace</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Department Deliverables List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <span>{currentDept.name} Deliverables & Sections ({deptTasks.length})</span>
                      <div className="flex items-center gap-2 text-slate-400 font-normal">
                        {pendingReviewCount > 0 && (
                          <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {pendingReviewCount} Awaiting HoD
                          </span>
                        )}
                        {revisionCount > 0 && (
                          <span className="text-orange-700 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                            {revisionCount} In Revision
                          </span>
                        )}
                        {overdueTasksCount > 0 && (
                          <span className="text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {overdueTasksCount} Overdue
                          </span>
                        )}
                      </div>
                    </div>

                    {deptTasks.length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-500 italic">
                        No specific task assigned to this unit yet. (Unit coordinates as proposal lead).
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {deptTasks.map(task => {
                          const urgency = getTaskUrgencyInfo(task.dueDate, task.completed);
                          const isPendingReview = task.departmentReviewStatus === 'Submitted to Department Head' && !task.completed;
                          const isRevision = task.departmentReviewStatus === 'Returned for Revision' && !task.completed;
                          const isApproved = task.departmentReviewStatus === 'Approved' || task.completed;

                          return (
                            <div
                              key={task.id}
                              onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                              className={`p-3 rounded-lg border text-xs transition cursor-pointer flex flex-col justify-between gap-2 hover:shadow-2xs ${
                                isPendingReview
                                  ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400'
                                  : isRevision
                                  ? 'bg-orange-50/60 border-orange-300 hover:border-orange-400'
                                  : urgency.isOverdue && !task.completed
                                  ? 'bg-rose-50/60 border-rose-300 hover:border-rose-400'
                                  : isApproved
                                  ? 'bg-emerald-50/40 border-emerald-200'
                                  : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-900 line-clamp-1">
                                    {task.title}
                                  </span>
                                  {/* Review State Badge */}
                                  {isPendingReview && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 shrink-0">
                                      HoD Review
                                    </span>
                                  )}
                                  {isRevision && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-200 text-orange-900 shrink-0">
                                      Revision
                                    </span>
                                  )}
                                  {isApproved && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0 flex items-center gap-1">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      Approved
                                    </span>
                                  )}
                                </div>

                                {task.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-1">
                                    {task.description}
                                  </p>
                                )}
                              </div>

                              {/* Footer with Officer, Due Date, and Hierarchy Status */}
                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                                <span className="font-medium text-slate-700 flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-slate-400" />
                                  {task.assignedTo || 'Unassigned'}
                                </span>

                                <span className={`font-semibold ${
                                  urgency.isOverdue && !task.completed
                                    ? 'text-rose-600 font-bold'
                                    : 'text-slate-600'
                                }`}>
                                  Due: {task.dueDate ? formatDeadline(task.dueDate) : 'No date'}
                                </span>
                              </div>

                              {/* HoD Review Notes preview if returned for revision */}
                              {isRevision && task.departmentReviewNotes && (
                                <div className="p-1.5 bg-white/90 rounded border border-orange-200 text-[10px] text-orange-900 font-medium">
                                  <strong>Supervisor Feedback:</strong> {task.departmentReviewNotes}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Departmental Quality Control & Supervisory Hierarchy Info Footnote */}
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 text-xs text-indigo-900">
        <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">
            Departmental Review Hierarchy in GrantFlow:
          </p>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            1. <strong>Staff Officer Drafting:</strong> The assigned departmental officer (e.g. Finance Officer, M&E Specialist) drafts the section.<br />
            2. <strong>Department Head Sign-Off:</strong> The Line Manager / HoD reviews technical quality and approves or requests revision before it leaves the unit.<br />
            3. <strong>Proposal Lead Integration:</strong> The overall proposal lead packages all approved multi-department pieces.<br />
            4. <strong>Executive Management Approval:</strong> Executive Director conducts final governance sign-off prior to donor submission.
          </p>
        </div>
      </div>
    </div>
  );
};
