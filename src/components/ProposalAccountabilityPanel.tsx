import React from 'react';
import { OpportunityWorkspace, StaffMember } from '../types';
import { getProposalBottleneck } from '../utils/accountabilityUtils';
import { calculateDaysRemaining, formatDeadline } from '../utils/dateUtils';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  User,
  Users,
  ChevronRight,
  ArrowRight,
  HelpCircle,
  Building,
  Briefcase
} from 'lucide-react';

interface ProposalAccountabilityPanelProps {
  opportunities: OpportunityWorkspace[];
  staffDirectory: StaffMember[];
  onSelectWorkspace: (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => void;
  onNavigateToAccountability: () => void;
}

export const ProposalAccountabilityPanel: React.FC<ProposalAccountabilityPanelProps> = ({
  opportunities,
  staffDirectory,
  onSelectWorkspace,
  onNavigateToAccountability
}) => {
  const activeOpportunities = opportunities.filter(
    opp => opp.stage !== 'Awarded' && opp.stage !== 'Rejected' && opp.stage !== 'Submitted'
  );

  // Diagnose all active proposals
  const diagnosedProposals = activeOpportunities.map(opp => ({
    opp,
    diagnosis: getProposalBottleneck(opp, staffDirectory),
    daysRemaining: calculateDaysRemaining(opp.deadline)
  }));

  // Group by priority/risk
  const criticalEscalations = diagnosedProposals.filter(p => p.diagnosis.requiresImmediateIntervention);
  const overdueProposals = diagnosedProposals.filter(p => p.diagnosis.status === 'OVERDUE' && !p.diagnosis.requiresImmediateIntervention);
  const blockedProposals = diagnosedProposals.filter(p => p.diagnosis.status === 'BLOCKED');
  const onTrackProposals = diagnosedProposals.filter(p => p.diagnosis.status === 'ON TRACK');

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
              Management Visibility & Escalation
            </span>
            <span className="text-xs text-slate-400">
              {activeOpportunities.length} Active Proposals Monitored
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Proposal Accountability & Bottleneck Monitor
          </h2>
          <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
            Real-time tracking of proposal ownership, departmental bottlenecks, and timely management escalation.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onNavigateToAccountability}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <span>Team Workload & Matrix</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/70 border-b border-slate-200 text-xs">
        <div className="p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">{onTrackProposals.length}</div>
            <div className="text-slate-500 font-medium">On Track</div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">{overdueProposals.length}</div>
            <div className="text-slate-500 font-medium">Overdue Tasks</div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">{blockedProposals.length}</div>
            <div className="text-slate-500 font-medium">Blocked Tasks</div>
          </div>
        </div>

        <div className="p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900">{criticalEscalations.length}</div>
            <div className="text-slate-500 font-medium">Require Escalation</div>
          </div>
        </div>
      </div>

      {/* Proposals List Table */}
      <div className="divide-y divide-slate-100">
        {diagnosedProposals.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 italic">
            No active proposals being monitored. Proposals in drafting, review, or submission readiness will appear here automatically.
          </div>
        ) : (
          diagnosedProposals.map(({ opp, diagnosis, daysRemaining }) => {
            const lead = opp.proposalLead || opp.leadStaff || 'Unassigned';
            const reviewer = opp.reviewer || 'Unassigned';
            const approver = opp.finalApprover || 'Unassigned';

          return (
            <div
              key={opp.id}
              onClick={() => onSelectWorkspace(opp, diagnosis.bottlenecks.length > 0 ? 'team' : 'overview')}
              className={`p-4 transition hover:bg-slate-50 cursor-pointer flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                diagnosis.requiresImmediateIntervention ? 'bg-rose-50/40 border-l-4 border-rose-500' : ''
              }`}
            >
              {/* Left Column: Proposal & Leadership */}
              <div className="space-y-1.5 min-w-[280px] lg:max-w-md">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {opp.donor}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs text-slate-500 font-medium">
                    {opp.stage}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {opp.fundingAmount} {opp.currency}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition">
                  {opp.title}
                </h3>

                {/* Ownership Pod */}
                <div className="flex items-center gap-3 text-xs text-slate-600 pt-1">
                  <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-slate-200">
                    <User className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-slate-400 font-medium">Lead:</span>
                    <span className="font-bold text-slate-900">{lead}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-500">
                    <span>Reviewer:</span>
                    <span className="font-medium text-slate-700">{reviewer}</span>
                  </div>
                </div>
              </div>

              {/* Middle Column: Exact Bottleneck / Current Status */}
              <div className="flex-1 px-0 lg:px-4 py-2 bg-slate-50/80 rounded-lg border border-slate-200/70">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${diagnosis.statusBadgeClass}`}
                    >
                      {diagnosis.status}
                    </span>
                    {diagnosis.primaryBottleneckDept && (
                      <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        Bottleneck in {diagnosis.primaryBottleneckDept}
                      </span>
                    )}
                  </div>

                  {daysRemaining !== null && (
                    <span
                      className={`text-xs font-bold ${
                        daysRemaining <= 3
                          ? 'text-rose-600'
                          : daysRemaining <= 7
                          ? 'text-amber-600'
                          : 'text-slate-600'
                      }`}
                    >
                      {daysRemaining < 0
                        ? `${Math.abs(daysRemaining)}d passed`
                        : daysRemaining === 0
                        ? 'Due Today'
                        : `${daysRemaining} days left`}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-800 font-medium line-clamp-2">
                  {diagnosis.headline}
                </p>

                {/* If Bottlenecks exist, list the exact task and assigned owner */}
                {diagnosis.bottlenecks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {diagnosis.bottlenecks.slice(0, 2).map((b, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] flex items-center justify-between bg-white px-2 py-1 rounded border border-slate-200 text-slate-700"
                      >
                        <span className="truncate max-w-[200px] sm:max-w-xs font-medium">
                          📌 {b.task.title}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-slate-500 font-semibold">
                            Assigned: <strong className="text-slate-800">{b.assignedStaff}</strong> ({b.department})
                          </span>
                          {b.isOverdue && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-100 text-rose-700 border border-rose-200">
                              {b.daysOverdue}d Overdue
                            </span>
                          )}
                          {b.isBlocked && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                              Blocked
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Actions & Escalation */}
              <div className="flex items-center lg:flex-col lg:items-end justify-between gap-2 shrink-0">
                {diagnosis.escalationLevel && diagnosis.escalationLevel !== 'None' ? (
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 block">
                      Escalated to: {diagnosis.escalationLevel}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {diagnosis.escalationRecipients.join(', ')}
                    </span>
                  </div>
                ) : (
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Normal Review Loop
                    </span>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectWorkspace(opp, 'team');
                  }}
                  className="px-3 py-1.5 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                >
                  <span>Open Team Matrix</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
    </div>
  );
};
