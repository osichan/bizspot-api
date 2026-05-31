import { ReportService } from './report.service';
import { METRIC_DESCRIPTIONS } from './types';

const ALL_PHRASES = Object.values(METRIC_DESCRIPTIONS).flatMap((m) => Object.values(m));

function countOccurrences(text: string, phrase: string): number {
  let count = 0;
  let pos = 0;
  const lower = text.toLowerCase();
  const lowerPhrase = phrase.toLowerCase();
  while ((pos = lower.indexOf(lowerPhrase, pos)) !== -1) {
    count++;
    pos += lowerPhrase.length;
  }
  return count;
}

function assertNoDuplicateMetricPhrases(summary: string) {
  for (const phrase of ALL_PHRASES) {
    const count = countOccurrences(summary, phrase);
    expect(count).toBeLessThanOrEqual(1);
  }
}

function makeSentences(summary: string): string[] {
  return summary.split(/(?<=[.!?])\s+/).filter(Boolean);
}

const BASE_SNAPSHOT = {
  cityName: 'TestCity',
  population: 100000,
  competitorRadius: 1000,
  avgRent: 500,
  trafficMultiplier: 1,
  commercialDensity: 1,
  competitors: 3,
  saturationCompetitors: 5,
  minBudget: 30000,
  urbanDependency: 0.5,
  employees: 2,
  avgMonthlySalaryUsd: 500,
  utilitiesMultiplier: 1,
};

