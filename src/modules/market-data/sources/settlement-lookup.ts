// DATA SOURCE — swap the JSON import here when upgrading to a new generated dataset.
// Current generated dataset: src/data/ua-settlements-population.generated.json
// To regenerate: npx ts-node scripts/generate-settlements.ts
//
// Manual list (ua-settlements.data.ts) is checked FIRST — it handles known cases where
// the OSM name differs from the official Ukrainian name (e.g. Рудне vs Рудно/Rudno).

import * as fs from 'fs';
import * as path from 'path';
import type { UaSettlement } from 'src/data/ua-settlements.data';
import { UA_SETTLEMENTS } from 'src/data/ua-settlements.data';
import type { GeneratedSettlement } from 'scripts/generate-settlements';

// ── Load generated JSON at module-init time (cached by Node module system) ────

const _generatedRaw = fs.readFileSync(
  path.join(__dirname, '../../../data/ua-settlements-population.generated.json'),
  'utf-8',
);
const GENERATED_SETTLEMENTS: GeneratedSettlement[] = JSON.parse(_generatedRaw) as GeneratedSettlement[];

// ── KMU 2010 Ukrainian transliteration ───────────────────────────────────────
//
// Used to convert Ukrainian names from the generated dataset to approximate
// English equivalents so they can be matched against Nominatim EN output.
// e.g. "винники" → "vynnyky", "брюховичі" → "briukhovychi"

const VOWELS_UK = new Set(['а', 'е', 'є', 'и', 'і', 'ї', 'о', 'у', 'ю', 'я']);
const AFTER_INITIAL = new Set(['й', 'ь', "'", 'ʼ', 'ʹ']);
const KMU_SIMPLE: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g',
  д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'y',
  і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh',
  ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '',
  "'": '', 'ʼ': '', 'ʹ': '',
};

function kmuTransliterate(text: string): string {
  const chars = Array.from(text.toLowerCase());
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const prev = i > 0 ? chars[i - 1] : null;
    const initial = prev === null || VOWELS_UK.has(prev) || AFTER_INITIAL.has(prev);
    if (c === 'є') { out += initial ? 'ye' : 'ie'; }
    else if (c === 'ю') { out += initial ? 'yu' : 'iu'; }
    else if (c === 'я') { out += initial ? 'ya' : 'ia'; }
    else if (Object.prototype.hasOwnProperty.call(KMU_SIMPLE, c)) { out += KMU_SIMPLE[c]; }
    else { out += c; }
  }
  return out;
}

// ── Region and district mapping: Nominatim EN → Ukrainian normalized ──────────
//
// Nominatim with accept-language=en returns English state/district names.
// The generated dataset has Ukrainian names. This table bridges the two.

const STATE_EN_TO_UK: Record<string, string> = {
  vinnytsia: 'вінницька',
  volyn: 'волинська',
  dnipropetrovsk: 'дніпропетровська',
  donetsk: 'донецька',
  zhytomyr: 'житомирська',
  zakarpattia: 'закарпатська',
  zaporizhzhia: 'запорізька',
  'ivano-frankivsk': 'івано-франківська',
  kyiv: 'київська',
  kirovohrad: 'кіровоградська',
  luhansk: 'луганська',
  lviv: 'львівська',
  mykolaiv: 'миколаївська',
  odesa: 'одеська',
  poltava: 'полтавська',
  rivne: 'рівненська',
  sumy: 'сумська',
  ternopil: 'тернопільська',
  kharkiv: 'харківська',
  kherson: 'херсонська',
  khmelnytskyi: 'хмельницька',
  cherkasy: 'черкаська',
  chernivtsi: 'чернівецька',
  chernihiv: 'чернігівська',
};

// Maps the normalized Nominatim EN district (e.g. "lviv" from "Lviv Raion")
// to the normalized Ukrainian district name (e.g. "львівський")
const DISTRICT_EN_TO_UK: Record<string, string> = {
  // Lviv Oblast
  lviv: 'львівський',
  sambir: 'самбірський',
  stryi: 'стрийський',
  drohobytskyi: 'дрогобицький',
  yavorivskyi: 'яворівський',
  zhovkivskyi: 'жовківський',
  zolochivskyi: 'золочівський',
  brodivskyi: 'бродівський',
  // Kyiv Oblast
  brovarskyi: 'броварський',
  boryspilskyi: 'бориспільський',
  buchaskyi: 'бучанський',
  vyshhorodskyi: 'вишгородський',
  fastivskyi: 'фастівський',
  obukhivskyi: 'обухівський',
  pereiaslav: 'переяславський',
  // Kharkiv Oblast
  chuhuivskyi: 'чугуївський',
  lozivskyi: 'лозівський',
  krasnohradskyi: 'красноградський',
  // Khmelnytskyi Oblast
  khmelnytskyi: 'хмельницький',
  // Other common city-based raion names
  vinnytsia: 'вінницький',
  dnipro: 'дніпровський',
  kharkiv: 'харківський',
  odesa: 'одеський',
  poltava: 'полтавський',
  rivne: 'рівненський',
  sumy: 'сумський',
  chernihiv: 'чернігівський',
  cherkasy: 'черкаський',
  zhytomyr: 'житомирський',
  ternopil: 'тернопільський',
  kherson: 'херсонський',
  mykolaiv: 'миколаївський',
};

// ── Name / region / district normalization ────────────────────────────────────

