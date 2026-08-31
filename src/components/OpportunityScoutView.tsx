import React, { useState, useEffect } from 'react';
import {
  ScoutedOpportunity,
  ScoutActivityLog,
  ScoutJobConfig,
  OrgProfile,
  OpportunityStatus,
  OpportunityMatchVerdict,
  DismissalReason,
  ScoutOpportunityLifecycleStatus
} from '../types';
import {
  Compass,
  Search,
  Sparkles,
  ExternalLink,
  Calendar,
  DollarSign,
  MapPin,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Bookmark,
  XCircle,
  Eye,
  ArrowRight,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Award,
  ChevronDown,
  ChevronUp,
  History,
  Tag,
  Zap,
  HelpCircle,
  FolderOpen,
  Info,
  Check,
  X
} from 'lucide-react';

interface OpportunityScoutViewProps {
  orgProfile: OrgProfile;
  onPursueOpportunity: (candidate: ScoutedOpportunity) => void;
  onNavigateToOrgPreferences?: () => void;
  onOpenWorkspace?: (workspaceId: string) => void;
}

export const OpportunityScoutView: React.FC<OpportunityScoutViewProps> = ({
  orgProfile,
  onPursueOpportunity,
  onNavigateToOrgPreferences,
  onOpenWorkspace
}) => {
  const [opportunities, setOpportunities] = useState<ScoutedOpportunity[]>([]);
  const [activityLogs, setActivityLogs] = useState<ScoutActivityLog[]>([]);
  const [config, setConfig] = useState<ScoutJobConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScouting, setIsScouting] = useState<boolean>(false);
  const [scoutProgressMsg, setScoutProgressMsg] = useState<string>('');
  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);

  // Filters & Tabs
  const [activeTab, setActiveTab] = useState<'Inbox' | 'Strong Match' | 'Saved' | 'Reviewed' | 'Dismissed' | 'All'>('Inbox');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDonorFilter, setSelectedDonorFilter] = useState<string>('ALL');
  const [showActivityLog, setShowActivityLog] = useState<boolean>(false);
  const [showLowMatches, setShowLowMatches] = useState<boolean>(false);

  // Modals
  const [selectedCandidate, setSelectedCandidate] = useState<ScoutedOpportunity | null>(null);
  const [dismissingCandidate, setDismissingCandidate] = useState<ScoutedOpportunity | null>(null);
  const [dismissalReason, setDismissalReason] = useState<DismissalReason>('Poor thematic fit');
  const [dismissalNotes, setDismissalNotes] = useState<string>('');

  // Fetch Opportunities, Logs, Config
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [oppsRes, logsRes, configRes] = await Promise.all([
        fetch('/api/scout/opportunities'),
        fetch('/api/scout/activity-log'),
        fetch('/api/scout/config')
      ]);

      if (oppsRes.ok) {
        const oppsData = await oppsRes.json();
        setOpportunities(oppsData.opportunities || []);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setActivityLogs(logsData.logs || []);
      }
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.config || null);
      }
    } catch (err) {
      console.error('Error fetching Scout data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orgProfile.id]);

  // Run Scout Now Action
  const handleRunScoutNow = async () => {
    try {
      setIsScouting(true);
      setScoutProgressMsg('Synthesizing targeted search queries from organisation profile...');

      setTimeout(() => {
        setScoutProgressMsg('Executing Google Search queries via Gemini discovery engine...');
      }, 1000);

      setTimeout(() => {
        setScoutProgressMsg('Inspecting source pages & assessing criteria fit...');
      }, 2500);

      const res = await fetch('/api/scout/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: orgProfile.id })
      });

      if (res.ok) {
        const data = await res.json();
        await fetchData();
        setNotificationBanner(
          `Scout run complete! Discovered ${data.newOpportunitiesCount || 0} actionable potential opportunities matching ${orgProfile.name}.`
        );
        setTimeout(() => setNotificationBanner(null), 6000);
      } else {
        alert('Failed to complete Scout run. Please check server logs.');
      }
    } catch (err) {
      console.error('Error running Scout:', err);
      alert('Network error while running Opportunity Scout.');
    } finally {
      setIsScouting(false);
      setScoutProgressMsg('');
    }
  };

  // Update Status (Save, Review, Dismiss)
  const handleUpdateStatus = async (
    id: string,
    status: ScoutOpportunityLifecycleStatus,
    reason?: DismissalReason,
    notes?: string
  ) => {
    try {
      const res = await fetch('/api/scout/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          dismissalReason: reason,
          dismissalNotes: notes
        })
      });

      if (res.ok) {
        setOpportunities(prev =>
          prev.map(o => (o.id === id ? { ...o, status, dismissalReason: reason, dismissalNotes: notes } : o))
        );
        if (dismissingCandidate?.id === id) {
          setDismissingCandidate(null);
          setDismissalNotes('');
        }
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Filter Logic
  const filteredOpportunities = opportunities.filter(opp => {
    // Tab filtering
    if (activeTab === 'Inbox') {
      if (opp.status !== 'Inbox') return false;
      // LOW MATCH opportunities are normally hidden from default Opportunity Inbox unless user enables Show Low Matches
      if (!showLowMatches && opp.matchVerdict === 'LOW MATCH') return false;
    }
    if (activeTab === 'Strong Match' && (opp.matchVerdict !== 'STRONG MATCH' || opp.status === 'Dismissed')) return false;
    if (activeTab === 'Saved' && opp.status !== 'Saved') return false;
    if (activeTab === 'Reviewed' && opp.status !== 'Reviewed') return false;
    if (activeTab === 'Dismissed' && opp.status !== 'Dismissed') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = opp.title.toLowerCase().includes(q);
      const matchDonor = opp.donor.toLowerCase().includes(q);
      const matchSummary = opp.rawSummary.toLowerCase().includes(q);
      const matchThematic = opp.thematicFocus.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDonor && !matchSummary && !matchThematic) return false;
    }

    // Donor filter
    if (selectedDonorFilter !== 'ALL' && opp.donor !== selectedDonorFilter) {
      return false;
    }

    return true;
  });

  // Counts
  const inboxCount = opportunities.filter(o => o.status === 'Inbox' && (showLowMatches || o.matchVerdict !== 'LOW MATCH')).length;
  const lowMatchesCount = opportunities.filter(o => o.status === 'Inbox' && o.matchVerdict === 'LOW MATCH').length;
  const strongMatchesCount = opportunities.filter(o => o.matchVerdict === 'STRONG MATCH' && o.status !== 'Dismissed').length;
  const savedCount = opportunities.filter(o => o.status === 'Saved').length;
  const reviewedCount = opportunities.filter(o => o.status === 'Reviewed').length;
  const dismissedCount = opportunities.filter(o => o.status === 'Dismissed').length;

  const uniqueDonors: string[] = Array.from(new Set(opportunities.map(o => o.donor))).filter((d): d is string => Boolean(d));
  const latestLog = activityLogs[0];

  const getVerdictBadge = (verdict: OpportunityMatchVerdict) => {
    switch (verdict) {
      case 'STRONG MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            STRONG MATCH
          </span>
        );
      case 'POSSIBLE MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            POSSIBLE MATCH
          </span>
        );
      case 'REVIEW REQUIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            REVIEW REQUIRED
          </span>
        );
      case 'LOW MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            LOW MATCH
          </span>
        );
    }
  };

  const getStatusBadge = (status: OpportunityStatus) => {
    switch (status) {
      case 'Open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Open Call
          </span>
        );
      case 'Deadline approaching':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Deadline Approaching
          </span>
        );
      case 'Rolling / no fixed deadline':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Rolling Call
          </span>
        );
      case 'Deadline unclear — verify':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Verify Deadline
          </span>
        );
      case 'Apparently closed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Closed
          </span>
        );
    }
  };

  const formatDeadlineDate = (dateStr: string) => {
    if (!dateStr || dateStr.toLowerCase().includes('rolling') || dateStr.toLowerCase().includes('tbd')) {
      return dateStr || 'Rolling';
    }
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Hero Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Compass className="w-3.5 h-3.5 text-indigo-600" />
                GrantFlow Opportunity Scout
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                Google Search via Gemini
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Opportunity Scout</h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl">
              GrantFlow periodically searches the public web for plausible funding opportunities that fit {orgProfile.name},
              verifies promising results against original sources, and presents actionable candidates for your review.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRunScoutNow}
              disabled={isScouting}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm flex items-center justify-center gap-2 transition ${
                isScouting
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600'
              }`}
            >
              <Zap className={`w-4 h-4 ${isScouting ? 'animate-spin' : ''}`} />
              {isScouting ? 'Scouting Web...' : 'Run Scout Now'}
            </button>

            {onNavigateToOrgPreferences && (
              <button
                type="button"
                onClick={onNavigateToOrgPreferences}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-600" />
                Preferences
              </button>
            )}
          </div>
        </div>

        {/* Status / Search Cadence Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Last search:{' '}
                <strong className="text-slate-800">
                  {config?.lastRunAt
                    ? new Date(config.lastRunAt).toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Just now'}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Schedule:{' '}
                <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {config?.scheduleCadence || 'Daily'} Automated Discovery
                </span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowActivityLog(!showActivityLog)}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <History className="w-3.5 h-3.5" />
            {showActivityLog ? 'Hide Scout Activity Log' : 'View Scout Activity Log'}
            {showActivityLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Live Scouting Animation Banner */}
        {isScouting && (
          <div className="mt-4 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 animate-pulse">
            <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
            <div>
              <span className="text-xs font-bold text-indigo-900">Agentic Scout in Progress</span>
              <p className="text-xs text-indigo-700 mt-0.5">{scoutProgressMsg}</p>
            </div>
          </div>
        )}

        {/* Notification Banner */}
        {notificationBanner && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notificationBanner}</span>
            </div>
            <button onClick={() => setNotificationBanner(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Activity Log Expanded Panel */}
        {showActivityLog && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-600" />
                Recent Scout Activity Summary
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">
                {activityLogs.length} logged search sessions
              </span>
            </div>

            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No search activity recorded yet. Click &quot;Run Scout Now&quot; to initiate discovery.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activityLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <span>{new Date(log.timestamp).toLocaleString('en-GB')}</span>
                      <div className="flex items-center gap-3">
                        <span>Searches: <strong>{log.searchesRun}</strong></span>
                        <span>Pages reviewed: <strong>{log.candidatePagesReviewed}</strong></span>
                        <span className="text-emerald-700 font-bold">Strong matches: {log.strongMatchesCount}</span>
                        <span className="text-slate-500">Duplicates: {log.duplicatesIgnored}</span>
                      </div>
                    </div>
                    <p className="text-slate-700">{log.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Transparency & Scope Notice */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
        <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Public Web Discovery Transparency</span>
          <p className="text-amber-800 leading-relaxed">
            GrantFlow found these potential opportunities from publicly available sources. GrantFlow never claims exhaustive
            coverage of all grants globally. Human review and source verification are always recommended before pursuing.
          </p>
        </div>
      </div>

      {/* Opportunity Inbox Filter Tabs & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 sm:border-b-0 overflow-x-auto gap-1 pb-1 sm:pb-0">
            {[
              { id: 'Inbox', label: 'Opportunity Inbox', count: inboxCount },
              { id: 'Strong Match', label: '⭐ Strong Matches', count: strongMatchesCount },
              { id: 'Saved', label: 'Saved for Later', count: savedCount },
              { id: 'Reviewed', label: 'Reviewed', count: reviewedCount },
              { id: 'Dismissed', label: 'Dismissed', count: dismissedCount },
              { id: 'All', label: 'All Candidates', count: opportunities.length }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    activeTab === tab.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Donor Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {uniqueDonors.length > 1 && (
              <select
                value={selectedDonorFilter}
                onChange={e => setSelectedDonorFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700"
              >
                <option value="ALL">All Donors</option>
                {uniqueDonors.map(d => (
                  <option key={d} value={d}>
                    {d.length > 22 ? d.slice(0, 22) + '...' : d}
                  </option>
                ))}
              </select>
            )}

            {activeTab === 'Inbox' && lowMatchesCount > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 transition">
                <input
                  type="checkbox"
                  checked={showLowMatches}
                  onChange={e => setShowLowMatches(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span className="font-medium text-[11px]">Show Low Matches ({lowMatchesCount})</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Opportunity Cards List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
          <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading Opportunity Scout inbox...</p>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">No Opportunities Found in this View</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery
                ? `No candidates match "${searchQuery}". Try clearing your search query.`
                : activeTab === 'Inbox'
                ? 'Your Opportunity Inbox is clean. Click "Run Scout Now" to discover fresh funding calls.'
                : `No opportunities currently marked as ${activeTab}.`}
            </p>
          </div>
          {activeTab === 'Inbox' && (
            <button
              type="button"
              onClick={handleRunScoutNow}
              disabled={isScouting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition inline-flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="w-3.5 h-3.5" />
              Run Scout Now
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOpportunities.map(opp => (
            <div
              key={opp.id}
              className={`bg-white border rounded-xl p-5 shadow-xs transition hover:shadow-md space-y-4 ${
                opp.matchVerdict === 'STRONG MATCH'
                  ? 'border-emerald-200 bg-gradient-to-r from-emerald-500/5 via-white to-white'
                  : 'border-slate-200'
              }`}
            >
              {/* Card Header: Donor, Verdict, Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-slate-900 tracking-wide uppercase flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    {opp.donor}
                  </span>
                  {opp.isAlreadyInPipeline && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      <FolderOpen className="w-3 h-3 text-blue-600" />
                      Already in your pipeline
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {opp.isDeadlineRisk && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      <Clock className="w-3 h-3 text-rose-600" />
                      Deadline Risk
                    </span>
                  )}
                  {getStatusBadge(opp.opportunityStatus)}
                  {getVerdictBadge(opp.matchVerdict)}
                </div>
              </div>

              {/* Deadline Risk Alert Notice */}
              {opp.isDeadlineRisk && opp.deadlineRiskNotice && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{opp.deadlineRiskNotice}</span>
                </div>
              )}

              {/* Title & Summary */}
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">{opp.title}</h2>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{opp.rawSummary}</p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
                {/* 1. Deadline */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Confirmed Deadline
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-900 font-semibold mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{formatDeadlineDate(opp.deadline)}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 italic block mt-0.5">
                    {opp.deadlineStatus === 'Confirmed from Source' ? '✓ Verified in source' : '⚠ Needs verification'}
                  </span>
                </div>

                {/* 2. Funding Range */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Funding Amount
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-900 font-semibold mt-0.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{opp.fundingAmount}</span>
                  </div>
                </div>

                {/* 3. Geography */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Eligible Geography
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-900 font-medium mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{opp.eligibleGeography.join(', ')}</span>
                  </div>
                </div>

                {/* 4. Verified Source URL */}
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Verified Public Source
                  </span>
                  <a
                    href={opp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium underline mt-0.5 truncate max-w-full"
                    title={opp.sourceUrl}
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    <span className="truncate">View Donor Notice</span>
                  </a>
                </div>
              </div>

              {/* Why GrantFlow Matched This Call (Checklist) */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Why GrantFlow Matched This Call for {orgProfile.name}:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  {opp.matchReasons.map((reason, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dismissal Reason if Dismissed */}
              {opp.status === 'Dismissed' && (
                <div className="p-2.5 bg-slate-100 rounded-lg text-xs text-slate-600 border border-slate-200 flex items-center justify-between gap-2">
                  <span>
                    Dismissed: <strong>{opp.dismissalReason || 'Other'}</strong>
                    {opp.dismissalNotes ? ` — "${opp.dismissalNotes}"` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(opp.id, 'Inbox')}
                    className="text-xs font-bold text-indigo-600 hover:underline"
                  >
                    Restore to Inbox
                  </button>
                </div>
              )}

              {/* Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 flex items-center gap-2">
                  <span>Discovered: {new Date(opp.discoveredAt).toLocaleDateString('en-GB')}</span>
                  <span>•</span>
                  <a
                    href={opp.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    Original Call URL <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Review / Details Modal */}
                  <button
                    type="button"
                    onClick={() => setSelectedCandidate(opp)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Review Details
                  </button>

                  {/* Save for later */}
                  {opp.status !== 'Saved' && opp.status !== 'Dismissed' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(opp.id, 'Saved')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition flex items-center gap-1"
                    >
                      <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                      Save
                    </button>
                  )}

                  {/* Dismiss */}
                  {opp.status !== 'Dismissed' && (
                    <button
                      type="button"
                      onClick={() => setDismissingCandidate(opp)}
                      className="px-3 py-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-medium transition flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Dismiss
                    </button>
                  )}

                  {/* Pursue */}
                  {opp.isAlreadyInPipeline ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenWorkspace && opp.existingWorkspaceId) {
                          onOpenWorkspace(opp.existingWorkspaceId);
                        } else {
                          onPursueOpportunity(opp);
                        }
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Open Workspace
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPursueOpportunity(opp)}
                      className="px-4 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Pursue Opportunity
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Full Candidate Review & Criteria Breakdown */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                    {selectedCandidate.donor}
                  </span>
                  {getVerdictBadge(selectedCandidate.matchVerdict)}
                </div>
                <h3 className="text-lg font-bold text-slate-900">{selectedCandidate.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-1">Call Overview</h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedCandidate.rawSummary}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Criteria Match Assessment against {orgProfile.name}
                </h4>
                <div className="space-y-2">
                  {selectedCandidate.matchCriteriaBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border flex items-start justify-between gap-3 ${
                        item.status === 'MET'
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50/60 border-amber-200 text-amber-950'
                      }`}
                    >
                      <div>
                        <span className="font-bold block">{item.criterion}</span>
                        <p className="text-slate-600 mt-0.5">{item.evidence}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          item.status === 'MET' ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 font-semibold block">Confirmed Deadline</span>
                  <span className="font-bold text-slate-900">{formatDeadlineDate(selectedCandidate.deadline)}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block">Funding Amount</span>
                  <span className="font-bold text-slate-900">{selectedCandidate.fundingAmount}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-semibold block">Public Source URL</span>
                  <a
                    href={selectedCandidate.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline inline-flex items-center gap-1 font-mono break-all"
                  >
                    {selectedCandidate.sourceUrl} <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const cand = selectedCandidate;
                  setSelectedCandidate(null);
                  onPursueOpportunity(cand);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Pursue this Call
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Dismissal Reason Dialog */}
      {dismissingCandidate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-red-100 text-red-600">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Dismiss Opportunity</h3>
                  <p className="text-xs text-slate-500">Record reason to improve future Scout precision.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissingCandidate(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <span className="font-bold text-slate-800 block truncate">{dismissingCandidate.title}</span>
              <span className="text-slate-500">{dismissingCandidate.donor}</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Dismissal</label>
                <select
                  value={dismissalReason}
                  onChange={e => setDismissalReason(e.target.value as DismissalReason)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Not eligible">Not eligible</option>
                  <option value="Poor thematic fit">Poor thematic fit</option>
                  <option value="Grant too small">Grant too small</option>
                  <option value="Grant too large">Grant too large</option>
                  <option value="Deadline too close">Deadline too close</option>
                  <option value="Geography mismatch">Geography mismatch</option>
                  <option value="Already applied">Already applied</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Optional Notes</label>
                <textarea
                  value={dismissalNotes}
                  onChange={e => setDismissalNotes(e.target.value)}
                  placeholder="Add any specific context (e.g. requires match funding we don't have)..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDismissingCandidate(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(dismissingCandidate.id, 'Dismissed', dismissalReason, dismissalNotes)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition shadow-xs"
              >
                Confirm Dismissal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
