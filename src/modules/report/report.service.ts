import { Injectable } from '@nestjs/common';
import { MarketSnapshot } from '../market-data/types';
import { NormalizedMetrics, Verdict } from '../scoring/types';
import {
  METRIC_DESCRIPTIONS,
  MetricKey,
  NEGATIVE,
  POSITIVE,
  ReportResult,
  RISK_LEVEL_RANGES,
  RiskLevel,
} from './types';

type generateProps = {
  metrics: NormalizedMetrics;
  snapshot: MarketSnapshot;
  verdict: Verdict;
  budget: number;
};

@Injectable()
export class ReportService {
  private getRiskLevel(value: number): RiskLevel {
    const v = Math.min(1, Math.max(0, value));

    for (const range of RISK_LEVEL_RANGES) {
      if (v >= range.min && v < range.max) {
        return range.level;
      }
    }

    return 'minimal';
  }

  private formatList(items: string[]) {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
  }

  private buildNaturalExplanation(risks: Record<MetricKey, RiskLevel>): string {
    const entries = Object.entries(risks) as [MetricKey, RiskLevel][];

    const negatives: string[] = [];
    const positives: string[] = [];
    const neutral: string[] = [];

    for (const [metric, level] of entries) {
      const text = METRIC_DESCRIPTIONS[metric][level];

      if (NEGATIVE.includes(level)) negatives.push(text);
      else if (POSITIVE.includes(level)) positives.push(text);
      else neutral.push(text);
    }

    const neg = this.formatList(negatives);
    const pos = this.formatList(positives);
    const neu = this.formatList(neutral);

    let result = '';

    if (negatives.length >= 2) {
      result += `This opportunity looks weak, mainly because ${neg}. `;
    } else if (positives.length >= 2) {
      result += `This looks like a strong opportunity, driven by ${pos}. `;
    } else {
      result += `This is a balanced opportunity. `;
    }

    if (neg && pos) {
      result += `While ${pos}, there are still issues such as ${neg}. `;
    } else if (neg && !pos) {
      result += `The main concerns are ${neg}. `;
    } else if (pos && !neg) {
      result += `Key advantages include ${pos}. `;
    }

    if (neu) {
      result += `Other factors are average, such as ${neu}. `;
    }

    if (negatives.length >= 2) {
      result += `Improvement should focus on addressing the weakest factors before proceeding.`;
    } else if (positives.length >= 2) {
      result += `You can proceed, but maintaining these advantages will be critical.`;
    } else {
      result += `Success will depend on execution and optimization of weaker areas.`;
    }

    return result.trim();
  }

  generate({ metrics }: generateProps): ReportResult {
    // marketCapacity = saturationRatio ∈ [0, ∞): higher = more saturated = higher risk.
    // Invert to [0,1] where 0 = saturated (critical risk), 1 = empty market (minimal risk).
    const saturationRisk = this.getRiskLevel(1 - Math.min(metrics.marketCapacity, 1));
    const risks: Record<MetricKey, RiskLevel> = {
      demand: this.getRiskLevel(metrics.demand),
      marketCapacity: saturationRisk,
      rent: this.getRiskLevel(metrics.rent),
      budget: this.getRiskLevel(metrics.budget),
    };

    return {
      paybackMonths: '',
      risks: (Object.entries(risks) as [MetricKey, RiskLevel][])
        .filter(([, v]) => NEGATIVE.includes(v))
        .map(([k, v]) => METRIC_DESCRIPTIONS[k][v]),
      summary: this.buildNaturalExplanation(risks),
    };
  }
}
