import React, { useState } from 'react';
import { computeAutoBadges, mergeBadges } from '../utils/badges';

/**
 * Renders inline badge pills next to a user's name.
 * Each badge shows its icon + label as a colored pill.
 * Hover reveals a tooltip with the full description.
 */
export default function UserBadges({ user, manualBadgeKeys = [], maxVisible = 4 }) {
  const [hoveredBadge, setHoveredBadge] = useState(null);

  const autoBadges = computeAutoBadges(user);
  const allBadges = mergeBadges(autoBadges, manualBadgeKeys);

  if (allBadges.length === 0) return null;

  const visible = allBadges.slice(0, maxVisible);
  const overflow = allBadges.length - maxVisible;

  return (
    <span className="inline-flex items-center gap-1 ml-1.5 shrink-0 flex-wrap">
      {visible.map((badge) => (
        <span
          key={badge.key}
          className="relative"
          onMouseEnter={() => setHoveredBadge(badge.key)}
          onMouseLeave={() => setHoveredBadge(null)}
        >
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-default transition-all hover:scale-105 hover:shadow-md ${badge.bg} ${badge.text} ${badge.border}`}
          >
            <span className="shrink-0 [&>svg]:w-3 [&>svg]:h-3" dangerouslySetInnerHTML={{ __html: badge.svg }} />
            <span className="leading-none">{badge.label}</span>
          </span>

          {/* Tooltip */}
          {hoveredBadge === badge.key && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none tracking-wide">
              {badge.tooltip}
              <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900" />
            </span>
          )}
        </span>
      ))}

      {overflow > 0 && (
        <span
          className="inline-flex items-center justify-center h-5 px-1.5 rounded-full text-[9px] font-black text-slate-400 bg-slate-100 border border-slate-200 cursor-default"
          title={allBadges.slice(maxVisible).map(b => b.tooltip).join(', ')}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
