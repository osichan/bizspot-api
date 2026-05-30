/**
 * Settlement population generator.
 * Reads tools/data-source/population.xlsx (Держстат official data) and produces
 * src/data/ua-settlements-population.generated.json.
 *
 * Run: npx ts-node --project tsconfig.json scripts/generate-settlements.ts
 *
 * Source:
 *   "Чисельність наявного населення по регіонах, районах, територіальних громадах
 *    та населених пунктах" — data.gov.ua / Держстат
 */

import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// ── Types ─────────────────────────────────────────────────────────────────────

export type GeneratedSettlement = {
  name: string
  normalizedName: string
  transliteration: string
  region: string
  normalizedRegion: string
  district?: string
  normalizedDistrict?: string
  hromada?: string
  population: number
}

// ── KMU 2010 transliteration ──────────────────────────────────────────────────

const VOWELS_UK = new Set(['а', 'е', 'є', 'и', 'і', 'ї', 'о', 'у', 'ю', 'я'])
const AFTER_INITIAL_CHARS = new Set(['й', 'ь', "'", 'ʼ', 'ʹ'])

const SIMPLE_MAP: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'yi',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  "'": '',
  ʼ: '',
  ʹ: '',
}

function kmuTransliterate(text: string): string {
  const chars = Array.from(text.toLowerCase())
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    const prev = i > 0 ? chars[i - 1] : null
    const initial = prev === null || VOWELS_UK.has(prev) || AFTER_INITIAL_CHARS.has(prev)
    if (c === 'є') {
      out += initial ? 'ye' : 'ie'
    } else if (c === 'ю') {
      out += initial ? 'yu' : 'iu'
    } else if (c === 'я') {
      out += initial ? 'ya' : 'ia'
    } else if (Object.prototype.hasOwnProperty.call(SIMPLE_MAP, c)) {
      out += SIMPLE_MAP[c]
    } else {
      out += c
    }
  }
  return out
}

// ── Name normalization ────────────────────────────────────────────────────────

function normalizePlaceName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/^(місто\s+|м\.\s*|село\s+|с\.\s*|смт\.?\s*)/u, '')
    .replace(/[ʼʼ'']/gu, "'")
    .trim()
}

function normalizeRegion(region: string): string {
  return region
    .toLowerCase()
    .replace(/\s+область$/u, '')
    .trim()
}

function normalizeDistrict(district: string): string {
  return district
    .toLowerCase()
    .replace(/\s+район$/u, '')
    .trim()
}

function stripSettlementPrefix(name: string): string {
  return name
    .trim()
    .replace(
      /^(місто\s+|м\.\s*|с\.\s*|с-ще\.?\s+|смт\.?\s+|смт\s*|село\s+|м-ко\.?\s+|хутір\s+|хут\.\s+|ст\.\s+|c\.\s*)/iu,
      ''
    )
    .trim()
}

// ── XLSX row detection ────────────────────────────────────────────────────────

// Matches all settlement row name prefixes found in the Держстат XLSX:
//   м. / м.  — місто (city), both with and without space after period
//   місто    — full word (used in Kyiv, Poltava, and other oblasts)
//   с. / с.  — село (village)
//   с-ще     — селище (settlement/township)
//   смт      — селище міського типу
//   м-ко     — містечко (small town)
//   хутір / хут. — khutir (hamlet)
//   ст.      — станція (station)
//   c.       — OCR artifact (Latin 'c' for 'с') in some eastern-oblast scans
const SETTLEMENT_PREFIX_RE =
  /^\s*(місто\s|м\.|с\.|с-ще\.?\s|смт\.?\s*|м-ко\.?|хутір|хут\.|ст\.|c\.)/iu
const SKIP_ROWS_RE = /^(атрибути|attributes|коди|code|дані|data|населення)$/iu

type RowKind = 'header' | 'oblast' | 'raion' | 'hromada' | 'settlement' | 'subtotal' | 'other'