describe('ReportService', () => {
  let service: ReportService;

  beforeEach(() => {
    service = new ReportService();
  });

  // ─── Test 1: RED with two risks and one strength ───────────────────────────
  it('RED two risks one strength — each phrase appears once, 4-5 sentences, no repetition', () => {
    // demand=critical, marketCapacity=critical (saturation=1→inversion=0), rent=minimal, budget=moderate
    const result = service.generate({
      metrics: { demand: 0.1, marketCapacity: 1.0, rent: 0.9, budget: 0.5, runway: 6, monthlyBurn: 3000 },
      snapshot: { ...BASE_SNAPSHOT, competitors: 10 },
      verdict: 'RED',
      budget: 50000,
    });

    const { summary, risks } = result;

    // risks[] must be unchanged (demand + marketCapacity are NEGATIVE)
    expect(risks).toContain(METRIC_DESCRIPTIONS.demand.critical);
    expect(risks).toContain(METRIC_DESCRIPTIONS.marketCapacity.critical);
    expect(risks).not.toContain(METRIC_DESCRIPTIONS.rent.minimal);

    // No metric phrase repeated
    assertNoDuplicateMetricPhrases(summary);

    // No empty parentheses or empty sections
    expect(summary).not.toMatch(/\(\s*\)/);
    expect(summary).not.toMatch(/ризики:\s*\./);
    expect(summary).not.toMatch(/переваги:\s*\./);

    // 4–5 sentences
    const sentences = makeSentences(summary);
    expect(sentences.length).toBeGreaterThanOrEqual(4);
    expect(sentences.length).toBeLessThanOrEqual(5);

    // Correct verdict sentence
    expect(summary).toContain('Ця локація не є доцільною для запуску у поточних умовах.');
  });

  // ─── Test 2: RED with no strengths ────────────────────────────────────────
  it('RED no strengths — no empty parentheses, natural fallback text', () => {
    // All metrics bad
    const result = service.generate({
      metrics: { demand: 0.1, marketCapacity: 1.0, rent: 0.1, budget: 0.1, runway: 1, monthlyBurn: 5000 },
      snapshot: { ...BASE_SNAPSHOT, competitors: 10 },
      verdict: 'RED',
      budget: 10000,
    });

    const { summary } = result;

    expect(summary).not.toMatch(/\(\s*\)/);
    expect(summary).not.toMatch(/переваги:\s*\./);
    expect(summary).not.toContain('Ключові переваги');
    assertNoDuplicateMetricPhrases(summary);

    const sentences = makeSentences(summary);
    expect(sentences.length).toBeGreaterThanOrEqual(4);
  });

  // ─── Test 3: YELLOW with strengths + risks ────────────────────────────────
  it('YELLOW strengths and risks — neither repeated in summary', () => {
    // demand=critical (risk), budget=minimal+rent=minimal (strengths), market=moderate
    const result = service.generate({
      metrics: { demand: 0.1, marketCapacity: 0.5, rent: 0.9, budget: 0.9, runway: 12, monthlyBurn: 2000 },
      snapshot: BASE_SNAPSHOT,
      verdict: 'YELLOW',
      budget: 50000,
    });

    const { summary, risks } = result;

    // risks[] correct
    expect(risks).toContain(METRIC_DESCRIPTIONS.demand.critical);
    expect(risks).not.toContain(METRIC_DESCRIPTIONS.budget.minimal);
    expect(risks).not.toContain(METRIC_DESCRIPTIONS.rent.minimal);

    assertNoDuplicateMetricPhrases(summary);
    expect(summary).not.toMatch(/\(\s*\)/);
    expect(summary).not.toMatch(/ризики:\s*\./);
    expect(summary).not.toMatch(/переваги:\s*\./);

    expect(summary).toContain('Локація має помірний потенціал, але потребує додаткової перевірки перед запуском.');

    const sentences = makeSentences(summary);
    expect(sentences.length).toBeGreaterThanOrEqual(4);
  });

  // ─── Test 4: GREEN with strengths ─────────────────────────────────────────
  it('GREEN all positive — advantages listed once, not repeated', () => {
    const result = service.generate({
      metrics: { demand: 0.9, marketCapacity: 0.0, rent: 0.9, budget: 0.9, runway: 24, monthlyBurn: 2000 },
      snapshot: { ...BASE_SNAPSHOT, competitors: 0 },
      verdict: 'GREEN',
      budget: 80000,
    });

    const { summary, risks } = result;

    // No risks for GREEN (all positive)
    expect(risks).toHaveLength(0);

    assertNoDuplicateMetricPhrases(summary);
    expect(summary).not.toMatch(/\(\s*\)/);
    expect(summary).toContain('Локація має високий потенціал для запуску вибраного типу бізнесу.');
    expect(summary).toContain('Ключові переваги:');

    const sentences = makeSentences(summary);
    expect(sentences.length).toBeGreaterThanOrEqual(4);
  });

  // ─── Test 5: Budget gate ───────────────────────────────────────────────────
  it('budget_gate bypasses report.generate — summary is direct with no duplicates', () => {
    // budget_gate is handled in analysis.service, not report.service.
    // Here we verify report.generate with budget=critical risk still produces clean output.
    const result = service.generate({
      metrics: { demand: 0.9, marketCapacity: 0.0, rent: 0.9, budget: 0.1, runway: 1, monthlyBurn: 5000 },
      snapshot: BASE_SNAPSHOT,
      verdict: 'RED',
      budget: 10000,
    });

    const { summary } = result;

    assertNoDuplicateMetricPhrases(summary);
    expect(summary).not.toMatch(/\(\s*\)/);

    const sentences = makeSentences(summary);
    expect(sentences.length).toBeGreaterThanOrEqual(4);
    expect(sentences.length).toBeLessThanOrEqual(5);
  });

  // ─── Test 6: Saturation override ──────────────────────────────────────────
  it('saturation override — "ринок перенасичений конкурентами" appears at most once', () => {
    // marketCapacity=critical (saturated), demand=moderate, budget=low, rent=low
    const result = service.generate({
      metrics: { demand: 0.5, marketCapacity: 1.0, rent: 0.7, budget: 0.7, runway: 10, monthlyBurn: 2500 },
      snapshot: { ...BASE_SNAPSHOT, competitors: 10 },
      verdict: 'RED',
      budget: 50000,
    });

    const { summary } = result;

    const saturationPhrase = METRIC_DESCRIPTIONS.marketCapacity.critical;
    expect(countOccurrences(summary, saturationPhrase)).toBeLessThanOrEqual(1);

    assertNoDuplicateMetricPhrases(summary);
    expect(summary).not.toMatch(/\(\s*\)/);
  });

  // ─── Test 7: risks[] unchanged ────────────────────────────────────────────
  it('risks[] contains only NEGATIVE-level metric descriptions', () => {
    const result = service.generate({
      metrics: { demand: 0.1, marketCapacity: 0.5, rent: 0.9, budget: 0.7, runway: 10, monthlyBurn: 2000 },
      snapshot: BASE_SNAPSHOT,
      verdict: 'YELLOW',
      budget: 50000,
    });

    const { risks } = result;

    // demand=critical → in risks
    expect(risks).toContain(METRIC_DESCRIPTIONS.demand.critical);
    // rent=minimal (POSITIVE) → not in risks
    expect(risks).not.toContain(METRIC_DESCRIPTIONS.rent.minimal);
    // budget=low (POSITIVE) → not in risks
    expect(risks).not.toContain(METRIC_DESCRIPTIONS.budget.low);
    // marketCapacity saturationRisk: 1-0.5=0.5 → moderate → not NEGATIVE → not in risks
    expect(risks).not.toContain(METRIC_DESCRIPTIONS.marketCapacity.moderate);
  });
});
