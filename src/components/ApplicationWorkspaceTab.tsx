import React, { useState, useMemo } from 'react';
import {
  OpportunityWorkspace,
  ApplicationSection,
  SectionAiCritique,
  DonorApplicationTemplateSource,
  OrgProfile,
  DonorSubmissionFormat,
  GeneratedApplicationVersion
} from '../types';
import { generateCompletedDocx, downloadBlob } from '../utils/docxExport';
import { generateCompletedXlsx } from '../utils/xlsxExport';
import { formatDeadline } from '../utils/dateUtils';
import {
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Send,
  Building,
  User,
  Users,
  Edit3,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  Layers,
  Search,
  Filter,
  ShieldCheck,
  FileCheck,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Download,
  FileSpreadsheet,
  History,
  Package,
  Info,
  Printer
} from 'lucide-react';

interface ApplicationWorkspaceTabProps {
  workspace: OpportunityWorkspace;
  orgProfile: OrgProfile;
  onUpdateWorkspace: (updated: OpportunityWorkspace) => void;
  onOpenFormatModal: () => void;
}

export const ApplicationWorkspaceTab: React.FC<ApplicationWorkspaceTabProps> = ({
  workspace,
  orgProfile,
  onUpdateWorkspace,
  onOpenFormatModal
}) => {
  const sections = workspace.applicationSections || [];
  const templateSource = workspace.templateSource;
  const versions = workspace.generatedVersions || [];

  // View Modes: 'editor' | 'portal_mode' | 'mapping_table' | 'compiled_doc' | 'submission_package'
  const [viewMode, setViewMode] = useState<
    'editor' | 'portal_mode' | 'mapping_table' | 'compiled_doc' | 'submission_package'
  >('editor');

  // Format Detection
  const detectedFormat: DonorSubmissionFormat = useMemo(() => {
    if (workspace.submissionFormat) return workspace.submissionFormat;
    const fmt = workspace.templateSource?.fileFormat;
    const srcType = workspace.templateSource?.type;
    if (fmt === 'DOCX') return 'docx';
    if (fmt === 'XLSX') return 'xlsx';
    if (fmt === 'PDF') return 'non_fillable_pdf';
    if (srcType === 'paste_questions') return 'portal';
    if (srcType === 'none_fallback') return 'none';
    return 'docx';
  }, [workspace.submissionFormat, workspace.templateSource]);

  // Filters
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active section for AI review & expanded states
  const [reviewingSectionId, setReviewingSectionId] = useState<string | null>(null);
  const [aiCritiqueSectionId, setAiCritiqueSectionId] = useState<string | null>(null);
  const [expandedSectionIds, setExpandedSectionIds] = useState<Record<string, boolean>>({});
  const [showOriginalMaterialDrawer, setShowOriginalMaterialDrawer] = useState<boolean>(false);
  const [showVersionHistoryDrawer, setShowVersionHistoryDrawer] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAllAnswers, setCopiedAllAnswers] = useState<boolean>(false);

  // Generation Loading States
  const [isGeneratingDocx, setIsGeneratingDocx] = useState<boolean>(false);
  const [isGeneratingXlsx, setIsGeneratingXlsx] = useState<boolean>(false);

  // Early Draft Generation Warning Modal
  const [draftWarningModal, setDraftWarningModal] = useState<{
    isOpen: boolean;
    targetFormat: 'docx' | 'xlsx';
  } | null>(null);

  // Human mapping verification state
  const [verifiedMappingIds, setVerifiedMappingIds] = useState<Record<string, boolean>>({});

  // Review Feedback modal state
  const [feedbackModalSecId, setFeedbackModalSecId] = useState<string | null>(null);
  const [feedbackAction, setFeedbackAction] = useState<'approve' | 'return'>('approve');
  const [feedbackNote, setFeedbackNote] = useState<string>('');

  // Toggle expand
  const toggleExpand = (id: string) => {
    setExpandedSectionIds((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id]
    }));
  };

  // Helper for word count
  const getWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  };

  // Update a single section draft
  const handleUpdateSectionDraft = (sectionId: string, newText: string) => {
    const updatedSections = sections.map((sec) => {
      if (sec.id === sectionId) {
        const words = getWordCount(newText);
        return {
          ...sec,
          draftResponse: newText,
          status: words > 0 ? ('Drafting' as const) : ('Not Started' as const),
          lastEditedBy: workspace.proposalLead || 'Staff Member',
          lastEditedAt: new Date().toISOString()
        };
      }
      return sec;
    });

    onUpdateWorkspace({
      ...workspace,
      applicationSections: updatedSections,
      updatedAt: new Date().toISOString()
    });
  };

  // Update section metadata (assignment, dueDate, etc.)
  const handleUpdateSectionMeta = (sectionId: string, updates: Partial<ApplicationSection>) => {
    const updatedSections = sections.map((sec) => (sec.id === sectionId ? { ...sec, ...updates } : sec));
    onUpdateWorkspace({
      ...workspace,
      applicationSections: updatedSections,
      updatedAt: new Date().toISOString()
    });
  };

  // Trigger Section AI Review
  const handleRunAiCritique = async (section: ApplicationSection) => {
    setReviewingSectionId(section.id);
    setAiCritiqueSectionId(section.id);

    try {
      const res = await fetch('/api/review-draft-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorQuestion: section.donorQuestion,
          donorInstructions: section.donorInstructions,
          wordLimit: section.wordLimit,
          charLimit: section.charLimit,
          draftResponse: section.draftResponse,
          orgProfile,
          departmentName: section.assignedDepartment,
          isDeveloperTestMode: false
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to review section.');
      }

      const critique: SectionAiCritique = await res.json();

      const updatedSections = sections.map((sec) =>
        sec.id === section.id ? { ...sec, aiCritique: critique } : sec
      );

      onUpdateWorkspace({
        ...workspace,
        applicationSections: updatedSections,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error running AI critique:', err);
      alert(`AI Quality Check Notice: ${err.message || 'Unable to complete review.'}`);
    } finally {
      setReviewingSectionId(null);
    }
  };

  // Review Workflow Actions
  const handleOpenReviewModal = (sectionId: string, action: 'approve' | 'return') => {
    setFeedbackModalSecId(sectionId);
    setFeedbackAction(action);
    setFeedbackNote('');
  };

  const handleApplyReviewDecision = () => {
    if (!feedbackModalSecId) return;

    const section = sections.find((s) => s.id === feedbackModalSecId);
    if (!section) return;

    const updatedSections = sections.map((sec) => {
      if (sec.id === feedbackModalSecId) {
        if (feedbackAction === 'approve') {
          const isHoD = sec.reviewStatus === 'Submitted to Department Head';
          return {
            ...sec,
            reviewStatus: isHoD ? ('Department Approved' as const) : ('Proposal Lead Approved' as const),
            status: 'Complete' as const,
            reviewedBy: isHoD ? sec.departmentHead : workspace.proposalLead,
            reviewedAt: new Date().toISOString(),
            reviewerNotes: feedbackNote || 'Approved for submission standards.'
          };
        } else {
          return {
            ...sec,
            reviewStatus: 'Returned for Revision' as const,
            status: 'Drafting' as const,
            reviewedBy: sec.departmentHead || workspace.proposalLead,
            reviewedAt: new Date().toISOString(),
            reviewerNotes: feedbackNote || 'Returned for revision based on departmental review.'
          };
        }
      }
      return sec;
    });

    onUpdateWorkspace({
      ...workspace,
      applicationSections: updatedSections,
      updatedAt: new Date().toISOString()
    });

    setFeedbackModalSecId(null);
  };

  const handleSubmitToHoD = (sectionId: string) => {
    const updatedSections = sections.map((sec) => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          reviewStatus: 'Submitted to Department Head' as const,
          status: 'Under Review' as const,
          lastEditedAt: new Date().toISOString()
        };
      }
      return sec;
    });

    onUpdateWorkspace({
      ...workspace,
      applicationSections: updatedSections,
      updatedAt: new Date().toISOString()
    });
  };

  // Copy to clipboard helper
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Copy all portal answers
  const handleCopyAllPortalAnswers = () => {
    const text = sections
      .map((sec) => {
        const header = `=== ${sec.sectionNumber ? sec.sectionNumber + ': ' : ''}${sec.donorQuestion} ===`;
        const instructions = sec.donorInstructions ? `(Instructions: ${sec.donorInstructions})` : '';
        const limit = sec.wordLimit ? `[Word Limit: ${sec.wordLimit}]` : '';
        const response = sec.draftResponse || '[No response drafted]';
        return `${header}\n${[instructions, limit].filter(Boolean).join(' ')}\n\n${response}\n`;
      })
      .join('\n----------------------------------------\n\n');

    navigator.clipboard.writeText(text);
    setCopiedAllAnswers(true);
    setTimeout(() => setCopiedAllAnswers(false), 2500);
  };

  // Calculate Narrative Readiness & Supporting Documents Readiness
  const narrativeMetrics = useMemo(() => {
    const total = sections.length;
    if (total === 0) return { total: 0, completed: 0, approved: 0, percent: 0 };
    const approved = sections.filter(
      (s) => s.reviewStatus === 'Department Approved' || s.reviewStatus === 'Proposal Lead Approved'
    ).length;
    const completed = sections.filter((s) => s.status === 'Complete').length;
    const percent = Math.round((approved / total) * 100);
    return { total, completed, approved, percent };
  }, [sections]);

  const docMetrics = useMemo(() => {
    const mandatoryDocs = workspace.documentsChecklist.filter((d) => d.mandatory);
    const readyDocs = mandatoryDocs.filter((d) => d.status === 'Ready' || d.status === 'Signed');
    const total = mandatoryDocs.length;
    const ready = readyDocs.length;
    const percent = total > 0 ? Math.round((ready / total) * 100) : 0;
    return { total, ready, percent };
  }, [workspace.documentsChecklist]);

  // Overall Submission Readiness Check
  const isSubmissionReady = useMemo(() => {
    const allQuestionsApproved =
      sections.length > 0 &&
      sections.every(
        (s) => s.reviewStatus === 'Department Approved' || s.reviewStatus === 'Proposal Lead Approved'
      );
    const allDocsReady = docMetrics.ready === docMetrics.total;
    const limitsSatisfied = sections.every((s) => {
      if (!s.wordLimit) return true;
      return getWordCount(s.draftResponse) <= s.wordLimit;
    });
    return allQuestionsApproved && allDocsReady && limitsSatisfied;
  }, [sections, docMetrics]);

  // Generate Completed DOCX Handler
  const handleGenerateDocx = async (forceDraft: boolean = false) => {
    const allApproved = narrativeMetrics.approved === narrativeMetrics.total && narrativeMetrics.total > 0;
    const isFinal = !forceDraft && allApproved;

    if (!isFinal && !forceDraft && narrativeMetrics.approved < narrativeMetrics.total) {
      setDraftWarningModal({ isOpen: true, targetFormat: 'docx' });
      return;
    }

    try {
      setIsGeneratingDocx(true);
      const nextVersionNum = (versions.length || 0) + 1;
      const { blob, fileName, versionRecord } = await generateCompletedDocx(
        workspace,
        orgProfile,
        isFinal,
        nextVersionNum
      );

      downloadBlob(blob, fileName);

      const updatedVersions = [versionRecord, ...(workspace.generatedVersions || [])];
      onUpdateWorkspace({
        ...workspace,
        generatedVersions: updatedVersions,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error generating DOCX template:', err);
      alert(`Failed to generate Word document: ${err.message || err}`);
    } finally {
      setIsGeneratingDocx(false);
      setDraftWarningModal(null);
    }
  };

  // Generate Completed XLSX Handler
  const handleGenerateXlsx = async (forceDraft: boolean = false) => {
    const allApproved = narrativeMetrics.approved === narrativeMetrics.total && narrativeMetrics.total > 0;
    const isFinal = !forceDraft && allApproved;

    if (!isFinal && !forceDraft && narrativeMetrics.approved < narrativeMetrics.total) {
      setDraftWarningModal({ isOpen: true, targetFormat: 'xlsx' });
      return;
    }

    try {
      setIsGeneratingXlsx(true);
      const nextVersionNum = (versions.length || 0) + 1;
      const { blob, fileName, versionRecord } = await generateCompletedXlsx(
        workspace,
        orgProfile,
        isFinal,
        nextVersionNum
      );

      downloadBlob(blob, fileName);

      const updatedVersions = [versionRecord, ...(workspace.generatedVersions || [])];
      onUpdateWorkspace({
        ...workspace,
        generatedVersions: updatedVersions,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('Error generating XLSX template:', err);
      alert(`Failed to generate Excel spreadsheet: ${err.message || err}`);
    } finally {
      setIsGeneratingXlsx(false);
      setDraftWarningModal(null);
    }
  };

  // Filtered Sections List
  const filteredSections = useMemo(() => {
    return sections.filter((sec) => {
      const matchDept = selectedDept === 'ALL' || sec.assignedDepartment === selectedDept;
      const matchStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'DRAFTING' && sec.reviewStatus === 'Drafting') ||
        (selectedStatus === 'UNDER_REVIEW' && sec.reviewStatus === 'Submitted to Department Head') ||
        (selectedStatus === 'APPROVED' &&
          (sec.reviewStatus === 'Department Approved' || sec.reviewStatus === 'Proposal Lead Approved')) ||
        (selectedStatus === 'RETURNED' && sec.reviewStatus === 'Returned for Revision');
      const matchQuery =
        !searchQuery ||
        sec.sectionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sec.donorQuestion.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sec.draftResponse.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sec.assignedStaff.toLowerCase().includes(searchQuery.toLowerCase());
      return matchDept && matchStatus && matchQuery;
    });
  }, [sections, selectedDept, selectedStatus, searchQuery]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5" />
                Donor-Template-First Application Workspace
              </span>
              <span className="text-xs text-slate-500 font-medium">
                • Format: <strong className="text-slate-800 uppercase">{detectedFormat.replace('_', ' ')}</strong>
              </span>
              {templateSource?.fileName && (
                <span className="text-xs text-slate-500 font-medium">
                  • Source: <strong className="text-slate-700">{templateSource.fileName}</strong>
                </span>
              )}
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Application Workspace: {workspace.title}
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              The donor defines the application structure; GrantFlow manages cross-departmental drafting, reviews, and automated completion of the submission document.
            </p>
          </div>

          {/* Action Header Buttons */}
          <div className="shrink-0 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowVersionHistoryDrawer(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition flex items-center gap-1.5"
            >
              <History className="w-4 h-4 text-slate-600" />
              <span>Versions ({versions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowOriginalMaterialDrawer(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4 text-slate-600" />
              <span>Original Material</span>
            </button>

            <button
              type="button"
              onClick={onOpenFormatModal}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Configure Format</span>
            </button>
          </div>
        </div>

        {/* Dual Readiness Gauges & Submission Gate */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Narrative Readiness */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Narrative Readiness
              </span>
              <span className="font-bold text-slate-900">
                {narrativeMetrics.approved} / {narrativeMetrics.total} Approved
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${narrativeMetrics.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {narrativeMetrics.percent}% approved by Department Heads & Proposal Lead.
            </p>
          </div>

          {/* 2. Supporting Documents Readiness */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Document Readiness
              </span>
              <span className="font-bold text-slate-900">
                {docMetrics.ready} / {docMetrics.total} Mandatory Docs
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                style={{ width: `${docMetrics.percent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              {docMetrics.percent}% mandatory attachments verified in document library.
            </p>
          </div>

          {/* 3. Submission Gate */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
              isSubmissionReady
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                {isSubmissionReady ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ready for Submission</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Submission Gate Locked</span>
                  </>
                )}
              </div>
              <p className="text-[11px] leading-tight">
                {isSubmissionReady
                  ? 'All donor questions approved & documents verified.'
                  : 'Requires all questions approved & mandatory docs ready.'}
              </p>
            </div>
            <span
              className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${
                isSubmissionReady
                  ? 'bg-emerald-200 text-emerald-900 border-emerald-400'
                  : 'bg-amber-200 text-amber-950 border-amber-400'
              }`}
            >
              {isSubmissionReady ? 'UNLOCKED' : 'LOCKED'}
            </span>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setViewMode('editor')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                viewMode === 'editor'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Working Draft Editor</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('portal_mode')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                viewMode === 'portal_mode'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Portal Submission View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('mapping_table')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                viewMode === 'mapping_table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Template Mapping Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('compiled_doc')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                viewMode === 'compiled_doc'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Compiled Proposal Document</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('submission_package')}
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 ${
                viewMode === 'submission_package'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Submission Package</span>
            </button>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {detectedFormat === 'xlsx' ? (
              <button
                type="button"
                onClick={() => handleGenerateXlsx(false)}
                disabled={isGeneratingXlsx}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isGeneratingXlsx ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                )}
                <span>Generate Completed Excel Template</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleGenerateDocx(false)}
                disabled={isGeneratingDocx}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isGeneratingDocx ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Generate Completed Word Template</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODE 1: WORKING DRAFT EDITOR */}
      {viewMode === 'editor' && (
        <div className="space-y-6">
          {/* Search & Department Filter Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter Dept:
              </span>
              {['ALL', 'Programmes', 'Finance', 'Monitoring & Evaluation', 'Grants / Resource Mobilisation'].map(
                (dept) => (
                  <button
                    key={dept}
                    type="button"
                    onClick={() => setSelectedDept(dept)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      selectedDept === dept
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {dept}
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-end">
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search questions or drafts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-700"
              >
                <option value="ALL">All Review Stages</option>
                <option value="DRAFTING">Drafting</option>
                <option value="UNDER_REVIEW">Submitted to HoD</option>
                <option value="APPROVED">Approved</option>
                <option value="RETURNED">Returned for Revision</option>
              </select>
            </div>
          </div>

          {/* List of Donor Questions */}
          {filteredSections.length === 0 ? (
            <div className="p-12 text-center bg-white border border-slate-200 rounded-2xl space-y-3">
              <FileText className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">No application questions found</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No questions match your current department or search filter. Clear filters or configure a donor template.
              </p>
              <button
                type="button"
                onClick={onOpenFormatModal}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                Configure Application Template
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredSections.map((sec, index) => {
                const words = getWordCount(sec.draftResponse);
                const limit = sec.wordLimit;
                const isOverLimit = limit ? words > limit : false;
                const isNearLimit = limit ? words >= limit * 0.9 && !isOverLimit : false;
                const isExpanded = expandedSectionIds[sec.id] !== false; // default expanded

                return (
                  <div
                    key={sec.id}
                    className="bg-white border-2 border-slate-200 rounded-2xl shadow-sm overflow-hidden transition hover:border-slate-300"
                  >
                    {/* Card Header */}
                    <div className="p-5 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-extrabold text-xs px-2.5 py-0.5 rounded-md bg-indigo-600 text-white shadow-xs">
                            {sec.sectionNumber}
                          </span>
                          {sec.isGrantFlowGenerated && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              GrantFlow-Generated Application Structure
                            </span>
                          )}
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-200/80 text-slate-800 border border-slate-300 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-600" />
                            {sec.assignedDepartment}
                          </span>
                          <span className="text-xs text-slate-500">
                            HoD: <strong className="text-slate-700">{sec.departmentHead}</strong>
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">
                          {sec.donorQuestion}
                        </h3>
                      </div>

                      {/* Right Meta & Review Status Badge */}
                      <div className="shrink-0 flex items-center gap-3">
                        <div className="text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                              sec.reviewStatus === 'Department Approved' ||
                              sec.reviewStatus === 'Proposal Lead Approved'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : sec.reviewStatus === 'Submitted to Department Head'
                                ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                                : sec.reviewStatus === 'Returned for Revision'
                                ? 'bg-rose-100 text-rose-900 border-rose-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {sec.reviewStatus === 'Department Approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                            {sec.reviewStatus === 'Proposal Lead Approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                            {sec.reviewStatus === 'Submitted to Department Head' && <Clock className="w-3.5 h-3.5 text-indigo-700" />}
                            {sec.reviewStatus === 'Returned for Revision' && <XCircle className="w-3.5 h-3.5 text-rose-700" />}
                            {sec.reviewStatus}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Assigned: <strong className="text-slate-700">{sec.assignedStaff}</strong>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleExpand(sec.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition"
                        >
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    {isExpanded && (
                      <div className="p-6 space-y-5">
                        {/* Exact Donor Instructions Callout */}
                        {sec.donorInstructions && (
                          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                            <BookOpen className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold text-blue-900">Donor Instructions & Guidelines: </strong>
                              <span className="text-blue-950 leading-relaxed">{sec.donorInstructions}</span>
                            </div>
                          </div>
                        )}

                        {/* Reviewer Feedback Note (If present) */}
                        {sec.reviewerNotes && (
                          <div
                            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                              sec.reviewStatus === 'Returned for Revision'
                                ? 'bg-rose-50 border-rose-300 text-rose-950'
                                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                            }`}
                          >
                            <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-bold">Review Feedback ({sec.reviewedBy || 'Reviewer'}): </strong>
                              <span>{sec.reviewerNotes}</span>
                              {sec.reviewedAt && (
                                <span className="block text-[10px] opacity-75 mt-0.5">
                                  {new Date(sec.reviewedAt).toLocaleDateString()} at {new Date(sec.reviewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Draft Response Area */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <label className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                              Working Draft Response
                            </label>

                            {/* Live Word Count & Limit Progress */}
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                                  isOverLimit
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : isNearLimit
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {words} {limit ? `/ ${limit}` : ''} words
                              </span>
                              {isOverLimit && (
                                <span className="text-[11px] text-rose-600 font-semibold flex items-center gap-0.5">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Over limit by {words - (limit || 0)}w
                                </span>
                              )}
                            </div>
                          </div>

                          <textarea
                            value={sec.draftResponse}
                            onChange={(e) => handleUpdateSectionDraft(sec.id, e.target.value)}
                            placeholder={`Type or paste ${sec.assignedDepartment} response addressing ${sec.sectionNumber}...`}
                            rows={8}
                            className="w-full text-xs md:text-sm p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-sans leading-relaxed text-slate-800 shadow-xs"
                          />

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>
                              Last edited by <strong>{sec.lastEditedBy || sec.assignedStaff}</strong>
                              {sec.lastEditedAt && ` • ${new Date(sec.lastEditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyText(sec.draftResponse, sec.id)}
                                className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                              >
                                {copiedId === sec.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" /> Copy Draft
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* AI Quality & Compliance Check Section */}
                        <div className="pt-2 border-t border-slate-200">
                          <div className="flex items-center justify-between pb-3">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-indigo-600" />
                              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                AI Quality & Compliance Critique (Gemini)
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={reviewingSectionId === sec.id || !sec.draftResponse.trim()}
                              onClick={() => handleRunAiCritique(sec)}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                            >
                              {reviewingSectionId === sec.id ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  Checking with Gemini...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  Run AI Quality Check
                                </>
                              )}
                            </button>
                          </div>

                          {sec.aiCritique && (
                            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs space-y-4 shadow-md">
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <span className="font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4" />
                                  AI Advisory Findings (Advisory Only • Does Not Overwrite Text)
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  Word status: <strong className="text-indigo-200">{sec.aiCritique.wordCountStatus}</strong>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {/* Unanswered Elements */}
                                {sec.aiCritique.unansweredElements.length > 0 && (
                                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-lg">
                                    <h5 className="font-bold text-rose-300 mb-1 flex items-center gap-1">
                                      <AlertTriangle className="w-3.5 h-3.5" /> Unanswered Parts of Question
                                    </h5>
                                    <ul className="list-disc pl-4 space-y-1 text-rose-100 text-[11px]">
                                      {sec.aiCritique.unansweredElements.map((item, i) => (
                                        <li key={i}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Weak Evidence */}
                                {sec.aiCritique.weakEvidence.length > 0 && (
                                  <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg">
                                    <h5 className="font-bold text-amber-300 mb-1 flex items-center gap-1">
                                      <HelpCircle className="w-3.5 h-3.5" /> Weak Evidence / Needs Baseline
                                    </h5>
                                    <ul className="list-disc pl-4 space-y-1 text-amber-100 text-[11px]">
                                      {sec.aiCritique.weakEvidence.map((item, i) => (
                                        <li key={i}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Unsupported Claims */}
                                {sec.aiCritique.unsupportedClaims.length > 0 && (
                                  <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-lg">
                                    <h5 className="font-bold text-slate-300 mb-1">
                                      Unsupported Claims / Vague Terms
                                    </h5>
                                    <ul className="list-disc pl-4 space-y-1 text-slate-300 text-[11px]">
                                      {sec.aiCritique.unsupportedClaims.map((item, i) => (
                                        <li key={i}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Actionable Suggestions */}
                                {sec.aiCritique.actionableSuggestions.length > 0 && (
                                  <div className="p-3 bg-indigo-950/50 border border-indigo-500/30 rounded-lg md:col-span-2">
                                    <h5 className="font-bold text-indigo-300 mb-1 flex items-center gap-1">
                                      <Sparkles className="w-3.5 h-3.5" /> Actionable Editorial Suggestions
                                    </h5>
                                    <ul className="list-disc pl-4 space-y-1 text-indigo-100 text-[11px]">
                                      {sec.aiCritique.actionableSuggestions.map((item, i) => (
                                        <li key={i}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Multi-Department Workflow Review Bar */}
                        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 p-4 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">
                              Workflow Actions ({sec.assignedDepartment}):
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Officer submit to HoD */}
                            {sec.reviewStatus === 'Drafting' && (
                              <button
                                type="button"
                                onClick={() => handleSubmitToHoD(sec.id)}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Submit to {sec.departmentHead} (HoD)</span>
                              </button>
                            )}

                            {/* HoD Approve or Return */}
                            {sec.reviewStatus === 'Submitted to Department Head' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReviewModal(sec.id, 'return')}
                                  className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Return for Revision</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenReviewModal(sec.id, 'approve')}
                                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve for Department ({sec.departmentHead})</span>
                                </button>
                              </>
                            )}

                            {/* Proposal Lead Sign-Off */}
                            {sec.reviewStatus === 'Department Approved' && (
                              <button
                                type="button"
                                onClick={() => handleOpenReviewModal(sec.id, 'approve')}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Proposal Lead Sign-Off</span>
                              </button>
                            )}

                            {(sec.reviewStatus === 'Proposal Lead Approved' ||
                              sec.reviewStatus === 'Department Approved') && (
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Sign-Off Complete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODE 2: PORTAL APPLICATION MODE (1-Click Copy in Donor Order) */}
      {viewMode === 'portal_mode' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 bg-indigo-200/70 px-2 py-0.5 rounded">
                  Online Portal Submission Mode
                </span>
                <span className="text-xs text-indigo-700">
                  Approved responses arranged in donor sequence for seamless 1-click transfer
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Copy individual responses directly into online grant portals (e.g. UN Partner Portal, Grants.gov, SurveyMonkey) without retyping.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyAllPortalAnswers}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
            >
              {copiedAllAnswers ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>All Answers Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy All Answers (Formatted)</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {sections.map((sec, idx) => {
              const wordCount = getWordCount(sec.draftResponse);
              const charCount = sec.draftResponse ? sec.draftResponse.length : 0;
              const isApproved =
                sec.reviewStatus === 'Department Approved' || sec.reviewStatus === 'Proposal Lead Approved';

              return (
                <div
                  key={sec.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-4 pb-2 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                          {sec.sectionNumber || `Q${idx + 1}`}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {sec.reviewStatus}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{sec.donorQuestion}</h4>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyText(sec.draftResponse, sec.id)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 shrink-0"
                    >
                      {copiedId === sec.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied Answer</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Answer</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
                    {sec.draftResponse || (
                      <span className="text-slate-400 italic">No response drafted for this section yet.</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Words: <strong>{wordCount}</strong> {sec.wordLimit ? `(Limit: ${sec.wordLimit})` : ''} • Characters:{' '}
                      <strong>{charCount}</strong>
                    </span>
                    <span>Assigned: {sec.assignedDepartment} ({sec.assignedStaff})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 3: DONOR TEMPLATE MAPPING MATRIX */}
      {viewMode === 'mapping_table' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Donor Application Template Mapping Matrix
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Comprehensive matrix mapping each donor field to assigned NGO departments, approved responses, and mapping confidence.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Total Fields:</span>
              <span className="px-2.5 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800">
                {sections.length} Fields
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="p-3 border-b border-slate-200">#</th>
                  <th className="p-3 border-b border-slate-200">Exact Donor Question</th>
                  <th className="p-3 border-b border-slate-200">Department</th>
                  <th className="p-3 border-b border-slate-200">Assignee / HoD</th>
                  <th className="p-3 border-b border-slate-200 text-center">Word Count</th>
                  <th className="p-3 border-b border-slate-200 text-center">Review Status</th>
                  <th className="p-3 border-b border-slate-200 text-center">Mapping Confidence</th>
                  <th className="p-3 border-b border-slate-200 text-center">Human Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sections.map((sec) => {
                  const words = getWordCount(sec.draftResponse);
                  const isVerified = verifiedMappingIds[sec.id] || false;
                  const confidence = isVerified ? 'High' : sec.donorQuestion.length > 20 ? 'High' : 'Requires Verification';

                  return (
                    <tr key={sec.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-indigo-700">{sec.sectionNumber}</td>
                      <td className="p-3 max-w-sm">
                        <strong className="text-slate-900 block">{sec.donorQuestion}</strong>
                        {sec.donorInstructions && (
                          <span className="text-[11px] text-slate-500 line-clamp-1 italic">{sec.donorInstructions}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800">{sec.assignedDepartment}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-900">{sec.assignedStaff}</div>
                        <div className="text-[10px] text-slate-500">HoD: {sec.departmentHead}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono">{words} {sec.wordLimit ? `/ ${sec.wordLimit}` : ''}</span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            sec.reviewStatus === 'Department Approved' || sec.reviewStatus === 'Proposal Lead Approved'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : sec.reviewStatus === 'Submitted to Department Head'
                              ? 'bg-indigo-100 text-indigo-900 border-indigo-300'
                              : sec.reviewStatus === 'Returned for Revision'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}
                        >
                          {sec.reviewStatus}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            confidence === 'High'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}
                        >
                          {confidence}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setVerifiedMappingIds((prev) => ({
                              ...prev,
                              [sec.id]: !prev[sec.id]
                            }))
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition ${
                            isVerified
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {isVerified ? '✓ Verified' : 'Confirm'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODE 4: COMPILED PROPOSAL DOCUMENT */}
      {viewMode === 'compiled_doc' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm space-y-8 max-w-4xl mx-auto">
          {/* Cover Header */}
          <div className="text-center pb-8 border-b-2 border-slate-900 space-y-3">
            <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
              Grant Proposal Submission Document
            </span>
            <h1 className="text-3xl font-black text-slate-900">{workspace.title}</h1>
            <p className="text-sm text-slate-600 max-w-2xl mx-auto">
              Submitted to: <strong>{workspace.donor}</strong> • Funding Opportunity ID: {workspace.id}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
              <span>Applicant: <strong>{orgProfile.name}</strong></span>
              <span>Country: <strong>{orgProfile.country}</strong></span>
              <span>Proposal Lead: <strong>{workspace.proposalLead}</strong></span>
              <span>Deadline: <strong>{formatDeadline(workspace.deadline, workspace.deadlineVerificationStatus)}</strong></span>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Proposal Outline</h4>
            <ol className="list-decimal pl-5 space-y-1 text-xs text-slate-700">
              {sections.map((sec, i) => (
                <li key={i}>
                  <strong>{sec.sectionNumber}:</strong> {sec.donorQuestion} ({sec.assignedDepartment})
                </li>
              ))}
            </ol>
          </div>

          {/* Sections Body */}
          <div className="space-y-8 divide-y divide-slate-200">
            {sections.map((sec) => (
              <div key={sec.id} className="pt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2 py-0.5 rounded">
                    {sec.sectionNumber}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{sec.donorQuestion}</h3>
                </div>
                <div className="text-xs md:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap pl-2">
                  {sec.draftResponse || <span className="text-slate-400 italic">No response drafted.</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Print/Export Actions */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Compiled by GrantFlow Agent on {new Date().toLocaleDateString()}
            </span>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 5: SUBMISSION PACKAGE */}
      {viewMode === 'submission_package' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Status Banner */}
          <div
            className={`p-6 rounded-2xl border ${
              isSubmissionReady
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            } flex flex-col md:flex-row md:items-center justify-between gap-4`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                    isSubmissionReady
                      ? 'bg-emerald-200 text-emerald-900'
                      : 'bg-amber-200 text-amber-950'
                  }`}
                >
                  {isSubmissionReady ? 'READY FOR SUBMISSION' : 'NOT READY FOR SUBMISSION'}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  • {workspace.donor} — {workspace.title}
                </span>
              </div>
              <p className="text-xs leading-relaxed max-w-2xl">
                {isSubmissionReady
                  ? 'All mandatory application sections are approved by Department Heads and Proposal Lead. All required legal and audit attachments are verified in the Document Library.'
                  : 'GrantFlow has identified missing approvals or unverified supporting documents. Review the itemized checklist below before final submission.'}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleGenerateDocx(false)}
                className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 ${
                  isSubmissionReady
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>{isSubmissionReady ? 'Generate Final Submission Document' : 'Generate Working Draft Copy'}</span>
              </button>
            </div>
          </div>

          {/* Submission Package Itemized Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Narrative Application Document Item */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Primary Application Document
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    narrativeMetrics.approved === narrativeMetrics.total && narrativeMetrics.total > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {narrativeMetrics.approved === narrativeMetrics.total && narrativeMetrics.total > 0
                    ? 'Ready ✓'
                    : `${narrativeMetrics.total - narrativeMetrics.approved} Pending`}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Donor Format:</span>
                  <strong className="text-slate-800 uppercase">{detectedFormat.replace('_', ' ')}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Questions Approved:</span>
                  <strong className="text-slate-800">
                    {narrativeMetrics.approved} of {narrativeMetrics.total}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Generated Versions:</span>
                  <strong className="text-slate-800">{versions.length} Version(s) recorded</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Proposal Lead:</span>
                  <strong className="text-slate-800">{workspace.proposalLead}</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Executive Sign-off:</span>
                  <strong className="text-slate-800">{workspace.finalApprover || 'Executive Director'}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowVersionHistoryDrawer(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  View Version History &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerateDocx(false)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Latest</span>
                </button>
              </div>
            </div>

            {/* Right: Mandatory Supporting Attachments Item */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Required Supporting Documents
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    docMetrics.ready === docMetrics.total
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {docMetrics.ready === docMetrics.total
                    ? 'All Ready ✓'
                    : `${docMetrics.total - docMetrics.ready} Missing ✗`}
                </span>
              </div>

              <div className="space-y-2 max-h-52 overflow-y-auto divide-y divide-slate-100 text-xs">
                {workspace.documentsChecklist.map((doc) => (
                  <div key={doc.id} className="pt-2 pb-1 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">{doc.name}</span>
                      <span className="text-[10px] text-slate-400 block">{doc.category}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        doc.status === 'Ready' || doc.status === 'Signed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {doc.status === 'Ready' || doc.status === 'Signed' ? `✓ ${doc.status}` : `✗ ${doc.status}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VERSION HISTORY DRAWER */}
      {showVersionHistoryDrawer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 space-y-5 flex flex-col justify-between animate-slideLeft">
            <div className="space-y-4 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base">Generated Document Versions</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVersionHistoryDrawer(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                GrantFlow maintains full version history of all generated donor documents without overwriting.
              </p>

              {versions.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                  No versions generated yet. Click &quot;Generate Completed Word Template&quot; to create Version 1.
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((ver) => (
                    <div
                      key={ver.id}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 font-mono">{ver.label}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ver.status === 'FINAL'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {ver.status}
                        </span>
                      </div>

                      <p className="text-slate-600 text-[11px]">{ver.notes}</p>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200">
                        <span>{new Date(ver.generatedAt).toLocaleString()}</span>
                        <span>{ver.fileSize || 'DOCX'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowVersionHistoryDrawer(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EARLY DRAFT WARNING MODAL */}
      {draftWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-200 space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-base">Generate Draft Output?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Not all donor questions are approved yet (<strong>{narrativeMetrics.approved} of {narrativeMetrics.total}</strong> approved).
              <br /><br />
              GrantFlow will generate a <strong>Draft Working Copy</strong> clearly watermarked as a Draft. Once all reviews and approvals are complete, you can generate the <strong>Final Submission Document</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDraftWarningModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  draftWarningModal.targetFormat === 'xlsx' ? handleGenerateXlsx(true) : handleGenerateDocx(true)
                }
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                Generate Draft Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORIGINAL DONOR MATERIAL SLIDE-OVER DRAWER */}
      {showOriginalMaterialDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-slideLeft">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Original Donor Reference Material</h3>
                    <p className="text-[11px] text-slate-500">Read-Only Preserved Source</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOriginalMaterialDrawer(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-700">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Donor Organization</span>
                  <p className="font-semibold text-slate-900">{workspace.donor}</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">Source Template Document</span>
                  <p className="font-semibold text-slate-900">
                    {templateSource?.fileName || `${workspace.donor}_Application_Guidelines.docx`}
                  </p>
                  <span className="text-[11px] text-slate-500 block">
                    Uploaded: {templateSource?.uploadedAt ? new Date(templateSource.uploadedAt).toLocaleString() : 'During Workspace Setup'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider">
                    Raw Donor Application Prompts & Requirements:
                  </span>
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap border border-slate-800">
                    {templateSource?.rawContent ||
                      workspace.extraction.rawSummary ||
                      `Donor Guidelines for ${workspace.donor}:\n\n` +
                        sections
                          .map(
                            (s) =>
                              `${s.sectionNumber}. ${s.donorQuestion}\nInstructions: ${s.donorInstructions || 'N/A'}\nLimit: ${s.wordLimit || 'Unspecified'} words`
                          )
                          .join('\n\n')}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowOriginalMaterialDrawer(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Close Reference Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVIEW FEEDBACK MODAL (For HoD / Proposal Lead) */}
      {feedbackModalSecId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                {feedbackAction === 'approve' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-bold text-base text-slate-900">
                  {feedbackAction === 'approve' ? 'Sign Off & Approve Section' : 'Return Section for Revision'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackModalSecId(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <p>
                {feedbackAction === 'approve'
                  ? 'Confirm departmental accuracy, methodology compliance, and alignment with donor guidelines.'
                  : 'Provide specific feedback notes to guide the assigned officer in updating this draft response.'}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reviewer Notes / Feedback:
                </label>
                <textarea
                  value={feedbackNote}
                  onChange={(e) => setFeedbackNote(e.target.value)}
                  placeholder={
                    feedbackAction === 'approve'
                      ? 'e.g. Approved. Methodology and indicators strictly align with donor criteria.'
                      : 'e.g. Please clarify the gender breakdown numbers in paragraph 2 and verify local partner roles.'
                  }
                  rows={4}
                  className="w-full p-3 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setFeedbackModalSecId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleApplyReviewDecision}
                className={`px-5 py-2 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 ${
                  feedbackAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {feedbackAction === 'approve' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Approval</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>Return for Revision</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
