import React, { useState } from 'react';
import {
  DonorApplicationTemplateSource,
  ApplicationSection,
  TemplateSourceType,
  OrgProfile
} from '../types';
import {
  FileText,
  Upload,
  ClipboardList,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  FileCheck,
  ShieldCheck
} from 'lucide-react';

interface ApplicationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (templateSource: DonorApplicationTemplateSource, sections: ApplicationSection[]) => void;
  donorName: string;
  opportunityTitle: string;
  extractedSections?: string[];
  orgProfile: OrgProfile;
}

export const ApplicationSetupModal: React.FC<ApplicationSetupModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  donorName,
  opportunityTitle,
  extractedSections = [],
  orgProfile
}) => {
  const [sourceType, setSourceType] = useState<TemplateSourceType>('upload_template');
  const [fileName, setFileName] = useState<string>('');
  const [fileFormat, setFileFormat] = useState<'DOCX' | 'PDF' | 'XLSX' | 'PORTAL_FORM' | 'CALL_SECTIONS' | 'NONE'>('DOCX');
  const [pastedText, setPastedText] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewSections, setPreviewSections] = useState<ApplicationSection[] | null>(null);
  const [isGeneratedFallback, setIsGeneratedFallback] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toUpperCase();
    if (ext === 'DOCX' || ext === 'DOC') setFileFormat('DOCX');
    else if (ext === 'PDF') setFileFormat('PDF');
    else if (ext === 'XLSX' || ext === 'XLS' || ext === 'CSV') setFileFormat('XLSX');
    else setFileFormat('PORTAL_FORM');

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setPastedText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleParseStructure = async () => {
    setIsParsing(true);
    setErrorMsg(null);

    let rawText = '';

    if (sourceType === 'upload_template') {
      rawText = pastedText || `Donor RFP Template for ${donorName}:
Q1. Executive Summary and Problem Statement (Max 500 words)
Please describe the problem context, target beneficiaries, and overall expected transformational impact.

Q2. Detailed Project Methodology & Technical Approach (Max 1500 words)
Provide step-by-step technical interventions, beneficiary selection criteria, and work plan milestones.

Q3. Results Framework, Indicators & MEAL Plan (Max 1000 words)
Detail quantitative and qualitative indicators, baseline values, disaggregated data collection, and feedback loops.

Q4. Activity-Based Budget Justification & Indirect Cost Compliance (Max 800 words)
Detail key activity cost drivers, procurement policies, and confirm administrative overhead is within limits.

Q5. Institutional Experience & Safeguarding Standards (Max 750 words)
Detail past grant track record, local presence, and safeguarding/gender policy compliance.`;
    } else if (sourceType === 'paste_questions') {
      if (!pastedText.trim()) {
        setErrorMsg('Please paste the donor application questions or portal text.');
        setIsParsing(false);
        return;
      }
      rawText = pastedText;
    } else if (sourceType === 'extracted_call') {
      rawText = extractedSections.length > 0 ? extractedSections.join('\n\n') : '';
    } else {
      rawText = '';
    }

    try {
      const res = await fetch('/api/parse-donor-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          rawText,
          fileName: fileName || `${donorName.replace(/\s+/g, '_')}_Application_Template`,
          donorName,
          opportunityTitle,
          proposalSections: extractedSections,
          orgProfile,
          isDeveloperTestMode: false
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to parse donor template structure.');
      }

      const data = await res.json();
      setPreviewSections(data.sections || []);
      setIsGeneratedFallback(data.isGrantFlowGenerated || sourceType === 'none_fallback');
    } catch (err: any) {
      console.error('Error parsing template:', err);
      setErrorMsg(err.message || 'Failed to parse application structure. Please retry.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!previewSections || previewSections.length === 0) {
      handleParseStructure();
      return;
    }

    const templateSource: DonorApplicationTemplateSource = {
      type: sourceType,
      fileName: fileName || (sourceType === 'upload_template' ? 'Donor_Application_Template.docx' : undefined),
      fileFormat: fileFormat,
      rawContent: pastedText,
      uploadedAt: new Date().toISOString(),
      sourceLabel:
        sourceType === 'upload_template'
          ? `Uploaded Donor Template (${fileName || 'DOCX'})`
          : sourceType === 'paste_questions'
          ? 'Pasted Portal Application Questions'
          : sourceType === 'extracted_call'
          ? 'Extracted Funding Call Structure'
          : 'GrantFlow-Generated Fallback Structure'
    };

    onConfirm(templateSource, previewSections);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-fadeIn">
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-indigo-300">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                  Step 1 • Application Setup
                </span>
                <span className="text-xs text-slate-400">Donor-Template-First</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Define Application Structure for {donorName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Core Rule Banner */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-950 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-semibold text-blue-950">Core Principle: </strong>
              The donor defines the application structure. GrantFlow preserves original question numbering, exact wording, and word limits, while orchestrating multi-department drafting and reviews around it.
            </div>
          </div>

          {/* 4 Format Options Grid */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              Choose Application Format Source
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Upload Template */}
              <button
                type="button"
                onClick={() => {
                  setSourceType('upload_template');
                  setPreviewSections(null);
                }}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between gap-3 ${
                  sourceType === 'upload_template'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                    <Upload className="w-5 h-5" />
                  </div>
                  {sourceType === 'upload_template' && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Upload Donor Template</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Upload a DOCX, PDF, XLSX, or form template supplied by {donorName}.
                  </p>
                </div>
              </button>

              {/* Option 2: Paste Questions */}
              <button
                type="button"
                onClick={() => {
                  setSourceType('paste_questions');
                  setPreviewSections(null);
                }}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between gap-3 ${
                  sourceType === 'paste_questions'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  {sourceType === 'paste_questions' && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Paste Application Questions</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Paste portal fields, SurveyMonkey/Grants.gov questions, or RFP prompts.
                  </p>
                </div>
              </button>

              {/* Option 3: Use Extracted Call Questions */}
              <button
                type="button"
                onClick={() => {
                  setSourceType('extracted_call');
                  setPreviewSections(null);
                }}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between gap-3 ${
                  sourceType === 'extracted_call'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                    <FileText className="w-5 h-5" />
                  </div>
                  {sourceType === 'extracted_call' && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Use Call Extraction</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Use the {extractedSections.length} proposal sections identified from the funding call analysis.
                  </p>
                </div>
              </button>

              {/* Option 4: No Template Provided */}
              <button
                type="button"
                onClick={() => {
                  setSourceType('none_fallback');
                  setPreviewSections(null);
                }}
                className={`p-4 rounded-xl border-2 text-left transition flex flex-col justify-between gap-3 ${
                  sourceType === 'none_fallback'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                    <Layers className="w-5 h-5" />
                  </div>
                  {sourceType === 'none_fallback' && (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">No Template Provided</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Generate a standard GrantFlow application structure (customizable).
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Configuration Input for Selected Option */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
            {sourceType === 'upload_template' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Donor Template File (.docx, .pdf, .xlsx, .txt)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept=".docx,.doc,.pdf,.xlsx,.xls,.txt,.md"
                    onChange={handleFileUpload}
                    className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                  {fileName && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {fileName}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  GrantFlow parses sections, question numbering, and instructions while preserving uploaded files as read-only reference.
                </p>
              </div>
            )}

            {sourceType === 'paste_questions' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Paste Donor Questions / Portal Form Text
                </label>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="e.g.&#10;Q1. Project Rationale & Context (Max 500 words)&#10;Q2. Target Beneficiaries & Vulnerability Criteria (Max 750 words)&#10;Q3. Technical Approach & Work Plan (Max 1500 words)&#10;Q4. Activity-Based Budget Narrative (Max 600 words)..."
                  rows={6}
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            )}

            {sourceType === 'extracted_call' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Extracted Funding Call Sections ({extractedSections.length})
                </label>
                <ul className="text-xs space-y-1 bg-white p-3 rounded-lg border border-slate-200 font-medium text-slate-700">
                  {extractedSections.map((sec, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-indigo-600 font-bold">•</span>
                      <span>{sec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sourceType === 'none_fallback' && (
              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">
                  GrantFlow-Generated Fallback Application Structure
                </p>
                <p>
                  Will generate 6 standardized NGO proposal sections across Programmes, Finance, M&E, and Grants. These can be modified, reordered, or deleted in the workspace.
                </p>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleParseStructure}
                disabled={isParsing}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Parsing Structure with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Parse & Preview Donor Questions
                  </>
                )}
              </button>

              {previewSections && (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {previewSections.length} Questions Ready
                </span>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Structure Preview */}
          {previewSections && previewSections.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Application Structure Preview ({previewSections.length} Items)
                  </h4>
                  {isGeneratedFallback && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                      GrantFlow-Generated Application Structure
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  Exact questions preserved verbatim
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-200">
                {previewSections.map((sec, idx) => (
                  <div key={idx} className="p-3 bg-white hover:bg-slate-50 text-xs flex items-start justify-between gap-3">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px]">
                          {sec.sectionNumber}
                        </span>
                        <strong className="font-semibold text-slate-900">{sec.donorQuestion}</strong>
                      </div>
                      {sec.donorInstructions && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic">
                          {sec.donorInstructions}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                        {sec.assignedDepartment}
                      </span>
                      {sec.wordLimit && (
                        <span className="text-[10px] text-slate-500">
                          Max {sec.wordLimit}w
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-2"
          >
            <span>Initialize Application Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
