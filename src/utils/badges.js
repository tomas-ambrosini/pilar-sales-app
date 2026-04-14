/**
 * Badge Registry & Auto-Computation — Pilar Home Edition
 * -------------------------------------------------------
 * Premium gradient badges with inline SVG icons.
 * Icon-only display, tooltip on hover.
 */

// Founder identifiers
const FOUNDER_IDENTIFIERS = [
  'worma002',
  'papiwalti',
  'tomas.ambrosini',
  'tomasambrosini',
  'walter@pilarservices.com',
  'walter@pilarservices',
];

// --- Inline SVG Icons (white, 14x14, stroke-based) ---

const iconPillar = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="4" width="8" height="16" rx="1"/><line x1="6" y1="4" x2="18" y2="4"/><line x1="6" y1="20" x2="18" y2="20"/></svg>`;

const iconRoot = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"/><path d="M8 14c-2 2-4 5-4 8"/><path d="M16 14c2 2 4 5 4 8"/><path d="M12 10c-2 2-3 5-3 8"/><path d="M12 10c2 2 3 5 3 8"/><circle cx="12" cy="10" r="2"/></svg>`;

const iconSunrise = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.93 10.93 2.83 2.83"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m16.24 13.76 2.83-2.83"/><path d="M18 18a6 6 0 0 0-12 0"/></svg>`;

const iconIce = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`;

const iconHammer = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25a2.13 2.13 0 0 1 0-3l.82-.82a2.13 2.13 0 0 0 0-3L18 1.13"/><path d="M13.59 8.41 9 3.82a2.13 2.13 0 0 0-3 0L4.18 5.64"/></svg>`;

const iconKey = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m11.5 11.5 6-6"/><path d="M17.5 5.5v4h4"/></svg>`;

const iconFlame = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;

const iconColumn = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h16"/><path d="M4 21h16"/><path d="M6 3v18"/><path d="M18 3v18"/><path d="M12 3v18"/></svg>`;


/**
 * Master badge definitions with gradient styling.
 */
export const BADGE_REGISTRY = {
  piedra_angular: {
    key: 'piedra_angular',
    label: 'Piedra Angular',
    subtitle: 'Company Founder',
    svg: iconPillar,
    gradient: 'linear-gradient(135deg, #b8860b, #daa520, #cd7f32)',
    glow: 'rgba(218, 165, 32, 0.4)',
    ring: 'rgba(255, 215, 0, 0.5)',
    tooltipBg: '#78350f',
    // For edit modal
    bg: 'bg-amber-600',
    text: 'text-white',
    border: 'border-amber-700',
    auto: true,
  },
  raices: {
    key: 'raices',
    label: 'Raíces',
    subtitle: '1+ Year with Pilar',
    svg: iconRoot,
    gradient: 'linear-gradient(135deg, #059669, #10b981, #34d399)',
    glow: 'rgba(16, 185, 129, 0.35)',
    ring: 'rgba(52, 211, 153, 0.5)',
    tooltipBg: '#064e3b',
    bg: 'bg-emerald-500',
    text: 'text-white',
    border: 'border-emerald-600',
    auto: true,
  },
  brote: {
    key: 'brote',
    label: 'Brote',
    subtitle: 'Joined < 90 days ago',
    svg: iconSunrise,
    gradient: 'linear-gradient(135deg, #7c3aed, #8b5cf6, #a78bfa)',
    glow: 'rgba(139, 92, 246, 0.35)',
    ring: 'rgba(167, 139, 250, 0.5)',
    tooltipBg: '#4c1d95',
    bg: 'bg-violet-500',
    text: 'text-white',
    border: 'border-violet-600',
    auto: true,
  },
  hielo: {
    key: 'hielo',
    label: 'Hielo',
    subtitle: 'Cool Under Pressure',
    svg: iconIce,
    gradient: 'linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee)',
    glow: 'rgba(6, 182, 212, 0.35)',
    ring: 'rgba(34, 211, 238, 0.5)',
    tooltipBg: '#164e63',
    bg: 'bg-cyan-500',
    text: 'text-white',
    border: 'border-cyan-600',
    auto: false,
  },
  el_martillo: {
    key: 'el_martillo',
    label: 'El Martillo',
    subtitle: 'Top Closer',
    svg: iconHammer,
    gradient: 'linear-gradient(135deg, #c2410c, #ea580c, #f97316)',
    glow: 'rgba(234, 88, 12, 0.35)',
    ring: 'rgba(249, 115, 22, 0.5)',
    tooltipBg: '#7c2d12',
    bg: 'bg-orange-500',
    text: 'text-white',
    border: 'border-orange-600',
    auto: false,
  },
  llave_maestra: {
    key: 'llave_maestra',
    label: 'Llave Maestra',
    subtitle: 'Certified Master Tech',
    svg: iconKey,
    gradient: 'linear-gradient(135deg, #0d9488, #14b8a6, #2dd4bf)',
    glow: 'rgba(20, 184, 166, 0.35)',
    ring: 'rgba(45, 212, 191, 0.5)',
    tooltipBg: '#134e4a',
    bg: 'bg-teal-500',
    text: 'text-white',
    border: 'border-teal-600',
    auto: false,
  },
  fuego: {
    key: 'fuego',
    label: 'Fuego',
    subtitle: 'On a Hot Streak',
    svg: iconFlame,
    gradient: 'linear-gradient(135deg, #dc2626, #ef4444, #f87171)',
    glow: 'rgba(239, 68, 68, 0.35)',
    ring: 'rgba(248, 113, 113, 0.5)',
    tooltipBg: '#7f1d1d',
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-600',
    auto: false,
  },
  la_columna: {
    key: 'la_columna',
    label: 'La Columna',
    subtitle: 'Backbone of the Team',
    svg: iconColumn,
    gradient: 'linear-gradient(135deg, #4338ca, #6366f1, #818cf8)',
    glow: 'rgba(99, 102, 241, 0.35)',
    ring: 'rgba(129, 140, 248, 0.5)',
    tooltipBg: '#312e81',
    bg: 'bg-indigo-500',
    text: 'text-white',
    border: 'border-indigo-600',
    auto: false,
  },
};

/**
 * All manually-assignable badge keys.
 */
export const MANUAL_BADGE_KEYS = Object.values(BADGE_REGISTRY)
  .filter(b => !b.auto)
  .map(b => b.key);

/**
 * Compute automatic badges from user profile data.
 */
export function computeAutoBadges(user) {
  const badges = [];

  const identifier = (user.username || user.email || '').toLowerCase();
  if (FOUNDER_IDENTIFIERS.includes(identifier)) {
    badges.push('piedra_angular');
  }

  if (user.created_at) {
    const accountAge = Date.now() - new Date(user.created_at).getTime();
    const dayMs = 86400000;

    if (accountAge >= 365 * dayMs) {
      badges.push('raices');
    } else if (accountAge < 90 * dayMs) {
      badges.push('brote');
    }
  }

  return badges;
}

/**
 * Merge auto + manual badges, deduplicated and sorted.
 */
export function mergeBadges(autoBadgeKeys = [], manualBadgeKeys = []) {
  const allKeys = [...new Set([...autoBadgeKeys, ...manualBadgeKeys])];

  const priority = ['piedra_angular', 'raices', 'brote'];
  allKeys.sort((a, b) => {
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

  return allKeys
    .map(key => BADGE_REGISTRY[key])
    .filter(Boolean);
}
