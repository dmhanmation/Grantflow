import React, { useState, useMemo } from 'react';
import { OpportunityWorkspace, PipelineStage } from '../types';
import { calculateDaysRemaining, formatDeadline, getTaskUrgencyInfo, normalizeVerificationStatus } from '../utils/dateUtils';
import { ProgressDonutChart } from './ProgressDonutChart';
import {
  Search,
  Filter,
  X,
  Plus,
  ArrowUpDown,
  Building2,
  Calendar,
  DollarSign,
  Clock,
  Layers,
  ChevronRight,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
  Sparkles,
  Award,
  Send,
  FileCheck,
  ListTodo,
  UserCheck,
  Trash2
} from 'lucide-react';

interface WorkspacesListViewProps {
  opportunities: OpportunityWorkspace[];
  onSelectWorkspace: (workspace: OpportunityWorkspace) => void;
  onNavigateToAnalyze: () => void;
  onDeleteWorkspace?: (workspaceId: string) => void;
}

const ALL_PIPELINE_STAGES: PipelineStage[] = [
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

export const WorkspacesListView: React.FC<WorkspacesListViewProps> = ({
  opportunities,
  onSelectWorkspace,
  onNavigateToAnalyze,
  onDeleteWorkspace
}) => {
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [selectedDonor, setSelectedDonor] = useState<string>('ALL');
  const [selectedLead, setSelectedLead] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'deadline' | 'amount' | 'donor' | 'updated' | 'title'>('deadline');
  const [viewLayout, setViewLayout] = useState<'cards' | 'table'>('cards');

  const effectiveOpportunities = opportunities;

  // Extract unique donors from opportunities with counts
  const donorOptions = useMemo(() => {
    const donorCounts: Record<string, number> = {};
    effectiveOpportunities.forEach(opp => {
      if (opp.donor) {
        donorCounts[opp.donor] = (donorCounts[opp.donor] || 0) + 1;
      }
    });
    return Object.entries(donorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [effectiveOpportunities]);

  // Extract unique leads
  const leadOptions = useMemo(() => {
    const leadCounts: Record<string, number> = {};
    effectiveOpportunities.forEach(opp => {
      const lead = opp.proposalLead || opp.leadStaff || 'Unassigned';
      leadCounts[lead] = (leadCounts[lead] || 0) + 1;
    });
    return Object.entries(leadCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [effectiveOpportunities]);

  // Stage counts for badges
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: effectiveOpportunities.length };
    effectiveOpportunities.forEach(opp => {
      counts[opp.stage] = (counts[opp.stage] || 0) + 1;
    });
    return counts;
  }, [effectiveOpportunities]);

  // Filtered and Sorted Opportunities
  const filteredOpportunities = useMemo(() => {
    return effectiveOpportunities
      .filter(opp => {
        // Stage filter
        if (selectedStage !== 'ALL' && opp.stage !== selectedStage) {
          return false;
        }

        // Donor filter
        if (selectedDonor !== 'ALL' && opp.donor !== selectedDonor) {
          return false;
        }

        // Lead filter
        const lead = opp.proposalLead || opp.leadStaff || 'Unassigned';
        if (selectedLead !== 'ALL' && lead !== selectedLead) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = opp.title?.toLowerCase().includes(q);
          const matchDonor = opp.donor?.toLowerCase().includes(q);
          const matchLead = lead.toLowerCase().includes(q);
          const matchCountry = opp.countryScope?.toLowerCase().includes(q);
          const matchThematic = opp.thematicArea?.toLowerCase().includes(q);
          const matchStage = opp.stage?.toLowerCase().includes(q);
          if (!matchTitle && !matchDonor && !matchLead && !matchCountry && !matchThematic && !matchStage) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'deadline') {
          const daysA = calculateDaysRemaining(a.deadline) ?? 99999;
          const daysB = calculateDaysRemaining(b.deadline) ?? 99999;
          return daysA - daysB;
        }
        if (sortBy === 'amount') {
          const getNum = (str: string) => {
            const match = str.replace(/,/g, '').match(/\d+/g);
            return match ? parseInt(match[0], 10) : 0;
          };
          return getNum(b.fundingAmount) - getNum(a.fundingAmount);
        }
        if (sortBy === 'donor') {
          return a.donor.localeCompare(b.donor);
        }
        if (sortBy === 'title') {
          return a.title.localeCompare(b.title);
        }
        if (sortBy === 'updated') {
          return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        }
        return 0;
      });
  }, [opportunities, selectedStage, selectedDonor, selectedLead, searchQuery, sortBy]);

  // Count active filters
  const hasActiveFilters = selectedStage !== 'ALL' || selectedDonor !== 'ALL' || selectedLead !== 'ALL' || searchQuery.trim() !== '';

  const handleResetFilters = () => {
    setSelectedStage('ALL');
    setSelectedDonor('ALL');
    setSelectedLead('ALL');
    setSearchQuery('');
  };

  const getStageColor = (stage: PipelineStage | string) => {
    switch (stage) {
      case 'Preparing Application':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Internal Review':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Ready for Submission':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Submitted':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Awaiting Decision':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Awarded':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
      case 'Rejected':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            Active Grant Workspaces
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Browse and manage all institutional proposals with dedicated Proposal Leads, checklists, and deadline watches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToAnalyze}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Analyse New Opportunity
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERING BAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3.5">
        {/* Row 1: Search and Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Box */}
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by title, donor, lead, thematic..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Stage Dropdown */}
          <div className="lg:col-span-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1.5 shrink-0">
                Stage:
              </span>
              <select
                value={selectedStage}
                onChange={e => setSelectedStage(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 border-none outline-hidden p-0 cursor-pointer"
              >
                <option value="ALL">All Stages ({opportunities.length})</option>
                {ALL_PIPELINE_STAGES.map(stage => (
                  <option key={stage} value={stage}>
                    {stage} ({stageCounts[stage] || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Donor Dropdown */}
          <div className="lg:col-span-3">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1.5 shrink-0">
                Donor:
              </span>
              <select
                value={selectedDonor}
                onChange={e => setSelectedDonor(e.target.value)}
                className="w-full bg-transparent text-xs font-semibold text-slate-800 border-none outline-hidden p-0 cursor-pointer truncate"
              >
                <option value="ALL">All Donors ({donorOptions.length})</option>
                {donorOptions.map(({ name, count }) => (
                  <option key={name} value={name}>
                    {name} ({count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort By & View Toggle */}
          <div className="lg:col-span-2 flex items-center justify-end gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 font-medium text-slate-700 cursor-pointer"
            >
              <option value="deadline">📅 Deadline</option>
              <option value="amount">💰 Funding Amount</option>
              <option value="donor">🏢 Donor Name</option>
              <option value="title">🔤 Title</option>
              <option value="updated">⏱️ Recent Update</option>
            </select>

            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
              <button
                onClick={() => setViewLayout('cards')}
                className={`p-1.5 rounded-md transition ${
                  viewLayout === 'cards' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewLayout('table')}
                className={`p-1.5 rounded-md transition ${
                  viewLayout === 'table' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Compact Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Quick Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs pt-1 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <ListFilter className="w-3 h-3" />
            Quick Stage:
          </span>

          <button
            onClick={() => setSelectedStage('ALL')}
            className={`px-3 py-1 rounded-full font-medium transition shrink-0 flex items-center gap-1.5 ${
              selectedStage === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>All Workspaces</span>
            <span className="text-[10px] font-bold opacity-80">({opportunities.length})</span>
          </button>

          <button
            onClick={() => setSelectedStage('Preparing Application')}
            className={`px-3 py-1 rounded-full font-medium transition shrink-0 flex items-center gap-1.5 ${
              selectedStage === 'Preparing Application'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            <span>Preparing Application</span>
            <span className="text-[10px] font-bold opacity-80">({stageCounts['Preparing Application'] || 0})</span>
          </button>

          <button
            onClick={() => setSelectedStage('Internal Review')}
            className={`px-3 py-1 rounded-full font-medium transition shrink-0 flex items-center gap-1.5 ${
              selectedStage === 'Internal Review'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <span>Internal Review</span>
            <span className="text-[10px] font-bold opacity-80">({stageCounts['Internal Review'] || 0})</span>
          </button>

          <button
            onClick={() => setSelectedStage('Awaiting Decision')}
            className={`px-3 py-1 rounded-full font-medium transition shrink-0 flex items-center gap-1.5 ${
              selectedStage === 'Awaiting Decision'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
            }`}
          >
            <span>Awaiting Decision</span>
            <span className="text-[10px] font-bold opacity-80">({stageCounts['Awaiting Decision'] || 0})</span>
          </button>

          <button
            onClick={() => setSelectedStage('Awarded')}
            className={`px-3 py-1 rounded-full font-medium transition shrink-0 flex items-center gap-1.5 ${
              selectedStage === 'Awarded'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <span>Awarded</span>
            <span className="text-[10px] font-bold opacity-80">({stageCounts['Awarded'] || 0})</span>
          </button>
        </div>

        {/* Row 3: Active Filters Summary & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 font-medium">
              Showing <strong className="text-slate-900 font-bold">{filteredOpportunities.length}</strong> of{' '}
              {effectiveOpportunities.length} workspaces
            </span>

            {/* Active Stage Tag */}
            {selectedStage !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Stage: {selectedStage}
                <button
                  onClick={() => setSelectedStage('ALL')}
                  className="hover:text-indigo-900 ml-0.5"
                  title="Remove stage filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active Donor Tag */}
            {selectedDonor !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Donor: {selectedDonor}
                <button
                  onClick={() => setSelectedDonor('ALL')}
                  className="hover:text-indigo-900 ml-0.5"
                  title="Remove donor filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Active Search Tag */}
            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Search: &quot;{searchQuery}&quot;
                <button
                  onClick={() => setSearchQuery('')}
                  className="hover:text-slate-900 ml-0.5"
                  title="Clear search query"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* MAIN WORKSPACES LIST / GRID */}
      {filteredOpportunities.length > 0 ? (
        <>
          {viewLayout === 'cards' ? (
            /* Cards Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredOpportunities.map(opp => {
                const daysRemaining = calculateDaysRemaining(opp.deadline);
                const completedTasks = opp.tasks?.filter(t => t.completed) || [];
                const totalTasks = opp.tasks?.length || 0;
                const totalDocs = opp.documentsChecklist?.length || 0;
                const readyAllDocs = opp.documentsChecklist?.filter(d => d.status === 'Ready' || d.status === 'Signed') || [];

                const overdueTasks = opp.tasks?.filter(
                  t => !t.completed && getTaskUrgencyInfo(t.dueDate, t.completed).isOverdue
                ) || [];

                const proposalLead = opp.proposalLead || opp.leadStaff || 'Unassigned';

                return (
                  <div
                    key={opp.id}
                    onClick={() => onSelectWorkspace(opp)}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2.5">
                      {/* Top Header: Donor, and Stage */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100 truncate">
                            {opp.donor}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${getStageColor(
                              opp.stage
                            )}`}
                          >
                            {opp.stage}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-2 leading-snug">
                        {opp.title}
                      </h3>

                      {/* Proposal Lead Pill */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md w-fit">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-slate-500 font-medium">Lead:</span>
                        <strong className="text-slate-900">{proposalLead}</strong>
                      </div>

                      {/* Scope and Thematic */}
                      <p className="text-xs text-slate-500 line-clamp-1">
                        🌍 {opp.thematicArea} • {opp.countryScope}
                      </p>
                    </div>

                    {/* Readiness Progress Mini Row */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <ProgressDonutChart
                          completedTasks={completedTasks.length}
                          totalTasks={totalTasks}
                          readyDocs={readyAllDocs.length}
                          totalDocs={totalDocs}
                          size="sm"
                          showLegend={false}
                        />
                        <div className="text-[11px]">
                          <div className="font-semibold text-slate-700">
                            {completedTasks.length}/{totalTasks} Tasks
                          </div>
                          <div className="text-slate-500">
                            {readyAllDocs.length}/{totalDocs} Docs
                          </div>
                        </div>
                      </div>

                      {overdueTasks.length > 0 ? (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                          <AlertCircle className="w-3 h-3" />
                          {overdueTasks.length} Overdue
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          On Track
                        </span>
                      )}
                    </div>

                    {/* Metadata & Footer */}
                    <div className="pt-3 border-t border-slate-100 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500">Funding Ceiling:</span>
                        <strong className="font-semibold text-slate-900">{opp.fundingAmount}</strong>
                      </div>

                      <div className="flex justify-between items-center text-slate-700">
                        <span className="text-slate-500">Deadline:</span>
                        <div className="flex items-center gap-1.5">
                          {daysRemaining !== null ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                daysRemaining <= 3
                                  ? 'bg-rose-100 text-rose-800'
                                  : daysRemaining <= 7
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {daysRemaining > 0 ? `${daysRemaining}d left` : 'Due today'}
                            </span>
                          ) : (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                normalizeVerificationStatus(opp.deadlineVerificationStatus) === 'Not Stated in Source'
                                  ? 'bg-slate-100 text-slate-600'
                                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}
                            >
                              {formatDeadline(opp.deadline, opp.deadlineVerificationStatus)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-indigo-600 font-bold group-hover:text-indigo-800">
                        <span className="text-xs">Open Workspace</span>
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table List View */
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Donor & Opportunity</th>
                      <th className="py-3 px-4">Proposal Lead</th>
                      <th className="py-3 px-4">Stage</th>
                      <th className="py-3 px-4">Thematic / Country</th>
                      <th className="py-3 px-4">Funding</th>
                      <th className="py-3 px-4">Deadline</th>
                      <th className="py-3 px-4">Readiness Progress</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOpportunities.map(opp => {
                      const daysRemaining = calculateDaysRemaining(opp.deadline);
                      const completedTasks = opp.tasks?.filter(t => t.completed) || [];
                      const totalTasks = opp.tasks?.length || 0;
                      const readyAllDocs = opp.documentsChecklist?.filter(d => d.status === 'Ready' || d.status === 'Signed') || [];
                      const totalDocs = opp.documentsChecklist?.length || 0;
                      const proposalLead = opp.proposalLead || opp.leadStaff || 'Unassigned';

                      return (
                        <tr
                          key={opp.id}
                          onClick={() => onSelectWorkspace(opp)}
                          className="hover:bg-indigo-50/40 transition cursor-pointer group"
                        >
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                              {opp.donor}
                            </span>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition mt-1 max-w-xs line-clamp-1">
                              {opp.title}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span className="font-bold text-slate-800">{proposalLead}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${getStageColor(
                                opp.stage
                              )}`}
                            >
                              {opp.stage}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            <div>{opp.thematicArea}</div>
                            <div className="text-[11px] text-slate-400">{opp.countryScope}</div>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            {opp.fundingAmount}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div>
                              <span className="font-semibold text-slate-800 block text-xs">
                                {formatDeadline(opp.deadline, opp.deadlineVerificationStatus)}
                              </span>
                              {daysRemaining !== null ? (
                                <span
                                  className={`text-[10px] font-bold ${
                                    daysRemaining <= 3
                                      ? 'text-rose-600'
                                      : daysRemaining <= 7
                                      ? 'text-amber-600'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {daysRemaining > 0 ? `${daysRemaining} days left` : 'Due today'}
                                </span>
                              ) : (
                                <span
                                  className={`text-[10px] font-medium ${
                                    normalizeVerificationStatus(opp.deadlineVerificationStatus) === 'Not Stated in Source'
                                      ? 'text-slate-400'
                                      : 'text-amber-700 font-semibold'
                                  }`}
                                >
                                  {normalizeVerificationStatus(opp.deadlineVerificationStatus)}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-[11px]">
                                {completedTasks.length}/{totalTasks} T
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="font-bold text-indigo-700 text-[11px]">
                                {readyAllDocs.length}/{totalDocs} D
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={e => {
                                  e.stopPropagation();
                                  onSelectWorkspace(opp);
                                }}
                                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition"
                              >
                                Open →
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
          )}
        </>
      ) : opportunities.length === 0 ? (
        /* Zero Proposals Clean Slate Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
            <Layers className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No Funding Opportunities Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Your organisation workspace is completely clean. Analyse a donor call or opportunity to extract requirements, assign proposal milestones, and track deadlines.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={onNavigateToAnalyze}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4" />
              Analyse Your First Funding Call
            </button>
          </div>
        </div>
      ) : (
        /* Filter Empty State */
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Filter className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">No workspaces match your filters</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No grant workspaces match the selected stage &quot;{selectedStage}&quot; and donor &quot;{selectedDonor}&quot;
              {searchQuery ? ` with query "${searchQuery}"` : ''}.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
            <button
              onClick={onNavigateToAnalyze}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Analyse New Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
