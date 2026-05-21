import { Injectable } from '@nestjs/common';
import { NormalizedMetrics, Verdict } from '../scoring/types';
import { InferenceResult, LatentFactors, VerdictSource } from './types';
import { fuzzify } from './fuzzy/fuzzifier';
import { fireFfRules, fireMaRules, fireRlRules } from './fuzzy/rules';
import { defuzzifyFf, defuzzifyMa, defuzzifyRl } from './fuzzy/defuzzifier';

const W_MARKET = 0.35;
const W_FINANCIAL = 0.45;
const W_RISK = 0.2;

const FF_HARD_BLOCK = 0.05;

@Injectable()
export class InferenceService {
  infer(metrics: NormalizedMetrics): InferenceResult {
    const memberships = fuzzify(metrics);

    const marketAttractiveness = defuzzifyMa(fireMaRules(memberships));
    const financialFeasibility = defuzzifyFf(fireFfRules(memberships));
    const riskLevel = defuzzifyRl(fireRlRules(memberships));

    const latentFactors: LatentFactors = {
      marketAttractiveness,
      financialFeasibility,
      riskLevel,
    };

    const rawScore =
      marketAttractiveness * W_MARKET +
      financialFeasibility * W_FINANCIAL +
      (1 - riskLevel) * W_RISK;

    const score = Math.round(rawScore * 100);
    const { verdict, verdictSource } = this.resolveVerdict(score, latentFactors, memberships.marketCapacity.critical);

    return { latentFactors, score, verdict, verdictSource };
  }

  private resolveVerdict(
    score: number,
    f: LatentFactors,
    marketCapacityCritical: number,
  ): { verdict: Verdict; verdictSource: VerdictSource } {
    if (marketCapacityCritical > 0) return { verdict: 'RED', verdictSource: 'saturation_override' };
    if (f.financialFeasibility < FF_HARD_BLOCK) return { verdict: 'RED', verdictSource: 'ff_hard_block' };

    const criticalCount = [
      f.marketAttractiveness < 0.2,
      f.financialFeasibility < 0.2,
      f.riskLevel > 0.8,
    ].filter(Boolean).length;

    if (criticalCount >= 2) return { verdict: 'RED', verdictSource: 'score' };

    const verdict: Verdict = score >= 75 ? 'GREEN' : score >= 50 ? 'YELLOW' : 'RED';
    return { verdict, verdictSource: 'score' };
  }
}
