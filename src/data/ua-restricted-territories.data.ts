/**
 * Static dataset of restricted territories in Ukraine.
 * Source: official Ukrainian list "Перелік територій, на яких ведуться/велися
 * бойові дії або тимчасово окупованих Російською Федерацією".
 *
 * Matching strategy: keyword substring match on normalized state name
 * (lowercase, " Oblast" suffix stripped).
 *
 * Blocked oblasts (entire region):
 *  - Autonomous Republic of Crimea / Sevastopol
 *  - Donetsk Oblast
 *  - Luhansk Oblast
 *  - Zaporizhzhia Oblast
 *  - Kherson Oblast
 */

const RESTRICTED_STATE_KEYWORDS = [
  'crimea',        // AR Crimea — Nominatim may return "Crimea", "Republic of Crimea", or "Autonomous Republic of Crimea"
  'sevastopol',    // City with special administrative status
  'donetsk',       // Donetsk Oblast
  'luhansk',       // Luhansk Oblast
  'lugansk',       // Alternate Nominatim transliteration of Luhansk
  'zaporizh',      // Zaporizhzhia Oblast — covers both Nominatim variants: "Zaporizhzhia" and "Zaporizhia"
  'kherson',       // Kherson Oblast
] as const;

export function normalizeState(raw: string): string {
  return raw.toLowerCase().replace(/\s*oblast\s*$/i, '').trim();
}

export function isRestrictedTerritory(normalizedState: string): boolean {
  return RESTRICTED_STATE_KEYWORDS.some((k) => normalizedState.includes(k));
}
