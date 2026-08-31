import React, { useState, useEffect } from 'react';
import {
  FundingCallExtraction,
  CriticalDonorFacts,
  FactVerificationStatus
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
  FileText,
  Clock,
  ShieldCheck,
  Info
} from 'lucide-react';

interface VerifyCriticalDetailsSectionProps {
  extraction: FundingCallExtraction;
  onConfirmAndContinue: (verifiedExtraction: FundingCallExtraction, verifiedFacts: CriticalDonorFacts) => void;
  isConfirmed: boolean;
  isPursuing?: boolean;
}

export const VerifyCriticalDetailsSection: React.FC<VerifyCriticalDetailsSectionProps> = ({
  extraction,
  onConfirmAndContinue,
  isConfirmed,
  isPursuing = false
}) => {
  const buildInitialFacts = (ext: FundingCallExtraction): CriticalDonorFacts => {
    if (ext.criticalFacts) return ext.criticalFacts;

    return {
      donorName: {
        value: ext.donor || 'Not stated in call.',
        sourceSnippet: ext.donor && ext.donor !== 'Not stated in call.' ? `Donor: ${ext.donor}` : '',
        sourceReference: 'Call Header',
        verificationStatus: ext.donor && ext.donor !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification'
      },
      opportunityTitle: {
        value: ext.opportunityTitle || 'Not stated in call.',
        sourceSnippet: ext.opportunityTitle && ext.opportunityTitle !== 'Not stated in call.' ? `Program Title: ${ext.opportunityTitle}` : '',
        sourceReference: 'Opportunity Title',
        verificationStatus: ext.opportunityTitle && ext.opportunityTitle !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification'
      },
      applicationDeadline: {
        value: ext.applicationDeadline || 'Not stated in call.',
        sourceSnippet: ext.deadlineToSourceSnippet || '',
        sourceReference: 'Submission Guidelines',
        verificationStatus: (ext.deadlineVerificationStatus as FactVerificationStatus) || (ext.applicationDeadline && ext.applicationDeadline !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification')
      },
      fundingAmount: {
        value: ext.fundingAmount || 'Not stated in call.',
        sourceSnippet: '',
        sourceReference: 'Award Information',
        verificationStatus: ext.fundingAmount && ext.fundingAmount !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification'
      },
      currency: {
        value: ext.currency || 'USD',
        sourceSnippet: '',
        sourceReference: 'Award Currency',
        verificationStatus: 'Confirmed from Source'
      },
      eligibleCountries: {
        value: ext.eligibleCountries || [],
        sourceSnippet: '',
        sourceReference: 'Eligibility Criteria',
        verificationStatus: ext.eligibleCountries?.length ? 'Confirmed from Source' : 'Needs Verification'
      },
      eligibleOrgTypes: {
        value: ext.eligibleOrgTypes || [],
        sourceSnippet: '',
        sourceReference: 'Eligibility Criteria',
        verificationStatus: ext.eligibleOrgTypes?.length ? 'Confirmed from Source' : 'Needs Verification'
      },
      coFundingRequirement: {
        value: ext.coFundingRequirement || 'Not stated in call.',
        sourceSnippet: '',
        sourceReference: 'Cost-Share Section',
        verificationStatus: ext.coFundingRequirement && ext.coFundingRequirement !== 'Not stated in call.' ? 'Confirmed from Source' : 'Not Stated in Source'
      },
      requiredSupportingDocs: {
        value: ext.requiredSupportingDocs || [],
        sourceSnippet: '',
        sourceReference: 'Submission Checklist',
        verificationStatus: ext.requiredSupportingDocs?.length ? 'Confirmed from Source' : 'Needs Verification'
      },
      wordLimits: {
        value: ext.wordLimits || 'Not stated in call.',
        sourceSnippet: '',
        sourceReference: 'Formatting Instructions',
        verificationStatus: ext.wordLimits && ext.wordLimits !== 'Not stated in call.' ? 'Confirmed from Source' : 'Not Stated in Source'
      },
      submissionMethod: {
        value: ext.submissionMethod || 'Not stated in call.',
        sourceSnippet: '',
        sourceReference: 'Submission Channel',
        verificationStatus: ext.submissionMethod && ext.submissionMethod !== 'Not stated in call.' ? 'Confirmed from Source' : 'Needs Verification'
      }
    };
  };

  const [facts, setFacts] = useState<CriticalDonorFacts>(() => buildInitialFacts(extraction));
  const [hasAcknowledgedUnverified, setHasAcknowledgedUnverified] = useState(false);

  useEffect(() => {
    setFacts(buildInitialFacts(extraction));
  }, [extraction]);

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
        verificationNotes: 'Manually verified and corrected by proposal lead.'
      }
    }));
  };

  const handleMarkAllAsHumanVerified = () => {
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
    setHasAcknowledgedUnverified(true);
  };

  // Check if any critical field still has "Needs Verification"
  const unverifiedFields = Object.entries(facts).filter(
    ([_, val]) => (val as any)?.verificationStatus === 'Needs Verification'
  );
  const hasUnverifiedItems = unverifiedFields.length > 0;
  const canContinue = !hasUnverifiedItems || hasAcknowledgedUnverified;

  const handleConfirm = () => {
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

    onConfirmAndContinue(updatedExtraction, facts);
  };

  const renderBadge = (status: FactVerificationStatus) => {
    switch (status) {
      case 'Confirmed from Source':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            Confirmed from Source
          </span>
        );
      case 'Human Verified':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <UserCheck className="w-3 h-3 text-blue-700" />
            Human Verified
          </span>
        );
      case 'Needs Verification':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-950 border border-amber-300 animate-pulse">
            <AlertTriangle className="w-3 h-3 text-amber-700" />
            Needs Verification
          </span>
        );
      case 'Not Stated in Source':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3 h-3 text-slate-500" />
            Not Stated in Source
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      id="verify-critical-details-section"
      className="bg-white border-2 border-indigo-200 rounded-2xl overflow-hidden shadow-lg"
    >
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
              Step 2 of 3 • Required Fact Verification
            </span>
            <span className="text-xs text-slate-400">Two-Pass Gemini Verification</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight mt-1.5 flex items-center gap-2">
            Verify Critical Opportunity Details
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-3xl">
            Review the extracted facts against verbatim source quotes. You can edit any field to mark it <strong>Human Verified</strong> before pursuing this opportunity.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllAsHumanVerified}
            className="px-3.5 py-2 bg-indigo-800/60 hover:bg-indigo-700 text-indigo-100 border border-indigo-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <UserCheck className="w-4 h-4 text-indigo-300" />
            <span>Mark All As Human Verified</span>
          </button>
        </div>
      </div>

      {/* Grid of Critical Donor Facts */}
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Donor Name */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                Donor / Funding Body
              </span>
              {renderBadge(facts.donorName.verificationStatus)}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={facts.donorName.value}
                onChange={e => updateField('donorName', e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {facts.donorName.sourceSnippet && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-500">Source Quote ({facts.donorName.sourceReference}):</span>
                <p className="italic mt-0.5 text-slate-800 font-medium">&ldquo;{facts.donorName.sourceSnippet}&rdquo;</p>
              </div>
            )}
          </div>

          {/* 2. Opportunity Title */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Opportunity Title
              </span>
              {renderBadge(facts.opportunityTitle.verificationStatus)}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={facts.opportunityTitle.value}
                onChange={e => updateField('opportunityTitle', e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {facts.opportunityTitle.sourceSnippet && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-500">Source Quote ({facts.opportunityTitle.sourceReference}):</span>
                <p className="italic mt-0.5 text-slate-800 font-medium">&ldquo;{facts.opportunityTitle.sourceSnippet}&rdquo;</p>
              </div>
            )}
          </div>

          {/* 3. Application Deadline (Core Planning Anchor) */}
          <div className="p-4 bg-rose-50/60 rounded-xl border-2 border-rose-200 space-y-2.5 md:col-span-2">
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
                className="flex-1 px-3.5 py-2.5 bg-white border border-rose-300 rounded-lg font-bold text-slate-900 text-sm focus:ring-2 focus:ring-rose-500"
              />
              <span className="text-xs text-slate-600 shrink-0 bg-white px-3 py-2 rounded-lg border border-slate-200">
                Formatted Deadline: <strong className="text-slate-900">{formatDeadline(facts.applicationDeadline.value)}</strong>
              </span>
            </div>
            {facts.applicationDeadline.sourceSnippet ? (
              <div className="text-xs text-rose-950 bg-white p-3 rounded-lg border border-rose-200">
                <span className="font-bold text-rose-700">Verbatim Supporting Source Text ({facts.applicationDeadline.sourceReference}):</span>
                <p className="italic font-medium text-slate-900 mt-1">&ldquo;{facts.applicationDeadline.sourceSnippet}&rdquo;</p>
              </div>
            ) : (
              <p className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Needs Verification — GrantFlow could not locate a confirmed closing date quote in the text. Please verify manually.</span>
              </p>
            )}
          </div>

          {/* 4. Funding Amount & Currency */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Funding Amount / Range & Currency
              </span>
              {renderBadge(facts.fundingAmount.verificationStatus)}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={facts.fundingAmount.value}
                onChange={e => updateField('fundingAmount', e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <input
                type="text"
                value={facts.currency.value}
                onChange={e => updateField('currency', e.target.value)}
                className="w-20 px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-sm text-center focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {facts.fundingAmount.sourceSnippet && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-500">Source Quote ({facts.fundingAmount.sourceReference}):</span>
                <p className="italic mt-0.5 text-slate-800 font-medium">&ldquo;{facts.fundingAmount.sourceSnippet}&rdquo;</p>
              </div>
            )}
          </div>

          {/* 5. Co-Funding Requirement */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                Co-Funding / Cost-Share Requirement
              </span>
              {renderBadge(facts.coFundingRequirement.verificationStatus)}
            </div>
            <input
              type="text"
              value={facts.coFundingRequirement.value}
              onChange={e => updateField('coFundingRequirement', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
            />
            {facts.coFundingRequirement.sourceSnippet && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-500">Source Quote ({facts.coFundingRequirement.sourceReference}):</span>
                <p className="italic mt-0.5 text-slate-800 font-medium">&ldquo;{facts.coFundingRequirement.sourceSnippet}&rdquo;</p>
              </div>
            )}
          </div>

          {/* 6. Geographic Eligibility */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                Eligible Geography / Countries
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
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
            />
            {facts.eligibleCountries.sourceSnippet && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-500">Source Quote ({facts.eligibleCountries.sourceReference}):</span>
                <p className="italic mt-0.5 text-slate-800 font-medium">&ldquo;{facts.eligibleCountries.sourceSnippet}&rdquo;</p>
              </div>
            )}
          </div>

          {/* 7. Applicant Eligibility (Org Types) */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                Eligible Applicant / Organisation Types
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
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
            />
            {facts.eligibleOrgTypes.sourceSnippet && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-500">Source Quote ({facts.eligibleOrgTypes.sourceReference}):</span>
                <p className="italic mt-0.5 text-slate-800 font-medium">&ldquo;{facts.eligibleOrgTypes.sourceSnippet}&rdquo;</p>
              </div>
            )}
          </div>

          {/* 8. Major Mandatory Conditions */}
          <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3 md:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                Major Mandatory Conditions (Documents, Word Limits, Submission Method)
              </span>
              {renderBadge(facts.requiredSupportingDocs.verificationStatus)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Mandatory Documents Checklist
                </label>
                <textarea
                  rows={3}
                  value={facts.requiredSupportingDocs.value.join('\n')}
                  onChange={e =>
                    updateField(
                      'requiredSupportingDocs',
                      e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="One document per line"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Word / Page Limits
                </label>
                <input
                  type="text"
                  value={facts.wordLimits.value}
                  onChange={e => updateField('wordLimits', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Status: {facts.wordLimits.verificationStatus}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1">
                  Submission Channel / Portal
                </label>
                <input
                  type="text"
                  value={facts.submissionMethod.value}
                  onChange={e => updateField('submissionMethod', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Status: {facts.submissionMethod.verificationStatus}
                </span>
              </div>
            </div>

            {facts.requiredSupportingDocs.sourceSnippet && (
              <div className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-500">Source Quote ({facts.requiredSupportingDocs.sourceReference}):</span>
                <p className="italic mt-0.5 text-slate-800 font-medium">&ldquo;{facts.requiredSupportingDocs.sourceSnippet}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Unverified Acknowledgement Gate if any fields are flagged */}
        {hasUnverifiedItems && (
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                Verification Required on {unverifiedFields.length} Field(s)
              </h4>
            </div>
            <p className="text-xs text-amber-900">
              The following fields could not be 100% confidently confirmed from source text:{' '}
              <strong>{unverifiedFields.map(([k]) => k).join(', ')}</strong>. You may edit them above or explicitly acknowledge them to proceed.
            </p>
            <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={hasAcknowledgedUnverified}
                onChange={e => setHasAcknowledgedUnverified(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-indigo-600 rounded cursor-pointer border-amber-400"
              />
              <span className="text-xs font-semibold text-amber-950">
                I have reviewed the unverified / ambiguous items above and explicitly acknowledge them to proceed.
              </span>
            </label>
          </div>
        )}

        {/* Confirmation & Action Button */}
        <div className="pt-2 p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Clicking <strong>Confirm &amp; Continue</strong> validates these critical facts and enables application workspace setup.
            </span>
          </div>

          <button
            id="confirm-critical-details-btn"
            type="button"
            onClick={handleConfirm}
            disabled={!canContinue || isPursuing}
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
          >
            {isPursuing ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Preparing Workspace...
              </>
            ) : (
              <>
                <span>Confirm &amp; Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
