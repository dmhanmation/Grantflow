import React, { useState, useRef } from 'react';
import {
  OrgProfile,
  OrgDepartment,
  StaffMember,
  UserRole,
  OrgDocument,
  DocumentAnalysisResult,
  DocumentProvenancedField
} from '../types';
import { sortStaffByHierarchy } from '../utils/staffHierarchy';
import { StructuredMultiSelect } from './StructuredMultiSelect';
import { StructuredSingleSelect } from './StructuredSingleSelect';
import { GeographicFootprintSelect } from './GeographicFootprintSelect';
import { FieldProvenanceBadge } from './FieldProvenanceBadge';
import {
  STANDARD_THEMATIC_SECTORS,
  STANDARD_COUNTRIES,
  STANDARD_ORG_CLASSIFICATIONS,
  STANDARD_BENEFICIARY_GROUPS,
  STANDARD_DONOR_TYPES,
  STANDARD_FUNDING_INSTRUMENTS,
  STANDARD_DEPARTMENT_OPTIONS
} from '../data/taxonomyOptions';
import {
  SAMPLE_NGO_DOCUMENTS,
  analyzeDocumentsRuleEngine,
  UploadedFileDescriptor
} from '../utils/documentExtractor';
import {
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  ShieldCheck,
  Award,
  Layers,
  Sparkles,
  UserCheck,
  Mail,
  Briefcase,
  HelpCircle,
  Check,
  AlertCircle,
  X,
  Upload,
  FileText,
  Clock,
  AlertTriangle,
  FolderLock,
  RefreshCw,
  FileCheck,
  FileSpreadsheet,
  Target,
  Sliders,
  CheckSquare
} from 'lucide-react';

