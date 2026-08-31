import React, { useState, useMemo } from 'react';
import { OpportunityWorkspace, StaffMember, WorkspaceTask, TaskStatus } from '../types';
import { calculateDaysRemaining, formatDeadline, getDaysDifference, getTaskUrgencyInfo } from '../utils/dateUtils';
import { sortStaffByHierarchy } from '../utils/staffHierarchy';
import { DepartmentalTaskReview } from './DepartmentalTaskReview';
import {
  Building,
  User,
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
  FolderOpen
} from 'lucide-react';

interface DepartmentRoleDashboardProps {
  opportunities: OpportunityWorkspace[];
  staffDirectory: StaffMember[];
  onSelectWorkspace: (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => void;
  onUpdateWorkspace?: (updated: OpportunityWorkspace) => void;
}

export type DashboardRoleView = 'executive' | 'department_head' | 'officer' | 'proposal_lead';

export const DepartmentRoleDashboard: React.FC<DepartmentRoleDashboardProps> = ({
  opportunities,
  staffDirectory,
  onSelectWorkspace,
  onUpdateWorkspace
}) => {
  // Role perspective selection
  const [roleView, setRoleView] = useState<DashboardRoleView>('executive');

  // Department selection for HoD view
  const [selectedDept, setSelectedDept] = useState<string>(staffDirectory?.[0]?.department || 'Programmes');

  // Officer selection for Officer view
  const [selectedOfficerName, setSelectedOfficerName] = useState<string>(staffDirectory?.[0]?.fullName || '');

  // Proposal Lead selection for Lead view
  const [selectedLeadName, setSelectedLeadName] = useState<string>(staffDirectory?.[0]?.fullName || '');

  // Available unique departments
  const departments = useMemo(() => {
    const set = new Set<string>();
    staffDirectory.forEach(s => s.department && set.add(s.department));
    return Array.from(set);
  }, [staffDirectory]);

  // Unique staff officers
  const officers = useMemo(() => {
    return staffDirectory;
  }, [staffDirectory]);

  // Unique proposal leads
  const proposalLeads = useMemo(() => {
    const leads = new Set<string>();
    opportunities.forEach(opp => {
      const lead = opp.proposalLead || opp.leadStaff;
      if (lead) leads.add(lead);
    });
    return Array.from(leads);
  }, [opportunities]);

  // Active proposals
  const activeOpportunities = useMemo(() => {
    return opportunities.filter(o => o.stage !== 'Awarded' && o.stage !== 'Rejected');
  }, [opportunities]);

  // Department Head calculations
  const deptStaff = useMemo(() => {
    return sortStaffByHierarchy(staffDirectory.filter(s => s.department === selectedDept));
  }, [staffDirectory, selectedDept]);

  const deptHead = useMemo(() => {
    const head = deptStaff.find(s => s.isDepartmentHead);
    if (head) return head;
    return { fullName: 'Unassigned', jobTitle: `${selectedDept || 'Department'} Line Manager` };
  }, [deptStaff, selectedDept]);

  // All tasks belonging to the selected department across all active workspaces
  const deptTasks = useMemo(() => {
    const list: { workspace: OpportunityWorkspace; task: WorkspaceTask }[] = [];
    activeOpportunities.forEach(opp => {
      (opp.tasks || []).forEach(t => {
        const staff = staffDirectory.find(s => s.fullName === t.assignedTo);
        const taskDept = t.departmentName || staff?.department;
        if (taskDept === selectedDept) {
          list.push({ workspace: opp, task: t });
        }
      });
    });
    return list;
  }, [activeOpportunities, selectedDept, staffDirectory]);

  const deptPendingReview = deptTasks.filter(item => item.task.departmentReviewStatus === 'Submitted to Department Head' && !item.task.completed);
  const deptInRevision = deptTasks.filter(item => item.task.departmentReviewStatus === 'Returned for Revision' && !item.task.completed);
  const deptApproved = deptTasks.filter(item => item.task.departmentReviewStatus === 'Approved' || item.task.completed);
  const deptDrafting = deptTasks.filter(item => !item.task.completed && (!item.task.departmentReviewStatus || item.task.departmentReviewStatus === 'Drafting'));
  const deptOverdue = deptTasks.filter(item => !item.task.completed && getTaskUrgencyInfo(item.task.dueDate, item.task.completed).isOverdue);

  // Officer calculations
  const selectedOfficer = useMemo(() => {
    return officers.find(o => o.fullName === selectedOfficerName) || officers[0];
  }, [officers, selectedOfficerName]);

  const officerTasks = useMemo(() => {
    const list: { workspace: OpportunityWorkspace; task: WorkspaceTask }[] = [];
    activeOpportunities.forEach(opp => {
      (opp.tasks || []).forEach(t => {
        if (t.assignedTo === selectedOfficerName) {
          list.push({ workspace: opp, task: t });
        }
      });
    });
    return list;
  }, [activeOpportunities, selectedOfficerName]);

  const officerRevisionTasks = officerTasks.filter(item => item.task.departmentReviewStatus === 'Returned for Revision' && !item.task.completed);
  const officerPendingHodTasks = officerTasks.filter(item => item.task.departmentReviewStatus === 'Submitted to Department Head' && !item.task.completed);
  const officerDraftingTasks = officerTasks.filter(item => !item.task.completed && (!item.task.departmentReviewStatus || item.task.departmentReviewStatus === 'Drafting'));
  const officerCompletedTasks = officerTasks.filter(item => item.task.completed || item.task.departmentReviewStatus === 'Approved');

  // Proposal Lead calculations
  const leadProposals = useMemo(() => {
    return activeOpportunities.filter(o => (o.proposalLead || o.leadStaff) === selectedLeadName);
  }, [activeOpportunities, selectedLeadName]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
      {/* Role Perspective Switcher Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
              Institutional Accountability Flow
            </span>
            <span className="text-xs text-slate-400">Proposal Coordination vs. Line Management</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Organisational Role Perspectives
          </h2>
          <p className="text-xs text-slate-500">
            Switch between Executive view, Department Head supervisory responsibilities, Officer tasks, and Proposal Lead coordination.
          </p>
        </div>

        {/* Perspective Buttons */}
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => setRoleView('executive')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition ${
              roleView === 'executive'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Proposals (Executive)
          </button>

          <button
            onClick={() => setRoleView('department_head')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              roleView === 'department_head'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Department Responsibilities</span>
          </button>

          <button
            onClick={() => setRoleView('officer')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              roleView === 'officer'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Proposal Tasks</span>
          </button>

          <button
            onClick={() => setRoleView('proposal_lead')}
            className={`px-3 py-2 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              roleView === 'proposal_lead'
                ? 'bg-indigo-600 text-white shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Proposals (Lead)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: EXECUTIVE / ALL OVERVIEW */}
      {roleView === 'executive' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 block text-sm">
                  Executive Cross-Departmental Overview
                </span>
                <span className="text-slate-500">
                  {activeOpportunities.length} active funding opportunities across {departments.length} functional departments.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                {deptApproved.length} Approved Deliverables
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-[11px]">
                {deptPendingReview.length} Pending HoD Reviews
              </span>
            </div>
          </div>

          {/* Departmental Workload Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map(dept => {
              const deptTasksList: WorkspaceTask[] = [];
              activeOpportunities.forEach(opp => {
                opp.tasks.forEach(t => {
                  const s = staffDirectory.find(staff => staff.fullName === t.assignedTo);
                  if ((t.departmentName || s?.department) === dept) {
                    deptTasksList.push(t);
                  }
                });
              });

              const pending = deptTasksList.filter(t => t.departmentReviewStatus === 'Submitted to Department Head' && !t.completed).length;
              const overdue = deptTasksList.filter(t => !t.completed && getTaskUrgencyInfo(t.dueDate, t.completed).isOverdue).length;
              const done = deptTasksList.filter(t => t.completed || t.departmentReviewStatus === 'Approved').length;

              return (
                <div
                  key={dept}
                  onClick={() => {
                    setSelectedDept(dept);
                    setRoleView('department_head');
                  }}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-indigo-50/40 hover:border-indigo-300 cursor-pointer transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600" />
                      {dept}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition" />
                  </div>

                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-900">{deptTasksList.length}</span>
                    <span className="text-xs font-semibold text-slate-500">Deliverables</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] flex items-center justify-between text-slate-600">
                    <span className="text-blue-700 font-bold">{pending} pending HoD</span>
                    <span className={overdue > 0 ? 'text-rose-700 font-bold' : 'text-emerald-700 font-medium'}>
                      {overdue > 0 ? `${overdue} overdue` : `${done} done`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: DEPARTMENT HEAD VIEW ("My Department Responsibilities") */}
      {roleView === 'department_head' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Department Selector & Line Manager Header */}
          <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 uppercase tracking-wider">
                  Line Manager Supervision Hub
                </span>
                <span className="text-xs text-slate-400">Responsible for Quality, Rigour & Staff Oversight</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-400" />
                {selectedDept} Department Responsibilities
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Line Manager: <strong className="text-white">{deptHead.fullName}</strong> ({deptHead.jobTitle})
              </p>
            </div>

            {/* Department Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Switch Department:</span>
              <select
                value={selectedDept}
                onChange={e => setSelectedDept(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* HoD KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-900">Pending HoD Review</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl font-black text-blue-900 mt-1 block">{deptPendingReview.length}</span>
              <span className="text-[11px] text-blue-700 mt-0.5 block">Staff awaiting your sign-off</span>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900">In Revision</span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="text-2xl font-black text-amber-900 mt-1 block">{deptInRevision.length}</span>
              <span className="text-[11px] text-amber-700 mt-0.5 block">Returned with feedback</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Drafting</span>
                <User className="w-4 h-4 text-slate-500" />
              </div>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{deptDrafting.length}</span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">In preparation by staff</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900">Approved & Done</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">{deptApproved.length}</span>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">Quality verified</span>
            </div>
          </div>

          {/* HoD Action Queue: Deliverables Awaiting Sign-Off */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Line Manager Review Queue ({deptPendingReview.length} awaiting approval)
              </h4>
              <span className="text-xs text-slate-500">Click to review and authorize deliverables</span>
            </div>

            {deptPendingReview.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>All submitted deliverables for {selectedDept} have been reviewed. No items pending HoD sign-off.</span>
              </div>
            ) : (
              <div className="space-y-2.5">
                {deptPendingReview.map(({ workspace, task }) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-blue-50/40 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{task.title}</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">
                          Submitted by {task.assignedTo}
                        </span>
                      </div>
                      <div className="text-slate-500 flex items-center gap-2 text-[11px]">
                        <span>Proposal: <strong>{workspace.title}</strong></span>
                        <span>•</span>
                        <span>Donor: <strong>{workspace.donor}</strong></span>
                        <span>•</span>
                        <span>Due: {task.dueDate}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      <span>Review & Approve</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Department Deliverables Table Across All Proposals */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              All {selectedDept} Contributions Across Proposals ({deptTasks.length})
            </h4>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <th className="py-2.5 px-3">Proposal / Opportunity</th>
                    <th className="py-2.5 px-3">Deliverable Task</th>
                    <th className="py-2.5 px-3">Staff Officer</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Review Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deptTasks.map(({ workspace, task }) => {
                    const revStatus = task.departmentReviewStatus || (task.completed ? 'Approved' : 'Drafting');
                    const urgency = getTaskUrgencyInfo(task.dueDate, task.completed);

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[200px] truncate">
                          {workspace.title}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {task.title}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {task.assignedTo}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={urgency.isOverdue ? 'text-rose-700 font-bold' : 'text-slate-600'}>
                            {task.dueDate}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {revStatus === 'Approved' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ Approved
                            </span>
                          ) : revStatus === 'Submitted to Department Head' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              ⏳ Pending HoD
                            </span>
                          ) : revStatus === 'Returned for Revision' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                              ⚠️ In Revision
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                              Drafting
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                          >
                            Open →
                          </button>
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

      {/* VIEW 3: OFFICER VIEW ("My Proposal Tasks") */}
      {roleView === 'officer' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Officer Selector Header */}
          <div className="bg-slate-900 text-white rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 uppercase tracking-wider">
                  Officer Workspace
                </span>
                <span className="text-xs text-slate-400">Assigned Proposal Contributions</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-400" />
                {selectedOfficer.fullName}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                {selectedOfficer.jobTitle} • {selectedOfficer.department} Department (Line Manager: <strong className="text-white">{selectedOfficer.reportsTo || 'Department Head'}</strong>)
              </p>
            </div>

            {/* Officer Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Select Staff Member:</span>
              <select
                value={selectedOfficerName}
                onChange={e => setSelectedOfficerName(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {officers.map(off => (
                  <option key={off.id} value={off.fullName}>
                    {off.fullName} ({off.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Officer KPI Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 text-xs">
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <span className="font-bold text-amber-900 block">Returned for Revision</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">{officerRevisionTasks.length}</span>
              <span className="text-[11px] text-amber-700 mt-0.5 block">Requires adjustments</span>
            </div>

            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
              <span className="font-bold text-indigo-900 block">In Progress / Drafting</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block">{officerDraftingTasks.length}</span>
              <span className="text-[11px] text-indigo-700 mt-0.5 block">Work currently underway</span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <span className="font-bold text-blue-900 block">Submitted to Line Manager</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">{officerPendingHodTasks.length}</span>
              <span className="text-[11px] text-blue-700 mt-0.5 block">Awaiting HoD review</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-emerald-900 block">Approved Deliverables</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">{officerCompletedTasks.length}</span>
              <span className="text-[11px] text-emerald-700 mt-0.5 block">Sign-offs complete</span>
            </div>
          </div>

          {/* Urgent Revision Tasks */}
          {officerRevisionTasks.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Tasks Returned for Revision by Line Manager ({selectedOfficer.reportsTo})
              </h4>
              <div className="space-y-2.5">
                {officerRevisionTasks.map(({ workspace, task }) => (
                  <div
                    key={task.id}
                    className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-bold text-amber-950 text-sm">{task.title}</div>
                        <div className="text-slate-500 mt-0.5">
                          Proposal: <strong>{workspace.title}</strong> • Due: {task.dueDate}
                        </div>
                      </div>
                      <button
                        onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                        className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition shrink-0"
                      >
                        Revise in Workspace →
                      </button>
                    </div>

                    {task.reviewNote && (
                      <div className="p-2.5 bg-white rounded-lg border border-amber-200 text-slate-800">
                        <strong>Line Manager Feedback:</strong> {task.reviewNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Officer Tasks */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              All Assigned Deliverables for {selectedOfficer.fullName} ({officerTasks.length})
            </h4>

            {officerTasks.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                No active tasks assigned to {selectedOfficer.fullName}.
              </div>
            ) : (
              <div className="space-y-2.5">
                {officerTasks.map(({ workspace, task }) => {
                  const revStatus = task.departmentReviewStatus || (task.completed ? 'Approved' : 'Drafting');
                  const urgency = getTaskUrgencyInfo(task.dueDate, task.completed);

                  return (
                    <div
                      key={task.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-indigo-300 transition"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-semibold text-sm ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </span>

                          {revStatus === 'Approved' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ Approved by HoD
                            </span>
                          )}
                          {revStatus === 'Submitted to Department Head' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              ⏳ Pending HoD Review
                            </span>
                          )}
                          {revStatus === 'Returned for Revision' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900">
                              ⚠️ Needs Revision
                            </span>
                          )}
                        </div>

                        <div className="text-slate-500 flex items-center gap-2 text-[11px] flex-wrap">
                          <span>Proposal: <strong>{workspace.title}</strong></span>
                          <span>•</span>
                          <span>Donor: {workspace.donor}</span>
                          <span>•</span>
                          <span className={urgency.isOverdue ? 'text-rose-700 font-bold' : ''}>
                            Due: {task.dueDate}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectWorkspace(workspace, 'tasks', task.id)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg transition shrink-0"
                      >
                        Open Task →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 4: PROPOSAL LEAD VIEW ("Departmental Task Review & My Proposals") */}
      {roleView === 'proposal_lead' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Proposal Lead Selector Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 uppercase tracking-wider">
                  Proposal Lead Workspace Dashboard
                </span>
                <span className="text-xs text-slate-400">Institutional Grant Synthesis & HoD Sign-Off</span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-400" />
                Active Coordinated Grants — {selectedLeadName}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Overseeing multi-departmental deliverables, tracking Line Manager quality sign-offs, and managing final submission readiness.
              </p>
            </div>

            {/* Lead Selector */}
            <div className="flex items-center gap-2 bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-300 font-medium whitespace-nowrap">Active Proposal Lead:</span>
              <select
                value={selectedLeadName}
                onChange={e => setSelectedLeadName(e.target.value)}
                className="bg-transparent text-white text-xs font-bold focus:outline-none cursor-pointer"
              >
                {proposalLeads.map(lead => (
                  <option key={lead} value={lead} className="bg-slate-900 text-white">{lead}</option>
                ))}
              </select>
            </div>
          </div>

          {/* REAL-TIME DEPARTMENTAL TASK REVIEW INTERFACE */}
          <DepartmentalTaskReview
            opportunities={opportunities}
            staffDirectory={staffDirectory}
            selectedLeadName={selectedLeadName}
            onSelectWorkspace={onSelectWorkspace}
            onUpdateWorkspace={onUpdateWorkspace}
          />
        </div>
      )}
    </div>
  );
};
