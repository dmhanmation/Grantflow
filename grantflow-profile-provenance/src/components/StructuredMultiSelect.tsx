import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus, Search, Tag, FileText, CheckCircle2, UserPlus } from 'lucide-react';

// Provenance of a selected value:
//  - 'derived'  : extracted from an uploaded document by GrantFlow
//  - 'added'    : entered manually by a person
//  - 'verified' : a derived value a person has reviewed and confirmed
export type ProvenanceState = 'derived' | 'added' | 'verified';

export interface StructuredMultiSelectProps {
  label?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  customPlaceholder?: string;
  badgeColor?: 'indigo' | 'emerald' | 'amber' | 'blue' | 'purple' | 'slate';
  disabled?: boolean;
  helperText?: string;
  maxDisplayTags?: number;
  // Provenance is optional and fully backward compatible. When a provenance map
  // is supplied, chips show where each value came from and derived values can be verified.
  provenance?: Record<string, ProvenanceState>;
  onProvenanceChange?: (next: Record<string, ProvenanceState>) => void;
  showProvenance?: boolean;
}

export const StructuredMultiSelect: React.FC<StructuredMultiSelectProps> = ({
  label,
  options = [],
  selected = [],
  onChange,
  placeholder = 'Select options...',
  allowCustom = true,
  customPlaceholder = 'Add custom option...',
  badgeColor = 'indigo',
  disabled = false,
  helperText,
  maxDisplayTags = 50,
  provenance,
  onProvenanceChange,
  showProvenance
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customInput, setCustomInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const provenanceEnabled = showProvenance ?? Boolean(provenance);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
  };
  const badgeColorClass = colorClasses[badgeColor] || colorClasses.indigo;

  // Provenance visual styling per state
  const provenanceChipClass: Record<ProvenanceState, string> = {
    derived: 'bg-blue-50 text-blue-800 border-blue-200',
    added: 'bg-slate-100 text-slate-700 border-slate-300',
    verified: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  };
  const stateOf = (value: string): ProvenanceState => provenance?.[value] || 'added';

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );
  const customSelectedValues = selected.filter(s => !options.includes(s));

  // ---- provenance-aware mutators ----
  const markProvenance = (value: string, state: ProvenanceState) => {
    if (!onProvenanceChange) return;
    onProvenanceChange({ ...(provenance || {}), [value]: state });
  };
  const dropProvenance = (value: string) => {
    if (!onProvenanceChange) return;
    const next = { ...(provenance || {}) };
    delete next[value];
    onProvenanceChange(next);
  };

  const toggleOption = (option: string) => {
    if (disabled) return;
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
      dropProvenance(option);
    } else {
      onChange([...selected, option]);
      // Turning a value on by hand is a human addition, unless it was already derived.
      if (!provenance?.[option]) markProvenance(option, 'added');
    }
  };

  const handleAddCustom = () => {
    if (disabled) return;
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      if (!provenance?.[trimmed]) markProvenance(trimmed, 'added');
      setCustomInput('');
    }
  };

  const handleRemove = (itemToRemove: string, e?: React.MouseEvent) => {
    if (disabled) return;
    if (e) e.stopPropagation();
    onChange(selected.filter(item => item !== itemToRemove));
    // Removing one value never touches the provenance of any other value.
    dropProvenance(itemToRemove);
  };

  const handleVerify = (value: string, e?: React.MouseEvent) => {
    if (disabled) return;
    if (e) e.stopPropagation();
    markProvenance(value, 'verified');
  };

  const handleClearAll = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    onChange([]);
    if (onProvenanceChange) onProvenanceChange({});
  };

  const provenanceIcon = (state: ProvenanceState) => {
    if (state === 'derived') return <FileText className="w-3 h-3 shrink-0" />;
    if (state === 'verified') return <CheckCircle2 className="w-3 h-3 shrink-0" />;
    return <UserPlus className="w-3 h-3 shrink-0" />;
  };
  const provenanceLabel: Record<ProvenanceState, string> = {
    derived: 'From document',
    added: 'Added',
    verified: 'Verified'
  };

  return (
    <div className="space-y-1.5 w-full" ref={dropdownRef}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {label} {selected.length > 0 && <span className="text-indigo-600 font-bold">({selected.length})</span>}
          </label>
          {selected.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-slate-400 hover:text-rose-600 transition font-medium"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Selected Tags Display */}
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 py-1">
          {selected.slice(0, maxDisplayTags).map((item, idx) => {
            if (provenanceEnabled) {
              const state = stateOf(item);
              return (
                <span
                  key={idx}
                  title={provenanceLabel[state]}
                  className={`inline-flex items-center gap-1 pl-2 pr-1.5 py-1 rounded-md text-xs font-semibold border ${provenanceChipClass[state]}`}
                >
                  {provenanceIcon(state)}
                  <span>{item}</span>
                  {state === 'derived' && !disabled && onProvenanceChange && (
                    <button
                      type="button"
                      onClick={(e) => handleVerify(item, e)}
                      title="Confirm this value is correct"
                      className="ml-0.5 px-1 py-0.5 rounded bg-white/70 text-emerald-700 hover:bg-white text-[10px] font-bold border border-emerald-200"
                    >
                      Verify
                    </button>
                  )}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemove(item, e)}
                      className="hover:text-rose-700 ml-0.5 font-bold text-sm leading-none focus:outline-hidden"
                      title={`Remove ${item}`}
                    >
                      ×
                    </button>
                  )}
                </span>
              );
            }
            return (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition ${badgeColorClass}`}
              >
                <Tag className="w-3 h-3 opacity-60 shrink-0" />
                <span>{item}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => handleRemove(item, e)}
                    className="hover:text-rose-700 ml-1 font-bold text-sm leading-none focus:outline-hidden"
                    title={`Remove ${item}`}
                  >
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      ) : (
        !isOpen && !disabled && (
          <p className="text-xs text-slate-400 italic py-0.5">Not configured</p>
        )
      )}

      {/* Provenance legend */}
      {provenanceEnabled && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1"><FileText className="w-3 h-3 text-blue-600" /> From document</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified</span>
          <span className="inline-flex items-center gap-1"><UserPlus className="w-3 h-3 text-slate-500" /> Added by you</span>
        </div>
      )}

      {/* Dropdown Trigger */}
      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-left hover:border-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs transition"
          >
            <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-700 font-medium'}>
              {selected.length === 0 ? placeholder : `${selected.length} selected — click to add/remove`}
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in duration-100 max-h-80 overflow-y-auto space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter standard options..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option, idx) => {
                    const isChecked = selected.includes(option);
                    return (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => toggleOption(option)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                          isChecked
                            ? 'bg-indigo-50 text-indigo-900 font-bold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate mr-2">{option}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 py-2 text-center italic">
                    No standard options matching "{searchQuery}"
                  </p>
                )}

                {customSelectedValues.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 block">
                      Custom Values
                    </span>
                    {customSelectedValues.map((customVal, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs bg-indigo-50/60 text-indigo-900 font-semibold"
                      >
                        <span className="truncate">{customVal}</span>
                        <button
                          type="button"
                          onClick={() => handleRemove(customVal)}
                          className="text-rose-600 hover:text-rose-800 text-sm font-bold ml-2"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {allowCustom && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Other (Add Custom)
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={customInput}
                      onChange={e => setCustomInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustom();
                        }
                      }}
                      placeholder={customPlaceholder}
                      className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      disabled={!customInput.trim()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {helperText && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
};
