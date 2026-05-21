export type NormalizedMetrics = {
  demand: number;
  marketCapacity: number; // raw saturationRatio = competitors / saturationCompetitors
  rent: number;
  budget: number;
  runway: number;      // raw months
  monthlyBurn: number; // USD/month including 15% buffer
};

export type Verdict = 'GREEN' | 'YELLOW' | 'RED';

export type ScoringResult = { score: number; verdict: Verdict };