interface OnboardingWizardProps {
  initialProfile: OrgProfile;
  adminUser: { fullName: string; email: string };
  onComplete: (completedProfile: OrgProfile) => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  initialProfile,
  adminUser,
  onComplete
}) => {
  // Step 1: Upload Documents
  // Step 2: Agent Document Ingestion & Extraction Insights
  // Step 3: Review Auto-Generated Profile & Missing Gaps
  // Step 4: Document Intelligence & Expiry Audit
  // Step 5: Department Setup
  // Step 6: Staff & Governance
  // Step 7: Funding Preferences & Complete
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileDescriptor[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null);

  // Extracted & Provenanced Profile Fields
  const [fieldProvenance, setFieldProvenance] = useState<Record<string, DocumentProvenancedField<any>>>({});
  const [name, setName] = useState(initialProfile.name || '');
  const [country, setCountry] = useState(initialProfile.country || '');
  const [registrationStatus, setRegistrationStatus] = useState(initialProfile.registrationStatus || '');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [orgType, setOrgType] = useState(initialProfile.orgType || '');
  const [yearEstablished, setYearEstablished] = useState<number | ''>(initialProfile.yearEstablished || '');
  const [thematicAreas, setThematicAreas] = useState<string[]>(
    initialProfile.thematicAreas?.length > 0 ? initialProfile.thematicAreas : []
  );
  const [geographicAreas, setGeographicAreas] = useState<string[]>(
    initialProfile.geographicAreas?.length > 0 ? initialProfile.geographicAreas : []
  );
  const [targetBeneficiaries, setTargetBeneficiaries] = useState<string[]>(
    initialProfile.fundingPreferences?.beneficiaryGroups?.length ? initialProfile.fundingPreferences.beneficiaryGroups : []
  );
  const [description, setDescription] = useState(initialProfile.description || '');
  const [contactEmail, setContactEmail] = useState(initialProfile.contactEmail || adminUser.email);
  const [previousDonors, setPreviousDonors] = useState<string[]>(initialProfile.previousDonors || []);

  // Policy Checklist States
  const [safeguardingPolicy, setSafeguardingPolicy] = useState(false);
  const [genderPolicy, setGenderPolicy] = useState(false);
  const [antiFraudPolicy, setAntiFraudPolicy] = useState(false);
  const [auditedAccountsAvailable, setAuditedAccountsAvailable] = useState(false);
  const [auditedAccountsYears, setAuditedAccountsYears] = useState(3);

  // Step 5: Departments
  const [departments, setDepartments] = useState<OrgDepartment[]>(
    Array.isArray(initialProfile.departments) ? initialProfile.departments : []
  );
  const [deptSelection, setDeptSelection] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');

  // Step 6: Staff & Governance
  const initialAdminStaff: StaffMember = {
    id: `staff-${Date.now()}-admin`,
    fullName: adminUser.fullName,
    email: adminUser.email,
    jobTitle: 'Executive Director / Admin',
    department: '',
    departmentId: undefined,
    isDepartmentHead: false,
    functionalRole: 'Admin',
    role: 'Admin',
    roles: ['Admin', 'FinalApprover'],
    status: 'Active',
    joinedDate: new Date().toISOString().split('T')[0]
  };

  const [staffDirectory, setStaffDirectory] = useState<StaffMember[]>(
    initialProfile.staffDirectory?.length ? initialProfile.staffDirectory : [initialAdminStaff]
  );
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffTitle, setNewStaffTitle] = useState('');
  const [newStaffDeptId, setNewStaffDeptId] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('Officer');
  const [finalApproverId, setFinalApproverId] = useState<string>(staffDirectory[0]?.id || '');
  const [smallNgoMode, setSmallNgoMode] = useState<boolean>(true);
  const [requireIntermediateReviewer, setRequireIntermediateReviewer] = useState<boolean>(true);

  // Step 7: Funding Preferences
  const [prefDonorTypes, setPrefDonorTypes] = useState<string[]>(STANDARD_DONOR_TYPES.slice(0, 3));
  const [prefFundingTypes, setPrefFundingTypes] = useState<string[]>([
    'Standard Project Grant',
    'Core / Unrestricted Operating Support',
    'Challenge Fund / Innovation Grant'
  ]);
  const [prefMinFunding, setPrefMinFunding] = useState('25000');
  const [prefMaxFunding, setPrefMaxFunding] = useState('500000');

  // Handle Drag & Drop / File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    addFilesToQueue(Array.from(files));
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems: UploadedFileDescriptor[] = [];
    let processed = 0;

    Array.from(files).forEach((file, idx) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'PDF';
      const fileFormat: UploadedFileDescriptor['fileFormat'] =
        ext === 'DOCX' || ext === 'DOC' ? 'DOCX' : ext === 'PNG' || ext === 'JPG' || ext === 'JPEG' ? 'IMAGE' : ext === 'TXT' ? 'TEXT' : 'PDF';

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const base64Data = dataUrl ? dataUrl.split(',')[1] : undefined;
        newItems.push({
          id: `file-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
          fileName: file.name,
          name: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fileFormat,
          mimeType: file.type || 'application/pdf',
          base64Data,
          textContent: file.name
        });
        processed++;
        if (processed === files.length) {
          setUploadedFiles(prev => [...prev, ...newItems]);
        }
      };
      reader.onerror = () => {
        newItems.push({
          id: `file-${Date.now()}-${idx}`,
          fileName: file.name,
          name: file.name,
          fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          fileFormat,
          textContent: `Uploaded document ${file.name}`
        });
        processed++;
        if (processed === files.length) {
          setUploadedFiles(prev => [...prev, ...newItems]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleLoadSampleDocs = () => {
    setUploadedFiles(SAMPLE_NGO_DOCUMENTS);
    setErrorMsg(null);
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Run Document Analysis (Gemini API with Rule Engine Fallback)
  const handleAnalyzeDocuments = async () => {
    if (uploadedFiles.length === 0) {
      setErrorMsg('Please upload at least one document or load the sample NGO document bundle.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysisProgress('Classifying institutional records & verifying file authenticity...');

    try {
      setTimeout(() => {
        setAnalysisProgress('Extracting official registration details, mandate & governance facts...');
      }, 1000);

      setTimeout(() => {
        setAnalysisProgress('Auditing board-approved policies & computing expiration dates...');
      }, 2200);

      // Use the proven extract-org-profile endpoint (same one used inside the app)
      // Try each file until one yields useful data
      let extracted: any = null;
      for (const file of uploadedFiles) {
        const payload: any = { documentName: (file as any).name || file.fileName, mimeType: (file as any).mimeType };
        if ((file as any).base64Data) {
          payload.base64Data = (file as any).base64Data;
        } else if (file.textContent && file.textContent.length > 50) {
          payload.text = file.textContent;
        } else {
          continue;
        }
        const r = await fetch('/api/extract-org-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (r.ok) {
          const json = await r.json();
          const d = json.data || json;
          if (d.organisationName && d.organisationName !== 'Not found in document') {
            extracted = d;
            break;
          }
        }
      }

      let data: DocumentAnalysisResult;
      if (extracted) {
        const NOT_FOUND = 'Not found in document';
        const conf = (val: any, src: string) => val && val !== NOT_FOUND
          ? { value: val, sourceDocument: src, status: 'confirmed' as const, confidence: 'high' as const }
          : null;
        const docName = uploadedFiles[0]?.fileName || 'Uploaded Document';
        const year = parseInt(String(extracted.yearOfRegistration || '').replace(/[^0-9]/g, '').slice(0, 4), 10);
        data = {
          extractedProfile: {
            name: conf(extracted.organisationName, docName) as any,
            country: conf(extracted.country, docName) as any,
            registrationNumber: conf(extracted.registrationNumberOrStatus, docName) as any,
            orgType: conf(extracted.organisationType, docName) as any,
            yearEstablished: year > 1900 ? { value: year, sourceDocument: docName, status: 'confirmed' as const, confidence: 'high' as const } : undefined,
            thematicAreas: extracted.thematicAreas?.length ? { value: extracted.thematicAreas, sourceDocument: docName, status: 'confirmed' as const, confidence: 'high' as const } : undefined,
          },
          classifiedDocuments: uploadedFiles.map(f => ({ id: f.id || '', fileName: f.fileName, fileFormat: f.fileFormat || 'PDF', category: 'Registration Document', tags: [], status: 'verified' as const })),
          missingEssentialDocuments: [],
          conflicts: [],
          summary: {
            totalDocumentsAnalyzed: uploadedFiles.length,
            fieldsConfirmedCount: Object.values(extracted).filter((v: any) => v && v !== NOT_FOUND).length,
            fieldsDerivedCount: 0,
            fieldsRequiringVerificationCount: 0,
            expiredDocumentsCount: 0,
            expiringSoonCount: 0,
            missingMandatoryDocsCount: 0
          }
        };
      } else {
        data = analyzeDocumentsRuleEngine(uploadedFiles, adminUser.email);
      }

      setAnalysisResult(data);
      applyAnalysisToState(data);
      setIsAnalyzing(false);
      setStep(2); // Advance to Ingestion Insights & Audit
    } catch (err: any) {
      console.warn('AI extraction fallback:', err);
      const fallback = analyzeDocumentsRuleEngine(uploadedFiles, adminUser.email);
      setAnalysisResult(fallback);
      applyAnalysisToState(fallback);
      setIsAnalyzing(false);
      setStep(2);
    }
  };

  const applyAnalysisToState = (data: DocumentAnalysisResult) => {
    const ext = data.extractedProfile;
    const prov: Record<string, DocumentProvenancedField<any>> = {};

    if (ext.name) {
      setName(ext.name.value);
      prov.name = ext.name;
    }
    if (ext.country) {
      setCountry(ext.country.value);
      prov.country = ext.country;
    }
    if (ext.registrationNumber) {
      setRegistrationNumber(ext.registrationNumber.value);
      setRegistrationStatus(`Registered (${ext.registrationNumber.value})`);
      prov.registrationNumber = ext.registrationNumber;
      prov.registrationStatus = {
        value: `Registered (${ext.registrationNumber.value})`,
        sourceDocument: ext.registrationNumber.sourceDocument,
        status: ext.registrationNumber.status,
        confidence: ext.registrationNumber.confidence
      };
    }
    if (ext.orgType) {
      setOrgType(ext.orgType.value);
      prov.orgType = ext.orgType;
    }
    if (ext.yearEstablished) {
      setYearEstablished(ext.yearEstablished.value);
      prov.yearEstablished = ext.yearEstablished;
    }
    if (ext.thematicAreas && ext.thematicAreas.value.length > 0) {
      setThematicAreas(ext.thematicAreas.value);
      prov.thematicAreas = ext.thematicAreas;
    }
    if (ext.geographicAreas && ext.geographicAreas.value.length > 0) {
      setGeographicAreas(ext.geographicAreas.value);
      prov.geographicAreas = ext.geographicAreas;
    }
    if (ext.targetBeneficiaries && ext.targetBeneficiaries.value.length > 0) {
      setTargetBeneficiaries(ext.targetBeneficiaries.value);
      prov.targetBeneficiaries = ext.targetBeneficiaries;
    }
    if (ext.description) {
      setDescription(ext.description.value);
      prov.description = ext.description;
    }
    if (ext.previousDonors && ext.previousDonors.value.length > 0) {
      setPreviousDonors(ext.previousDonors.value);
      prov.previousDonors = ext.previousDonors;
    }
    if (ext.safeguardingPolicy) {
      setSafeguardingPolicy(ext.safeguardingPolicy.value);
      prov.safeguardingPolicy = ext.safeguardingPolicy;
    }
    if (ext.genderPolicy) {
      setGenderPolicy(ext.genderPolicy.value);
      prov.genderPolicy = ext.genderPolicy;
    }
    if (ext.antiFraudPolicy) {
      setAntiFraudPolicy(ext.antiFraudPolicy.value);
      prov.antiFraudPolicy = ext.antiFraudPolicy;
    }
    if (ext.auditedAccountsAvailable) {
      setAuditedAccountsAvailable(ext.auditedAccountsAvailable.value);
      prov.auditedAccountsAvailable = ext.auditedAccountsAvailable;
    }
    if (ext.auditedAccountsYears) {
      setAuditedAccountsYears(ext.auditedAccountsYears.value);
      prov.auditedAccountsYears = ext.auditedAccountsYears;
    }

    // Auto-populate detected departments if available
    if (ext.departments && ext.departments.value.length > 0 && departments.length === 0) {
      const extractedDepts: OrgDepartment[] = ext.departments.value.map((deptName, idx) => {
        const matchingStd = STANDARD_DEPARTMENT_OPTIONS.find(
          d => d.name.toLowerCase() === deptName.toLowerCase() || deptName.toLowerCase().includes(d.name.toLowerCase())
        );
        return {
          id: `dept-${Date.now()}-${idx}`,
          name: deptName,
          code: matchingStd?.code || deptName.substring(0, 4).toUpperCase(),
          headStaffId: '',
          headStaffName: '',
          mandate: matchingStd?.mandate || 'Operational mandate extracted from governance bylaws.',
          color: matchingStd?.color || 'indigo'
        };
      });
      setDepartments(extractedDepts);
    }

    setFieldProvenance(prov);
  };

  // Department Handlers
  const handleAddDepartment = () => {
    if (!deptSelection) {
      setErrorMsg('Select a department from the list first.');
      return;
    }
    const isCustom = deptSelection === 'OTHER';
    const standard = STANDARD_DEPARTMENT_OPTIONS.find(d => d.name === deptSelection);
    const dName = isCustom ? newDeptName.trim() : standard?.name || '';
    const dCode = isCustom
      ? (newDeptCode.trim() || newDeptName.trim().substring(0, 4).toUpperCase())
      : standard?.code || '';

    if (!dName) {
      setErrorMsg('Enter a name for the custom department.');
      return;
    }
    if (departments.some(d => d.name.toLowerCase() === dName.toLowerCase())) {
      setErrorMsg(`${dName} has already been added.`);
      return;
    }

    setErrorMsg(null);
    setDepartments([
      ...departments,
      {
        id: `dept-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        name: dName,
        code: dCode,
        headStaffId: '',
        headStaffName: '',
        mandate: isCustom ? '' : standard?.mandate,
        color: isCustom ? 'indigo' : standard?.color || 'indigo'
      }
    ]);
    setDeptSelection('');
    setNewDeptName('');
    setNewDeptCode('');
  };

  const handleRemoveDepartment = (id: string) => {
    setDepartments(departments.filter(d => d.id !== id));
  };

  // Staff Handlers
  const handleAddStaffMember = () => {
    if (!newStaffName.trim() || !newStaffEmail.trim()) {
      setErrorMsg('Staff Name and Email are required.');
      return;
    }
    const targetDept = departments.find(d => d.id === newStaffDeptId);
    if (!targetDept) {
      setErrorMsg('Select a department for this staff member.');
      return;
    }
    setErrorMsg(null);
    const newStaff: StaffMember = {
      id: `staff-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      fullName: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      jobTitle: newStaffTitle.trim() || 'Officer',
      department: targetDept.name,
      departmentId: newStaffDeptId,
      isDepartmentHead: newStaffRole === 'DepartmentHead',
      functionalRole: newStaffRole === 'Admin' ? 'Admin' : newStaffRole === 'DepartmentHead' ? 'DepartmentHead' : newStaffRole === 'ProposalLead' ? 'ProposalLead' : newStaffRole === 'FinalApprover' ? 'FinalApprover' : 'Contributor',
      role: newStaffRole,
      roles: [newStaffRole],
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0]
    };

    setStaffDirectory([...staffDirectory, newStaff]);
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffTitle('');
  };

  const handleRemoveStaffMember = (id: string) => {
    if (staffDirectory.length <= 1) {
      setErrorMsg('At least one staff member (the Administrator) is required.');
      return;
    }
    setStaffDirectory(staffDirectory.filter(s => s.id !== id));
  };

  const handleUpdateStaff = (id: string, updates: Partial<StaffMember>) => {
    setStaffDirectory(staffDirectory.map(s => (s.id === id ? { ...s, ...updates } : s)));
  };

  // Final Submission
  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const selectedApprover = staffDirectory.find(s => s.id === finalApproverId) || staffDirectory[0];

      // Update Department Heads in department list
      const enrichedDepartments = departments.map(d => {
        const head = staffDirectory.find(s => s.departmentId === d.id && (s.isDepartmentHead || s.role === 'DepartmentHead'));
        return {
          ...d,
          headStaffId: head?.id || '',
          headStaffName: head?.fullName || ''
        };
      });

      // Construct rich document library records from analysis
      const libraryDocs: OrgDocument[] = (analysisResult?.classifiedDocuments || []).map((doc, idx) => ({
        id: `doc-lib-${Date.now()}-${idx}`,
        title: doc.title,
        documentType: doc.documentType,
        category: doc.category,
        year: yearEstablished ? String(yearEstablished) : undefined,
        version: 'v1.0',
        isCurrentApproved: !doc.isExpired,
        status: doc.status,
        approvalDate: doc.issuedDate,
        expiryDate: doc.expiryDate,
        nextReviewDate: doc.nextReviewDate,
        accessLevel: 'General',
        fileName: doc.fileName,
        fileSize: doc.fileSize || '1.2 MB',
        fileFormat: doc.fileFormat,
        maintainedBy: adminUser.fullName,
        description: doc.summary || 'Verified institutional document registered during onboarding.',
        tags: [doc.documentType, doc.category, 'Onboarding Verified'],
        donorUses: ['All Institutional Donors'],
        lastUpdated: new Date().toISOString()
      }));

      const completed: OrgProfile = {
        ...initialProfile,
        name: name.trim() || 'My Organisation',
        country: country || 'Nigeria',
        registrationStatus: registrationStatus || 'Registered',
        orgType: orgType || 'National NGO (NNGO)',
        yearEstablished: typeof yearEstablished === 'number' ? yearEstablished : new Date().getFullYear(),
        thematicAreas: thematicAreas.length > 0 ? thematicAreas : ['Health & Public Health', 'Food Security & Agriculture'],
        geographicAreas: geographicAreas.length > 0 ? geographicAreas : [country || 'Nigeria'],
        departments: enrichedDepartments,
        staffDirectory,
        documentLibrary: libraryDocs,
        documentProvenance: fieldProvenance,
        documentComplianceAudit: {
          missingDocuments: analysisResult?.missingEssentialDocuments || [],
          expiredCount: analysisResult?.summary.expiredDocumentsCount || 0,
          expiringSoonCount: analysisResult?.summary.expiringSoonCount || 0
        },
        defaultFinalApproverId: selectedApprover.id,
        defaultFinalApproverName: selectedApprover.fullName,
        smallNgoMode,
        requireIntermediateReviewer,
        contactEmail: contactEmail.trim().toLowerCase(),
        previousDonors,
        safeguardingPolicy,
        genderPolicy,
        antiFraudPolicy,
        auditedAccountsAvailable,
        auditedAccountsYears,
        description: description.trim(),
        fundingPreferences: {
          thematicAreas,
          geographicEligibility: geographicAreas.length > 0 ? geographicAreas : [country || 'Nigeria'],
          beneficiaryGroups: targetBeneficiaries,
          orgType,
          preferredFundingMin: prefMinFunding,
          preferredFundingMax: prefMaxFunding,
          minUsefulGrantSize: '25000',
          preferredProjectDuration: '12 - 24 months',
          preferredDonorTypes: prefDonorTypes,
          fundingTypes: prefFundingTypes,
          keywords: thematicAreas.map(t => t.toLowerCase()),
          excludedSectors: [],
          excludedCountries: [],
          acceptsConsortium: true
        },
        onboardingComplete: true,
        isDemo: false,
        updatedAt: new Date().toISOString()
      };

      onComplete(completed);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to complete setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const STAGES = [
    { num: 1, label: 'Upload Documents' },
    { num: 2, label: 'AI Extraction' },
    { num: 3, label: 'Review Profile' },
    { num: 4, label: 'Compliance Audit' },
    { num: 5, label: 'Departments' },
    { num: 6, label: 'Staff' },
    { num: 7, label: 'Preferences' }
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center py-10 px-4 sm:px-6">
      {/* Brand Header */}
      <div className="text-center mb-8 space-y-2 max-w-2xl">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-xl mb-2">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Welcome to GrantFlow
        </h1>
        <p className="text-sm text-slate-300">
          Document-first institutional onboarding. Upload your governance and registration documents, and GrantFlow will auto-populate your profile and audit compliance readiness.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-4xl overflow-hidden flex flex-col">
        {/* Progress Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-1 mb-2 overflow-x-auto pb-1">
            {STAGES.map((s, idx) => {
              const isDone = s.num < step;
              const isCurrent = s.num === step;
              return (
                <React.Fragment key={s.label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (s.num < step) {
                        setErrorMsg(null);
                        setStep(s.num);
                      }
                    }}
                    disabled={s.num > step}
                    className={`flex items-center gap-1 text-[11px] font-bold whitespace-nowrap transition ${
                      isCurrent ? 'text-indigo-600' : isDone ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400'
                    } ${s.num < step ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      isCurrent ? 'bg-indigo-600 text-white' : isDone ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {isDone ? <Check className="w-3 h-3" /> : s.num}
                    </span>
                    <span className="hidden md:inline">{s.label}</span>
                  </button>
                  {idx < STAGES.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />}
                </React.Fragment>
              );
            })}
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 7) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 sm:p-8 flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: UPLOAD & REGISTER INSTITUTIONAL DOCUMENTS */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Step 1 — Document Ingestion
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    Upload & Register Institutional Documents
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload Certificates, Constitutions, Audited Financials, and Policies. GrantFlow will extract your profile data automatically.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleLoadSampleDocs}
                  className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Load Sample NGO Compliance Bundle
                </button>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-2xl p-8 text-center cursor-pointer transition space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to browse or drag & drop institutional files here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports PDF, DOCX, TXT, and scanned image files (Certificates, Bylaws, Audits, Policies, Strategic Plans)
                  </p>
                </div>
              </div>

              {/* Staged Uploads List */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Staged Documents ({uploadedFiles.length} Ready for Analysis)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles([])}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {uploadedFiles.map(file => (
                      <div key={file.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 truncate max-w-md">{file.fileName}</p>
                            <p className="text-[10px] text-slate-500">{file.fileFormat} • {file.fileSize || '1.0 MB'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
                >
                  Skip and enter profile manually →
                </button>

                <button
                  type="button"
                  disabled={uploadedFiles.length === 0 || isAnalyzing}
                  onClick={handleAnalyzeDocuments}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Analyzing Documents...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze Documents with AI
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: AGENT EXTRACTION PROGRESS & SUMMARY */}
          {/* ========================================================================= */}
          {step === 2 && analysisResult && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="text-center space-y-2 py-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Document Ingestion & AI Analysis Complete
                </h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto">
                  GrantFlow extracted verified organisational profile metadata from <strong>{analysisResult.summary.totalDocumentsAnalyzed} documents</strong> with full source evidence tracking.
                </p>
              </div>

              {/* Extraction Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-2xl font-black text-emerald-700">{analysisResult.summary.fieldsConfirmedCount}</span>
                  <p className="text-[11px] font-bold text-emerald-900 mt-0.5">Facts Confirmed</p>
                  <span className="text-[10px] text-emerald-700">Direct source evidence</span>
                </div>
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
                  <span className="text-2xl font-black text-blue-700">{analysisResult.summary.fieldsDerivedCount}</span>
                  <p className="text-[11px] font-bold text-blue-900 mt-0.5">Facts Derived</p>
                  <span className="text-[10px] text-blue-700">Synthesized context</span>
                </div>
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-center">
                  <span className="text-2xl font-black text-indigo-700">{analysisResult.classifiedDocuments.length}</span>
                  <p className="text-[11px] font-bold text-indigo-900 mt-0.5">Files Classified</p>
                  <span className="text-[10px] text-indigo-700">Added to Library</span>
                </div>
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="text-2xl font-black text-amber-700">{analysisResult.missingEssentialDocuments.length}</span>
                  <p className="text-[11px] font-bold text-amber-900 mt-0.5">Missing Gaps</p>
                  <span className="text-[10px] text-amber-700">Checklist flagged</span>
                </div>
              </div>

              {/* Next Action */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Upload More Files
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  Review Auto-Generated Profile
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: REVIEW AUTO-GENERATED PROFILE & FILL MISSING GAPS */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Step 3 — Profile Verification
                  </span>
                  <span className="text-xs text-slate-500">
                    Every auto-populated field displays its supporting document evidence
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Review Organisation Profile & Missing Gaps
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm or complete your institutional profile facts below. Human-entered values always override AI inferences.
                </p>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Official Organisation Name *
                    </label>
                    <FieldProvenanceBadge provenance={fieldProvenance.name} />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      setFieldProvenance(prev => ({
                        ...prev,
                        name: { value: e.target.value, status: 'Confirmed from Document', sourceDocument: 'Human Verified' }
                      }));
                    }}
                    placeholder="e.g. Action Health and Development Initiative"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                    required
                  />
                </div>

                {/* Country & Registration Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Country of Primary Operation *
                      </label>
                      <FieldProvenanceBadge provenance={fieldProvenance.country} />
                    </div>
                    <StructuredSingleSelect
                      options={STANDARD_COUNTRIES}
                      selected={country}
                      onChange={val => {
                        setCountry(val);
                        setFieldProvenance(prev => ({
                          ...prev,
                          country: { value: val, status: 'Confirmed from Document', sourceDocument: 'Human Verified' }
                        }));
                      }}
                      placeholder="Select primary country..."
                      allowCustom={true}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Registration Status & Number
                      </label>
                      <FieldProvenanceBadge provenance={fieldProvenance.registrationNumber || fieldProvenance.registrationStatus} />
                    </div>
                    <input
                      type="text"
                      value={registrationStatus}
                      onChange={e => setRegistrationStatus(e.target.value)}
                      placeholder="e.g. Registered (CAC/IT/NO 48291)"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Classification & Year Established */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Organisation Classification *
                      </label>
                      <FieldProvenanceBadge provenance={fieldProvenance.orgType} />
                    </div>
                    <StructuredSingleSelect
                      options={STANDARD_ORG_CLASSIFICATIONS}
                      selected={orgType}
                      onChange={val => {
                        setOrgType(val);
                        setFieldProvenance(prev => ({
                          ...prev,
                          orgType: { value: val, status: 'Confirmed from Document', sourceDocument: 'Human Verified' }
                        }));
                      }}
                      placeholder="Select legal classification..."
                      allowCustom={true}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Year Established / Registered
                      </label>
                      <FieldProvenanceBadge provenance={fieldProvenance.yearEstablished} />
                    </div>
                    <input
                      type="number"
                      value={yearEstablished}
                      onChange={e => setYearEstablished(e.target.value ? parseInt(e.target.value, 10) : '')}
                      placeholder="e.g. 2018"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Core Thematic Sectors */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Core Thematic Sectors *
                    </label>
                    <FieldProvenanceBadge provenance={fieldProvenance.thematicAreas} />
                  </div>
                  <StructuredMultiSelect
                    options={STANDARD_THEMATIC_SECTORS}
                    selected={thematicAreas}
                    onChange={setThematicAreas}
                    badgeColor="indigo"
                    placeholder="Select or verify thematic sectors..."
                    allowCustom={true}
                    customPlaceholder="Add custom sector..."
                  />
                </div>

                {/* Geographic Footprint */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Geographic Footprint & Field Locations
                    </label>
                    <FieldProvenanceBadge provenance={fieldProvenance.geographicAreas} />
                  </div>
                  <GeographicFootprintSelect
                    selected={geographicAreas}
                    onChange={setGeographicAreas}
                    primaryCountry={country}
                  />
                </div>

                {/* Target Beneficiaries */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Target Beneficiary Populations
                    </label>
                    <FieldProvenanceBadge provenance={fieldProvenance.targetBeneficiaries} />
                  </div>
                  <StructuredMultiSelect
                    options={STANDARD_BENEFICIARY_GROUPS}
                    selected={targetBeneficiaries}
                    onChange={setTargetBeneficiaries}
                    badgeColor="purple"
                    placeholder="Select or verify beneficiary groups..."
                    allowCustom={true}
                    customPlaceholder="Add custom beneficiary group..."
                  />
                </div>

                {/* Institutional Narrative / Mandate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Institutional Mandate & Mission Summary
                    </label>
                    <FieldProvenanceBadge provenance={fieldProvenance.description} />
                  </div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe your organisation's mandate, mission, and core expertise..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Official Contact Email *
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="e.g. info@organisation.org"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                    required
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(analysisResult ? 2 : 1)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="button"
                  disabled={!name.trim() || !country.trim()}
                  onClick={() => setStep(4)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  Continue to Compliance Audit
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: DOCUMENT INTELLIGENCE & COMPLIANCE AUDIT */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Step 4 — Document Intelligence
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Classified Documents & Expiry Risk Audit
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  GrantFlow classified your institutional records, detected renewal dates, and checked your documentation against major donor compliance checklists.
                </p>
              </div>

              {/* Classified Uploads Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Registered Documents in Library ({analysisResult?.classifiedDocuments.length || 0})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                  {(analysisResult?.classifiedDocuments || []).map(doc => (
                    <div
                      key={doc.id}
                      className={`p-3.5 rounded-xl border space-y-2 ${
                        doc.isExpired
                          ? 'bg-rose-50/50 border-rose-200'
                          : doc.isExpiringSoon
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800">
                            {doc.category}
                          </span>
                          <h5 className="font-bold text-xs text-slate-900 mt-1">{doc.title}</h5>
                          <p className="text-[10px] text-slate-500">{doc.fileName}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          doc.isExpired
                            ? 'bg-rose-100 text-rose-800'
                            : doc.isExpiringSoon
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {doc.isExpired ? 'Expired' : doc.isExpiringSoon ? 'Expiring Soon' : 'Current Approved'}
                        </span>
                      </div>

                      {doc.expiryDate && (
                        <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-600">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            Expiry: {doc.expiryDate}
                          </span>
                          {doc.daysUntilExpiry !== undefined && (
                            <span className={doc.isExpired ? 'text-rose-600 font-bold' : doc.isExpiringSoon ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                              {doc.daysUntilExpiry < 0 ? `${Math.abs(doc.daysUntilExpiry)} days overdue` : `${doc.daysUntilExpiry} days remaining`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Essential Documents Audit */}
              <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Important Institutional Documents Not Yet Uploaded ({analysisResult?.missingEssentialDocuments.length || 0})</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  These records are frequently requested during donor pre-award due diligence. You can upload them anytime in your <strong>Document Library</strong>.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {(analysisResult?.missingEssentialDocuments || []).slice(0, 6).map((missing, idx) => (
                    <div key={idx} className="p-2.5 bg-white border border-amber-200/80 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-800">{missing.documentType}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                          {missing.importance.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 line-clamp-2">{missing.donorRationale}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  Continue to Department Setup
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: DEPARTMENTS */}
          {/* ========================================================================= */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Step 5 — Operational Units
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Configure Departments</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  GrantFlow assigns proposal sections and review responsibilities to specific departments.
                </p>
              </div>

              {/* Department Selector */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Add Department from Standard List
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={deptSelection}
                    onChange={e => setDeptSelection(e.target.value)}
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a common department...</option>
                    {STANDARD_DEPARTMENT_OPTIONS.map(d => (
                      <option key={d.name} value={d.name}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                    <option value="OTHER">+ Other / Custom Department</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddDepartment}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shrink-0"
                  >
                    Add Department
                  </button>
                </div>

                {deptSelection === 'OTHER' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={e => setNewDeptName(e.target.value)}
                      placeholder="Custom Department Name *"
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                    />
                    <input
                      type="text"
                      value={newDeptCode}
                      onChange={e => setNewDeptCode(e.target.value.toUpperCase())}
                      placeholder="Unit Code (e.g. M&E)"
                      maxLength={8}
                      className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium uppercase font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Configured Departments List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Configured Departments ({departments.length})
                </h4>
                {departments.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                    No departments added yet. Select departments above to structure proposal drafting assignments.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                    {departments.map(dept => (
                      <div key={dept.id} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-bold text-xs flex items-center justify-center">
                            {dept.code}
                          </span>
                          <div>
                            <p className="font-bold text-xs text-slate-800">{dept.name}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-xs">{dept.mandate || 'Operational unit'}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDepartment(dept.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="button"
                  disabled={departments.length === 0}
                  onClick={() => setStep(6)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  Continue to Staff Team
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: STAFF & GOVERNANCE */}
          {/* ========================================================================= */}
          {step === 6 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Step 6 — Personnel & Roles
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Staff Team & Approval Authority</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register staff members and designate who holds Department Head and Final Approver authority.
                </p>
              </div>

              {/* Add Staff Input Form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add Team Member</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newStaffName}
                    onChange={e => setNewStaffName(e.target.value)}
                    placeholder="Full Name *"
                    className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                  <input
                    type="email"
                    value={newStaffEmail}
                    onChange={e => setNewStaffEmail(e.target.value)}
                    placeholder="Email Address *"
                    className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                  <input
                    type="text"
                    value={newStaffTitle}
                    onChange={e => setNewStaffTitle(e.target.value)}
                    placeholder="Job Title (e.g. M&E Officer)"
                    className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  />
                  <select
                    value={newStaffDeptId}
                    onChange={e => setNewStaffDeptId(e.target.value)}
                    className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium"
                  >
                    <option value="">Select Department *</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddStaffMember}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    Add Staff Member
                  </button>
                </div>
              </div>

              {/* Staff Directory Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Registered Staff ({staffDirectory.length})
                </h4>
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {sortStaffByHierarchy(staffDirectory).map(staff => (
                    <div key={staff.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{staff.fullName}</p>
                        <p className="text-[10px] text-slate-500">{staff.jobTitle} • {staff.department || 'Unassigned'} • {staff.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={staff.role}
                          onChange={e => handleUpdateStaff(staff.id, { role: e.target.value as UserRole })}
                          className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold"
                        >
                          <option value="Admin">Admin</option>
                          <option value="FinalApprover">Final Approver</option>
                          <option value="DepartmentHead">Department Head</option>
                          <option value="ProposalLead">Proposal Lead</option>
                          <option value="Officer">Officer</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                        {staffDirectory.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveStaffMember(staff.id)}
                            className="text-slate-400 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Final Approver Designation */}
              <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider">
                  Default Final Approver (Executive Signatory)
                </label>
                <p className="text-[11px] text-indigo-900">
                  This executive holds ultimate sign-off authority for submitting proposals to donors.
                </p>
                <select
                  value={finalApproverId}
                  onChange={e => setFinalApproverId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  {staffDirectory.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.fullName} — {s.jobTitle} ({s.department || 'Executive'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => setStep(7)}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
                >
                  Continue to Preferences
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 7: FUNDING PREFERENCES & COMPLETE */}
          {/* ========================================================================= */}
          {step === 7 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Step 7 — Opportunity Radar Setup
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900">Funding Preferences & Complete Setup</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm the donor categories and funding instruments GrantFlow will match against your profile.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Donor Categories
                  </label>
                  <StructuredMultiSelect
                    options={STANDARD_DONOR_TYPES}
                    selected={prefDonorTypes}
                    onChange={setPrefDonorTypes}
                    badgeColor="blue"
                    placeholder="Select preferred donor categories..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Preferred Funding Instruments
                  </label>
                  <StructuredMultiSelect
                    options={STANDARD_FUNDING_INSTRUMENTS}
                    selected={prefFundingTypes}
                    onChange={setPrefFundingTypes}
                    badgeColor="emerald"
                    placeholder="Select funding modalities..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Minimum Target Grant Size (USD)
                    </label>
                    <input
                      type="number"
                      value={prefMinFunding}
                      onChange={e => setPrefMinFunding(e.target.value)}
                      placeholder="e.g. 25000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Maximum Target Grant Size (USD)
                    </label>
                    <input
                      type="number"
                      value={prefMaxFunding}
                      onChange={e => setPrefMaxFunding(e.target.value)}
                      placeholder="e.g. 500000"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Ready Summary Card */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-xs text-emerald-950">Institutional Workspace Ready</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Your organisation profile, verified document library, department units, and staff hierarchy are configured.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep(6)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCompleteSetup}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-indigo-200 transition flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Finalizing Setup...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Complete Setup & Launch Workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
