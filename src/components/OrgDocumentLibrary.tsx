import React, { useState, useMemo, useRef } from 'react';
import {
  OrgDocument,
  OrgDocumentCategory,
  OrgDocumentStatus,
  OrgDocumentAccessLevel,
  StaffMember,
  OrgDocumentVersion
} from '../types';
import { getDaysDifference, formatDate } from '../utils/dateUtils';
import { DocumentUploadModal } from './DocumentUploadModal';
import { isExternalRecord } from '../utils/documentExtractor';
import {
  FileText,
  FolderLock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Upload,
  History,
  Shield,
  Eye,
  Edit,
  Trash2,
  Tag,
  Building,
  Calendar,
  User,
  Check,
  X,
  FileCheck,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Layers,
  FileSpreadsheet,
  Lock,
  Info,
  CheckSquare,
  HelpCircle,
  Archive,
  Paperclip
} from 'lucide-react';

interface OrgDocumentLibraryProps {
  documents: OrgDocument[];
  staffDirectory: StaffMember[];
  onUpdateDocuments: (updatedDocs: OrgDocument[], rawTextContent?: string) => void;
  onNavigateToWorkspace?: (workspaceId: string) => void;
}

const CATEGORIES: OrgDocumentCategory[] = [
  'Legal & Registration',
  'Policies & Compliance',
  'Financial & Audit',
  'Organisational Information',
  'Staff & Governance',
  'Donor & Project Experience'
];

const CATEGORY_COLORS: Record<OrgDocumentCategory, { bg: string; text: string; border: string; iconBg: string }> = {
  'Legal & Registration': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
    iconBg: 'bg-emerald-100 text-emerald-700'
  },
  'Policies & Compliance': {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200',
    iconBg: 'bg-indigo-100 text-indigo-700'
  },
  'Financial & Audit': {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700'
  },
  'Organisational Information': {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    iconBg: 'bg-blue-100 text-blue-700'
  },
  'Staff & Governance': {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
    iconBg: 'bg-purple-100 text-purple-700'
  },
  'Donor & Project Experience': {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
    iconBg: 'bg-rose-100 text-rose-700'
  }
};

// Essential institutional documents recommended for non-profit donor due diligence
const ESSENTIAL_DOC_CHECKLIST = [
  { title: 'Certificate of Incorporation (CAC / Legal Status)', category: 'Legal & Registration', docType: 'Registration Certificate' },
  { title: 'Valid Tax Clearance Certificate (TCC)', category: 'Legal & Registration', docType: 'Tax Clearance' },
  { title: 'SCUML Anti-Money Laundering Certificate', category: 'Legal & Registration', docType: 'Compliance Certificate' },
  { title: 'SAM.gov Active UEI & CAGE Validation', category: 'Legal & Registration', docType: 'US Federal Registration' },
  { title: 'Child Protection & Safeguarding Policy', category: 'Policies & Compliance', docType: 'Governance Policy' },
  { title: 'Gender Equality & Social Inclusion (GESI) Policy', category: 'Policies & Compliance', docType: 'Institutional Policy' },
  { title: 'Anti-Fraud, Anti-Bribery & Whistleblower Policy', category: 'Policies & Compliance', docType: 'Governance Policy' },
  { title: 'Procurement & Financial SOP Manual', category: 'Policies & Compliance', docType: 'Operational Manual' },
  { title: 'Environmental & Climate Sustainability Policy', category: 'Policies & Compliance', docType: 'Institutional Policy' },
  { title: 'Latest Audited Financial Statements (Unqualified Opinion)', category: 'Financial & Audit', docType: 'Audited Financial Statements' },
  { title: 'Bank Letter of Good Standing & Authorized Signatories', category: 'Financial & Audit', docType: 'Banking Document' },
  { title: 'Institutional Organogram & Management Structure', category: 'Organisational Information', docType: 'Organogram' },
  { title: 'Multi-Year Strategic Plan (2024–2028)', category: 'Organisational Information', docType: 'Strategic Plan' },
  { title: 'Institutional Capability Statement', category: 'Organisational Information', docType: 'Capability Statement' },
  { title: 'Board of Trustees Register & Resolution', category: 'Staff & Governance', docType: 'Governance Register' },
  { title: 'Key Personnel CV & Biodata Master Pack', category: 'Staff & Governance', docType: 'Staff CV Pack' },
  { title: 'Institutional Donor Past Performance Reference Letters', category: 'Donor & Project Experience', docType: 'Reference Letter' }
];

