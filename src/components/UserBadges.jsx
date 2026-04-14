import React, { useState } from 'react';
import { computeAutoBadges, mergeBadges } from '../utils/badges';

/**
 * Renders inline badge pills next to a user's name.
 * Shows up to `maxVisible` badges, with a +N overflow indicator.
 *
 * @param {Object} props
 * @param {Object} props.user - user_profiles row
 * @param {string[]} props.manualBadgeKeys - badge keys from user_badges table
 * @param {number} props.maxVisible - max badges to show before overflow (default 4)
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
            className={`inline-flex items-center justify-center w-[22px] h-[22px] rounded-md text-[11px] border cursor-default transition-transform hover:scale-110 ${badge.bg} ${badge.text} ${badge.border}`}
            title={badge.tooltip}
          >
            {badge.emoji}
          </span>

          {/* Tooltip */}
          {hoveredBadge === badge.key && (
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-md whitespace-nowrap shadow-lg z-50 pointer-events-none">
              {badge.tooltip}
              <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
            </span>
          )}
        </span>
      ))}

      {overflow > 0 && (
        <span
          className="inline-flex items-center justify-center h-[22px] px-1.5 rounded-md text-[9px] font-black text-slate-400 bg-slate-100 border border-slate-200 cursor-default"
          title={allBadges.slice(maxVisible).map(b => b.tooltip).join(', ')}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
