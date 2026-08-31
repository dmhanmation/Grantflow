import React, { useState, useRef, useEffect } from 'react';
import { OpportunityWorkspace, WorkspaceNotification, NotificationCategory, OrgProfile } from '../types';
import { generateWorkspaceNotifications } from '../utils/dateUtils';
import {
  Bell,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  ChevronRight,
  X,
  Filter,
  CheckSquare,
  Sparkles,
  ShieldAlert,
  AlertCircle,
  FileText
} from 'lucide-react';

interface NotificationCenterProps {
  opportunities: OpportunityWorkspace[];
  orgProfile?: OrgProfile;
  onSelectWorkspace: (workspace: OpportunityWorkspace, targetTab?: string, taskId?: string) => void;
  onNavigateToProfile?: (tab?: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  opportunities,
  orgProfile,
  onSelectWorkspace,
  onNavigateToProfile
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ESCALATIONS' | 'REVIEWS' | 'DOCS' | 'OVERDUE' | 'BLOCKED' | 'DUE_SOON' | 'DEADLINES'>('ALL');
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('grantflow_dismissed_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const allNotifications = generateWorkspaceNotifications(opportunities, orgProfile);
  const activeNotifications = allNotifications.filter(n => !dismissedIds.includes(n.id));

  const escalationCount = activeNotifications.filter(n => n.category === 'escalation_alert').length;
  const reviewCount = activeNotifications.filter(
    n => n.category === 'hod_review_pending' || n.category === 'task_returned_revision' || n.category === 'final_review_pending'
  ).length;
  const docAlertCount = activeNotifications.filter(
    n => n.category === 'document_expired' || n.category === 'document_expiring_soon' || n.category === 'document_review_due'
  ).length;
  const overdueCount = activeNotifications.filter(n => n.category === 'overdue_task').length;
  const blockedCount = activeNotifications.filter(n => n.category === 'task_blocked').length;
  const dueTodayCount = activeNotifications.filter(n => n.category === 'task_due_today').length;
  const dueSoonCount = activeNotifications.filter(n => n.category === 'task_due_soon').length;
  const deadlinesCount = activeNotifications.filter(
    n => n.category === 'critical_deadline' || n.category === 'upcoming_deadline'
  ).length;

  const criticalTotal = escalationCount + overdueCount + activeNotifications.filter(n => n.severity === 'critical').length;

  const filteredNotifications = activeNotifications.filter(n => {
    if (filter === 'ESCALATIONS') return n.category === 'escalation_alert';
    if (filter === 'REVIEWS') return n.category === 'hod_review_pending' || n.category === 'task_returned_revision' || n.category === 'final_review_pending';
    if (filter === 'DOCS') return n.category === 'document_expired' || n.category === 'document_expiring_soon' || n.category === 'document_review_due';
    if (filter === 'OVERDUE') return n.category === 'overdue_task';
    if (filter === 'BLOCKED') return n.category === 'task_blocked';
    if (filter === 'DUE_SOON') return n.category === 'task_due_today' || n.category === 'task_due_soon';
    if (filter === 'DEADLINES') return n.category === 'critical_deadline' || n.category === 'upcoming_deadline';
    return true;
  });

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('grantflow_dismissed_notifs', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = () => {
    const allIds = activeNotifications.map(n => n.id);
    const updated = [...dismissedIds, ...allIds];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem('grantflow_dismissed_notifs', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif: WorkspaceNotification) => {
    if (notif.targetType === 'org_document' || notif.libraryDocId) {
      setIsOpen(false);
      if (onNavigateToProfile) {
        onNavigateToProfile('documents');
      }
      return;
    }

    const targetOpp = opportunities.find(o => o.id === notif.workspaceId);
    if (targetOpp) {
      setIsOpen(false);
      let targetTab = 'overview';
      if (notif.category === 'overdue_task' || notif.category === 'task_due_today' || notif.category === 'task_due_soon' || notif.category === 'task_blocked') {
        targetTab = 'tasks';
      } else if (notif.category === 'escalation_alert') {
        targetTab = 'team';
      }
      onSelectWorkspace(targetOpp, targetTab, notif.targetId);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl border transition flex items-center justify-center ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
            : criticalTotal > 0
            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
        title="View Proposal Escalations, Document Expirations & Deadline Alerts"
        aria-label="Notifications"
      >
        <Bell className={`w-5 h-5 ${criticalTotal > 0 ? 'text-rose-600 animate-bounce' : ''}`} />

        {/* Counter Badge */}
        {activeNotifications.length > 0 && (
          <span
            className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-xs ${
              criticalTotal > 0 ? 'bg-rose-600 ring-2 ring-white' : 'bg-indigo-600 ring-2 ring-white'
            }`}
          >
            {activeNotifications.length}
          </span>
        )}
      </button>

      {/* Flyout Panel / Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Accountability & Expiry Radar</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Real-time document expiry scans, deadlines & bottleneck escalations
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeNotifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[10px] text-slate-300 hover:text-white underline font-medium"
                  >
                    Dismiss all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-5 gap-1.5 mt-3 pt-3 border-t border-slate-800 text-center">
              <div className="bg-slate-800/80 rounded-lg p-1.5">
                <span className="text-[8px] text-rose-300 font-bold block uppercase">Escalations</span>
                <span className="text-sm font-black text-white">{escalationCount}</span>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-1.5">
                <span className="text-[8px] text-amber-300 font-bold block uppercase">Doc Expiry</span>
                <span className="text-sm font-black text-white">{docAlertCount}</span>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-1.5">
                <span className="text-[8px] text-rose-300 font-bold block uppercase">Overdue</span>
                <span className="text-sm font-black text-white">{overdueCount}</span>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-1.5">
                <span className="text-[8px] text-amber-300 font-bold block uppercase">Blocked</span>
                <span className="text-sm font-black text-white">{blockedCount}</span>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-1.5">
                <span className="text-[8px] text-indigo-300 font-bold block uppercase">Deadlines</span>
                <span className="text-sm font-black text-white">{deadlinesCount}</span>
              </div>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 p-2.5 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition ${
                filter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({activeNotifications.length})
            </button>
            {reviewCount > 0 && (
              <button
                onClick={() => setFilter('REVIEWS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition flex items-center gap-1 ${
                  filter === 'REVIEWS'
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-800 bg-blue-100 hover:bg-blue-200 border border-blue-300'
                }`}
              >
                👥 HoD Reviews ({reviewCount})
              </button>
            )}
            {docAlertCount > 0 && (
              <button
                onClick={() => setFilter('DOCS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition flex items-center gap-1 ${
                  filter === 'DOCS'
                    ? 'bg-amber-600 text-white'
                    : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300'
                }`}
              >
                📄 Doc Expirations ({docAlertCount})
              </button>
            )}
            {escalationCount > 0 && (
              <button
                onClick={() => setFilter('ESCALATIONS')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition flex items-center gap-1 ${
                  filter === 'ESCALATIONS'
                    ? 'bg-rose-700 text-white'
                    : 'text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300'
                }`}
              >
                ⚡ Escalations ({escalationCount})
              </button>
            )}
            <button
              onClick={() => setFilter('OVERDUE')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition flex items-center gap-1 ${
                filter === 'OVERDUE'
                  ? 'bg-rose-600 text-white'
                  : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              🚨 Overdue ({overdueCount})
            </button>
            <button
              onClick={() => setFilter('BLOCKED')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition flex items-center gap-1 ${
                filter === 'BLOCKED'
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              ⚠️ Blocked ({blockedCount})
            </button>
            <button
              onClick={() => setFilter('DUE_SOON')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] shrink-0 transition flex items-center gap-1 ${
                filter === 'DUE_SOON'
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
              }`}
            >
              ⏰ Due Soon ({dueTodayCount + dueSoonCount})
            </button>
          </div>

          {/* Notification List Body */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 p-2 space-y-1">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-slate-800">All caught up!</p>
                <p className="text-xs text-slate-500">
                  {filter === 'ALL'
                    ? 'No outstanding overdue tasks, expiring documents, or urgent escalations.'
                    : `No items matching the selected filter.`}
                </p>
              </div>
            ) : (
              filteredNotifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 rounded-xl transition cursor-pointer flex items-start justify-between gap-3 border ${
                    notif.category === 'escalation_alert'
                      ? 'bg-rose-100/70 border-rose-300 hover:bg-rose-100'
                      : notif.category === 'document_expired'
                      ? 'bg-rose-100/80 border-rose-300 hover:bg-rose-100'
                      : notif.category === 'document_expiring_soon'
                      ? 'bg-amber-50/90 border-amber-300 hover:bg-amber-100'
                      : notif.severity === 'critical'
                      ? 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/70'
                      : notif.severity === 'warning'
                      ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {notif.category === 'hod_review_pending' && (
                        <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                      )}
                      {notif.category === 'task_returned_revision' && (
                        <div className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                      )}
                      {notif.category === 'document_expired' && (
                        <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      {notif.category === 'document_expiring_soon' && (
                        <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                      {notif.category === 'document_review_due' && (
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                      )}
                      {notif.category === 'escalation_alert' && (
                        <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                      )}
                      {notif.category === 'overdue_task' && (
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                      {notif.category === 'task_blocked' && (
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                      )}
                      {notif.category === 'task_due_today' && (
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                      {notif.category === 'task_due_soon' && (
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                      {(notif.category === 'critical_deadline' || notif.category === 'upcoming_deadline') && (
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center">
                          <Calendar className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {notif.donor && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-100 truncate max-w-[140px]">
                            {notif.donor}
                          </span>
                        )}

                        {notif.category === 'hod_review_pending' && (
                          <span className="text-[10px] font-black text-white bg-blue-700 px-1.5 py-0.5 rounded">
                            HOD REVIEW PENDING
                          </span>
                        )}
                        {notif.category === 'task_returned_revision' && (
                          <span className="text-[10px] font-black text-white bg-orange-600 px-1.5 py-0.5 rounded">
                            REVISION REQUESTED
                          </span>
                        )}
                        {notif.category === 'document_expired' && (
                          <span className="text-[10px] font-black text-white bg-rose-700 px-1.5 py-0.5 rounded">
                            DOCUMENT EXPIRED ({Math.abs(notif.daysDiff)}d AGO)
                          </span>
                        )}
                        {notif.category === 'document_expiring_soon' && (
                          <span className="text-[10px] font-black text-amber-950 bg-amber-200 px-1.5 py-0.5 rounded">
                            {notif.daysDiff <= 0 ? 'EXPIRES TODAY' : `EXPIRES IN ${notif.daysDiff}d`}
                          </span>
                        )}
                        {notif.category === 'document_review_due' && (
                          <span className="text-[10px] font-bold text-indigo-900 bg-indigo-100 px-1.5 py-0.5 rounded">
                            REVIEW DUE
                          </span>
                        )}
                        {notif.category === 'escalation_alert' && (
                          <span className="text-[10px] font-black text-white bg-rose-700 px-1.5 py-0.5 rounded">
                            ESCALATION REQUIRED
                          </span>
                        )}
                        {notif.category === 'task_blocked' && (
                          <span className="text-[10px] font-black text-amber-900 bg-amber-200 px-1.5 py-0.5 rounded">
                            BLOCKED ITEM
                          </span>
                        )}
                        {notif.category === 'overdue_task' && (
                          <span className="text-[10px] font-black text-rose-700 bg-rose-200/80 px-1.5 py-0.5 rounded">
                            {Math.abs(notif.daysDiff)}d OVERDUE
                          </span>
                        )}
                        {notif.category === 'task_due_today' && (
                          <span className="text-[10px] font-black text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded">
                            DUE TODAY
                          </span>
                        )}
                        {notif.category === 'task_due_soon' && (
                          <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded">
                            DUE IN {notif.daysDiff}d
                          </span>
                        )}
                        {notif.category === 'critical_deadline' && (
                          <span className="text-[10px] font-black text-rose-700 bg-rose-200/80 px-1.5 py-0.5 rounded">
                            DEADLINE: {notif.daysDiff}d LEFT
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                        {notif.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 line-clamp-2">
                        {notif.description}
                      </p>

                      <div className="pt-0.5 flex items-center justify-between text-[10px] text-indigo-600 font-bold">
                        {notif.targetType === 'org_document' ? (
                          <>
                            <span className="truncate max-w-[200px] text-slate-500 font-normal">
                              🏛️ Organisation Document Library
                            </span>
                            <span className="flex items-center gap-0.5 text-indigo-600 hover:underline shrink-0 font-bold">
                              Open in Library →
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="truncate max-w-[180px] text-slate-500 font-normal">
                              📁 {notif.workspaceTitle}
                            </span>
                            <span className="flex items-center gap-0.5 hover:underline shrink-0">
                              Inspect Workspace →
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={e => handleDismiss(notif.id, e)}
                    className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-black/5 transition shrink-0"
                    title="Dismiss alert"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center text-[10px] text-slate-500">
            Clicking a document alert opens the Document Library. Clicking a task opens the grant workspace.
          </div>
        </div>
      )}
    </div>
  );
};