export const OrgDocumentLibrary: React.FC<OrgDocumentLibraryProps> = ({
  documents,
  staffDirectory,
  onUpdateDocuments,
  onNavigateToWorkspace
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [accessFilter, setAccessFilter] = useState<string>('ALL');
  const [showSuperseded, setShowSuperseded] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Modals & Drawers
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadPresetCategory, setUploadPresetCategory] = useState<OrgDocumentCategory | undefined>(undefined);
  const [uploadPresetTitle, setUploadPresetTitle] = useState<string | undefined>(undefined);
  const [uploadPresetType, setUploadPresetType] = useState<string | undefined>(undefined);
  const [selectedDocForVersion, setSelectedDocForVersion] = useState<OrgDocument | null>(null);
  const [editingDoc, setEditingDoc] = useState<OrgDocument | null>(null);
  const [previewDoc, setPreviewDoc] = useState<OrgDocument | null>(null);
  const [expandedHistoryDocId, setExpandedHistoryDocId] = useState<string | null>(null);
  const [showPlannerDrawer, setShowPlannerDrawer] = useState<boolean>(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);
  const [isDraggingOverLibrary, setIsDraggingOverLibrary] = useState<boolean>(false);
  const quickDropInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string) => {
    setActionSuccessToast(message);
    setTimeout(() => {
      setActionSuccessToast(null);
    }, 4000);
  };

  // Calculations for Summary Statistics
  const stats = useMemo(() => {
    const total = documents.length;
    const currentApproved = documents.filter(d => d.isCurrentApproved || d.status === 'Current Approved').length;
    const underReview = documents.filter(d => d.status === 'Under Review' || d.status === 'Draft').length;
    const superseded = documents.filter(d => d.status === 'Superseded').length;

    let expiringSoonCount = 0;
    let expiredCount = 0;
    let reviewDueCount = 0;

    documents.forEach(d => {
      if (d.expiryDate) {
        const diff = getDaysDifference(d.expiryDate);
        if (diff !== null) {
          if (diff < 0) expiredCount++;
          else if (diff <= 60) expiringSoonCount++;
        }
      }
      if (d.nextReviewDate && d.status !== 'Superseded') {
        const rDiff = getDaysDifference(d.nextReviewDate);
        if (rDiff !== null && rDiff <= 30) reviewDueCount++;
      }
    });

    return {
      total,
      currentApproved,
      underReview,
      superseded,
      expiringSoonCount,
      expiredCount,
      reviewDueCount,
      totalAlerts: expiringSoonCount + expiredCount + reviewDueCount
    };
  }, [documents]);

  // Filtering documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Category filter
      if (activeCategory !== 'ALL' && doc.category !== activeCategory) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'Current') {
          if (doc.status !== 'Current' && doc.status !== 'Approved' && doc.status !== 'Current Approved') return false;
        } else if (statusFilter === 'Verified') {
          if (doc.status !== 'Verified' && doc.status !== 'Current') return false;
        } else if (statusFilter === 'Approved') {
          if (doc.status !== 'Approved' && doc.status !== 'Current Approved') return false;
        } else if (doc.status !== statusFilter) {
          return false;
        }
      }
      // Access level filter
      if (accessFilter !== 'ALL' && doc.accessLevel !== accessFilter) {
        return false;
      }
      // Superseded filter
      if (!showSuperseded && doc.status === 'Superseded') {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchCategory = doc.category.toLowerCase().includes(q);
        const matchType = doc.documentType.toLowerCase().includes(q);
        const matchDesc = doc.description?.toLowerCase().includes(q) || false;
        const matchTags = doc.tags?.some(t => t.toLowerCase().includes(q)) || false;
        const matchDonors = doc.donorUses?.some(d => d.toLowerCase().includes(q)) || false;
        const matchFile = doc.fileName.toLowerCase().includes(q);
        const matchStaff = doc.maintainedBy.toLowerCase().includes(q);

        if (!matchTitle && !matchCategory && !matchType && !matchDesc && !matchTags && !matchDonors && !matchFile && !matchStaff) {
          return false;
        }
      }
      return true;
    });
  }, [documents, activeCategory, statusFilter, accessFilter, showSuperseded, searchQuery]);

  // Handle open Add Modal / Upload Modal
  const handleOpenAddModal = (presetCategory?: OrgDocumentCategory, presetTitle?: string, presetType?: string) => {
    setEditingDoc(null);
    setSelectedDocForVersion(null);
    setUploadPresetCategory(presetCategory || (activeCategory !== 'ALL' ? (activeCategory as OrgDocumentCategory) : undefined));
    setUploadPresetTitle(presetTitle);
    setUploadPresetType(presetType);
    setShowUploadModal(true);
  };

  // Handle open Edit Modal
  const handleOpenEditModal = (doc: OrgDocument) => {
    setEditingDoc(doc);
    setSelectedDocForVersion(null);
    setUploadPresetCategory(undefined);
    setUploadPresetTitle(undefined);
    setUploadPresetType(undefined);
    setShowUploadModal(true);
  };

  // Open Version Upload Modal
  const handleOpenVersionModal = (doc: OrgDocument) => {
    setEditingDoc(null);
    setSelectedDocForVersion(doc);
    setUploadPresetCategory(undefined);
    setUploadPresetTitle(undefined);
    setUploadPresetType(undefined);
    setShowUploadModal(true);
  };

  // Save Document from DocumentUploadModal
  const handleSaveDocument = (
    newOrUpdatedDoc: OrgDocument,
    isNewVersionOfExisting?: boolean,
    existingDocId?: string,
    rawTextContent?: string
  ) => {
    if (isNewVersionOfExisting && existingDocId) {
      const updated = documents.map(d => (d.id === existingDocId ? newOrUpdatedDoc : d));
      onUpdateDocuments(updated, rawTextContent);
      showToast(`Published revision ${newOrUpdatedDoc.version} of "${newOrUpdatedDoc.title}". Previous version archived.`);
    } else if (editingDoc) {
      const updated = documents.map(d => (d.id === newOrUpdatedDoc.id ? newOrUpdatedDoc : d));
      onUpdateDocuments(updated, rawTextContent);
      showToast(`Updated metadata for "${newOrUpdatedDoc.title}".`);
    } else {
      onUpdateDocuments([newOrUpdatedDoc, ...documents], rawTextContent);
      showToast(`Registered & analysed "${newOrUpdatedDoc.title}" in Document Library. Populating Organisation Details...`);
    }
  };

  // Delete Document
  const handleDeleteDoc = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to remove "${title}" from the institutional Document Library?`)) {
      const updated = documents.filter(d => d.id !== id);
      onUpdateDocuments(updated);
      showToast(`Removed "${title}" from library.`);
      if (previewDoc?.id === id) setPreviewDoc(null);
    }
  };

  // Download simulation
  const handleDownloadDoc = (doc: OrgDocument) => {
    showToast(`Downloading approved institutional file: ${doc.fileName} (${doc.fileSize || '1.8 MB'})`);
  };

  // Render Status Badge
  const renderStatusBadge = (status: OrgDocumentStatus, isCurrent?: boolean, category?: OrgDocumentCategory, docType?: string) => {
    const isExt = category ? isExternalRecord(category, docType) : (status === 'Verified' || status === 'Current' || status === 'Needs Verification');

    if (status === 'Verified') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Verified Record</span>
        </span>
      );
    }
    if (status === 'Current' || status === 'Current Approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>{isExt ? 'Current Valid' : 'Approved'}</span>
        </span>
      );
    }
    if (status === 'Approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Approved</span>
        </span>
      );
    }
    if (status === 'Expiring Soon') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Expiring Soon</span>
        </span>
      );
    }
    if (status === 'Under Review') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Under Review</span>
        </span>
      );
    }
    if (status === 'Draft') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Draft</span>
        </span>
      );
    }
    if (status === 'Needs Verification') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-900 border border-yellow-300">
          <AlertCircle className="w-3.5 h-3.5 text-yellow-700 shrink-0" />
          <span>Needs Verification</span>
        </span>
      );
    }
    if (status === 'Expired') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span>Expired</span>
        </span>
      );
    }
    if (status === 'Superseded') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-300">
          <Archive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Superseded</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
        <span>{status}</span>
      </span>
    );
  };

  // Render Expiry / Review Status Pill
  const renderExpiryReviewPill = (doc: OrgDocument) => {
    if (doc.expiryDate) {
      const diff = getDaysDifference(doc.expiryDate);
      if (diff !== null) {
        if (diff < 0) {
          return (
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
              <span>Expired {Math.abs(diff)}d ago ({doc.expiryDate})</span>
            </div>
          );
        }
        if (diff <= 60) {
          return (
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
              <span>Expires in {diff}d ({doc.expiryDate})</span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Valid to {doc.expiryDate}</span>
          </div>
        );
      }
    }

    if (doc.nextReviewDate && doc.status !== 'Superseded') {
      const rDiff = getDaysDifference(doc.nextReviewDate);
      if (rDiff !== null && rDiff <= 30) {
        return (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
            <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
            <span>Review {rDiff < 0 ? 'overdue' : `due in ${rDiff}d`} ({doc.nextReviewDate})</span>
          </div>
        );
      }
    }

    if (isExternalRecord(doc.category, doc.documentType)) {
      return (
        <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50/70 px-2 py-0.5 rounded border border-emerald-200">
          <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Indefinite Statutory Validity</span>
        </div>
      );
    }

    if (doc.approvalDate) {
      return (
        <div className="flex items-center gap-1 text-[11px] text-slate-500">
          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
          <span>Approved {doc.approvalDate}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6" id="org-document-library-container">
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <FolderLock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Organisation Document Library</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {documents.length} Institutional Assets
              </span>
            </div>
            <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
              Centralized repository of verified institutional documents, governance policies, audited financial accounts, and donor certificates.
              Proposal teams can instantly attach current approved documents to grant submissions without manual searching or risk of submitting superseded versions.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="library-check-planner-btn"
              onClick={() => setShowPlannerDrawer(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition shadow-2xs"
            >
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              <span>Due Diligence Checklist</span>
            </button>

            <button
              id="library-add-document-btn"
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Document</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Repository</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across {CATEGORIES.length} categories</div>
          </div>

          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Current Approved
            </div>
            <div className="text-2xl font-bold text-emerald-900 mt-1">{stats.currentApproved}</div>
            <div className="text-[11px] text-emerald-700 mt-0.5">Ready for immediate submission</div>
          </div>

          <div className={`rounded-lg p-3 border ${stats.totalAlerts > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${stats.totalAlerts > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Expiry & Review Alerts
            </div>
            <div className={`text-2xl font-bold mt-1 ${stats.totalAlerts > 0 ? 'text-amber-900' : 'text-slate-700'}`}>
              {stats.totalAlerts}
            </div>
            <div className="text-[11px] text-slate-600 mt-0.5">
              {stats.expiredCount > 0 ? `${stats.expiredCount} expired • ` : ''}{stats.expiringSoonCount} expiring soon
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200">
            <div className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-600" />
              Under Review / Draft
            </div>
            <div className="text-2xl font-bold text-indigo-900 mt-1">{stats.underReview}</div>
            <div className="text-[11px] text-indigo-700 mt-0.5">Pending board / management approval</div>
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
            activeCategory === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <span>All Categories</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeCategory === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
            {documents.length}
          </span>
        </button>

        {CATEGORIES.map(cat => {
          const count = documents.filter(d => d.category === cat).length;
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <span>{cat}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by title, keyword, donor, tag, or staff..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-slate-50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500 hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Verified">Verified Records</option>
              <option value="Current">Current / Approved</option>
              <option value="Approved">Approved Policies & Plans</option>
              <option value="Under Review">Under Review</option>
              <option value="Draft">Draft</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
              <option value="Needs Verification">Needs Verification</option>
              <option value="Superseded">Superseded / Archived</option>
            </select>
          </div>

          {/* Access Level Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="font-semibold text-slate-500 hidden sm:inline">Access:</span>
            <select
              value={accessFilter}
              onChange={e => setAccessFilter(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Access Levels</option>
              <option value="General">General (All Staff)</option>
              <option value="Restricted">Restricted</option>
              <option value="Management Only">Management Only</option>
            </select>
          </div>

          {/* Superseded Checkbox */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
            <input
              type="checkbox"
              checked={showSuperseded}
              onChange={e => setShowSuperseded(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
            />
            <span className="font-medium text-slate-700">Include Superseded</span>
          </label>

          {/* Grid vs Table View */}
          <div className="flex items-center rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md text-xs font-semibold transition ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card View"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Documents Listing */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Documents Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            No institutional documents match your search query and filters. Try adjusting the category or keyword search.
          </p>
          <button
            onClick={() => { setSearchQuery(''); setActiveCategory('ALL'); setStatusFilter('ALL'); setAccessFilter('ALL'); }}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Document Title & Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Version & Status</th>
                  <th className="py-3 px-4">Validity / Review</th>
                  <th className="py-3 px-4">Maintained By</th>
                  <th className="py-3 px-4">File Info</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredDocuments.map(doc => {
                  const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS['Legal & Registration'];
                  const isHistoryExpanded = expandedHistoryDocId === doc.id;

                  return (
                    <React.Fragment key={doc.id}>
                      <tr className="hover:bg-slate-50/80 transition group">
                        {/* Title & Metadata */}
                        <td className="py-3.5 px-4 max-w-xs sm:max-w-sm">
                          <div className="flex items-start gap-2.5">
                            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${catStyle.iconBg}`}>
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  onClick={() => setPreviewDoc(doc)}
                                  className="font-bold text-slate-900 hover:text-indigo-600 cursor-pointer text-xs leading-snug"
                                >
                                  {doc.title}
                                </span>
                                {doc.accessLevel === 'Management Only' && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200" title="Management Only Access">
                                    <Lock className="w-2.5 h-2.5" />
                                    Mgmt Only
                                  </span>
                                )}
                                {doc.accessLevel === 'Restricted' && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                    <Shield className="w-2.5 h-2.5" />
                                    Restricted
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                                <span className="font-medium text-slate-600">{doc.documentType}</span>
                                <span>•</span>
                                <span>Year: {doc.year}</span>
                                {doc.tags && doc.tags.length > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-400">{doc.tags.slice(0, 2).join(', ')}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                            {doc.category}
                          </span>
                        </td>

                        {/* Version & Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {doc.version}
                              </span>
                              {renderStatusBadge(doc.status, doc.isCurrentApproved, doc.category, doc.documentType)}
                            </div>
                            {doc.previousVersions && doc.previousVersions.length > 0 && (
                              <button
                                onClick={() => setExpandedHistoryDocId(isHistoryExpanded ? null : doc.id)}
                                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 transition"
                              >
                                <History className="w-3 h-3" />
                                {doc.previousVersions.length} older version{doc.previousVersions.length > 1 ? 's' : ''}
                                {isHistoryExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Validity / Expiry / Review */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {renderExpiryReviewPill(doc)}
                        </td>

                        {/* Maintained By */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                              {doc.maintainedBy.split(' ').map(n => n[0]).join('')}
                            </div>
                            <span className="text-xs font-medium text-slate-700">{doc.maintainedBy}</span>
                          </div>
                        </td>

                        {/* File Info */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="text-[11px]">
                            <div className="font-medium text-slate-800 truncate max-w-[140px]" title={doc.fileName}>
                              {doc.fileName}
                            </div>
                            <div className="text-slate-400 text-[10px]">
                              {doc.fileFormat || 'PDF'} • {doc.fileSize || '1.5 MB'}
                            </div>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                              title="Inspect Details & Metadata"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDownloadDoc(doc)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                              title="Download Approved File"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenVersionModal(doc)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                              title="Upload New Version (Archives current as Superseded)"
                            >
                              <Upload className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(doc)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                              title="Edit Metadata"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteDoc(doc.id, doc.title)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                              title="Delete from Library"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Version History Row */}
                      {isHistoryExpanded && doc.previousVersions && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={7} className="px-6 py-3">
                            <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                  <History className="w-3.5 h-3.5 text-indigo-600" />
                                  Historical Version Audit Trail for &quot;{doc.title}&quot;
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Superseded versions are preserved for institutional audit records
                                </span>
                              </div>

                              <div className="space-y-1.5 divide-y divide-slate-100 text-xs">
                                {doc.previousVersions.map((prev, idx) => (
                                  <div key={idx} className="pt-1.5 flex items-center justify-between gap-4 text-[11px]">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-300">
                                        {prev.version}
                                      </span>
                                      <span className="text-slate-500 font-medium">Uploaded {prev.uploadedAt} by {prev.uploadedBy}</span>
                                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                                        Superseded
                                      </span>
                                    </div>
                                    <div className="text-slate-500 italic truncate max-w-sm">
                                      {prev.changeNotes || 'Superseded version.'}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-slate-400 font-mono text-[10px]">{prev.fileName}</span>
                                      <button
                                        onClick={() => showToast(`Downloading historical version ${prev.version}: ${prev.fileName}`)}
                                        className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] flex items-center gap-0.5"
                                      >
                                        <Download className="w-3 h-3" />
                                        Retrieve
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID / CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(doc => {
            const catStyle = CATEGORY_COLORS[doc.category] || CATEGORY_COLORS['Legal & Registration'];

            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-sm transition flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Top Category & Version row */}
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}>
                      {doc.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {doc.version}
                      </span>
                      {renderStatusBadge(doc.status, doc.isCurrentApproved, doc.category, doc.documentType)}
                    </div>
                  </div>

                  {/* Title */}
                  <h4
                    onClick={() => setPreviewDoc(doc)}
                    className="text-sm font-bold text-slate-900 hover:text-indigo-600 cursor-pointer mt-2.5 leading-snug line-clamp-2"
                  >
                    {doc.title}
                  </h4>

                  {/* Description snippet */}
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {doc.description || `${doc.documentType} registered for institutional compliance.`}
                  </p>

                  {/* Expiry Pill */}
                  <div className="mt-2.5">
                    {renderExpiryReviewPill(doc)}
                  </div>
                </div>

                {/* Bottom metadata & actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 min-w-0">
                    <div className="font-medium text-slate-700 truncate">{doc.maintainedBy}</div>
                    <div className="text-[10px] text-slate-400">{doc.fileName}</div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setPreviewDoc(doc)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                      title="Inspect"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadDoc(doc)}
                      className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenVersionModal(doc)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition"
                      title="New Version"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(doc)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DOCUMENT UPLOAD / VERSION / METADATA MODAL */}
      {/* ========================================================================= */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setEditingDoc(null);
          setSelectedDocForVersion(null);
          setUploadPresetCategory(undefined);
          setUploadPresetTitle(undefined);
          setUploadPresetType(undefined);
        }}
        documents={documents}
        staffDirectory={staffDirectory}
        onSaveDocument={handleSaveDocument}
        initialCategory={uploadPresetCategory}
        initialTitle={uploadPresetTitle}
        initialType={uploadPresetType}
        existingDocToEdit={editingDoc}
        existingDocForVersion={selectedDocForVersion}
      />

      {/* ========================================================================= */}
      {/* 3. DOCUMENT PREVIEW / DETAIL INSPECTOR DRAWER/MODAL */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 mt-1">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {previewDoc.version}
                    </span>
                    {renderStatusBadge(previewDoc.status, previewDoc.isCurrentApproved, previewDoc.category, previewDoc.documentType)}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">{previewDoc.title}</h3>
                  <div className="text-xs text-slate-500 mt-0.5">{previewDoc.category} • {previewDoc.documentType}</div>
                </div>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs max-h-[65vh] overflow-y-auto pr-1">
              {/* Description */}
              {previewDoc.description && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-700 block mb-1">Institutional Description:</span>
                  <p className="text-slate-600 leading-relaxed">{previewDoc.description}</p>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Validity / Coverage</span>
                  <span className="font-bold text-slate-800 text-xs">{previewDoc.year}</span>
                </div>
                {isExternalRecord(previewDoc.category, previewDoc.documentType) ? (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Date of Issuance / Reg</span>
                    <span className="font-bold text-slate-800 text-xs">{previewDoc.issuedDate || previewDoc.approvalDate || 'Recorded'}</span>
                  </div>
                ) : (
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase block">Approval Date</span>
                    <span className="font-bold text-slate-800 text-xs">{previewDoc.approvalDate || 'Recorded'}</span>
                  </div>
                )}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Expiry Date</span>
                  <span className="font-bold text-slate-800 text-xs">
                    {previewDoc.expiryDate || (isExternalRecord(previewDoc.category, previewDoc.documentType) ? 'No Expiry (Indefinite)' : 'No formal expiration')}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Scheduled Review</span>
                  <span className="font-bold text-slate-800 text-xs">{previewDoc.nextReviewDate || 'Periodic Review'}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Maintained By</span>
                  <span className="font-bold text-slate-800 text-xs">{previewDoc.maintainedBy}</span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase block">Access Level</span>
                  <span className="font-bold text-slate-800 text-xs">{previewDoc.accessLevel}</span>
                </div>
              </div>

              {/* File Info */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-600 text-white">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-mono font-bold text-slate-900 text-xs">{previewDoc.fileName}</div>
                    <div className="text-[11px] text-slate-500">{previewDoc.fileFormat || 'PDF'} • {previewDoc.fileSize || '1.8 MB'}</div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadDoc(previewDoc)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>

              {/* Tags & Donor Uses */}
              <div className="space-y-2">
                {previewDoc.donorUses && previewDoc.donorUses.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">Approved for Donor Submissions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewDoc.donorUses.map((d, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {previewDoc.tags && previewDoc.tags.length > 0 && (
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">Tags / Compliance Codes:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {previewDoc.tags.map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 font-mono">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Historical Versions */}
              {previewDoc.previousVersions && previewDoc.previousVersions.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <span className="font-bold text-slate-800 block mb-2 flex items-center gap-1">
                    <History className="w-3.5 h-3.5 text-indigo-600" />
                    Previous Version History ({previewDoc.previousVersions.length})
                  </span>
                  <div className="space-y-1.5">
                    {previewDoc.previousVersions.map((ver, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]">
                        <div>
                          <span className="font-mono font-bold text-slate-700 bg-slate-200 px-1.5 py-0.2 rounded mr-1.5">{ver.version}</span>
                          <span className="text-slate-500">Uploaded {ver.uploadedAt} by {ver.uploadedBy}</span>
                          <div className="text-[10px] text-slate-400 italic mt-0.5">{ver.changeNotes}</div>
                        </div>
                        <button
                          onClick={() => showToast(`Downloading historical version ${ver.version}`)}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    handleOpenEditModal(doc);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit Metadata
                </button>
                <button
                  onClick={() => {
                    const doc = previewDoc;
                    setPreviewDoc(null);
                    handleOpenVersionModal(doc);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload New Version
                </button>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. DUE DILIGENCE ESSENTIAL CHECKLIST DRAWER */}
      {/* ========================================================================= */}
      {showPlannerDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-end p-0">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Institutional Due Diligence Checklist</h3>
                  <p className="text-xs text-slate-500">Standard documents required by USAID, UN, EU, and Global Fund</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlannerDrawer(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-slate-700 text-xs leading-relaxed">
                This checklist benchmarks your Organisation Document Library against standard institutional due diligence matrices.
                Click &quot;Add to Library&quot; on any missing item to upload and approve it.
              </div>

              <div className="space-y-2">
                {ESSENTIAL_DOC_CHECKLIST.map((item, idx) => {
                  const existingDoc = documents.find(d =>
                    d.title.toLowerCase().includes(item.title.toLowerCase().split(' ')[0]) ||
                    d.category === item.category && d.documentType.toLowerCase().includes(item.docType.toLowerCase())
                  );

                  const isAvailable = !!existingDoc && (existingDoc.isCurrentApproved || existingDoc.status === 'Current Approved');

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                        isAvailable ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {isAvailable ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          )}
                          <span className="font-bold text-slate-900 text-xs">{item.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 pl-5">
                          {item.category} • {item.docType}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAvailable && existingDoc ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <span>Approved ({existingDoc.version})</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setShowPlannerDrawer(false);
                              handleOpenAddModal(item.category as OrgDocumentCategory, item.title, item.docType);
                            }}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            Add to Library
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setShowPlannerDrawer(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Close Checklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
