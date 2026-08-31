import React, { useState } from 'react';
import { StructuredMultiSelect } from './StructuredMultiSelect';
import { STANDARD_COUNTRIES } from '../data/taxonomyOptions';
import { MapPin, Plus, Tag } from 'lucide-react';

export interface GeographicFootprintSelectProps {
  selectedGeos: string[]; // Combined list of countries and states/regions
  onChange: (geos: string[]) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
}

export const GeographicFootprintSelect: React.FC<GeographicFootprintSelectProps> = ({
  selectedGeos = [],
  onChange,
  disabled = false,
  label = 'Geographic Footprint & Field Locations',
  helperText
}) => {
  const [stateInput, setStateInput] = useState('');

  // Extract country names vs state/sub-region names
  const countries = selectedGeos.filter(g => STANDARD_COUNTRIES.includes(g) || (!g.toLowerCase().includes('state') && !g.toLowerCase().includes('county') && !g.toLowerCase().includes('region') && !g.toLowerCase().includes('district') && !g.toLowerCase().includes('province')));
  const subRegions = selectedGeos.filter(g => !countries.includes(g));

  const handleCountrySelectionChange = (newCountries: string[]) => {
    // Keep all existing subregions and update countries
    onChange([...newCountries, ...subRegions]);
  };

  const handleAddSubRegion = () => {
    const trimmed = stateInput.trim();
    if (trimmed && !selectedGeos.includes(trimmed)) {
      onChange([...selectedGeos, trimmed]);
      setStateInput('');
    }
  };

  const handleRemoveSubRegion = (subRegionToRemove: string) => {
    onChange(selectedGeos.filter(g => g !== subRegionToRemove));
  };

  if (disabled) {
    return (
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          {label} ({selectedGeos.length})
        </label>
        {selectedGeos.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {selectedGeos.map((geo, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
              >
                <MapPin className="w-3 h-3 text-emerald-500" />
                {geo}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-1">Not configured</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Countries Multi-Select */}
      <StructuredMultiSelect
        label="Operational Countries"
        options={STANDARD_COUNTRIES}
        selected={selectedGeos.filter(g => STANDARD_COUNTRIES.includes(g) || !subRegions.includes(g))}
        onChange={handleCountrySelectionChange}
        placeholder="Select operational countries..."
        badgeColor="emerald"
        allowCustom={true}
        customPlaceholder="Add other country..."
      />

      {/* 2. States / Counties / Field Regions */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Specific States / Provinces / Counties ({subRegions.length})
        </label>

        {subRegions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 py-1">
            {subRegions.map((sub, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
              >
                <MapPin className="w-3 h-3 text-emerald-600" />
                <span>{sub}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSubRegion(sub)}
                  className="text-emerald-500 hover:text-emerald-900 font-bold ml-1 text-sm leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={stateInput}
            onChange={e => setStateInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSubRegion();
              }
            }}
            placeholder="Add specific state/county (e.g. Borno State, Nairobi County, Greater Accra)..."
            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={handleAddSubRegion}
            disabled={!stateInput.trim()}
            className="px-3.5 py-1.5 text-xs bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-40 font-bold flex items-center gap-1 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Region
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          Optional sub-national locations used for fine-grained geographic matching in Opportunity Scout.
        </p>
      </div>

      {helperText && <p className="text-[11px] text-slate-400">{helperText}</p>}
    </div>
  );
};
