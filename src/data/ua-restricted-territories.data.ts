/**
 * Static dataset of restricted/occupied territories in Ukraine.
 * Source: official Ukrainian list "Перелік територій, на яких ведуться/велися
 * бойові дії або тимчасово окупованих Російською Федерацією".
 *
 * Matching strategy:
 *  - State-level: keyword substring match on normalized state (lowercase, "Oblast" stripped).
 *  - Raion-level: state match + county substring match — used for partially affected oblasts.
 */

const RESTRICTED_STATE_KEYWORDS = [
  'crimea',      // AR Crimea — Nominatim may return "Crimea", "Republic of Crimea", or "Autonomous Republic of Crimea"
  'sevastopol',  // City with special administrative status
  'donetsk',     // Donetsk Oblast — blocked at oblast level (MVP; control lines shift at raion level)
  'luhansk',     // Luhansk Oblast
  'lugansk',     // Alternate Nominatim transliteration of Luhansk
] as const;

const RESTRICTED_RAIONS: Record<string, readonly string[]> = {
  // Partially occupied raions in Zaporizhzhia Oblast
  zaporizhzhia: [
    'melitopol raion',
    'berdyansk raion',
    'vasylivka raion',
    'polohiv raion',
  ],
  // Partially occupied raions in Kherson Oblast
  kherson: [
    'henichesk raion',
    'kakhovka raion',
  ],
};

export function normalizeState(raw: string): string {
  return raw.toLowerCase().replace(/\s*oblast\s*$/i, '').trim();
}

export function isRestrictedTerritory(
  normalizedState: string,
  rawCounty: string | null,
): boolean {
  if (RESTRICTED_STATE_KEYWORDS.some((k) => normalizedState.includes(k))) {
    return true;
  }

  if (rawCounty) {
    const county = rawCounty.toLowerCase();
    for (const [state, raions] of Object.entries(RESTRICTED_RAIONS)) {
      if (normalizedState.includes(state) && raions.some((r) => county.includes(r))) {
        return true;
      }
    }
  }

  return false;
}
