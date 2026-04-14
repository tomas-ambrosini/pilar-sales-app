/**
 * Badge Registry & Auto-Computation — Pilar Home Edition
 * -------------------------------------------------------
 * Custom badges with inline SVG icons, themed around
 * the Pilar brand, HVAC culture, and team identity.
 */

// Founder identifiers (usernames / emails)
const FOUNDER_IDENTIFIERS = [
  'worma002',
  'papiwalti',
  'tomas.ambrosini',
  'tomasambrosini',
  'walter@pilarservices.com',
  'walter@pilarservices',
];

// --- Inline SVG Icon Builders (14x14, stroke-based) ---

const iconPillar = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="4" width="8" height="16" rx="1"/><line x1="6" y1="4" x2="18" y2="4"/><line x1="6" y1="20" x2="18" y2="20"/></svg>`;

const iconRoot = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v8"/><path d="M8 14c-2 2-4 5-4 8"/><path d="M16 14c2 2 4 5 4 8"/><path d="M12 10c-2 2-3 5-3 8"/><path d="M12 10c2 2 3 5 3 8"/><circle cx="12" cy="10" r="2"/></svg>`;

const iconSunrise = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m4.93 10.93 2.83 2.83"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m16.24 13.76 2.83-2.83"/><path d="M18 18a6 6 0 0 0-12 0"/></svg>`;

const iconIce = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="19.07" y1="4.93" x2="4.93" y2="19.07"/></svg>`;

const iconHammer = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25a2.13 2.13 0 0 1 0-3l.82-.82a2.13 2.13 0 0 0 0-3L18 1.13"/><path d="M13.59 8.41 9 3.82a2.13 2.13 0 0 0-3 0L4.18 5.64"/></svg>`;

const iconKey = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m11.5 11.5 6-6"/><path d="M17.5 5.5v4h4"/></svg>`;

const iconFlame = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`;

const iconColumn = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h16"/><path d="M4 21h16"/><path d="M6 3v18"/><path d="M18 3v18"/><path d="M12 3v18"/></svg>`;


/**
 * Master badge definitions.
 */
export const BADGE_REGISTRY = {
  piedra_angular: {
    key: 'piedra_angular',
    label: 'Piedra Angular',
    svg: iconPillar,
    tooltip: 'Piedra Angular — Company Founder',
    bg: 'bg-slate-900',
    text: 'text-amber-400',
    border: 'border-slate-700',
    auto: true,
  },
  raices: {
    key: 'raices',
    label: 'Raíces',
    svg: iconRoot,
    tooltip: 'Raíces — 1+ Year with Pilar Home',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    auto: true,
  },
  brote: {
    key: 'brote',
    label: 'Brote',
    svg: iconSunrise,
    tooltip: 'Brote — Joined within the last 90 days',
    bg: 'bg-sky-50',
    text: 'text-sky-500',
    border: 'border-sky-200',
    auto: true,
  },
  hielo: {
    key: 'hielo',
    label: 'Hielo',
    svg: iconIce,
    tooltip: 'Hielo — Cool Under Pressure',
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    auto: false,
  },
  el_martillo: {
    key: 'el_martillo',
    label: 'El Martillo',
    svg: iconHammer,
    tooltip: 'El Martillo — Top Closer',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    auto: false,
  },
  llave_maestra: {
    key: 'llave_maestra',
    label: 'Llave Maestra',
    svg: iconKey,
    tooltip: 'Llave Maestra — Certified Master Tech',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    auto: false,
  },
  fuego: {
    key: 'fuego',
    label: 'Fuego',
    svg: iconFlame,
    tooltip: 'Fuego — On a Hot Streak',
    bg: 'bg-red-50',
    text: 'text-red-500',
    border: 'border-red-200',
    auto: false,
  },
  la_columna: {
    key: 'la_columna',
    label: 'La Columna',
    svg: iconColumn,
    tooltip: 'La Columna — Backbone of the Team',
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    auto: false,
  },
};

/**
 * All manually-assignable badge keys (for admin UI).
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
 * Merge auto badges with manual badge keys.
 * Returns full badge definition objects, deduplicated and sorted.
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
