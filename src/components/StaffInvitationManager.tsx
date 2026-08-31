import React, { useState } from 'react';
import { api } from '../utils/api';
import { OrgDepartment, StaffInvitation, UserRole } from '../types';
import {
  Mail,
  UserPlus,
  Copy,
  Check,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles
} from 'lucide-react';

interface StaffInvitationManagerProps {
  departments: OrgDepartment[];
  organizationName: string;
  onStaffInvited?: (invitation: StaffInvitation) => void;
}

export const StaffInvitationManager: React.FC<StaffInvitationManagerProps> = ({
  departments,
  organizationName,
  onStaffInvited
}) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [role, setRole] = useState<UserRole>('Officer');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{ invitation: StaffInvitation; inviteLink: string; emailDelivery?: { sent: boolean; skipped?: boolean; error?: string } } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !fullName.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.createInvitation({
        email: email.trim(),
        fullName: fullName.trim(),
        jobTitle: jobTitle.trim() || 'Staff Member',
        departmentId,
        role,
        roles: [role]
      });

      setCreatedInvite(res);
      setEmail('');
      setFullName('');
      setJobTitle('');
      if (onStaffInvited) onStaffInvited(res.invitation);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create staff invitation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdInvite) return;
    const fullUrl = `${window.location.origin}${createdInvite.inviteLink}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (departments.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-amber-900">Create a department first</h3>
          <p className="text-xs text-amber-800 mt-1">
            Staff must be assigned to a department. Configure at least one department in Department Management before inviting staff.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Invite Staff Member</h3>
              <p className="text-xs text-slate-500">
                Grant staff access to {organizationName} with dedicated department roles.
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSendInvite} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter staff full name"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter staff email address"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Job Title
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="Enter job title"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Assigned Department
              </label>
              <select
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
              >
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Functional Operational Role
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as UserRole)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="Officer">Officer / Contributor (Drafts assigned sections and tasks)</option>
              <option value="DepartmentHead">Department Head / Line Manager (Reviews & approves departmental deliverables)</option>
              <option value="ProposalLead">Proposal Lead (Coordinates overall grant applications)</option>
              <option value="FinalApprover">Final Approver (Authorizes proposal submission)</option>
              <option value="Admin">Organisation Admin (Manages org profile, staff, and settings)</option>
              <option value="Viewer">Viewer (Read-only access)</option>
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {isLoading ? 'Creating Invitation...' : 'Generate Staff Invitation'}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Invitation Link Box */}
      {createdInvite && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Invitation Created for {createdInvite.invitation.fullName}</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              Role: {createdInvite.invitation.role}
            </span>
          </div>

          <p className="text-xs text-emerald-800">
            {createdInvite.emailDelivery?.sent
              ? `Invitation email sent to ${createdInvite.invitation.email}. The direct link is also available below.`
              : 'Email delivery is not configured or could not be completed. Use the direct invitation link below while email is being configured.'}
          </p>

          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-emerald-300">
            <input
              type="text"
              readOnly
              value={`${window.location.origin}${createdInvite.inviteLink}`}
              className="w-full text-xs font-mono text-slate-800 bg-transparent outline-none px-2"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shrink-0 flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Link
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
