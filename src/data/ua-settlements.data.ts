export type UaSettlement = {
  /** Primary Ukrainian name */
  name: string
  /** English oblast name as returned by Nominatim state field (before normalization) */
  region: string
  /** English raion name as returned by Nominatim district field — used for disambiguation */
  district?: string
  /** Approximate population (Держстат 2020–2021) */
  population: number
  /** English transliterations and alternate spellings that Nominatim may return */
  aliases?: string[]
}

/**
 * Manual override list for known OSM-vs-official name discrepancies.
 *
 * Entries here ONLY exist when the Nominatim EN name differs from the official
 * Ukrainian name in the generated dataset, preventing KMU transliteration from
 * matching. For the vast majority of settlements, the generated dataset
 * (ua-settlements-population.generated.json) is the authoritative source.
 *
 * Region/district values match the Nominatim `state`/`district` fields
 * before normalization (e.g. "Lviv Oblast", "Lviv Raion").
 * Population figures are from official Держстат XLSX (2020-2021).
 *
 * TODO(production): If more OSM discrepancies are discovered, add them here.
 * To regenerate the full dataset from updated official data:
 *   1. Download updated XLSX from data.gov.ua / Держстат.
 *   2. npx ts-node scripts/generate-settlements.ts
 *   3. settlement-lookup.ts picks up the new JSON automatically.
 */
export const UA_SETTLEMENTS: UaSettlement[] = [
  {
    // Nominatim EN returns "rudno"; official Ukrainian name is "Рудне" (translit "rudne").
    // KMU transliteration cannot bridge this gap — manual alias required.
    name: 'Рудно',
    region: 'Lviv Oblast',
    district: 'Lviv Raion',
    population: 7_502,
    aliases: ['rudno'],
  },
]
