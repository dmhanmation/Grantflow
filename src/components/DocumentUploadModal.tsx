import React, { useState, useRef, useEffect } from 'react';
import {
  OrgDocument,
  OrgDocumentCategory,
  OrgDocumentStatus,
  OrgDocumentAccessLevel,
  StaffMember,
  OrgDocumentVersion
} from '../types';
import { getDaysDifference, formatDate } from '../utils/dateUtils';
import { SAMPLE_NGO_DOCUMENTS, isExternalRecord } from '../utils/documentExtractor';
import { extractTextFromFile } from '../utils/fileTextReader';
import {
  Upload,
  FileText,
  X,
  Check,
  Calendar,
  AlertTriangle,
  Clock,
  Shield,
  Tag,
  Users,
  Paperclip,
  Sparkles,
  Building,
  Layers,
  FileSpreadsheet,
  Archive,
  Image as ImageIcon,
  CheckCircle2,
  FileCheck,
  ChevronRight,
  RotateCcw,
  RefreshCw,
  FolderLock,
  Lock,
  Info,
  HelpCircle
} from 'lucide-react';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: OrgDocument[];
  staffDirectory: StaffMember[];
  onSaveDocument: (
    newOrUpdatedDoc: OrgDocument,
    isNewVersionOfExisting?: boolean,
    existingDocId?: string,
    rawTextContent?: string
  ) => void;
  initialCategory?: OrgDocumentCategory;
  initialTitle?: string;
  initialType?: string;
  existingDocToEdit?: OrgDocument | null;
  existingDocForVersion?: OrgDocument | null;
}

const CATEGORIES: OrgDocumentCategory[] = [
  'Legal & Registration',
  'Policies & Compliance',
  'Financial & Audit',
  'Organisational Information',
  'Staff & Governance',
  'Donor & Project Experience'
];

const CATEGORY_CODES: Record<OrgDocumentCategory, string> = {
  'Legal & Registration': 'LEG',
  'Policies & Compliance': 'POL',
  'Financial & Audit': 'FIN',
  'Organisational Information': 'ORG',
  'Staff & Governance': 'GOV',
  'Donor & Project Experience': 'DON'
};

// Common institutional document presets for 1-click quick configuration
const QUICK_PRESETS = [
  {
    title: 'Certificate of Incorporation (CAC / Legal Status)',
    category: 'Legal & Registration' as OrgDocumentCategory,
    docType: 'Registration Certificate',
    version: 'v1.0',
    defaultStatus: 'Verified' as OrgDocumentStatus,
    expiryPreset: 'none',
    donorUses: 'USAID, UN Women, EU, Global Fund, FCDO',
    tags: 'CAC, Legal, Registration, Mandatory'
  },
  {
    title: 'Valid Tax Clearance Certificate (TCC)',
    category: 'Legal & Registration' as OrgDocumentCategory,
    docType: 'Tax Clearance Certificate',
    version: 'v2026.1',
    defaultStatus: 'Current' as OrgDocumentStatus,
    expiryPreset: '1y',
    donorUses: 'All Institutional Donors, Federal Grants',
    tags: 'TCC, FIRS, Tax, Annual Renewal'
  },
  {
    title: 'SCUML Anti-Money Laundering Certificate',
    category: 'Legal & Registration' as OrgDocumentCategory,
    docType: 'Compliance Certificate',
    version: 'v1.0',
    defaultStatus: 'Verified' as OrgDocumentStatus,
    expiryPreset: 'none',
    donorUses: 'USAID, EU-ACT, FCDO',
    tags: 'SCUML, EFCC, AML/CFT, Compliance'
  },
  {
    title: 'Child Protection & Safeguarding Policy',
    category: 'Policies & Compliance' as OrgDocumentCategory,
    docType: 'Child Safeguarding & PSEA Policy',
    version: 'v3.0',
    defaultStatus: 'Approved' as OrgDocumentStatus,
    expiryPreset: 'none',
    donorUses: 'UNICEF, USAID, Save the Children, EU',
    tags: 'Safeguarding, PSEA, Child Protection, Mandatory'
  },
  {
    title: 'Gender Equality & Social Inclusion (GESI) Policy',
    category: 'Policies & Compliance' as OrgDocumentCategory,
    docType: 'Institutional Policy',
    version: 'v2.2',
    defaultStatus: 'Approved' as OrgDocumentStatus,
    expiryPreset: 'none',
    donorUses: 'UN Women, Global Affairs Canada, USAID',
    tags: 'GESI, Gender Mainstreaming, Inclusion'
  },
  {
    title: 'Anti-Fraud, Anti-Bribery & Whistleblower Policy',
    category: 'Policies & Compliance' as OrgDocumentCategory,
    docType: 'Governance Policy',
    version: 'v2.0',
    defaultStatus: 'Approved' as OrgDocumentStatus,
    expiryPreset: 'none',
    donorUses: 'FCDO, USAID, MacArthur Foundation',
    tags: 'Anti-Fraud, Whistleblower, Financial Integrity'
  },
  {
    title: 'Audited Financial Statements (Parker & Cole)',
    category: 'Financial & Audit' as OrgDocumentCategory,
    docType: 'Audited Financial Statements',
    version: 'v2025.Final',
    defaultStatus: 'Verified' as OrgDocumentStatus,
    expiryPreset: 'none',
    donorUses: 'All Donors, EU-ACT, USAID, Global Fund',
    tags: 'External Audit, Financials, Unqualified Opinion'
  },
  {
    title: 'Bank Letter of Good Standing & Signatories',
    category: 'Financial & Audit' as OrgDocumentCategory,
    docType: 'Banking Document',
    version: 'v2026.Q1',
    defaultStatus: 'Current' as OrgDocumentStatus,
    expiryPreset: 'none',
    donorUses: 'All Donors, Wire Verifications',
    tags: 'Bank Letter, Zenith Bank, Domiciliary'
  },
  {
    title: 'Multi-Year Strategic Plan (2024–2028)',
    category: 'Organisational Information' as OrgDocumentCategory,
    docType: 'Multi-Year Strategic Plan',
    version: 'v1.0',
    defaultStatus: 'Approved' as OrgDocumentStatus,
    expiryPreset: 'none',
    donorUses: 'Institutional Review, Core Support',
    tags: 'Strategy, Multi-Year, Board Approved'
  },
  {
    title: 'Institutional Organogram & Management Hierarchy',
    category: 'Organisational Information' as OrgDocumentCategory,
    docType: 'Organogram',
    version: 'v2026.1',
    defaultStatus: 'Approved' as OrgDocumentStatus,
    expiryPreset: 'none',
    donorUses: 'USAID, UN Women, MacArthur Foundation',
    tags: 'Organogram, Staffing, Leadership'
  }
];