function normalizePlaceName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/^(місто\s+|м\.\s*|село\s+|с\.\s*|смт\.?\s*)/u, '')
    .replace(/[ʼ'']/gu, "'")
    .trim();
}

function normalizeRegion(region: string): string {
  return region
    .toLowerCase()
    .replace(/\s+oblast$/i, '')   // English: "Lviv Oblast"
    .replace(/\s+область$/u, '')  // Ukrainian: "Львівська область"
    .trim();
}

function normalizeDistrict(district: string): string {
  return district
    .toLowerCase()
    .replace(/\s+raion$/i, '')   // English: "Lviv Raion"
    .replace(/\s+район$/u, '')   // Ukrainian: "Львівський район"
    .trim();
}

// ── Normalized index ──────────────────────────────────────────────────────────

type NormalizedEntry = {
  population: number;
  normalizedName: string;
  transliteration: string;
  normalizedRegion: string;
  normalizedDistrict: string | undefined;
  normalizedAliases: string[];
};

function fromManual(s: UaSettlement): NormalizedEntry {
  const normalizedName = normalizePlaceName(s.name);
  return {
    population: s.population,
    normalizedName,
    transliteration: kmuTransliterate(normalizedName),
    normalizedRegion: normalizeRegion(s.region),
    normalizedDistrict: s.district ? normalizeDistrict(s.district) : undefined,
    normalizedAliases: s.aliases?.map(normalizePlaceName) ?? [],
  };
}

function fromGenerated(s: GeneratedSettlement): NormalizedEntry {
  return {
    population: s.population,
    normalizedName: s.normalizedName,
    transliteration: s.transliteration,
    normalizedRegion: s.normalizedRegion,
    normalizedDistrict: s.normalizedDistrict,
    normalizedAliases: [],
  };
}

// Manual entries go first — they act as priority overrides for known OSM-vs-official discrepancies
const NORMALIZED: NormalizedEntry[] = [
  ...UA_SETTLEMENTS.map(fromManual),
  ...GENERATED_SETTLEMENTS.map(fromGenerated),
];

// ── Disambiguation helpers ────────────────────────────────────────────────────

// Returns both the raw form and the mapped Ukrainian form for a given Nominatim state string
function resolveRegion(state: string): string[] {
  const mapped = STATE_EN_TO_UK[state];
  return mapped ? [state, mapped] : [state];
}

// Returns both the raw normalized form and the mapped Ukrainian form for a given Nominatim district
function resolveDistrict(district: string): string[] {
  const nd = normalizeDistrict(district);
  const mapped = DISTRICT_EN_TO_UK[nd];
  return mapped ? [nd, mapped] : [nd];
}

function nameMatches(entry: NormalizedEntry, candidate: string): boolean {
  return (
    entry.normalizedName === candidate ||
    entry.transliteration === candidate ||
    entry.normalizedAliases.includes(candidate)
  );
}

function regionMatches(entry: NormalizedEntry, regionForms: string[]): boolean {
  return regionForms.includes(entry.normalizedRegion);
}

function districtMatches(entry: NormalizedEntry, districtForms: string[]): boolean {
  if (!entry.normalizedDistrict) return false;
  return districtForms.includes(entry.normalizedDistrict);
}

// ── Public API ────────────────────────────────────────────────────────────────

type LookupResult = { population: number };

/**
 * Finds the population of a Ukrainian settlement by matching name candidates
 * against the combined manual + generated dataset.
 *
 * Name matching: Ukrainian normalizedName OR KMU transliteration OR manual aliases.
 * Region/district matching: handles both Nominatim EN and Ukrainian forms.
 *
 * @param nameCandidates - Ordered list of names to try (city, settlement, town, village, …)
 * @param state          - Nominatim normalized state field (e.g. "lviv")
 * @param district       - Nominatim district field before normalization (e.g. "Lviv Raion")
 */
export function findSettlementPopulation(
  nameCandidates: string[],
  state?: string,
  district?: string,
): LookupResult | undefined {
  const regionForms = state ? resolveRegion(state) : [];
  const districtForms = district ? resolveDistrict(district) : [];

  for (const rawCandidate of nameCandidates) {
    if (!rawCandidate?.trim()) continue;
    const candidate = normalizePlaceName(rawCandidate);
    if (!candidate) continue;

    const matches = NORMALIZED.filter((e) => nameMatches(e, candidate));
    if (matches.length === 0) continue;

    if (matches.length === 1) return { population: matches[0].population };

    // Multiple entries share the same name — disambiguate by region
    if (regionForms.length > 0) {
      const regionMatched = matches.filter((m) => regionMatches(m, regionForms));

      if (regionMatched.length === 1) return { population: regionMatched[0].population };

      // Same region, multiple entries — try district
      if (regionMatched.length > 1 && districtForms.length > 0) {
        const districtMatched = regionMatched.filter((m) => districtMatches(m, districtForms));
        if (districtMatched.length >= 1) return { population: districtMatched[0].population };
        // Same region, can't narrow by district — take highest-population entry
        regionMatched.sort((a, b) => b.population - a.population);
        return { population: regionMatched[0].population };
      }

      if (regionMatched.length > 1) {
        regionMatched.sort((a, b) => b.population - a.population);
        return { population: regionMatched[0].population };
      }
    }

    // No region context — skip to avoid wrong match
  }

  return undefined;
}
