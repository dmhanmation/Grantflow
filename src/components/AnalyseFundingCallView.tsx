import React, { useState, useEffect } from 'react';
import {
  OrgProfile,
  FundingCallExtraction,
  EligibilityAssessment,
  OpportunityWorkspace,
  DonorApplicationTemplateSource,
  ApplicationSection,
  CriticalDonorFacts,
  ScoutedOpportunity
} from '../types';
import { formatDeadline, sanitizeOpportunityWorkspace, normalizeVerificationStatus } from '../utils/dateUtils';
import { ApplicationSetupModal } from './ApplicationSetupModal';
import { VerifyCriticalDetailsModal } from './VerifyCriticalDetailsModal';
import { VerifyCriticalDetailsSection } from './VerifyCriticalDetailsSection';
import {
  Sparkles,
  Search,
  FileText,
  Link,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ArrowDown,
  ShieldAlert,
  Building,
  Calendar,
  DollarSign,
  Globe2,
  Clock,
  Briefcase,
  Layers,
  FileCheck,
  Send,
  Info,
  AlertCircle,
  RefreshCw,
  Zap,
  Terminal,
  Cpu
} from 'lucide-react';

interface AnalyseFundingCallViewProps {
  orgProfile: OrgProfile;
  onPursueOpportunity: (workspace: OpportunityWorkspace) => void;
  initialCandidate?: ScoutedOpportunity | null;
  onClearInitialCandidate?: () => void;
  isDeveloperModeEnabled?: boolean;
}