function detectRowKind(name: string, hasCode: boolean): RowKind {
  if (!name) return 'other'
  if (SKIP_ROWS_RE.test(name.trim())) return 'header'
  const lower = name.toLowerCase()
  if (!hasCode) return 'subtotal' // "Міське населення", "Сільське населення"
  if (lower.includes('область') && lower.includes('усього')) return 'oblast'
  if (lower.includes('район') && lower.includes('усього')) return 'raion'
  if (lower.includes(' тг') && lower.includes('усього')) return 'hromada'
  if (SETTLEMENT_PREFIX_RE.test(name)) return 'settlement'
  return 'other'
}

// ── Main ──────────────────────────────────────────────────────────────────────

const XLSX_PATH = path.resolve(__dirname, '../tools/data-source/population.xlsx')
const OUTPUT_PATH = path.resolve(__dirname, '../src/data/ua-settlements-population.generated.json')

console.log(`Reading: ${XLSX_PATH}`)
const workbook = XLSX.readFile(XLSX_PATH)

const results: GeneratedSettlement[] = []
let importedCount = 0
let skippedCount = 0

// Skip description and Ukraine-total sheets; process Kyiv city sheet separately
const SKIP_SHEETS = new Set(['Опис', 'Україна'])

for (const sheetName of workbook.SheetNames) {
  if (SKIP_SHEETS.has(sheetName)) continue

  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' })

  let currentRegion = ''
  let currentDistrict = ''
  let currentHromada = ''

  // For "м. Київ" sheet, the region is the city itself
  if (sheetName === 'м. Київ') {
    currentRegion = 'м. Київ'
  }

  for (const rawRow of rows) {
    const row = rawRow.map((c) => String(c ?? '').trim())
    const name = row[0] ?? ''
    const code = row[1] ?? ''
    const popStr = row[2] ?? ''

    if (!name) {
      skippedCount++
      continue
    }

    const hasCode = code.startsWith('UA')
    const kind = detectRowKind(name, hasCode)

    switch (kind) {
      case 'header':
      case 'subtotal':
      case 'other':
        skippedCount++
        continue

      case 'oblast':
        currentRegion = name.replace(/,\s*усього\s*$/u, '').trim()
        currentDistrict = ''
        currentHromada = ''
        continue

      case 'raion':
        currentDistrict = name.replace(/,\s*усього\s*$/u, '').trim()
        currentHromada = ''
        continue

      case 'hromada':
        currentHromada = name.replace(/,\s*усього\s*$/u, '').trim()
        continue

      case 'settlement': {
        if (!currentRegion) {
          skippedCount++
          continue
        }

        const settName = stripSettlementPrefix(name)
        if (!settName) {
          skippedCount++
          continue
        }

        const population = parseInt(popStr.replace(/[\s ]/g, ''), 10)
        if (isNaN(population) || population < 0) {
          skippedCount++
          continue
        }

        const normalizedName = normalizePlaceName(settName)
        const transliteration = kmuTransliterate(normalizedName)

        const entry: GeneratedSettlement = {
          name: settName,
          normalizedName,
          transliteration,
          region: currentRegion,
          normalizedRegion: normalizeRegion(currentRegion),
          population,
        }
        if (currentDistrict) {
          entry.district = currentDistrict
          entry.normalizedDistrict = normalizeDistrict(currentDistrict)
        }
        if (currentHromada) {
          entry.hromada = currentHromada
        }

        results.push(entry)
        importedCount++
        break
      }
    }
  }
}

// ── Duplicate report ──────────────────────────────────────────────────────────

const nameFreq = new Map<string, number>()
for (const s of results) {
  nameFreq.set(s.normalizedName, (nameFreq.get(s.normalizedName) ?? 0) + 1)
}
const dupGroups = [...nameFreq.entries()].filter(([, n]) => n > 1)

console.log(`Imported : ${importedCount.toLocaleString()}`)
console.log(`Skipped  : ${skippedCount.toLocaleString()}`)
console.log(`Duplicates (same normalizedName): ${dupGroups.length}`)
if (dupGroups.length > 0) {
  const top5 = dupGroups
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n, c]) => `${n}(×${c})`)
    .join(', ')
  console.log(`Top dupes: ${top5}`)
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2), 'utf-8')
const sizeKb = Math.round(fs.statSync(OUTPUT_PATH).size / 1024)
console.log(`Written  : ${OUTPUT_PATH} (${sizeKb} KB)`)
