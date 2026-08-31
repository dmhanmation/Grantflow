import React, { useState, useEffect } from 'react';

export interface StructuredSingleSelectProps {
  label?: string;
  options: string[];
  selected: string;
  onChange: (selected: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  disabled?: boolean;
  helperText?: string;
}

export const StructuredSingleSelect: React.FC<StructuredSingleSelectProps> = ({
  label,
  options = [],
  selected = '',
  onChange,
  placeholder = 'Select classification...',
  allowCustom = true,
  disabled = false,
  helperText
}) => {
  const isCustomOption = Boolean(selected && !options.includes(selected));
  const [selectMode, setSelectMode] = useState<string>(
    isCustomOption ? 'OTHER_CUSTOM' : selected || ''
  );
  const [customText, setCustomText] = useState<string>(isCustomOption ? selected : '');

  useEffect(() => {
    const isCustom = Boolean(selected && !options.includes(selected));
    if (isCustom) {
      setSelectMode('OTHER_CUSTOM');
      setCustomText(selected);
    } else {
      setSelectMode(selected || '');
    }
  }, [selected, options]);

  const handleSelectChange = (val: string) => {
    setSelectMode(val);
    if (val === 'OTHER_CUSTOM') {
      onChange(customText.trim() || 'Custom Organisation');
    } else {
      onChange(val);
    }
  };

  const handleCustomTextChange = (val: string) => {
    setCustomText(val);
    onChange(val);
  };

  if (disabled) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            {label}
          </label>
        )}
        {selected ? (
          <p className="text-sm text-slate-800">{selected}</p>
        ) : (
          <p className="text-sm text-slate-400 italic">Not configured</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
      )}

      <select
        value={selectMode}
        onChange={e => handleSelectChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
      >
        <option value="">-- {placeholder} --</option>
        {options.map((opt, idx) => (
          <option key={idx} value={opt}>
            {opt}
          </option>
        ))}
        {allowCustom && <option value="OTHER_CUSTOM">Other (Specify custom classification)</option>}
      </select>

      {selectMode === 'OTHER_CUSTOM' && allowCustom && (
        <div className="pt-1">
          <input
            type="text"
            value={customText}
            onChange={e => handleCustomTextChange(e.target.value)}
            placeholder="Type custom organisation classification..."
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
            autoFocus
          />
        </div>
      )}

      {helperText && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
};
