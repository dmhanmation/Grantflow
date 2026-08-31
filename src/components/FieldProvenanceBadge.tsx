import React, { useState } from 'react';
import { DocumentProvenancedField, DocumentVerificationStatus } from '../types';
import {
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  FileText,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  Info
} from 'lucide-react';

interface FieldProvenanceBadgeProps {
  provenance?: DocumentProvenancedField<any>;
  fieldName?: string;
  className?: string;
  compact?: boolean;
}

export const FieldProvenanceBadge: React.FC<FieldProvenanceBadgeProps> = ({
  provenance,
  fieldName,
  className = '',
  compact = false
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!provenance) return null;

  const status: DocumentVerificationStatus = provenance.status || 'Needs Human Verification';

  const getStatusBadge = () => {
    switch (status) {
      case 'Confirmed from Document':
        return {
          label: 'Confirmed from Document',
          shortLabel: 'Confirmed',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          text: 'text-emerald-700',
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
        };
      case 'Derived from Documents':
        return {
          label: 'Derived from Documents',
          shortLabel: 'Derived',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
        };
      case 'Needs Human Verification':
        return {
          label: 'Needs Human Verification',
          shortLabel: 'Verify',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          text: 'text-amber-700',
          icon: <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
        };
      case 'Not Provided / Missing':
      default:
        return {
          label: 'Not in Documents',
          shortLabel: 'Missing',
          bg: 'bg-slate-100',
          border: 'border-slate-200',
          text: 'text-slate-600',
          icon: <Info className="w-3 h-3 text-slate-500 shrink-0" />
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${badge.bg} ${badge.border} ${badge.text} hover:opacity-90 cursor-pointer shadow-2xs`}
        title="Click or hover to inspect document source evidence"
      >
        {badge.icon}
        <span>{compact ? badge.shortLabel : badge.label}</span>
      </button>

      {/* Popover / Tooltip */}
      {showTooltip && (
        <div className="absolute left-0 top-full mt-1.5 z-40 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 text-xs space-y-2 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>{badge.label}</span>
            </div>
            {provenance.confidence && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                {provenance.confidence} Conf.
              </span>
            )}
          </div>

          {provenance.sourceDocument && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Evidence Source
              </span>
              <div className="flex items-center gap-1.5 text-indigo-300 font-medium text-[11px]">
                <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                <span className="truncate">{provenance.sourceDocument}</span>
              </div>
            </div>
          )}

          {provenance.sourceSnippet && (
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                Verbatim Extracted Text
              </span>
              <p className="text-[11px] text-slate-200 bg-slate-950/80 p-2 rounded-lg border border-slate-800 font-mono text-[10px] leading-relaxed italic line-clamp-4">
                "{provenance.sourceSnippet}"
              </p>
            </div>
          )}

          {provenance.isConflict && provenance.conflictDetails && (
            <div className="p-2 rounded bg-rose-950/80 border border-rose-800 text-rose-200 text-[10px]">
              <strong>Conflict Flag:</strong> {provenance.conflictDetails}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