const COMMON_DOC_TYPES = [
  'Registration Certificate',
  'Tax Clearance Certificate',
  'Audited Financial Statements',
  'Compliance Certificate',
  'Banking Document',
  'Donor Reference Letter',
  'Child Safeguarding & PSEA Policy',
  'Anti-Fraud & Whistleblower Policy',
  'Institutional Policy',
  'Governance Policy',
  'Multi-Year Strategic Plan',
  'Organogram',
  'Operational Manual (SOP)',
  'Board Resolution',
  'Constitution & Bylaws'
];

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  documents,
  staffDirectory,
  onSaveDocument,
  initialCategory,
  initialTitle,
  initialType,
  existingDocToEdit,
  existingDocForVersion
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedFileText, setExtractedFileText] = useState<string>('');

  // Upload Mode: 'new_doc' or 'new_version'
  const [uploadMode, setUploadMode] = useState<'new_doc' | 'new_version'>(
    existingDocForVersion ? 'new_version' : 'new_doc'
  );
  const [linkedExistingDocId, setLinkedExistingDocId] = useState<string>(
    existingDocForVersion?.id || ''
  );

  // Form Fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<OrgDocumentCategory>('Legal & Registration');
  const [docType, setDocType] = useState('Governance Policy');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [version, setVersion] = useState('v1.0');
  const [status, setStatus] = useState<OrgDocumentStatus>('Current Approved');
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [maintainedBy, setMaintainedBy] = useState('');
  const [accessLevel, setAccessLevel] = useState<OrgDocumentAccessLevel>('General');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('1.5 MB');
  const [fileFormat, setFileFormat] = useState<'PDF' | 'DOCX' | 'XLSX' | 'ZIP' | 'IMAGE'>('PDF');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [donorUses, setDonorUses] = useState('');
  const [versionNotes, setVersionNotes] = useState('');
  const [isCurrentApproved, setIsCurrentApproved] = useState(true);

  // Error validation
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form based on props
  useEffect(() => {
    if (!isOpen) return;

    if (existingDocToEdit) {
      // Editing existing document metadata
      setUploadMode('new_doc');
      setTitle(existingDocToEdit.title);
      setCategory(existingDocToEdit.category);
      setDocType(existingDocToEdit.documentType);
      setYear(existingDocToEdit.year || new Date().getFullYear().toString());
      setVersion(existingDocToEdit.version);
      setStatus(existingDocToEdit.status);
      setIsCurrentApproved(existingDocToEdit.isCurrentApproved);
      setApprovalDate(existingDocToEdit.approvalDate || new Date().toISOString().split('T')[0]);
      setExpiryDate(existingDocToEdit.expiryDate || '');
      setNextReviewDate(existingDocToEdit.nextReviewDate || '');
      setMaintainedBy(existingDocToEdit.maintainedBy);
      setAccessLevel(existingDocToEdit.accessLevel);
      setFileName(existingDocToEdit.fileName);
      setFileSize(existingDocToEdit.fileSize || '1.8 MB');
      setFileFormat(existingDocToEdit.fileFormat || 'PDF');
      setDescription(existingDocToEdit.description || '');
      setTags(existingDocToEdit.tags ? existingDocToEdit.tags.join(', ') : '');
      setDonorUses(existingDocToEdit.donorUses ? existingDocToEdit.donorUses.join(', ') : '');
      setSelectedFile(null);
    } else if (existingDocForVersion) {
      // Uploading new version to existing document
      setUploadMode('new_version');
      setLinkedExistingDocId(existingDocForVersion.id);
      setTitle(existingDocForVersion.title);
      setCategory(existingDocForVersion.category);
      setDocType(existingDocForVersion.documentType);
      setYear(new Date().getFullYear().toString());
      
      // Calculate next version recommendation (e.g. v2.0 -> v2.1 or v3.0)
      const currentVer = existingDocForVersion.version || 'v1.0';
      const numMatch = currentVer.match(/\d+(\.\d+)?/);
      let nextVerStr = 'v2.0';
      if (numMatch) {
        const val = parseFloat(numMatch[0]);
        nextVerStr = `v${(val + 1.0).toFixed(1)}`;
      }
      setVersion(nextVerStr);
      setStatus('Current Approved');
      setIsCurrentApproved(true);
      setApprovalDate(new Date().toISOString().split('T')[0]);
      setExpiryDate(existingDocForVersion.expiryDate || '');
      
      // Default next review in 1 year
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      setNextReviewDate(nextYear.toISOString().split('T')[0]);
      
      setMaintainedBy(existingDocForVersion.maintainedBy);
      setAccessLevel(existingDocForVersion.accessLevel);
      setFileName(`HHDI_${existingDocForVersion.title.replace(/[^a-zA-Z0-9]/g, '_')}_${nextVerStr}.pdf`);
      setFileSize('2.1 MB');
      setFileFormat(existingDocForVersion.fileFormat || 'PDF');
      setDescription(existingDocForVersion.description || '');
      setTags(existingDocForVersion.tags ? existingDocForVersion.tags.join(', ') : '');
      setDonorUses(existingDocForVersion.donorUses ? existingDocForVersion.donorUses.join(', ') : '');
      setVersionNotes(`Updated version ${nextVerStr} replacing previous ${existingDocForVersion.version}. Approved for ongoing institutional grant submissions.`);
      setSelectedFile(null);
    } else {
      // Brand new document registration
      const cat = initialCategory || 'Legal & Registration';
      const initialDocType = initialType || (cat === 'Legal & Registration' ? 'Registration Certificate' : 'Governance Policy');
      const isExt = isExternalRecord(cat, initialDocType);

      setUploadMode('new_doc');
      setLinkedExistingDocId('');
      setTitle(initialTitle || '');
      setCategory(cat);
      setDocType(initialDocType);
      setYear(new Date().getFullYear().toString());
      setVersion('v1.0');
      setStatus(isExt ? 'Verified' : 'Approved');
      setIsCurrentApproved(true);
      setApprovalDate(new Date().toISOString().split('T')[0]);
      setExpiryDate('');
      setNextReviewDate('');
      
      setMaintainedBy(staffDirectory[0]?.fullName || 'Organisation Admin');
      setAccessLevel('General');
      setFileName(initialTitle ? `${initialTitle.replace(/[^a-zA-Z0-9]/g, '_')}_v1.0.pdf` : 'Document.pdf');
      setFileSize('1.8 MB');
      setFileFormat('PDF');
      setDescription('');
      setTags('');
      setDonorUses('');
      setVersionNotes('');
      setSelectedFile(null);
    }
    setErrorMessage(null);
  }, [isOpen, existingDocToEdit, existingDocForVersion, initialCategory, initialTitle, initialType, staffDirectory]);

  if (!isOpen) return null;

  // Auto-detect format from extension
  const detectFileFormat = (name: string): 'PDF' | 'DOCX' | 'XLSX' | 'ZIP' | 'IMAGE' => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'PDF';
    if (ext === 'doc' || ext === 'docx') return 'DOCX';
    if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return 'XLSX';
    if (ext === 'zip' || ext === 'rar' || ext === '7z' || ext === 'tar') return 'ZIP';
    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return 'IMAGE';
    return 'PDF';
  };

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle file input or drop
  const handleFileProcess = async (file: File) => {
    setSelectedFile(file);
    const detectedFmt = detectFileFormat(file.name);
    setFileFormat(detectedFmt);
    setFileSize(formatBytes(file.size));
    
    // Auto-generate clean document title if currently empty
    if (!title.trim()) {
      const baseNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const cleanTitle = baseNameWithoutExt
        .replace(/^[A-Z0-9]+[_\-\s]+/i, '') // Remove prefixes like HHDI_
        .replace(/[_\-]+/g, ' ')
        .trim();
      setTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }

    // Set standard file name
    setFileName(file.name);

    // Read text content asynchronously with deep stream parsing
    try {
      const text = await extractTextFromFile(file);
      if (text && text.trim()) {
        setExtractedFileText(text);
      } else {
        setExtractedFileText(`${file.name}\n${file.size} bytes`);
      }
    } catch (e) {
      setExtractedFileText(`${file.name}`);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  // Standardise file name helper button
  const handleStandardiseFileName = () => {
    const orgCode = 'HHDI';
    const catCode = CATEGORY_CODES[category] || 'DOC';
    const cleanTitleStr = (title.trim() || 'Document')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_');
    const verStr = version.replace(/[^a-zA-Z0-9.]/g, '') || 'v1.0';
    const ext = fileFormat === 'DOCX' ? 'docx' : fileFormat === 'XLSX' ? 'xlsx' : fileFormat === 'ZIP' ? 'zip' : fileFormat === 'IMAGE' ? 'png' : 'pdf';
    
    const standardName = `${orgCode}_${catCode}_${cleanTitleStr}_${year}_${verStr}.${ext}`;
    setFileName(standardName);
  };

  // Quick Preset Click
  const handleApplyPreset = (preset: typeof QUICK_PRESETS[0]) => {
    setTitle(preset.title);
    setCategory(preset.category);
    setDocType(preset.docType);
    setVersion(preset.version);
    setDonorUses(preset.donorUses);
    setTags(preset.tags);

    const isExt = isExternalRecord(preset.category, preset.docType);
    setStatus(preset.defaultStatus || (isExt ? 'Verified' : 'Approved'));
    setIsCurrentApproved(true);

    // Presets configure metadata only without injecting foreign organisation text
    setExtractedFileText('');

    // Set expiry based on preset
    const now = new Date();
    if (preset.expiryPreset === '1y') {
      const next1 = new Date();
      next1.setFullYear(now.getFullYear() + 1);
      setExpiryDate(next1.toISOString().split('T')[0]);
    } else if (preset.expiryPreset === '2y') {
      const next2 = new Date();
      next2.setFullYear(now.getFullYear() + 2);
      setExpiryDate(next2.toISOString().split('T')[0]);
    } else if (preset.expiryPreset === '3y') {
      const next3 = new Date();
      next3.setFullYear(now.getFullYear() + 3);
      setExpiryDate(next3.toISOString().split('T')[0]);
    } else {
      setExpiryDate('');
    }

    // Set review date for internal policies or clear for external statutory records
    if (!isExt && preset.category === 'Policies & Compliance') {
      const rev = new Date();
      rev.setFullYear(now.getFullYear() + 2);
      setNextReviewDate(rev.toISOString().split('T')[0]);
    } else {
      setNextReviewDate('');
    }

    // Standard file name
    const orgCode = 'HHDI';
    const catCode = CATEGORY_CODES[preset.category] || 'DOC';
    const cleanTitleStr = preset.title.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    setFileName(`${orgCode}_${catCode}_${cleanTitleStr}_${year}_${preset.version}.pdf`);
  };

  // Quick Expiry Date setters
  const setExpiryInMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setExpiryDate(d.toISOString().split('T')[0]);
  };

  const setExpiryInYears = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    setExpiryDate(d.toISOString().split('T')[0]);
  };

  // Quick Review Date setters
  const setReviewInMonths = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setNextReviewDate(d.toISOString().split('T')[0]);
  };

  const setReviewInYears = (years: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + years);
    setNextReviewDate(d.toISOString().split('T')[0]);
  };

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please provide a document title.');
      return;
    }

    const tagsArray = tags.split(',').map(s => s.trim()).filter(Boolean);
    const donorArray = donorUses.split(',').map(s => s.trim()).filter(Boolean);
    const staffObj = staffDirectory.find(s => s.fullName === maintainedBy);

    if (uploadMode === 'new_version' && linkedExistingDocId) {
      // Find the target existing document
      const targetDoc = documents.find(d => d.id === linkedExistingDocId);
      if (!targetDoc) {
        setErrorMessage('Linked existing document was not found.');
        return;
      }

      // Create an archived version record of the current document
      const oldVersionArchive: OrgDocumentVersion = {
        version: targetDoc.version,
        uploadedAt: targetDoc.approvalDate || targetDoc.lastUpdated || new Date().toISOString().split('T')[0],
        uploadedBy: targetDoc.maintainedBy,
        fileName: targetDoc.fileName,
        fileSize: targetDoc.fileSize,
        changeNotes: targetDoc.description || 'Prior active institutional version archived upon new version release.',
        status: 'Superseded'
      };

      const existingArchives = targetDoc.previousVersions || [];

      // Update the document to the new version
      const updatedDoc: OrgDocument = {
        ...targetDoc,
        title: title.trim(),
        category,
        documentType: docType.trim() || targetDoc.documentType,
        year: year.trim() || targetDoc.year,
        version: version.trim() || 'v2.0',
        status: isCurrentApproved ? 'Current Approved' : status,
        isCurrentApproved: isCurrentApproved,
        approvalDate: approvalDate || new Date().toISOString().split('T')[0],
        expiryDate: expiryDate || undefined,
        nextReviewDate: nextReviewDate || undefined,
        maintainedBy: maintainedBy || targetDoc.maintainedBy,
        maintainedByStaffId: staffObj?.id || targetDoc.maintainedByStaffId,
        accessLevel,
        fileName: fileName.trim() || targetDoc.fileName,
        fileSize: fileSize || targetDoc.fileSize,
        fileFormat: fileFormat || targetDoc.fileFormat,
        description: description.trim() || targetDoc.description,
        tags: tagsArray.length > 0 ? tagsArray : targetDoc.tags,
        donorUses: donorArray.length > 0 ? donorArray : targetDoc.donorUses,
        previousVersions: [oldVersionArchive, ...existingArchives],
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      const effectiveText = extractedFileText || description.trim() || `${title} ${docType} ${tagsArray.join(' ')}`;
      onSaveDocument(updatedDoc, true, linkedExistingDocId, effectiveText);
      onClose();
      return;
    }

    const isExt = isExternalRecord(category, docType);
    const governanceType = isExt ? 'external' : 'internal';
    const isLiveApproved =
      status === 'Verified' ||
      status === 'Current' ||
      status === 'Approved' ||
      status === 'Current Approved';

    if (existingDocToEdit) {
      // Update existing document metadata directly
      const updatedDoc: OrgDocument = {
        ...existingDocToEdit,
        title: title.trim(),
        category,
        documentType: docType.trim() || (isExt ? 'Registration Certificate' : 'Governance Policy'),
        governanceType,
        year: year.trim() || new Date().getFullYear().toString(),
        version: version.trim() || 'v1.0',
        status,
        isCurrentApproved: isLiveApproved,
        approvalDate: !isExt ? (approvalDate || undefined) : undefined,
        issuedDate: isExt ? (approvalDate || undefined) : undefined,
        expiryDate: expiryDate || undefined,
        nextReviewDate: nextReviewDate || undefined,
        maintainedBy: maintainedBy || staffDirectory[0]?.fullName || 'Organisation Admin',
        maintainedByStaffId: staffObj?.id,
        accessLevel,
        fileName: fileName.trim() || `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        fileSize: fileSize || '1.8 MB',
        fileFormat,
        description: description.trim(),
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        donorUses: donorArray.length > 0 ? donorArray : undefined,
        textContent: effectiveText,
        rawText: effectiveText,
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      onSaveDocument(updatedDoc, false, undefined, effectiveText);
      onClose();
      return;
    }

    // Brand new document registration
    const newDocId = `doc-cust-${Date.now()}`;
    const effectiveText = extractedFileText || description.trim() || `${title} ${docType} ${tagsArray.join(' ')}`;
    const newDoc: OrgDocument = {
      id: newDocId,
      title: title.trim(),
      category,
      documentType: docType.trim() || (isExt ? 'Registration Certificate' : 'Governance Policy'),
      governanceType,
      year: year.trim() || new Date().getFullYear().toString(),
      version: version.trim() || 'v1.0',
      status,
      isCurrentApproved: isLiveApproved,
      approvalDate: !isExt ? (approvalDate || new Date().toISOString().split('T')[0]) : undefined,
      issuedDate: isExt ? (approvalDate || new Date().toISOString().split('T')[0]) : undefined,
      expiryDate: expiryDate || undefined,
      nextReviewDate: nextReviewDate || undefined,
      maintainedBy: maintainedBy || staffDirectory[0]?.fullName || 'Organisation Admin',
      maintainedByStaffId: staffObj?.id,
      accessLevel,
      fileName: fileName.trim() || `${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      fileSize: fileSize || '1.8 MB',
      fileFormat,
      description: description.trim(),
      tags: tagsArray.length > 0 ? tagsArray : undefined,
      donorUses: donorArray.length > 0 ? donorArray : undefined,
      textContent: effectiveText,
      rawText: effectiveText,
      linkedRequirementsCount: 1,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    onSaveDocument(newDoc, false, undefined, effectiveText);
    onClose();
  };

  // Render Format Icon
  const renderFileIcon = () => {
    switch (fileFormat) {
      case 'DOCX':
        return <FileText className="w-7 h-7 text-blue-600" />;
      case 'XLSX':
        return <FileSpreadsheet className="w-7 h-7 text-emerald-600" />;
      case 'ZIP':
        return <Archive className="w-7 h-7 text-amber-600" />;
      case 'IMAGE':
        return <ImageIcon className="w-7 h-7 text-purple-600" />;
      case 'PDF':
      default:
        return <FileCheck className="w-7 h-7 text-rose-600" />;
    }
  };

  // Expiry preview calculation
  const expiryDiff = expiryDate ? getDaysDifference(expiryDate) : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {existingDocToEdit
                  ? 'Edit Document Metadata'
                  : uploadMode === 'new_version'
                  ? 'Upload New Revision / Version'
                  : 'Upload & Register Institutional Document'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure file naming, type categorization, version tracking, and expiry governance
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 py-4 max-h-[75vh] overflow-y-auto pr-1 text-xs">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Presets Bar (when adding new doc) */}
          {!existingDocToEdit && (
            <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Quick Compliance Templates (1-Click Auto-Fill)
                </span>
                <span className="text-[10px] text-indigo-600">Standard Non-Profit Due Diligence</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {QUICK_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white text-slate-700 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 whitespace-nowrap transition shadow-2xs shrink-0"
                  >
                    {p.title.split('(')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 1. FILE UPLOAD DROPZONE */}
          {/* ========================================================================= */}
          <div>
            <label className="block font-bold text-slate-800 mb-1.5 uppercase tracking-wider text-[11px]">
              1. Document File Upload & Detection
            </label>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.png,.jpg,.jpeg,.txt,.csv"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-indigo-500 bg-indigo-50/80 scale-[1.01]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-indigo-600">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-sm">
                    {isDragging ? 'Drop your document here' : 'Click to select file or drag & drop here'}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Supports PDF, Word (DOCX), Excel (XLSX), ZIP archives, and scanned verification images (up to 50 MB)
                  </p>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-600">PDF</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-600">DOCX</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-600">XLSX</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-600">ZIP</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-slate-200 text-slate-600">PNG/JPG</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                    {renderFileIcon()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{selectedFile.name}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        File Attached
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 font-mono">
                      <span>{fileFormat}</span>
                      <span>•</span>
                      <span>{fileSize}</span>
                      <span>•</span>
                      <span>Ready for institutional indexing</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                  >
                    Replace File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 2. FILE NAMING & TITLE */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                2. File Naming & Institutional Title
              </span>
              <button
                type="button"
                onClick={handleStandardiseFileName}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                title="Format file name as HHDI_[Category]_[Title]_[Year]_[Version].ext"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Standardise Institutional File Name
              </button>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Document Display Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Child Protection & Safeguarding Policy"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Institutional File Name on Disk / Submission Package
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. HHDI_POL_Child_Protection_Policy_2026_v3.0.pdf"
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detected Format</label>
                <select
                  value={fileFormat}
                  onChange={e => setFileFormat(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PDF">PDF Document</option>
                  <option value="DOCX">Word Document (.docx)</option>
                  <option value="XLSX">Excel Spreadsheet (.xlsx)</option>
                  <option value="ZIP">ZIP Package / Archive</option>
                  <option value="IMAGE">Scanned Certificate / Image</option>
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 3. TYPE CATEGORIZATION */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              3. Type Categorization & Institutional Classification
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Primary Institutional Category *
                </label>
                <select
                  value={category}
                  onChange={e => {
                    const newCat = e.target.value as OrgDocumentCategory;
                    setCategory(newCat);
                    if (newCat === 'Legal & Registration') {
                      setDocType('Registration Certificate');
                      setStatus('Verified');
                    } else if (newCat === 'Financial & Audit') {
                      setDocType('Audited Financial Statements');
                      setStatus('Verified');
                    } else if (newCat === 'Donor & Project Experience') {
                      setDocType('Donor Reference Letter');
                      setStatus('Verified');
                    } else if (newCat === 'Policies & Compliance') {
                      setDocType('Child Safeguarding & PSEA Policy');
                      setStatus('Approved');
                    } else if (newCat === 'Organisational Information') {
                      setDocType('Multi-Year Strategic Plan');
                      setStatus('Approved');
                    } else if (newCat === 'Staff & Governance') {
                      setDocType('Staff CV Pack');
                      setStatus('Approved');
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Document Sub-Type / Classification *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Registration Certificate, Tax Clearance, Policy"
                  value={docType}
                  onChange={e => setDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick doc type suggestions */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400">Common types:</span>
              {COMMON_DOC_TYPES.slice(0, 8).map((t, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setDocType(t);
                    const isExt = isExternalRecord(category, t);
                    setStatus(isExt ? 'Verified' : 'Approved');
                  }}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. VERSION TRACKING & INTENT */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                {isExternalRecord(category, docType)
                  ? '4. Record Status & Issuance Validation'
                  : '4. Version Tracking & Lifecycle Governance'}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {version} • {status}
              </span>
            </div>

            {/* Explanatory banner for document origin */}
            <div className={`p-2.5 rounded-lg border text-[11px] flex items-start gap-2 ${
              isExternalRecord(category, docType)
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
            }`}>
              <Shield className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                {isExternalRecord(category, docType) ? (
                  <span>
                    <strong>Externally Issued Record:</strong> This official record (e.g. CAC certificate, SCUML, Tax Clearance, Audited Accounts) is issued by an external statutory authority or auditor. It does not require internal approval.
                  </span>
                ) : (
                  <span>
                    <strong>Internally Governed Document:</strong> This policy, manual, or strategic plan is authored and adopted internally by organisation leadership or the Board of Trustees.
                  </span>
                )}
              </div>
            </div>

            {/* Version Mode Selection (if not editing an existing single doc) */}
            {!existingDocToEdit && (
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUploadMode('new_doc')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    uploadMode === 'new_doc'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  New Document Entry
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('new_version')}
                  className={`py-2 px-3 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                    uploadMode === 'new_version'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  New Revision of Existing Document
                </button>
              </div>
            )}

            {/* If uploading as new version of existing document */}
            {uploadMode === 'new_version' && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
                <label className="block font-bold text-indigo-900 text-xs">
                  Select Existing Library Document to Revise & Supersede:
                </label>
                <select
                  value={linkedExistingDocId}
                  onChange={e => {
                    setLinkedExistingDocId(e.target.value);
                    const sel = documents.find(d => d.id === e.target.value);
                    if (sel) {
                      setTitle(sel.title);
                      setCategory(sel.category);
                      setDocType(sel.documentType);
                      // Suggest next version
                      const match = sel.version.match(/\d+(\.\d+)?/);
                      if (match) {
                        setVersion(`v${(parseFloat(match[0]) + 1.0).toFixed(1)}`);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select an existing document --</option>
                  {documents.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.version} - {d.category})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-indigo-700">
                  ⚡ When published, the previous version will be moved to the archive audit trail with status &quot;Superseded&quot;, and this file will become the active record.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Version / Revision Identifier *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. v1.0, v2.1, v2026.1"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Applicable Year / Period
                </label>
                <input
                  type="text"
                  placeholder="2026 or 2024-2028"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isExternalRecord(category, docType) ? 'Official Record Status *' : 'Governance Approval Status *'}
                </label>
                <select
                  value={status}
                  onChange={e => {
                    const newStat = e.target.value as OrgDocumentStatus;
                    setStatus(newStat);
                    setIsCurrentApproved(
                      newStat === 'Verified' ||
                      newStat === 'Current' ||
                      newStat === 'Approved' ||
                      newStat === 'Current Approved'
                    );
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  {isExternalRecord(category, docType) ? (
                    <>
                      <option value="Verified">Verified (Official Valid Record)</option>
                      <option value="Current">Current (Active Record)</option>
                      <option value="Expiring Soon">Expiring Soon (Renewal Required)</option>
                      <option value="Expired">Expired (Renewal Overdue)</option>
                      <option value="Needs Verification">Needs Verification</option>
                    </>
                  ) : (
                    <>
                      <option value="Approved">Approved (Adopted by Board / Management)</option>
                      <option value="Under Review">Under Review (Pending Approval)</option>
                      <option value="Draft">Draft (Working Document)</option>
                      <option value="Superseded">Superseded / Archived</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Version Revision Notes */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Version Changelog / Revision Audit Notes
              </label>
              <textarea
                rows={2}
                placeholder="Key revisions, added donor compliance clauses, updated reporting focal points..."
                value={versionNotes}
                onChange={e => setVersionNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-indigo-50/70 p-2.5 rounded-lg border border-indigo-100 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrentApproved}
                onChange={e => {
                  setIsCurrentApproved(e.target.checked);
                  if (e.target.checked) {
                    setStatus(isExternalRecord(category, docType) ? 'Verified' : 'Approved');
                  }
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>
                {isExternalRecord(category, docType)
                  ? 'Designate as Active Record for institutional grant applications & eligibility checks'
                  : 'Designate as the active Approved Version for proposal submissions'}
              </span>
            </label>
          </div>

          {/* ========================================================================= */}
          {/* 5. EXPIRY DATE & REVIEW SETTING */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                5. Issuance, Expiry & Review Cadence
              </span>
              {expiryDate && expiryDiff !== null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  expiryDiff < 0
                    ? 'bg-rose-100 text-rose-800'
                    : expiryDiff <= 60
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {expiryDiff < 0 ? `Expired ${Math.abs(expiryDiff)}d ago` : `Expires in ${expiryDiff} days`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isExternalRecord(category, docType) ? 'Date of Issuance / Registration *' : 'Approval Date *'}
                </label>
                <input
                  type="date"
                  required
                  value={approvalDate}
                  onChange={e => setApprovalDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Expiry Date {isExternalRecord(category, docType) && !expiryDate && <span className="text-slate-400 font-normal text-[10px]">(Only if stated on document)</span>}
                  </label>
                  {expiryDate && (
                    <button
                      type="button"
                      onClick={() => setExpiryDate('')}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isExternalRecord(category, docType) ? 'Statutory Renewal / Review Date' : 'Next Scheduled Review Date'}
                </label>
                <input
                  type="date"
                  value={nextReviewDate}
                  onChange={e => setNextReviewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Expiry Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-medium">Quick Expiry Presets:</span>
              <button
                type="button"
                onClick={() => setExpiryInMonths(6)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition"
              >
                +6 Months
              </button>
              <button
                type="button"
                onClick={() => setExpiryInYears(1)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition"
              >
                +1 Year
              </button>
              <button
                type="button"
                onClick={() => setExpiryInYears(2)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition"
              >
                +2 Years
              </button>
              <button
                type="button"
                onClick={() => setExpiryInYears(3)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition"
              >
                +3 Years
              </button>
              <button
                type="button"
                onClick={() => setExpiryDate('')}
                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-semibold transition"
              >
                Permanent (No Expiry)
              </button>
            </div>

            {/* Review Quick Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-400 font-medium">Review Cadence:</span>
              <button
                type="button"
                onClick={() => setReviewInMonths(6)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition"
              >
                Review in 6 Months
              </button>
              <button
                type="button"
                onClick={() => setReviewInYears(1)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition"
              >
                Annual Review (+1 Year)
              </button>
              <button
                type="button"
                onClick={() => setReviewInYears(2)}
                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold transition"
              >
                Biennial Review (+2 Years)
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 6. GOVERNANCE, ACCESS & METADATA */}
          {/* ========================================================================= */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
            <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-2 border-b border-slate-100">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              6. Document Custodian & Access Governance
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Document Custodian / Maintained By *
                </label>
                <select
                  value={maintainedBy}
                  onChange={e => setMaintainedBy(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  {staffDirectory.map(staff => (
                    <option key={staff.id} value={staff.fullName}>
                      {staff.fullName} ({staff.jobTitle} - {staff.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Access Control</label>
                <select
                  value={accessLevel}
                  onChange={e => setAccessLevel(e.target.value as OrgDocumentAccessLevel)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="General">General (Accessible to all proposal teams)</option>
                  <option value="Restricted">Restricted (Assigned team leads only)</option>
                  <option value="Management Only">Management Only (Executive & Board)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Institutional Scope & Description
              </label>
              <textarea
                rows={2}
                placeholder="Institutional description, governing scope, or purpose..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tags & Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Safeguarding, PSEA, Mandatory, Board Approved"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Approved Donor Uses (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. USAID, UN Women, EU-ACT, Global Fund"
                  value={donorUses}
                  onChange={e => setDonorUses(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Includes version tracking & automated expiry notification alerts</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim()}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition shadow-sm flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {existingDocToEdit
                    ? 'Save Changes'
                    : uploadMode === 'new_version'
                    ? 'Publish New Version'
                    : 'Upload & Register Document'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
