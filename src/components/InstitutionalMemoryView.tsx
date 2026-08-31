import React, { useState } from 'react';
import { InstitutionalMemoryRecord } from '../types';
import {
  BookOpen,
  Award,
  XCircle,
  Clock,
  Plus,
  Search,
  Building,
  Calendar,
  DollarSign,
  User,
  Lightbulb,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface InstitutionalMemoryViewProps {
  records: InstitutionalMemoryRecord[];
  onAddRecord: (record: InstitutionalMemoryRecord) => void;
}

export const InstitutionalMemoryView: React.FC<InstitutionalMemoryViewProps> = ({
  records,
  onAddRecord
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [donorFilter, setDonorFilter] = useState('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [donor, setDonor] = useState('');
  const [opportunityTitle, setOpportunityTitle] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [amountRequested, setAmountRequested] = useState('');
  const [outcome, setOutcome] = useState<'Awarded' | 'Rejected' | 'Awaiting Decision'>('Awarded');
  const [amountAwarded, setAmountAwarded] = useState('');
  const [leadPerson, setLeadPerson] = useState('');
  const [feedback, setFeedback] = useState('');
  const [keyLearnings, setKeyLearnings] = useState('');

  const uniqueDonors = Array.from(new Set(records.map(r => r.donor)));

  const filteredRecords = records.filter(r => {
    const matchesSearch =
      r.donor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.opportunityTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.keyLearnings.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDonor = donorFilter === 'ALL' || r.donor === donorFilter;
    const matchesOutcome = outcomeFilter === 'ALL' || r.outcome === outcomeFilter;
    return matchesSearch && matchesDonor && matchesOutcome;
  });

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donor.trim() || !opportunityTitle.trim()) return;

    const newRecord: InstitutionalMemoryRecord = {
      id: `mem-${Date.now()}`,
      donor: donor.trim(),
      opportunityTitle: opportunityTitle.trim(),
      year: Number(year),
      amountRequested: amountRequested.trim() || 'Not specified',
      outcome,
      amountAwarded: outcome === 'Awarded' ? amountAwarded.trim() : undefined,
      leadPerson: leadPerson.trim() || 'Grants Officer',
      feedbackNotes: feedback.trim() || 'No feedback recorded',
      keyLearnings: keyLearnings.trim() || 'Learnings logged for future proposal rounds.',
      attachments: []
    };

    onAddRecord(newRecord);
    setShowAddModal(false);
    // Reset form
    setDonor('');
    setOpportunityTitle('');
    setAmountRequested('');
    setAmountAwarded('');
    setLeadPerson('');
    setFeedback('');
    setKeyLearnings('');
  };

  // Stats
  const awardedCount = records.filter(r => r.outcome === 'Awarded').length;
  const rejectedCount = records.filter(r => r.outcome === 'Rejected').length;
  const awaitingCount = records.filter(r => r.outcome === 'Awaiting Decision').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            Institutional Memory & Knowledge Bank
          </span>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2 mt-1">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Donor History & Institutional Learnings
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Never lose institutional knowledge when grant writers or program managers depart.
            Track previous applications, donor scoring feedback, and hard-earned takeaways.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Log Historical Grant Record
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historical Records</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">{records.length}</span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Recorded applications</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Awarded Grants</span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">{awardedCount}</span>
          <span className="text-[11px] text-emerald-600/80 mt-0.5 block">Funded partnerships</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Not Selected</span>
          <span className="text-2xl font-black text-rose-700 mt-1 block">{rejectedCount}</span>
          <span className="text-[11px] text-rose-600/80 mt-0.5 block">Rejected / Debriefed</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Awaiting Decision</span>
          <span className="text-2xl font-black text-amber-700 mt-1 block">{awaitingCount}</span>
          <span className="text-[11px] text-amber-600/80 mt-0.5 block">Pending donor review</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search learnings, donors, topics..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Donor Filter */}
          <select
            value={donorFilter}
            onChange={e => setDonorFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Donors ({records.length})</option>
            {uniqueDonors.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Outcome Filter */}
          <select
            value={outcomeFilter}
            onChange={e => setOutcomeFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-700"
          >
            <option value="ALL">All Outcomes</option>
            <option value="Awarded">Awarded Only</option>
            <option value="Rejected">Rejected Only</option>
            <option value="Awaiting Decision">Awaiting Decision Only</option>
          </select>
        </div>
      </div>

      {/* History Records List */}
      <div className="space-y-4">
        {records.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">No Historical Grant Records Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Your institutional knowledge bank is clean. Past awards, rejections, and review feedback will appear here as your organisation logs grant cycle outcomes.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Log First Grant Outcome
              </button>
            </div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-400">
            No historical records match your search query or filter.
          </div>
        ) : (
          filteredRecords.map(record => (
          <div
            key={record.id}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:border-slate-300 transition space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                    {record.donor}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    Year: {record.year}
                  </span>
                  <span className="text-xs text-slate-400">• Lead: {record.leadPerson}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">{record.opportunityTitle}</h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <span className="text-slate-500 block">Requested: {record.amountRequested}</span>
                  {record.amountAwarded && (
                    <span className="font-bold text-emerald-700 block">
                      Awarded: {record.amountAwarded}
                    </span>
                  )}
                </div>

                <span
                  className={`px-3 py-1 text-xs font-bold rounded-md flex items-center gap-1 shrink-0 ${
                    record.outcome === 'Awarded'
                      ? 'bg-emerald-100 text-emerald-800'
                      : record.outcome === 'Rejected'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {record.outcome === 'Awarded' && <Award className="w-3.5 h-3.5" />}
                  {record.outcome === 'Rejected' && <XCircle className="w-3.5 h-3.5" />}
                  {record.outcome === 'Awaiting Decision' && <Clock className="w-3.5 h-3.5" />}
                  {record.outcome}
                </span>
              </div>
            </div>

            {/* Debrief & Learnings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  Donor Feedback / Debrief Notes:
                </span>
                <p className="text-slate-800 leading-relaxed">{record.feedbackNotes}</p>
              </div>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg space-y-1">
                <span className="font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                  Institutional Learning & Policy Takeaway:
                </span>
                <p className="text-indigo-950 font-medium leading-relaxed">{record.keyLearnings}</p>
              </div>
            </div>
          </div>
        ))
      )}
      </div>

      {/* MODAL: Add Historical Record */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Log Historical Grant Record
            </h3>

            <form onSubmit={handleSaveRecord} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Donor Name</label>
                  <input
                    type="text"
                    value={donor}
                    onChange={e => setDonor(e.target.value)}
                    placeholder="Enter donor name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Application Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={e => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Opportunity / Project Title</label>
                <input
                  type="text"
                  value={opportunityTitle}
                  onChange={e => setOpportunityTitle(e.target.value)}
                  placeholder="Enter opportunity or project title"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Outcome</label>
                  <select
                    value={outcome}
                    onChange={e => setOutcome(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="Awarded">Awarded</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Awaiting Decision">Awaiting Decision</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Requested</label>
                  <input
                    type="text"
                    value={amountRequested}
                    onChange={e => setAmountRequested(e.target.value)}
                    placeholder="Enter amount (e.g. $100,000 USD)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                {outcome === 'Awarded' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Amount Awarded</label>
                    <input
                      type="text"
                      value={amountAwarded}
                      onChange={e => setAmountAwarded(e.target.value)}
                      placeholder="Enter amount (e.g. $100,000 USD)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Lead Proposal Writer / Contact</label>
                <input
                  type="text"
                  value={leadPerson}
                  onChange={e => setLeadPerson(e.target.value)}
                  placeholder="Enter lead proposal writer or contact"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Donor Feedback & Scores</label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  placeholder="Summarize reviewer comments, strengths noted, or reasons for rejection..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Institutional Learning & Key Takeaway</label>
                <textarea
                  rows={2}
                  value={keyLearnings}
                  onChange={e => setKeyLearnings(e.target.value)}
                  placeholder="What should future teams remember when applying to this donor?"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow"
                >
                  Save to Knowledge Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
