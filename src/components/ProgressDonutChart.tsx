import React, { useState } from 'react';
import { CheckCircle2, FileCheck, ListTodo, AlertCircle } from 'lucide-react';

interface ProgressDonutChartProps {
  completedTasks: number;
  totalTasks: number;
  readyDocs: number;
  totalDocs: number;
  mandatoryReadyDocs?: number;
  totalMandatoryDocs?: number;
  size?: 'sm' | 'md' | 'lg';
  showLegend?: boolean;
  onNavigateTab?: (tab: 'tasks' | 'documents') => void;
  className?: string;
}

export const ProgressDonutChart: React.FC<ProgressDonutChartProps> = ({
  completedTasks,
  totalTasks,
  readyDocs,
  totalDocs,
  mandatoryReadyDocs,
  totalMandatoryDocs,
  size = 'md',
  showLegend = true,
  onNavigateTab,
  className = ''
}) => {
  const [hoveredRing, setHoveredRing] = useState<'tasks' | 'docs' | 'overall' | null>(null);

  // Calculations
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const docPct = totalDocs > 0 ? Math.round((readyDocs / totalDocs) * 100) : 0;

  const totalItems = totalTasks + totalDocs;
  const completedItems = completedTasks + readyDocs;
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Chart dimensions based on size
  const config = {
    sm: {
      svgSize: 96,
      cx: 48,
      cy: 48,
      r1: 38, // Outer ring (Tasks)
      stroke1: 6,
      r2: 28, // Inner ring (Docs)
      stroke2: 6,
      centerTextSize: 'text-sm font-extrabold',
      centerSubtextSize: 'text-[9px]'
    },
    md: {
      svgSize: 136,
      cx: 68,
      cy: 68,
      r1: 54, // Outer ring (Tasks)
      stroke1: 9,
      r2: 40, // Inner ring (Docs)
      stroke2: 9,
      centerTextSize: 'text-xl font-black',
      centerSubtextSize: 'text-[10px]'
    },
    lg: {
      svgSize: 180,
      cx: 90,
      cy: 90,
      r1: 72, // Outer ring (Tasks)
      stroke1: 12,
      r2: 52, // Inner ring (Docs)
      stroke2: 12,
      centerTextSize: 'text-3xl font-black',
      centerSubtextSize: 'text-xs'
    }
  }[size];

  // Circumferences
  const c1 = 2 * Math.PI * config.r1;
  const c2 = 2 * Math.PI * config.r2;

  // Offsets (starting from top, so rotated -90deg)
  const offset1 = c1 - (taskPct / 100) * c1;
  const offset2 = c2 - (docPct / 100) * c2;

  const getReadinessColor = (pct: number) => {
    if (totalItems === 0) return 'text-slate-500';
    if (pct >= 100) return 'text-emerald-600';
    if (pct >= 70) return 'text-indigo-600';
    if (pct >= 40) return 'text-amber-600';
    return 'text-rose-600';
  };

  const getHoverText = () => {
    if (hoveredRing === 'tasks') {
      return {
        value: totalTasks > 0 ? `${taskPct}%` : '0%',
        label: `${completedTasks}/${totalTasks} Tasks`,
        color: 'text-emerald-700'
      };
    }
    if (hoveredRing === 'docs') {
      return {
        value: totalDocs > 0 ? `${docPct}%` : '0%',
        label: `${readyDocs}/${totalDocs} Docs`,
        color: 'text-indigo-700'
      };
    }
    return {
      value: `${overallPct}%`,
      label: totalItems === 0 ? 'No items' : overallPct === 100 ? 'Ready' : 'Overall',
      color: getReadinessColor(overallPct)
    };
  };

  const centerDisplay = getHoverText();

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-4 ${className}`} id="workspace-progress-donut">
      {/* SVG Dual-Ring Donut */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={config.svgSize}
          height={config.svgSize}
          className="transform -rotate-90"
          aria-label={`Overall progress ${overallPct}%: ${completedTasks} of ${totalTasks} tasks completed, ${readyDocs} of ${totalDocs} documents ready`}
        >
          {/* Outer Ring Background (Tasks) */}
          <circle
            cx={config.cx}
            cy={config.cy}
            r={config.r1}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={config.stroke1}
          />
          {/* Outer Ring Progress (Tasks - Emerald) */}
          <circle
            cx={config.cx}
            cy={config.cy}
            r={config.r1}
            fill="transparent"
            stroke="#059669"
            strokeWidth={hoveredRing === 'tasks' ? config.stroke1 + 2 : config.stroke1}
            strokeDasharray={c1}
            strokeDashoffset={offset1}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out cursor-pointer"
            onMouseEnter={() => setHoveredRing('tasks')}
            onMouseLeave={() => setHoveredRing(null)}
            onClick={() => onNavigateTab?.('tasks')}
          />

          {/* Inner Ring Background (Documents) */}
          <circle
            cx={config.cx}
            cy={config.cy}
            r={config.r2}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={config.stroke2}
          />
          {/* Inner Ring Progress (Docs - Indigo) */}
          <circle
            cx={config.cx}
            cy={config.cy}
            r={config.r2}
            fill="transparent"
            stroke="#4f46e5"
            strokeWidth={hoveredRing === 'docs' ? config.stroke2 + 2 : config.stroke2}
            strokeDasharray={c2}
            strokeDashoffset={offset2}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out cursor-pointer"
            onMouseEnter={() => setHoveredRing('docs')}
            onMouseLeave={() => setHoveredRing(null)}
            onClick={() => onNavigateTab?.('documents')}
          />
        </svg>

        {/* Center Percentage & Label Overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-300"
        >
          <span className={`${config.centerTextSize} ${centerDisplay.color} tracking-tight leading-none`}>
            {centerDisplay.value}
          </span>
          <span className={`${config.centerSubtextSize} font-bold text-slate-500 uppercase tracking-wider mt-0.5 max-w-[70px] truncate`}>
            {centerDisplay.label}
          </span>
        </div>
      </div>

      {/* Legend & Quick Breakdown */}
      {showLegend && (
        <div className="flex flex-col gap-2 min-w-[170px] text-xs">
          {/* Tasks Legend */}
          <button
            type="button"
            onClick={() => onNavigateTab?.('tasks')}
            onMouseEnter={() => setHoveredRing('tasks')}
            onMouseLeave={() => setHoveredRing(null)}
            className={`flex items-center justify-between gap-3 p-1.5 px-2.5 rounded-lg border text-left transition ${
              hoveredRing === 'tasks'
                ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
            title="Click to view preparation tasks checklist"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
              <div className="flex items-center gap-1">
                <ListTodo className="w-3.5 h-3.5 text-emerald-700" />
                <span className="font-semibold text-slate-800">Tasks</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-emerald-700">
                {completedTasks}/{totalTasks}
              </span>
              <span className="text-[10px] text-slate-400 font-mono ml-1">
                ({taskPct}%)
              </span>
            </div>
          </button>

          {/* Documents Legend */}
          <button
            type="button"
            onClick={() => onNavigateTab?.('documents')}
            onMouseEnter={() => setHoveredRing('docs')}
            onMouseLeave={() => setHoveredRing(null)}
            className={`flex items-center justify-between gap-3 p-1.5 px-2.5 rounded-lg border text-left transition ${
              hoveredRing === 'docs'
                ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
                : 'bg-white hover:bg-slate-50 border-slate-200'
            }`}
            title="Click to view documents checklist"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0" />
              <div className="flex items-center gap-1">
                <FileCheck className="w-3.5 h-3.5 text-indigo-700" />
                <span className="font-semibold text-slate-800">Documents</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-indigo-700">
                {readyDocs}/{totalDocs}
              </span>
              <span className="text-[10px] text-slate-400 font-mono ml-1">
                ({docPct}%)
              </span>
            </div>
          </button>

          {/* Combined Status Pill */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 px-1">
            <span>Overall Readiness:</span>
            <span className={`font-bold ${overallPct === 100 ? 'text-emerald-700' : 'text-slate-700'}`}>
              {completedItems}/{totalItems} items ({overallPct}%)
            </span>
          </div>

          {totalMandatoryDocs !== undefined && mandatoryReadyDocs !== undefined && (
            <div className="flex items-center gap-1 text-[10px] text-slate-500 px-1">
              {mandatoryReadyDocs === totalMandatoryDocs ? (
                <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  All {totalMandatoryDocs} mandatory docs ready
                </span>
              ) : (
                <span className="text-amber-700 font-medium flex items-center gap-0.5">
                  <AlertCircle className="w-3 h-3 text-amber-600" />
                  {totalMandatoryDocs - mandatoryReadyDocs} mandatory docs still required
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
