import React, { useState } from 'react';
import {
  FundingCallExtraction,
  CriticalDonorFacts,
  FactVerificationStatus,
  VerifiedField
} from '../types';
import { formatDeadline } from '../utils/dateUtils';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  UserCheck,
  Calendar,
  DollarSign,
  Globe2,
  Building,
  FileCheck,
  Layers,
  ArrowRight,
  X,
  FileText,
  Clock,
  ShieldAlert,
  Edit3
} from 'lucide-react';

interface VerifyCriticalDetailsModalProps {
  extraction: FundingCallExtraction;
  onConfirm: (verifiedExtraction: FundingCallExtraction, verifiedFacts: CriticalDonorFacts) => void;
  onClose: () => void;
}

export const VerifyCriticalDetailsModal: React.FC<VerifyCriticalDetailsModalProps> = ({
  extraction,
  onConfirm,
  onClose
}) => {
  // Initialize editable state from extraction.criticalFacts or fallback
  const initialFacts: CriticalDonorFacts = extraction.criticalFacts || {
    donorName: {
      value: extraction.donor,
      sourceSnippet: '',
      sourceReference: 'Document Header',
      verificationStatus: extraction.donor && extraction.donor !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification'
    },
    opportunityTitle: {
      value: extraction.opportunityTitle,
      sourceSnippet: '',
      sourceReference: 'Opportunity Title',
      verificationStatus: extraction.opportunityTitle && extraction.opportunityTitle !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification'
    },
    applicationDeadline: {
      value: extraction.applicationDeadline,
      sourceSnippet: extraction.deadlineToSourceSnippet || '',
      sourceReference: 'Submission Guidelines',
      verificationStatus: (extraction.deadlineVerificationStatus as FactVerificationStatus) || (extraction.applicationDeadline && extraction.applicationDeadline !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification')
    },
    fundingAmount: {
      value: extraction.fundingAmount,
      sourceSnippet: '',
      sourceReference: 'Award Information',
      verificationStatus: extraction.fundingAmount && extraction.fundingAmount !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification'
    },
    currency: {
      value: extraction.currency || 'USD',
      sourceSnippet: '',
      sourceReference: 'Award Currency',
      verificationStatus: 'Confirmed from Source'
    },
    eligibleCountries: {
      value: extraction.eligibleCountries || [],
      sourceSnippet: '',
      sourceReference: 'Eligibility Criteria',
      verificationStatus: extraction.eligibleCountries?.length ? 'Confirmed from Source' : 'Needs Verification'
    },
    eligibleOrgTypes: {
      value: extraction.eligibleOrgTypes || [],
      sourceSnippet: '',
      sourceReference: 'Eligibility Criteria',
      verificationStatus: extraction.eligibleOrgTypes?.length ? 'Confirmed from Source' : 'Needs Verification'
    },
    coFundingRequirement: {
      value: extraction.coFundingRequirement || 'Not stated in call.',
      sourceSnippet: '',
      sourceReference: 'Cost-Share Section',
      verificationStatus: extraction.coFundingRequirement && extraction.coFundingRequirement !== 'Not stated in call.' ? 'Confirmed from Source' : 'Not Stated in Source'
    },
    requiredSupportingDocs: {
      value: extraction.requiredSupportingDocs || [],
      sourceSnippet: '',
      sourceReference: 'Submission Checklist',
      verificationStatus: extraction.requiredSupportingDocs?.length ? 'Confirmed from Source' : 'Needs Verification'
    },
    wordLimits: {
      value: extraction.wordLimits || 'Not stated in call.',
      sourceSnippet: '',
      sourceReference: 'Formatting Instructions',
      verificationStatus: extraction.wordLimits && extraction.wordLimits !== 'Not stated in call.' ? 'Confirmed from Source' : 'Not Stated in Source'
    },
    submissionMethod: {
      value: extraction.submissionMethod || 'Not stated in call.',
      sourceSnippet: '',
      sourceReference: 'Submission Method',
      verificationStatus: extraction.submissionMethod && extraction.submissionMethod !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification'
    }
  };

  const [facts, setFacts] = useState<CriticalDonorFacts>(initialFacts);

  // Helper to update a field value and transition to 'Human Verified'
  const updateField = <K extends keyof CriticalDonorFacts>(
    field: K,
    newValue: CriticalDonorFacts[K]['value'],
    statusOverride?: FactVerificationStatus
  ) => {
    setFacts(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        value: newValue,
        verificationStatus: statusOverride || 'Human Verified',
        verificationNotes: statusOverride === 'Human Verified' || !statusOverride
          ? 'Verified and confirmed by proposal lead.'
          : prev[field].verificationNotes
      }
    }));
  };

  const handleVerifyAllAsHuman = () => {
    const updated: CriticalDonorFacts = {
      ...facts,
      donorName: { ...facts.donorName, verificationStatus: 'Human Verified' },
      opportunityTitle: { ...facts.opportunityTitle, verificationStatus: 'Human Verified' },
      applicationDeadline: { ...facts.applicationDeadline, verificationStatus: 'Human Verified' },
      fundingAmount: { ...facts.fundingAmount, verificationStatus: 'Human Verified' },
      currency: { ...facts.currency, verificationStatus: 'Human Verified' },
      eligibleCountries: { ...facts.eligibleCountries, verificationStatus: 'Human Verified' },
      eligibleOrgTypes: { ...facts.eligibleOrgTypes, verificationStatus: 'Human Verified' },
      coFundingRequirement: { ...facts.coFundingRequirement, verificationStatus: facts.coFundingRequirement.verificationStatus === 'Not Stated in Source' ? 'Not Stated in Source' : 'Human Verified' },
      requiredSupportingDocs: { ...facts.requiredSupportingDocs, verificationStatus: 'Human Verified' },
      wordLimits: { ...facts.wordLimits, verificationStatus: facts.wordLimits.verificationStatus === 'Not Stated in Source' ? 'Not Stated in Source' : 'Human Verified' },
      submissionMethod: { ...facts.submissionMethod, verificationStatus: 'Human Verified' }
    };
    setFacts(updated);
  };

  const handleSaveAndProceed = () => {
    // Synchronize verified extraction
    const updatedExtraction: FundingCallExtraction = {
      ...extraction,
      donor: facts.donorName.value,
      opportunityTitle: facts.opportunityTitle.value,
      applicationDeadline: facts.applicationDeadline.value,
      deadlineVerificationStatus: (facts.applicationDeadline.verificationStatus as any) || 'Human verified',
      deadlineToSourceSnippet: facts.applicationDeadline.sourceSnippet,
      fundingAmount: facts.fundingAmount.value,
      currency: facts.currency.value,
      eligibleCountries: facts.eligibleCountries.value,
      eligibleOrgTypes: facts.eligibleOrgTypes.value,
      coFundingRequirement: facts.coFundingRequirement.value,
      requiredSupportingDocs: facts.requiredSupportingDocs.value,
      wordLimits: facts.wordLimits.value,
      submissionMethod: facts.submissionMethod.value,
      criticalFacts: facts
    };

    onConfirm(updatedExtraction, facts);
  };

  const renderBadge = (status: FactVerificationStatus) => {
    switch (status) {
      case 'Confirmed from Source':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Confirmed from Source
          </span>
        );
      case 'Human Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <UserCheck className="w-3.5 h-3.5 text-blue-700" />
            Human Verified
          </span>
        );
      case 'Needs Verification':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            Needs Verification
          </span>
        );
      case 'Not Stated in Source':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Not Stated in Source
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-indigo-300" />
                Evidence & Fact Audit
              </span>
              <span className="text-xs text-slate-400">Two-Pass Gemini Verification</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-1 flex items-center gap-2">
              Verify Critical Opportunity Details
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Cross-check the extracted values against verbatim source text before creating the proposal workspace. You can edit any field to mark it <strong>Human Verified</strong>.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Quick Notice Banner */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs text-indigo-950">
              <ShieldAlert className="w-4 h-4 text-indigo-700 shrink-0" />
              <span>
                All proposal milestones and task schedules will be anchored to the verified donor deadline below.
              </span>
            </div>
            <button
              type="button"
              onClick={handleVerifyAllAsHuman}
              className="shrink-0 px-3 py-1.5 bg-white text-indigo-700 hover:bg-indigo-100/70 border border-indigo-300 rounded-lg font-semibold text-xs transition flex items-center gap-1"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              Mark All As Human Verified
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Donor Name */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  Donor / Funding Body
                </span>
                {renderBadge(facts.donorName.verificationStatus)}
              </div>
              <input
                type="text"
                value={facts.donorName.value}
                onChange={e => updateField('donorName', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              {facts.donorName.sourceSnippet && (
                <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200/80">
                  <span className="font-semibold text-slate-500">Source Quote ({facts.donorName.sourceReference}):</span>
                  <p className="italic mt-0.5 text-slate-800">"{facts.donorName.sourceSnippet}"</p>
                </div>
              )}
            </div>

            {/* 2. Opportunity Title */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Opportunity Title
                </span>
                {renderBadge(facts.opportunityTitle.verificationStatus)}
              </div>
              <input
                type="text"
                value={facts.opportunityTitle.value}
                onChange={e => updateField('opportunityTitle', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              {facts.opportunityTitle.sourceSnippet && (
                <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200/80">
                  <span className="font-semibold text-slate-500">Source Quote ({facts.opportunityTitle.sourceReference}):</span>
                  <p className="italic mt-0.5 text-slate-800">"{facts.opportunityTitle.sourceSnippet}"</p>
                </div>
              )}
            </div>

            {/* 3. Application Deadline (Core Anchor) */}
            <div className="p-4 bg-rose-50/50 rounded-xl border-2 border-rose-200 space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-rose-600" />
                  Application Deadline (Planning Anchor)
                </span>
                {renderBadge(facts.applicationDeadline.verificationStatus)}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="text"
                  value={facts.applicationDeadline.value}
                  onChange={e => updateField('applicationDeadline', e.target.value)}
                  placeholder="e.g. 1 November 2026 or 2026-11-01"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-rose-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-rose-500 text-sm"
                />
                <span className="text-xs text-slate-500 shrink-0">
                  Formatted: <strong>{formatDeadline(facts.applicationDeadline.value)}</strong>
                </span>
              </div>
              {facts.applicationDeadline.sourceSnippet ? (
                <div className="text-xs text-rose-950 bg-white p-2.5 rounded-lg border border-rose-200">
                  <span className="font-bold text-rose-700">Verbatim Supporting Source Text ({facts.applicationDeadline.sourceReference}):</span>
                  <p className="italic font-medium text-slate-900 mt-1">"{facts.applicationDeadline.sourceSnippet}"</p>
                </div>
              ) : (
                <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                  ⚠️ Needs Verification — GrantFlow could not locate a confirmed closing date quote. Please verify manually.
                </p>
              )}
            </div>

            {/* 4. Funding Amount & Currency */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  Funding Amount & Currency
                </span>
                {renderBadge(facts.fundingAmount.verificationStatus)}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={facts.fundingAmount.value}
                  onChange={e => updateField('fundingAmount', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 text-sm"
                />
                <input
                  type="text"
                  value={facts.currency.value}
                  onChange={e => updateField('currency', e.target.value)}
                  className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-sm text-center"
                />
              </div>
              {facts.fundingAmount.sourceSnippet && (
                <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200/80">
                  <span className="font-semibold text-slate-500">Source Quote ({facts.fundingAmount.sourceReference}):</span>
                  <p className="italic mt-0.5 text-slate-800">"{facts.fundingAmount.sourceSnippet}"</p>
                </div>
              )}
            </div>

            {/* 5. Co-Funding Requirement */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Co-Funding / Cost Share
                </span>
                {renderBadge(facts.coFundingRequirement.verificationStatus)}
              </div>
              <input
                type="text"
                value={facts.coFundingRequirement.value}
                onChange={e => updateField('coFundingRequirement', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm"
              />
              {facts.coFundingRequirement.sourceSnippet && (
                <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200/80">
                  <span className="font-semibold text-slate-500">Source Quote ({facts.coFundingRequirement.sourceReference}):</span>
                  <p className="italic mt-0.5 text-slate-800">"{facts.coFundingRequirement.sourceSnippet}"</p>
                </div>
              )}
            </div>

            {/* 6. Geographic Eligibility */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                  Eligible Countries
                </span>
                {renderBadge(facts.eligibleCountries.verificationStatus)}
              </div>
              <input
                type="text"
                value={facts.eligibleCountries.value.join(', ')}
                onChange={e =>
                  updateField(
                    'eligibleCountries',
                    e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  )
                }
                placeholder="Separate countries with commas"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm"
              />
              {facts.eligibleCountries.sourceSnippet && (
                <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200/80">
                  <span className="font-semibold text-slate-500">Source Quote ({facts.eligibleCountries.sourceReference}):</span>
                  <p className="italic mt-0.5 text-slate-800">"{facts.eligibleCountries.sourceSnippet}"</p>
                </div>
              )}
            </div>

            {/* 7. Applicant Eligibility (Org Types) */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  Eligible Organisation Types
                </span>
                {renderBadge(facts.eligibleOrgTypes.verificationStatus)}
              </div>
              <input
                type="text"
                value={facts.eligibleOrgTypes.value.join(', ')}
                onChange={e =>
                  updateField(
                    'eligibleOrgTypes',
                    e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                  )
                }
                placeholder="e.g. Registered National NGOs, CSOs"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm"
              />
              {facts.eligibleOrgTypes.sourceSnippet && (
                <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200/80">
                  <span className="font-semibold text-slate-500">Source Quote ({facts.eligibleOrgTypes.sourceReference}):</span>
                  <p className="italic mt-0.5 text-slate-800">"{facts.eligibleOrgTypes.sourceSnippet}"</p>
                </div>
              )}
            </div>

            {/* 8. Mandatory Supporting Documents */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Mandatory Supporting Documents
                </span>
                {renderBadge(facts.requiredSupportingDocs.verificationStatus)}
              </div>
              <textarea
                rows={2}
                value={facts.requiredSupportingDocs.value.join('\n')}
                onChange={e =>
                  updateField(
                    'requiredSupportingDocs',
                    e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                  )
                }
                placeholder="One document requirement per line"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-xs font-mono"
              />
              {facts.requiredSupportingDocs.sourceSnippet && (
                <div className="text-xs text-slate-600 bg-white p-2 rounded border border-slate-200/80">
                  <span className="font-semibold text-slate-500">Source Quote ({facts.requiredSupportingDocs.sourceReference}):</span>
                  <p className="italic mt-0.5 text-slate-800">"{facts.requiredSupportingDocs.sourceSnippet}"</p>
                </div>
              )}
            </div>

            {/* 9. Word Limits & Submission Method */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  Word / Page Limits
                </span>
                {renderBadge(facts.wordLimits.verificationStatus)}
              </div>
              <input
                type="text"
                value={facts.wordLimits.value}
                onChange={e => updateField('wordLimits', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm"
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Submission Method & Destination
                </span>
                {renderBadge(facts.submissionMethod.verificationStatus)}
              </div>
              <input
                type="text"
                value={facts.submissionMethod.value}
                onChange={e => updateField('submissionMethod', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveAndProceed}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2"
          >
            <span>Confirm & Proceed to Application Setup</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
