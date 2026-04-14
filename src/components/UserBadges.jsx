import React, { useState } from 'react';
import { computeAutoBadges, mergeBadges } from '../utils/badges';

/**
 * Renders premium circular badge icons next to a user's name.
 * Icon-only display. Hover reveals the badge name in a tooltip.
 */
export default function UserBadges({ user, manualBadgeKeys = [], maxVisible = 4 }) {
  const [hoveredBadge, setHoveredBadge] = useState(null);

  const autoBadges = computeAutoBadges(user);
  const allBadges = mergeBadges(autoBadges, manualBadgeKeys);

  if (allBadges.length === 0) return null;

  const visible = allBadges.slice(0, maxVisible);
  const overflow = allBadges.length - maxVisible;

  return (
    <span className="inline-flex items-center gap-1 ml-1.5 shrink-0">
      {visible.map((badge) => (
        <span
          key={badge.key}
          className="relative"
          onMouseEnter={() => setHoveredBadge(badge.key)}
          onMouseLeave={() => setHoveredBadge(null)}
        >
          <span
            className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-full cursor-default transition-all duration-200 hover:scale-125 hover:shadow-lg [&>svg]:w-[15px] [&>svg]:h-[15px]"
            style={{
              background: badge.gradient,
              color: 'white',
              boxShadow: `0 2px 6px ${badge.glow}`,
              border: `1.5px solid ${badge.ring}`,
            }}
            dangerouslySetInnerHTML={{ __html: badge.svg }}
          />

          {/* Tooltip */}
          {hoveredBadge === badge.key && (
            <span
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl z-50 pointer-events-none text-center"
              style={{ background: badge.tooltipBg || '#0f172a' }}
            >
              <span className="block text-[10px] font-black text-white uppercase tracking-widest">{badge.label}</span>
              <span className="block text-[9px] font-medium text-white/70 mt-0.5">{badge.subtitle}</span>
              <span
                className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent"
                style={{ borderTopColor: badge.tooltipBg || '#0f172a' }}
              />
            </span>
          )}
        </span>
      ))}

      {overflow > 0 && (
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[9px] font-black text-slate-400 bg-slate-100 border border-slate-200 cursor-default hover:scale-110 transition-transform"
          title={allBadges.slice(maxVisible).map(b => `${b.label}: ${b.subtitle}`).join(', ')}
        >
          +{overflow}
        </span>
      )}
    </span>
  );
}
