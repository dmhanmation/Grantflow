import React from 'react';
import { OrgProfile, AppUser, StaffMember } from '../types';
import { sortStaffByHierarchy } from '../utils/staffHierarchy';
import { generateWorkspaceNotifications } from '../utils/dateUtils';
import { OpportunityWorkspace } from '../types';
import {
  Building2,
  Users,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Plus,
  FolderOpen,
  UserCheck,
  Mail,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface AdminSetupDashboardProps {
  orgProfile: OrgProfile;
  currentUser: AppUser;
  opportunities: OpportunityWorkspace[];
  onNavigateToProfile: (tab?: string) => void;
  onInviteStaff?: () => void;
}

export const AdminSetupDashboard: React.FC<AdminSetupDashboardProps> = ({
  orgProfile,
  currentUser,
  opportunities,
  onNavigateToProfile,
  onInviteStaff
}) => {
  const setupItems = [
    { key: 'details', label: 'Organisation Profile', description: 'Legal name, registration, country, type', done: Boolean(orgProfile.name && orgProfile.country && orgProfile.orgType), tab: 'details' },
    { key: 'departments', label: 'Departments', description: 'At least one department configured', done: (orgProfile.departments?.length || 0) > 0, tab: 'departments' },
    { key: 'staff', label: 'Staff Accounts', description: 'At least one staff member in a department', done: (orgProfile.staffDirectory || []).some(s => Boolean(s.departmentId || s.department)), tab: 'staff' },
    { key: 'documents', label: 'Document Library', description: 'Statutory documents and compliance records', done: (orgProfile.documentLibrary?.length || 0) > 0, tab: 'documents' },
    { key: 'policies', label: 'Governance Policies', description: 'Safeguarding, anti-fraud, gender policies', done: Boolean(orgProfile.safeguardingPolicy || orgProfile.antiFraudPolicy || orgProfile.genderPolicy), tab: 'policies' }
  ];

  const completedCount = setupItems.filter(s => s.done).length;
  const pctDone = Math.round((completedCount / setupItems.length) * 100);

  const staffList = orgProfile.staffDirectory || [];
  const activeStaff = staffList.filter(s => s.status === 'Active' || !s.status);
  const inactiveStaff = staffList.filter(s => s.status === 'Inactive');
  const departments = orgProfile.departments || [];

  const allNotifications = generateWorkspaceNotifications(opportunities, orgProfile);
  const expiringDocs = allNotifications.filter(
    n => (n.category === 'document_expiring_soon' && n.daysDiff <= 30) || n.category === 'document_expired'
  );
  const totalDocs = orgProfile.documentLibrary?.length || 0;

  const operationalRoles = ['DepartmentHead', 'ProposalLead', 'Officer', 'FinalApprover', 'Reviewer'];
  const adminAsStaff = staffList.find(s => s.email === currentUser.email || s.userId === currentUser.id);
  const adminOperationalRole = adminAsStaff
    ? (adminAsStaff.roles || [adminAsStaff.role]).find(r => operationalRoles.includes(r as string))
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 text-white rounded-xl px-5 py-4 md:px-6 md:py-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">Organisation Administration</span>
            {expiringDocs.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/30 text-amber-200 border border-amber-400/40 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {expiringDocs.length} Doc Alert{expiringDocs.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">Admin Setup Hub</h1>
          <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Manage your organisation profile, staff accounts, departments, document library, and governance settings. Use <strong>Switch View</strong> in your account menu to access operational dashboards if you hold an operational role.
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-3 flex-wrap">
          <button onClick={() => onNavigateToProfile('details')} className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-300" />Org Profile
          </button>
          <button onClick={() => onNavigateToProfile('documents')} className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-xl border border-white/20 transition flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-300" />Doc Library
          </button>
          <button onClick={() => onNavigateToProfile('staff')} className="px-5 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center gap-2">
            <Users className="w-4 h-4" />Manage Staff
          </button>
        </div>
      </div>

      {/* SWITCH VIEW PROMPT */}
      {adminOperationalRole && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <RefreshCw className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-indigo-900">You are also listed as <span className="text-indigo-700">{adminOperationalRole}</span>.</p>
            <p className="text-xs text-indigo-700 mt-0.5">Use <strong>Switch View</strong> in your account menu (top right) to access the operational dashboard for your {adminOperationalRole} responsibilities.</p>
          </div>
        </div>
      )}

      {/* SETUP CHECKLIST + STAFF STATS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-indigo-600" />Organisation Setup Progress</h2>
              <p className="text-xs text-slate-500 mt-0.5">Complete all sections to fully activate GrantFlow for your team.</p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black ${pctDone === 100 ? 'text-emerald-600' : 'text-indigo-700'}`}>{pctDone}%</span>
              <p className="text-[11px] text-slate-500">{completedCount}/{setupItems.length} done</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${pctDone === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pctDone}%` }} />
          </div>
          <div className="space-y-2.5">
            {setupItems.map(item => (
              <button key={item.key} onClick={() => onNavigateToProfile(item.tab)} className={`w-full text-left p-3.5 rounded-xl border transition flex items-center justify-between gap-3 group ${item.done ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300' : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {item.done ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className={`text-sm font-bold block ${item.done ? 'text-emerald-900' : 'text-slate-900'}`}>{item.label}</span>
                    <span className="text-[11px] text-slate-500">{item.description}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0 transition" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100"><Users className="w-4 h-4 text-indigo-600" />Staff Roster</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-indigo-50 rounded-xl text-center">
                <span className="text-2xl font-black text-indigo-700">{activeStaff.length}</span>
                <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Active</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <span className="text-2xl font-black text-slate-500">{inactiveStaff.length}</span>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Inactive</p>
              </div>
            </div>
            <button onClick={() => onNavigateToProfile('staff')} className="w-full px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition flex items-center justify-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />Manage Staff & Roles
            </button>
            {onInviteStaff && (
              <button onClick={onInviteStaff} className="w-full px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition flex items-center justify-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />Invite Staff Member
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100"><Layers className="w-4 h-4 text-indigo-600" />Departments ({departments.length})</h3>
            {departments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No departments configured yet.</p>
            ) : (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {departments.map(d => (
                  <div key={d.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{d.name}</span>
                    <span className="text-[10px] text-slate-500">{d.headStaffName || '—'}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => onNavigateToProfile('departments')} className="w-full px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />Manage Departments
            </button>
          </div>
        </div>
      </div>

      {/* DOCUMENT COMPLIANCE RADAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${expiringDocs.length > 0 ? 'bg-amber-100 border border-amber-300' : 'bg-emerald-100 border border-emerald-300'}`}>
              {expiringDocs.length > 0 ? <Clock className="w-5 h-5 text-amber-700 animate-pulse" /> : <ShieldCheck className="w-5 h-5 text-emerald-700" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Document Compliance Radar</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">30-Day Scan</span>
              </div>
              <p className="text-xs text-slate-500">Statutory registrations, tax clearances, audit statements, and governance policies</p>
            </div>
          </div>
          <button onClick={() => onNavigateToProfile('documents')} className="px-3.5 py-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto">
            <FolderOpen className="w-4 h-4" />Manage Document Library →
          </button>
        </div>

        {totalDocs === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <FolderOpen className="w-8 h-8 text-slate-400" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">No Documents Uploaded Yet</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Upload your CAC certificate, tax clearance, audit statements, and governance policies to activate compliance tracking.</span>
              </div>
            </div>
            <button onClick={() => onNavigateToProfile('documents')} className="text-xs font-bold text-indigo-600 px-3 py-1.5 bg-white border border-slate-200 rounded-lg shrink-0 transition self-start sm:self-auto">Upload Documents →</button>
          </div>
        ) : expiringDocs.length === 0 ? (
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              <div>
                <span className="text-xs font-bold text-emerald-900 block">All {totalDocs} Documents Are Compliant</span>
                <span className="text-[11px] text-emerald-700 block mt-0.5">No documents expire within the next 30 days.</span>
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-800 px-2.5 py-1 bg-emerald-100 rounded-lg">100% Up to Date</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {expiringDocs.map(alert => {
              const isExpired = alert.daysDiff < 0;
              return (
                <div key={alert.id} className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${isExpired ? 'bg-rose-50/80 border-rose-300' : alert.daysDiff <= 7 ? 'bg-rose-50/50 border-rose-300' : 'bg-amber-50/70 border-amber-300'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isExpired ? 'bg-rose-700 text-white' : alert.daysDiff <= 7 ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}`}>
                        {isExpired ? `EXPIRED (${Math.abs(alert.daysDiff)}d AGO)` : alert.daysDiff === 0 ? 'EXPIRES TODAY' : `EXPIRES IN ${alert.daysDiff} DAYS`}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600">Due: {alert.dueDateStr}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{alert.title.replace(/^Institutional Document Expired: |^Document Expiring (Today|in \d+ days?): /, '')}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{alert.description}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-slate-600 font-medium truncate">Custodian: <strong className="text-slate-800">{alert.assignee || 'Unassigned'}</strong></span>
                    <button onClick={() => onNavigateToProfile('documents')} className="px-2.5 py-1 text-[11px] font-bold bg-white text-indigo-700 hover:bg-indigo-50 border border-slate-200 rounded-lg shrink-0 transition">Update →</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* STAFF DIRECTORY OVERVIEW */}
      {staffList.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" />Staff Directory Overview</h2>
            <button onClick={() => onNavigateToProfile('staff')} className="text-xs font-bold text-indigo-600 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg transition">Manage All →</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortStaffByHierarchy(activeStaff).slice(0, 9).map(s => (
              <div key={s.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-900 block truncate">{s.fullName}</span>
                  <span className="text-[11px] text-slate-500 block truncate">{s.jobTitle || '—'} · {s.department || '—'}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${s.role === 'Admin' ? 'bg-slate-900 text-white' : s.role === 'DepartmentHead' ? 'bg-indigo-100 text-indigo-800' : s.role === 'ProposalLead' ? 'bg-purple-100 text-purple-800' : s.role === 'FinalApprover' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {s.role}
                </span>
              </div>
            ))}
            {activeStaff.length > 9 && (
              <button onClick={() => onNavigateToProfile('staff')} className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition flex items-center justify-center gap-1.5">
                +{activeStaff.length - 9} more →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
