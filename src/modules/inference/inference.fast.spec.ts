import { InferenceService } from './inference.service';
import { NormalizedMetrics } from '../scoring/types';

const svc = new InferenceService();

const CASES: {
  label: string;
  metrics: NormalizedMetrics;
  expect: { minRl?: number; maxRl?: number; verdict?: string; maxScore?: number; minScore?: number };
}[] = [
  // ── Oversaturated market — the critical path fix ───────────────────────
  // riskLevel lands ~0.55 (not 0.88) because demand+budget rules compete with critical.
  // Centroid averages both signals. RED comes via score (MA=0 → rawScore < 0.5).
  {
    label: 'Lviv oversaturated: saturationRatio=1.8 → riskLevel elevated, verdict RED',
    metrics: { demand: 0.72, marketCapacity: 1.8, rent: 0.55, budget: 0.65, runway: 9, monthlyBurn: 2800 },
    expect: { minRl: 0.45, verdict: 'RED' },
  },
  {
    label: 'Extreme saturation ratio=2.5 → riskLevel elevated, verdict RED',
    metrics: { demand: 0.6, marketCapacity: 2.5, rent: 0.5, budget: 0.7, runway: 12, monthlyBurn: 2000 },
    expect: { minRl: 0.5, verdict: 'RED' },
  },
  {
    label: 'Boundary saturation ratio=1.4 (onset of critical) → riskLevel elevated',
    metrics: { demand: 0.7, marketCapacity: 1.4, rent: 0.5, budget: 0.6, runway: 10, monthlyBurn: 2500 },
    expect: { minRl: 0.5 },
  },

  // ── Healthy market ─────────────────────────────────────────────────────
  {
    label: 'Kyiv strong demand, open market, good budget → GREEN',
    metrics: { demand: 0.92, marketCapacity: 0.35, rent: 0.7, budget: 0.85, runway: 24, monthlyBurn: 3000 },
    expect: { verdict: 'GREEN', maxRl: 0.4 },
  },
  {
    label: 'Medium city, medium market → YELLOW',
    metrics: { demand: 0.6, marketCapacity: 0.65, rent: 0.5, budget: 0.55, runway: 11, monthlyBurn: 1800 },
    expect: { verdict: 'YELLOW' },
  },

  // ── Financial pressure ─────────────────────────────────────────────────
  {
    label: 'Short runway + expensive rent → RED or YELLOW (FF degraded)',
    metrics: { demand: 0.7, marketCapacity: 0.4, rent: 0.15, budget: 0.25, runway: 3, monthlyBurn: 4000 },
    expect: { maxScore: 50 },
  },
  {
    label: 'Sufficient budget, cheap rent, open market → not RED',
    metrics: { demand: 0.75, marketCapacity: 0.3, rent: 0.85, budget: 0.9, runway: 30, monthlyBurn: 1500 },
    expect: { minScore: 50 },
  },

  // ── riskLevel ≠ 0 sanity check ─────────────────────────────────────────
  {
    label: 'riskLevel is always defined and positive',
    metrics: { demand: 0.5, marketCapacity: 0.5, rent: 0.5, budget: 0.5, runway: 12, monthlyBurn: 2000 },
    expect: { minRl: 0.01 },
  },
];

describe('InferenceService — FAST (inference-only, no external calls)', () => {
  for (const c of CASES) {
    it(c.label, () => {
      const result = svc.infer(c.metrics);
      const { verdict, score, latentFactors } = result;
      const rl = latentFactors.riskLevel;

      if (c.expect.verdict !== undefined) {
        expect(verdict).toBe(c.expect.verdict);
      }
      if (c.expect.minRl !== undefined) {
        expect(rl).toBeGreaterThanOrEqual(c.expect.minRl);
      }
      if (c.expect.maxRl !== undefined) {
        expect(rl).toBeLessThanOrEqual(c.expect.maxRl);
      }
      if (c.expect.minScore !== undefined) {
        expect(score).toBeGreaterThanOrEqual(c.expect.minScore);
      }
      if (c.expect.maxScore !== undefined) {
        expect(score).toBeLessThanOrEqual(c.expect.maxScore);
      }
    });
  }
});
