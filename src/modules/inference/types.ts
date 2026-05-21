import { Verdict } from '../scoring/types';

export type InputMemberships = {
  demand: { low: number; medium: number; high: number };
  marketCapacity: { high: number; medium: number; low: number; critical: number };
  rent: { cheap: number; normal: number; expensive: number };
  budget: {
    insufficient: number;
    tight: number;
    sufficient: number;
    strong: number;
  };
  runway: { short: number; medium: number; long: number };
};

export type MaLevel = 'weak' | 'moderate' | 'strong';
export type FfLevel = 'non_viable' | 'risky' | 'viable' | 'stable';
export type RlLevel = 'low' | 'moderate' | 'high' | 'critical';

export type FiredRule<TLevel extends string> = {
  strength: number;
  consequent: TLevel;
};

export type LatentFactors = {
  marketAttractiveness: number;
  financialFeasibility: number;
  riskLevel: number;
};

export type VerdictSource = 'budget_gate' | 'saturation_override' | 'ff_hard_block' | 'score';

export type InferenceResult = {
  latentFactors: LatentFactors;
  score: number;
  verdict: Verdict;
  verdictSource: VerdictSource;
};