export const AnalyseFundingCallView: React.FC<AnalyseFundingCallViewProps> = ({
  orgProfile,
  onPursueOpportunity,
  initialCandidate,
  onClearInitialCandidate,
  isDeveloperModeEnabled = false
}) => {
  const [inputMode, setInputMode] = useState<'text' | 'url' | 'upload'>('text');
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState('');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');
  const [extractedData, setExtractedData] = useState<FundingCallExtraction | null>(null);
  const [assessmentData, setAssessmentData] = useState<EligibilityAssessment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTemporaryError, setIsTemporaryError] = useState(false);
  const [isPursuing, setIsPursuing] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showVerifyDetailsModal, setShowVerifyDetailsModal] = useState(false);
  const [isDetailsVerified, setIsDetailsVerified] = useState(false);

  useEffect(() => {
    if (initialCandidate) {
      setInputMode(initialCandidate.sourceUrl ? 'url' : 'text');
      setInputText(initialCandidate.rawSummary || `${initialCandidate.donor}: ${initialCandidate.title}`);
      if (initialCandidate.sourceUrl) setInputUrl(initialCandidate.sourceUrl);

      const initialExtraction: FundingCallExtraction = {
        donor: initialCandidate.donor,
        opportunityTitle: initialCandidate.title,
        applicationDeadline: initialCandidate.deadline,
        deadlineVerificationStatus: initialCandidate.deadlineStatus,
        fundingAmount: initialCandidate.fundingAmount,
        currency: initialCandidate.currency || 'USD',
        thematicPriorities: initialCandidate.thematicFocus,
        eligibleCountries: initialCandidate.eligibleGeography,
        eligibleOrgTypes: initialCandidate.eligibleApplicantTypes,
        targetBeneficiaries: ['Women', 'Youth', 'Underserved Communities'],
        projectDuration: '12 - 24 months',
        coFundingRequirement: 'None stated in source',
        minOrgExperience: '3+ years non-profit operation',
        financialRequirements: 'Audited accounts required',
        requiredPolicies: ['Safeguarding', 'Anti-Fraud', 'Gender Equality (GESI)'],
        requiredSupportingDocs: [
          'Certificate of Incorporation / NGO Registration',
          'Audited Financial Statements (Last 2 Years)',
          'Board-Approved Safeguarding Policy',
          'Tax Clearance Certificate'
        ],
        proposalSections: [
          'Executive Summary & Problem Statement',
          'Target Beneficiary Analysis & Needs Assessment',
          'Methodology, Technical Approach & Implementation Workplan',
          'Monitoring, Evaluation, Accountability & Learning (MEAL) Framework',
          'Detailed Itemised Activity Budget & Cost Justification',
          'Risk Mitigation, Safeguarding & Sustainability Strategy'
        ],
        wordLimits: 'Standard donor question limits apply',
        submissionMethod: 'Online Donor Portal',
        submissionUrlOrEmail: initialCandidate.sourceUrl,
        contactInfo: 'Official Donor Grants Office',
        specialRestrictions: 'None stated in public call',
        otherEligibilityConditions: ['Active legal registration required'],
        rawSummary: initialCandidate.rawSummary,
        sourceType: 'url',
        sourceReference: initialCandidate.sourceUrl
      };

      setExtractedData(initialExtraction);
      setIsDetailsVerified(false);
      setShowVerifyDetailsModal(true);
    }
  }, [initialCandidate, orgProfile]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      setUploadedFileContent(content);
      setInputText(content);
    };
    reader.readAsText(file);
  };

  // Helper to parse friendly error message without exposing raw JSON
  const formatFriendlyError = (err: any): { message: string; isTemp: boolean } => {
    const defaultTempMsg = 'The AI analysis service is temporarily unavailable. Your funding call has been preserved. Please try again shortly.';
    
    if (!err) {
      return { message: defaultTempMsg, isTemp: true };
    }

    const raw = typeof err === 'string' ? err : (err.error || err.message || '');
    const isTemp = Boolean(
      err.isTemporary ||
      err.code === 'GEMINI_TEMPORARILY_UNAVAILABLE' ||
      raw.includes('503') ||
      raw.toLowerCase().includes('high demand') ||
      raw.toLowerCase().includes('service unavailable') ||
      raw.toLowerCase().includes('temporarily unavailable') ||
      raw.toLowerCase().includes('overloaded') ||
      raw.toLowerCase().includes('resource_exhausted') ||
      raw.toLowerCase().includes('rate limit')
    );

    if (isTemp) {
      return { message: defaultTempMsg, isTemp: true };
    }

    // Try parsing if raw is JSON string
    if (typeof raw === 'string' && raw.trim().startsWith('{') && raw.trim().endsWith('}')) {
      try {
        const parsed = JSON.parse(raw);
        return formatFriendlyError(parsed);
      } catch {
        // ignore parse error
      }
    }

    return {
      message: raw || defaultTempMsg,
      isTemp
    };
  };

  // Fetch with exponential backoff for temporary 503 or network issues
  const fetchApiWithRetry = async (
    url: string,
    bodyPayload: any,
    stepName: string,
    maxRetries = 3
  ): Promise<any> => {
    let attempt = 0;
    let delay = 1200;

    while (true) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        if (response.ok) {
          return await response.json();
        }

        let errBody: any = null;
        try {
          errBody = await response.json();
        } catch {
          errBody = { error: response.statusText || `Request failed with status ${response.status}` };
        }

        const isTempStatus =
          response.status === 503 ||
          response.status === 429 ||
          response.status === 502 ||
          response.status === 504 ||
          errBody?.isTemporary ||
          errBody?.code === 'GEMINI_TEMPORARILY_UNAVAILABLE' ||
          String(errBody?.error || '').toLowerCase().includes('high demand') ||
          String(errBody?.error || '').toLowerCase().includes('service unavailable');

        attempt++;
        if (attempt > maxRetries || !isTempStatus) {
          const parsed = formatFriendlyError(errBody);
          const error: any = new Error(parsed.message);
          error.isTemporary = parsed.isTemp;
          throw error;
        }

        // Show friendly retry progress in UI
        setIsRetrying(true);
        setAnalysisStep('Gemini is temporarily busy. GrantFlow is retrying the analysis.');
        const jitter = Math.round(delay * (0.85 + Math.random() * 0.3));
        await new Promise(resolve => setTimeout(resolve, jitter));
        delay *= 2;
      } catch (err: any) {
        if (err.isTemporary !== undefined) {
          throw err;
        }

        attempt++;
        if (attempt > maxRetries) {
          const parsed = formatFriendlyError(err);
          const error: any = new Error(parsed.message);
          error.isTemporary = true;
          throw error;
        }

        setIsRetrying(true);
        setAnalysisStep('Gemini is temporarily busy. GrantFlow is retrying the analysis.');
        const jitter = Math.round(delay * (0.85 + Math.random() * 0.3));
        await new Promise(resolve => setTimeout(resolve, jitter));
        delay *= 2;
      }
    }
  };

  const handleRunAnalysis = async () => {
    setErrorMsg(null);
    setIsTemporaryError(false);
    setIsRetrying(false);

    const payloadContent = inputMode === 'url' ? '' : inputText;
    const payloadUrl = inputMode === 'url' ? inputUrl : '';

    if (!payloadContent.trim() && !payloadUrl.trim()) {
      setErrorMsg('Please enter or paste funding call text, a URL, or upload a document.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setAnalysisStep('1. Calling Gemini to extract all structured criteria & restrictions...');

      // Step 1: Call /api/analyze-funding-call with retry
      const extracted: FundingCallExtraction = await fetchApiWithRetry(
        '/api/analyze-funding-call',
        {
          text: payloadContent,
          url: payloadUrl,
          documentName: uploadedFileName,
          documentContent: uploadedFileContent,
          isDeveloperTestMode: false
        },
        'Extract Requirements'
      );

      setExtractedData(extracted);

      // Step 2: Call /api/assess-eligibility with retry
      setIsRetrying(false);
      setAnalysisStep(`2. Reasoning organizational fit against "${orgProfile.name}"...`);

      const assessed: EligibilityAssessment = await fetchApiWithRetry(
        '/api/assess-eligibility',
        {
          extraction: extracted,
          orgProfile,
          isDeveloperTestMode: false
        },
        'Assess Eligibility'
      );

      setAssessmentData(assessed);
    } catch (err: any) {
      console.error('Analysis error:', err);
      const parsed = formatFriendlyError(err);
      setErrorMsg(parsed.message);
      setIsTemporaryError(parsed.isTemp);
      // NOTE: Form state (inputText, inputUrl, uploadedFileName, uploadedFileContent) is carefully preserved
    } finally {
      setIsAnalyzing(false);
      setIsRetrying(false);
      setAnalysisStep('');
    }
  };

  const handlePursue = () => {
    if (!extractedData || !assessmentData) return;
    if (!isDetailsVerified) {
      document.getElementById('verify-critical-details-section')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setShowSetupModal(true);
  };

  const handleVerifiedDetailsConfirmed = (
    verifiedExtraction: FundingCallExtraction,
    verifiedFacts: CriticalDonorFacts
  ) => {
    setExtractedData(verifiedExtraction);
    setShowVerifyDetailsModal(false);
    setShowSetupModal(true);
  };

  const handleConfirmSetup = async (
    templateSource: DonorApplicationTemplateSource,
    sections: ApplicationSection[]
  ) => {
    await handlePursueOpportunity(sections);
  };

  const handlePursueOpportunity = async (sections?: ApplicationSection[]) => {
    if (!extractedData || !assessmentData) return;

    try {
      setIsPursuing(true);

      const defaultLead = orgProfile.staffDirectory?.find(s => s.role === 'ProposalLead' || s.roles?.includes('ProposalLead'))?.fullName
        || orgProfile.staffDirectory?.[0]?.fullName
        || 'Unassigned';
      const defaultReviewer = orgProfile.staffDirectory?.find(s => s.role === 'DepartmentHead' || s.roles?.includes('DepartmentHead'))?.fullName
        || orgProfile.staffDirectory?.[0]?.fullName
        || 'Unassigned';
      const defaultApprover = orgProfile.defaultFinalApproverName
        || orgProfile.staffDirectory?.find(s => s.role === 'FinalApprover' || s.roles?.includes('FinalApprover') || s.role === 'Admin')?.fullName
        || orgProfile.staffDirectory?.[0]?.fullName
        || 'Unassigned';

      // Live AI Mode: Generate workspace artifacts
      const resArtifacts = await fetch('/api/generate-workspace-artifacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extraction: extractedData,
          assessment: assessmentData,
          orgProfile
        })
      });

      let artifacts = {
        requirementsChecklist: [],
        documentsChecklist: [],
        tasks: [],
        milestones: [],
        outstandingQuestions: []
      };

      if (resArtifacts.ok) {
        artifacts = await resArtifacts.json();
      }

      // Construct complete OpportunityWorkspace with templateSource, applicationSections, and criticalFacts
      const rawWorkspace: OpportunityWorkspace = {
        id: `opp-${Date.now()}`,
        isDemo: false,
        donor: extractedData.donor !== 'Not stated in call.' ? extractedData.donor : 'Prospective Donor',
        title: extractedData.opportunityTitle !== 'Not stated in call.' ? extractedData.opportunityTitle : 'Grant Opportunity',
        deadline: extractedData.applicationDeadline,
        deadlineVerificationStatus: normalizeVerificationStatus(extractedData.deadlineVerificationStatus),
        deadlineToSourceSnippet: extractedData.deadlineToSourceSnippet,
        fundingAmount: extractedData.fundingAmount !== 'Not stated in call.' ? `${extractedData.fundingAmount} ${extractedData.currency}` : 'Amount TBD',
        currency: extractedData.currency || 'USD',
        stage: 'Preparing Application',
        priority: assessmentData.overallStatus === 'LIKELY ELIGIBLE' ? 'High' : 'Medium',
        leadStaff: defaultLead,
        proposalLead: defaultLead,
        reviewer: defaultReviewer,
        finalApprover: defaultApprover,
        thematicArea: extractedData.thematicPriorities?.[0] || 'Community Development',
        countryScope: orgProfile.country,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        templateSource: {
          type: 'extracted_call',
          fileName: uploadedFileName || `${extractedData.donor}_Application_Questions.docx`,
          fileFormat: 'CALL_SECTIONS',
          uploadedAt: new Date().toISOString(),
          sourceLabel: 'Extracted from funding call'
        },
        applicationSections: sections && sections.length > 0 ? sections : (extractedData.proposalSections || []).map((secTitle, idx) => ({
          id: `sec-${idx + 1}`,
          sectionNumber: `Q${idx + 1}`,
          donorQuestion: secTitle,
          donorInstructions: `Please address the requirements for: ${secTitle}`,
          wordLimit: 500,
          assignedDepartment: orgProfile.departments?.[idx % (orgProfile.departments?.length || 1)]?.name || 'Programmes',
          assignedStaff: defaultLead,
          departmentHead: defaultReviewer,
          status: 'Not Started',
          reviewStatus: 'Drafting',
          mandatory: true,
          orderIndex: idx,
          draftResponse: ''
        })),
        criticalFacts: extractedData.criticalFacts,
        extraction: extractedData,
        assessment: assessmentData,
        requirementsChecklist: artifacts.requirementsChecklist?.length > 0 ? artifacts.requirementsChecklist : [
          { id: 'req-1', title: 'Valid Organization Registration & Governance Certificate', category: 'Governance', status: 'PENDING', notes: 'Verify registration before proposal submission' },
          { id: 'req-2', title: 'Audited Financial Statements Compliance', category: 'Financial', status: 'PENDING', notes: 'Prepare most recent audit reports' },
          { id: 'req-3', title: 'Thematic & Geographic Alignment Review', category: 'Operational', status: 'PENDING', notes: 'Ensure project scope matches donor call requirements' }
        ],
        documentsChecklist: artifacts.documentsChecklist?.length > 0 ? artifacts.documentsChecklist : [
          { id: 'doc-1', name: 'Technical Proposal Narrative', mandatory: true, category: 'Technical Proposal', status: 'Pending', assignedTo: defaultLead },
          { id: 'doc-2', name: 'Detailed Activity Budget & Cost Breakdown', mandatory: true, category: 'Budget', status: 'Pending', assignedTo: defaultReviewer },
          { id: 'doc-3', name: 'Certificate of Incorporation & Tax Clearance', mandatory: true, category: 'Governance', status: 'Pending', assignedTo: defaultLead },
          { id: 'doc-4', name: 'Board Safeguarding Policy', mandatory: true, category: 'Governance', status: 'Pending', assignedTo: defaultLead }
        ],
        tasks: artifacts.tasks?.length > 0 ? artifacts.tasks : [
          {
            id: `task-${Date.now()}-1`,
            workspaceId: `opp-${Date.now()}`,
            title: 'Draft Technical Approach & Problem Statement',
            department: 'Programmes',
            assignedOfficerName: defaultLead,
            assignedOfficerRole: 'ProposalLead',
            assignedBy: currentUserRoleName,
            status: 'Not Started',
            priority: 'High',
            assignedDate: new Date().toISOString().split('T')[0],
            deadline: extractedData.applicationDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            instructions: 'Draft the core technical methodology in accordance with the extracted donor guidelines.'
          },
          {
            id: `task-${Date.now()}-2`,
            workspaceId: `opp-${Date.now()}`,
            title: 'Prepare Detailed Line-Item Budget & Cost Notes',
            department: 'Finance',
            assignedOfficerName: defaultReviewer,
            assignedOfficerRole: 'DepartmentHead',
            assignedBy: currentUserRoleName,
            status: 'Not Started',
            priority: 'High',
            assignedDate: new Date().toISOString().split('T')[0],
            deadline: extractedData.applicationDeadline || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            instructions: 'Prepare activity-based budget and verify cost-share compliance.'
          }
        ],
        milestones: artifacts.milestones?.length > 0 ? artifacts.milestones : [
          { id: 'ms-1', title: 'Internal Proposal First Draft Review', targetDate: extractedData.applicationDeadline ? new Date(new Date(extractedData.applicationDeadline).getTime() - 7 * 86400000).toISOString().split('T')[0] : '2026-10-15', completed: false },
          { id: 'ms-2', title: 'Final Executive Sign-off & Donor Dossier Submission', targetDate: extractedData.applicationDeadline || '2026-10-25', completed: false }
        ],
        outstandingQuestions: artifacts.outstandingQuestions || [],
        internalNotes: [
          {
            id: `note-${Date.now()}`,
            author: currentUserRoleName,
            timestamp: new Date().toISOString(),
            content: `Workspace created from live analysis of ${extractedData.donor}. Fit score: ${assessmentData.fitScore}%.`
          }
        ],
        readinessAlert: {
          level: assessmentData.overallStatus === 'LIKELY ELIGIBLE' ? 'INFO' : 'WARNING',
          headline: assessmentData.overallStatus === 'LIKELY ELIGIBLE' ? 'Live Workspace Initialized with Structured Sections.' : 'Eligibility Criteria Requires Verification Before Submission.',
          details: `Overall match score: ${assessmentData.fitScore}%. Review extracted requirements and assigned tasks.`,
          recommendedActions: [
            'Review extracted donor questions in the Application tab.',
            'Assign specific drafting tasks to departmental staff.',
            'Track submission deadlines and required compliance documents.'
          ],
          evaluatedAt: new Date().toISOString()
        }
      };

      const finalWorkspace = sanitizeOpportunityWorkspace(rawWorkspace);
      onPursueOpportunity(finalWorkspace);
    } catch (err: any) {
      console.error('Pursue opportunity error:', err);
      setErrorMsg('Failed to initialize application workspace. Please try again.');
    } finally {
      setIsPursuing(false);
    }
  };

  const currentUserRoleName = orgProfile.staffDirectory?.[0]?.fullName || 'Organisation Admin';

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Top Hero & Input Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Gemini AI Grant Analysis Engine
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Analyse Funding Call</h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Paste funding-call text, a donor URL, or upload a document. GrantFlow extracts requirements,
              flags ambiguity as &ldquo;Needs human verification&rdquo;, compares with {orgProfile.name}, and provides an eligibility verdict.
            </p>
          </div>
        </div>

        {/* Input Mode Switcher */}
        <div className="mt-5 space-y-4">
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
                inputMode === 'text'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              Paste Funding-Call Text
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
                inputMode === 'url'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Link className="w-4 h-4" />
              Paste Funding Opportunity URL
            </button>
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition ${
                inputMode === 'upload'
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload PDF / Document
            </button>
          </div>

          {/* Input Body */}
          {inputMode === 'text' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Funding Call Text / RFP / NOFO / WhatsApp Broadcast
              </label>
              <textarea
                rows={7}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Paste the full text of the funding call, call for proposals, eligibility criteria, and submission instructions here..."
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {inputMode === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Funding Opportunity Webpage URL
                </label>
                <input
                  type="url"
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  placeholder="https://donor-portal.org/grants/call-for-proposals-2026"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Optional: Accompanying Guidelines or Snippets
                </label>
                <textarea
                  rows={3}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Add any supplementary text or guidance notes from the page..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          )}

          {inputMode === 'upload' && (
            <div className="space-y-3">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700">
                  {uploadedFileName ? `Selected: ${uploadedFileName}` : 'Drag and drop or browse funding call document'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Supports PDF, DOCX, TXT, or markdown guidelines</p>
                <input
                  type="file"
                  id="file-upload-input"
                  onChange={handleFileUpload}
                  accept=".txt,.md,.pdf,.doc,.docx"
                  className="mt-3 text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {uploadedFileContent && (
                <div>
                  <span className="text-xs font-semibold text-slate-600">Extracted Document Preview:</span>
                  <div className="max-h-32 overflow-y-auto p-2.5 bg-slate-50 rounded border border-slate-200 text-xs font-mono text-slate-700 mt-1">
                    {uploadedFileContent.slice(0, 500)}...
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div
              id="analysis-error-banner"
              className="p-4 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 shrink-0 mt-0.5 sm:mt-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-900/80 text-rose-200 px-2 py-0.5 rounded border border-rose-700">
                      AI Service Notice
                    </span>
                    <span className="text-xs text-slate-400">Technical / API Error</span>
                  </div>
                  <p className="font-semibold text-slate-100 mt-1">{errorMsg}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your entered text, URL, and uploaded documents remain safely preserved in the form.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 self-start sm:self-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Analysis
              </button>
            </div>
          )}

          {/* Action Trigger */}
          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Matching against: <strong className="text-slate-800">{orgProfile.name}</strong> ({orgProfile.country})
            </div>

            <button
              id="analyze-call-submit-btn"
              type="button"
              disabled={isAnalyzing}
              onClick={handleRunAnalysis}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {isRetrying ? 'Retrying Gemini...' : 'Analyzing with Gemini...'}
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Analyse Funding Call
                </>
              )}
            </button>
          </div>

          {isAnalyzing && (
            <div
              id="analysis-progress-indicator"
              className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-3"
            >
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium text-indigo-950">{analysisStep}</p>
                {isRetrying && (
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Exponential backoff active. Preserving all funding call data...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Extracted Information & Eligibility Assessment Results */}
      {extractedData && assessmentData && (
        <div className="space-y-8 animate-fadeIn">
          {/* 1. ELIGIBILITY & FIT ASSESSMENT DASHBOARD (Core Area 3) */}
          <div className="bg-white border-2 border-slate-200 rounded-xl overflow-hidden shadow-md">
            {/* Status Header Banner - 3-Level Distinct Visual Verdict Treatment */}
            {assessmentData.overallStatus === 'LIKELY ELIGIBLE' && (
              <div className="p-6 bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-emerald-950">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                      Eligibility & Fit Verdict • Strong Fit
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 tracking-tight">
                    <CheckCircle2 className="w-8 h-8 text-emerald-300 shrink-0" />
                    <span>LIKELY ELIGIBLE</span>
                  </h2>
                  <p className="text-sm text-emerald-50 mt-1 max-w-3xl leading-relaxed">
                    {assessmentData.overallFitSummary}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-100 bg-emerald-950/40 border border-emerald-400/30 px-2.5 py-1 rounded-md font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>Meets core institutional requirements (geography, legal status, audits, and governance policies).</span>
                  </div>
                </div>

                {/* Pursue Opportunity Action Button (Prominent!) */}
                <div className="shrink-0 flex flex-col items-start md:items-end">
                  {!isDetailsVerified ? (
                    <button
                      id="verify-details-scroll-btn"
                      onClick={() => {
                        document.getElementById('verify-critical-details-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-6 py-3.5 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-sm md:text-base rounded-xl shadow-lg hover:shadow-xl transition flex items-center gap-2 border-2 border-white"
                    >
                      <span>Verify Critical Details Below</span>
                      <ArrowDown className="w-5 h-5 text-emerald-700 animate-bounce" />
                    </button>
                  ) : (
                    <button
                      id="pursue-opportunity-btn"
                      onClick={handlePursue}
                      disabled={isPursuing}
                      className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm md:text-base rounded-xl shadow-lg transition flex items-center gap-2 border-2 border-emerald-300"
                    >
                      {isPursuing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Creating Workspace...
                        </>
                      ) : (
                        <>
                          <span>PURSUE OPPORTUNITY</span>
                          <ArrowRight className="w-5 h-5 text-white" />
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[11px] text-emerald-200 text-center md:text-right mt-1.5">
                    {!isDetailsVerified ? 'Step 2: Fact Verification Required' : '✓ Critical facts verified by human'}
                  </p>
                </div>
              </div>
            )}

            {assessmentData.overallStatus === 'REVIEW REQUIRED' && (
              <div className="p-6 bg-amber-50/90 border-b-2 border-amber-300 text-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      Eligibility & Fit Verdict • Caution
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-amber-950 flex items-center gap-3 tracking-tight">
                    <AlertTriangle className="w-8 h-8 text-amber-600 shrink-0" />
                    <span>REVIEW REQUIRED</span>
                  </h2>
                  <p className="text-sm text-slate-800 mt-1 max-w-3xl leading-relaxed">
                    {assessmentData.overallFitSummary}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-xs text-amber-900 bg-amber-100/80 border border-amber-300 px-2.5 py-1 rounded-md font-medium">
                    <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Opportunity may be suitable, but certain eligibility conditions or co-funding rules require human verification.</span>
                  </div>
                </div>

                {/* Pursue Opportunity Action Button (Available with clear caution theme) */}
                <div className="shrink-0 flex flex-col items-start md:items-end">
                  {!isDetailsVerified ? (
                    <button
                      id="verify-details-scroll-btn"
                      onClick={() => {
                        document.getElementById('verify-critical-details-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm md:text-base rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 border border-amber-700"
                    >
                      <span>Verify Critical Details Below</span>
                      <ArrowDown className="w-5 h-5 text-amber-100 animate-bounce" />
                    </button>
                  ) : (
                    <button
                      id="pursue-opportunity-btn"
                      onClick={handlePursue}
                      disabled={isPursuing}
                      className="px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm md:text-base rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 border border-amber-700"
                    >
                      {isPursuing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Creating Workspace...
                        </>
                      ) : (
                        <>
                          <span>PURSUE OPPORTUNITY</span>
                          <ArrowRight className="w-5 h-5 text-amber-100" />
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[11px] text-amber-900/80 text-center md:text-right mt-1.5">
                    {!isDetailsVerified ? 'Step 2: Fact Verification Required' : '✓ Verified with flagged review items'}
                  </p>
                </div>
              </div>
            )}

            {assessmentData.overallStatus === 'LIKELY INELIGIBLE' && (
              <div className="p-6 bg-gradient-to-r from-rose-800 via-red-800 to-rose-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-rose-950">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-rose-950/70 text-rose-200 border border-rose-400/40 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-300" />
                      Eligibility & Fit Verdict • High Risk
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black flex items-center gap-3 tracking-tight text-white">
                    <XCircle className="w-8 h-8 text-rose-300 shrink-0" />
                    <span>LIKELY INELIGIBLE / NO-GO</span>
                  </h2>
                  <p className="text-sm text-rose-100 mt-1 max-w-3xl leading-relaxed">
                    {assessmentData.overallFitSummary}
                  </p>

                  {/* Explicit Disqualifying Criteria Callout */}
                  {assessmentData.criteria.some(c => c.status === 'UNMET') && (
                    <div className="p-3 bg-rose-950/60 border border-rose-400/40 rounded-lg text-xs space-y-1 mt-2">
                      <div className="font-bold text-rose-200 uppercase tracking-wider flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-rose-300" />
                        Disqualifying / Unmet Mandatory Criteria:
                      </div>
                      <ul className="space-y-1 text-rose-100 pl-4 list-disc">
                        {assessmentData.criteria.filter(c => c.status === 'UNMET').map((c, i) => (
                          <li key={i}>
                            <strong>{c.criterion}:</strong> Donor requires &ldquo;{c.donorRequirement}&rdquo; (Organisation evidence: {c.orgEvidence}).
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="inline-flex items-center gap-1.5 text-xs text-rose-200 bg-rose-950/40 border border-rose-400/30 px-2.5 py-1 rounded-md font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                    <span>Significant risk of disqualification unless a donor waiver, consortium partner, or exception applies.</span>
                  </div>
                </div>

                {/* Pursue Opportunity Action Button (Secondary Action with Warning) */}
                <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5">
                  <div className="bg-rose-950/80 border border-rose-400/50 text-rose-100 px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 max-w-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
                    <span>Mandatory requirements not met.</span>
                  </div>
                  {!isDetailsVerified ? (
                    <button
                      id="verify-details-scroll-btn"
                      onClick={() => {
                        document.getElementById('verify-critical-details-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-5 py-2.5 bg-rose-950/50 hover:bg-rose-950/90 text-rose-100 hover:text-white font-semibold text-xs md:text-sm rounded-xl border border-rose-400/50 transition flex items-center gap-2"
                    >
                      <span>Verify Critical Details Below</span>
                      <ArrowDown className="w-4 h-4 text-rose-300 animate-bounce" />
                    </button>
                  ) : (
                    <button
                      id="pursue-opportunity-btn"
                      onClick={handlePursue}
                      disabled={isPursuing}
                      className="px-5 py-2.5 bg-rose-950/50 hover:bg-rose-950/90 text-rose-100 hover:text-white font-semibold text-xs md:text-sm rounded-xl border border-rose-400/50 transition flex items-center gap-2"
                    >
                      {isPursuing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Creating Workspace...
                        </>
                      ) : (
                        <>
                          <span>Pursue Opportunity Anyway</span>
                          <ArrowRight className="w-4 h-4 text-rose-300" />
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[10px] text-rose-300 text-center md:text-right">
                    {!isDetailsVerified ? 'Fact verification required' : 'Overrides negative recommendation'}
                  </p>
                </div>
              </div>
            )}


            {/* Strategic Recommendation & Scoring Logic */}
            <div className="p-6 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Strategic Recommendation
                  </span>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {assessmentData.strategicRecommendation}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Scoring & Confidence Rationale
                  </span>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {assessmentData.confidenceScoreRationale}
                  </p>
                </div>
              </div>
            </div>

            {/* Criteria-by-Criteria Breakdown Table */}
            <div className="p-6">
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                Individual Eligibility Criteria Comparison
              </h3>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                    <tr>
                      <th className="p-3 border-b border-slate-200">Criterion</th>
                      <th className="p-3 border-b border-slate-200">Donor Requirement</th>
                      <th className="p-3 border-b border-slate-200">{orgProfile.name} Evidence</th>
                      <th className="p-3 border-b border-slate-200 text-center">Status</th>
                      <th className="p-3 border-b border-slate-200">Verification Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {assessmentData.criteria.map((crit, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">
                          <div>{crit.criterion}</div>
                          <span className="text-[10px] text-slate-500 font-normal">{crit.category}</span>
                        </td>
                        <td className="p-3 text-slate-700 max-w-xs">{crit.donorRequirement}</td>
                        <td className="p-3 text-slate-700 max-w-xs">{crit.orgEvidence}</td>
                        <td className="p-3 text-center">
                          {crit.status === 'MET' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Met
                            </span>
                          )}
                          {crit.status === 'REVIEW_REQUIRED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> Review
                            </span>
                          )}
                          {crit.status === 'UNMET' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-950 border border-rose-300">
                              <XCircle className="w-3.5 h-3.5 text-rose-700" /> Unmet
                            </span>
                          )}
                          {crit.status === 'NOT_STATED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              <HelpCircle className="w-3.5 h-3.5 text-slate-500" /> Not Stated
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          {crit.details}
                          {crit.needsHumanVerification && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-amber-950 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" /> Needs human verification
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 4 Analytical Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {/* Strongest Matches */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                  <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Strongest Matches
                  </h4>
                  <ul className="space-y-1.5 text-xs text-emerald-950">
                    {assessmentData.strongestMatches.map((m, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-emerald-600 font-bold">•</span>
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Important Risks */}
                <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-lg">
                  <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Important Risks
                  </h4>
                  <ul className="space-y-1.5 text-xs text-rose-950">
                    {assessmentData.importantRisks.map((r, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-rose-600 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Missing Information */}
                <div className="p-4 bg-slate-100 border border-slate-200 rounded-lg">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                    Missing in Call
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-800">
                    {assessmentData.missingInformation.length > 0 ? (
                      assessmentData.missingInformation.map((m, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span className="text-slate-400 font-bold">•</span>
                          <span>{m}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500 italic">No major information missing from call text.</li>
                    )}
                  </ul>
                </div>

                {/* Human Verification Required */}
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Human Verification
                  </h4>
                  <ul className="space-y-1.5 text-xs text-amber-950">
                    {assessmentData.humanVerificationRequired.map((h, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-amber-600 font-bold">•</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 2. VERIFY CRITICAL OPPORTUNITY DETAILS (Step 2 of 3) */}
          <VerifyCriticalDetailsSection
            extraction={extractedData}
            onConfirmAndContinue={(verifiedExtraction, verifiedFacts) => {
              setExtractedData(verifiedExtraction);
              setIsDetailsVerified(true);
              setShowSetupModal(true);
            }}
            isConfirmed={isDetailsVerified}
            isPursuing={isPursuing}
          />

          {/* 3. EXTRACTED FUNDING CALL REQUIREMENTS (Step 3 Reference) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  Full Extracted Funding Call Requirements
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Extracted by Gemini from source material without inventing unstated details.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono rounded">
                  Source: {extractedData.sourceType.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Two-Column Grid of 22 Extracted Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-sm">
              {/* Donor / Funder */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Donor / Funder
                </span>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-indigo-600 shrink-0" />
                  {extractedData.donor}
                </p>
              </div>

              {/* Opportunity Title */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 md:col-span-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Opportunity Title
                </span>
                <p className="font-semibold text-slate-900">{extractedData.opportunityTitle}</p>
              </div>

              {/* Funding Amount & Currency */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Funding Amount or Range
                </span>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                  {extractedData.fundingAmount} ({extractedData.currency})
                </p>
              </div>

              {/* Application Deadline */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Application Deadline
                </span>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-rose-600 shrink-0" />
                  {formatDeadline(extractedData.applicationDeadline, extractedData.deadlineVerificationStatus)}
                </p>
                {extractedData.deadlineVerificationStatus && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                        normalizeVerificationStatus(extractedData.deadlineVerificationStatus) === 'Confirmed from Source'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : normalizeVerificationStatus(extractedData.deadlineVerificationStatus) === 'Human Verified'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : normalizeVerificationStatus(extractedData.deadlineVerificationStatus) === 'Needs Verification'
                          ? 'bg-amber-100 text-amber-950 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {normalizeVerificationStatus(extractedData.deadlineVerificationStatus) === 'Confirmed from Source' && (
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                      )}
                      {normalizeVerificationStatus(extractedData.deadlineVerificationStatus) === 'Human Verified' && (
                        <CheckCircle2 className="w-3 h-3 text-blue-700" />
                      )}
                      {normalizeVerificationStatus(extractedData.deadlineVerificationStatus) === 'Needs Verification' && (
                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                      )}
                      {normalizeVerificationStatus(extractedData.deadlineVerificationStatus) === 'Not Stated in Source' && (
                        <HelpCircle className="w-3 h-3 text-slate-500" />
                      )}
                      {normalizeVerificationStatus(extractedData.deadlineVerificationStatus)}
                    </span>
                  </div>
                )}
                {extractedData.deadlineToSourceSnippet && (
                  <p className="text-[11px] text-slate-500 italic mt-1 bg-white p-1.5 rounded border border-slate-200/60">
                    &quot;{extractedData.deadlineToSourceSnippet}&quot;
                  </p>
                )}
              </div>

              {/* Project Duration */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Project Duration
                </span>
                <p className="font-medium text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  {extractedData.projectDuration}
                </p>
              </div>

              {/* Eligible Countries */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Eligible Countries / Geographic Scope
                </span>
                <div className="flex flex-wrap gap-1">
                  {extractedData.eligibleCountries?.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-800">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Eligible Org Types */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Eligible Organisation Types
                </span>
                <div className="flex flex-wrap gap-1">
                  {extractedData.eligibleOrgTypes?.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-800">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Co-Funding Requirement */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Co-Funding / Cost-Share
                </span>
                <p className="font-medium text-slate-900">{extractedData.coFundingRequirement}</p>
              </div>

              {/* Thematic Priorities */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 md:col-span-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Thematic Priorities & Focus Areas
                </span>
                <div className="flex flex-wrap gap-1">
                  {extractedData.thematicPriorities?.map((th, i) => (
                    <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded text-xs">
                      {th}
                    </span>
                  ))}
                </div>
              </div>

              {/* Target Beneficiaries */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Target Beneficiaries
                </span>
                <div className="flex flex-wrap gap-1">
                  {extractedData.targetBeneficiaries?.map((b, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-800">
                      {b}
                    </span>
                  ))}
                </div>
              </div>

              {/* Min Experience */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Minimum Organisational Experience
                </span>
                <p className="font-medium text-slate-900">{extractedData.minOrgExperience}</p>
              </div>

              {/* Financial Requirements */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 md:col-span-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Financial & Audit Requirements
                </span>
                <p className="font-medium text-slate-900">{extractedData.financialRequirements}</p>
              </div>

              {/* Required Policies */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 md:col-span-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Required Institutional Policies
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {extractedData.requiredPolicies?.map((pol, i) => (
                    <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-medium flex items-center gap-1">
                      <FileCheck className="w-3 h-3 text-emerald-600" />
                      {pol}
                    </span>
                  ))}
                </div>
              </div>

              {/* Required Supporting Documents */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 md:col-span-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Required Supporting Documents Checklist
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {extractedData.requiredSupportingDocs?.map((doc, i) => (
                    <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded text-xs font-medium">
                      📎 {doc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Proposal Sections & Word Limits */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 md:col-span-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Proposal Narrative Sections
                </span>
                <p className="text-xs text-slate-800">{extractedData.proposalSections?.join(' • ')}</p>
                <p className="text-xs font-medium text-indigo-700 mt-1">Limits: {extractedData.wordLimits}</p>
              </div>

              {/* Submission Method & URL/Email */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Submission Channel & Contact
                </span>
                <p className="text-xs font-semibold text-slate-900">{extractedData.submissionMethod}</p>
                <p className="text-xs text-indigo-600 font-mono mt-0.5">{extractedData.submissionUrlOrEmail}</p>
                {extractedData.contactInfo !== 'Not stated in call.' && (
                  <p className="text-xs text-slate-500 mt-1">Contact: {extractedData.contactInfo}</p>
                )}
              </div>

              {/* Special Restrictions */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 md:col-span-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Special Restrictions & Other Conditions
                </span>
                <p className="text-xs text-slate-800">{extractedData.specialRestrictions}</p>
                {extractedData.otherEligibilityConditions?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {extractedData.otherEligibilityConditions.map((cond, i) => (
                      <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs">
                        {cond}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Verify Critical Opportunity Details Modal */}
      {showVerifyDetailsModal && extractedData && (
        <VerifyCriticalDetailsModal
          extraction={extractedData}
          onConfirm={handleVerifiedDetailsConfirmed}
          onClose={() => setShowVerifyDetailsModal(false)}
        />
      )}

      {/* Application Setup Modal */}
      {extractedData && (
        <ApplicationSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          donorName={extractedData.donor !== 'Not stated in call.' ? extractedData.donor : 'Prospective Donor'}
          opportunityTitle={extractedData.opportunityTitle !== 'Not stated in call.' ? extractedData.opportunityTitle : 'Grant Opportunity'}
          extractedSections={extractedData.proposalSections || []}
          orgProfile={orgProfile}
          onConfirm={handleConfirmSetup}
        />
      )}
    </div>
  );
};
