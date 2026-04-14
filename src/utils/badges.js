/**
 * Badge Registry & Auto-Computation
 * -----------------------------------
 * Central config for all team badges in Pilar Home.
 * Auto badges are computed from user data. Manual badges come from user_badges table.
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

/**
 * Master badge definitions.
 * Each key maps to a visual config used by <UserBadges />.
 */
export const BADGE_REGISTRY = {
  founder: {
    key: 'founder',
    label: 'Founder',
    emoji: '👑',
    tooltip: 'Company Founder',
    bg: 'bg-slate-900',
    text: 'text-amber-400',
    border: 'border-slate-700',
    auto: true,
  },
  veteran: {
    key: 'veteran',
    label: 'Veteran',
    emoji: '⏳',
    tooltip: '1+ Year with Pilar Home',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-300',
    auto: true,
  },
  new_hire: {
    key: 'new_hire',
    label: 'New',
    emoji: '✨',
    tooltip: 'Joined within the last 90 days',
    bg: 'bg-sky-50',
    text: 'text-sky-600',
    border: 'border-sky-200',
    auto: true,
  },
  closer: {
    key: 'closer',
    label: 'Closer',
    emoji: '🔥',
    tooltip: '10+ Approved Proposals',
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    auto: false, // future: auto from proposal stats
  },
  star_employee: {
    key: 'star_employee',
    label: 'Star',
    emoji: '⭐',
    tooltip: 'Star Employee — Management Recognition',
    bg: 'bg-yellow-50',
    text: 'text-yellow-600',
    border: 'border-yellow-200',
    auto: false,
  },
  certified_tech: {
    key: 'certified_tech',
    label: 'Certified',
    emoji: '🛡️',
    tooltip: 'HVAC Certified Technician',
    bg: 'bg-teal-50',
    text: 'text-teal-600',
    border: 'border-teal-200',
    auto: false,
  },
  quota_crusher: {
    key: 'quota_crusher',
    label: 'Crusher',
    emoji: '🎯',
    tooltip: 'Exceeded Sales Quota',
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    auto: false,
  },
  diamond_club: {
    key: 'diamond_club',
    label: 'Diamond',
    emoji: '💎',
    tooltip: 'Diamond Club — Career Milestone',
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    auto: false,
  },
};

/**
 * All manually-assignable badge keys (for the admin UI checkboxes).
 */
export const MANUAL_BADGE_KEYS = Object.values(BADGE_REGISTRY)
  .filter(b => !b.auto)
  .map(b => b.key);

/**
 * Compute automatic badges from user profile data.
 * @param {Object} user - user_profiles row (needs username, email, created_at)
 * @returns {string[]} array of badge keys
 */
export function computeAutoBadges(user) {
  const badges = [];

  // Founder check
  const identifier = (user.username || user.email || '').toLowerCase();
  if (FOUNDER_IDENTIFIERS.includes(identifier)) {
    badges.push('founder');
  }

  // Tenure-based badges
  if (user.created_at) {
    const accountAge = Date.now() - new Date(user.created_at).getTime();
    const dayMs = 86400000;

    if (accountAge >= 365 * dayMs) {
      badges.push('veteran');
    } else if (accountAge < 90 * dayMs) {
      badges.push('new_hire');
    }
  }

  return badges;
}

/**
 * Merge auto badges with manually-assigned badge keys.
 * Returns full badge definition objects, deduplicated.
 * @param {string[]} autoBadgeKeys
 * @param {string[]} manualBadgeKeys - from user_badges table
 * @returns {Object[]} array of badge definition objects from BADGE_REGISTRY
 */
export function mergeBadges(autoBadgeKeys = [], manualBadgeKeys = []) {
  const allKeys = [...new Set([...autoBadgeKeys, ...manualBadgeKeys])];

  // Ensure founder always comes first, then veteran, then manual badges
  const priority = ['founder', 'veteran', 'new_hire'];
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
