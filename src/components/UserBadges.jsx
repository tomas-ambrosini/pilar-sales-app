import React, { useState } from 'react';
import { computeAutoBadges, mergeBadges } from '../utils/badges';

/**
 * Renders inline badge icons next to a user's name.
 * Uses dangerouslySetInnerHTML for inline SVG strings from the badge registry.
 * Shows up to `maxVisible` badges, with a +N overflow indicator.
 */
export default function UserBadges({ user, manualBadgeKeys = [], maxVisible = 4 }) {
  const [hoveredBadge, setHoveredBadge] = useState(null);

  const autoBadges = computeAutoBadges(user);
  const allBadges = mergeBadges(autoBadges, manualBadgeKeys);

  if (allBadges.length === 0) return null;

  const visible = allBadges.slice(0, maxVisible);
  const overflow = allBadges.length - maxVisible;

  return (
    <span className="inline-flex items-center gap-0.5 ml-1 shrink-0">
      {visible.map((badge) => (
        <span
          key={badge.key}
          className="relative"
          onMouseEnter={() => setHoveredBadge(badge.key)}
          onMouseLeave={() => setHoveredBadge(null)}
        >
          <span
            className={`inline-flex items-center justify-center w-[24px] h-[24px] rounded-md border cursor-default transition-all hover:scale-110 hover:shadow-sm ${badge.bg} ${badge.text} ${badge.border}`}
            dangerouslySetInnerHTML={{ __html: badge.svg }}
          />

          {/* Tooltip */}
          {hoveredBadge === badge.key && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none tracking-wide">
              {badge.tooltip}
              <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-slate-900" />
            </span>
          )}
        </span>
      ))}

      {overflow > 0 && (
        <span
          className="inline-flex items-center justify-center h-[24px] px-1.5 rounded-md text-[9px] font-black text-slate-400 bg-slate-50 border border-slate-200 cursor-default"
          title={allBadges.slice(maxVisible).map(b => b.tooltip).join(', ')}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
