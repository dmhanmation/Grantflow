import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { AppUser, OrgProfile, StaffInvitation } from '../types';
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';

interface InvitationAcceptScreenProps {
  token: string;
  onAccepted: (user: AppUser, org: OrgProfile, token: string) => void;
}

export const InvitationAcceptScreen: React.FC<InvitationAcceptScreenProps> = ({ token, onAccepted }) => {
  const [invitation, setInvitation] = useState<StaffInvitation | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getInvitation(token)
      .then(inv => {
        if (!active) return;
        setInvitation(inv);
        setFullName(inv.fullName || '');
      })
      .catch(err => {
        if (active) setError(err.message || 'Invitation is invalid or expired.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.acceptInvitation({ token, password, fullName: fullName.trim() });
      onAccepted(res.user, res.organization, res.token);
      window.history.replaceState({}, document.title, '/');
    } catch (err: any) {
      setError(err.message || 'Could not accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-xl p-7 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Join GrantFlow</h1>
            <p className="text-xs text-slate-500 mt-1">Create your password to activate your staff account.</p>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking invitation…
          </div>
        ) : error && !invitation ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" /> {error}
          </div>
        ) : invitation ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm">
              <div className="font-bold text-slate-900">{invitation.organizationName}</div>
              <div className="text-slate-600 mt-1">{invitation.jobTitle} • {invitation.departmentName}</div>
              <div className="text-slate-500 text-xs mt-1">{invitation.email}</div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Full name</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Create password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500" />
            </div>

            <button type="submit" disabled={submitting} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Activate Account
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
};
