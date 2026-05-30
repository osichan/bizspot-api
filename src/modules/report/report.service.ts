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

  private buildNaturalExplanation(risks: Record<MetricKey, RiskLevel>, verdict: Verdict): string {
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

    // Opener: verdict takes precedence to prevent contradictory messaging
    // e.g. "strong opportunity" must never appear for a RED verdict
    if (verdict === 'RED') {
      result += negatives.length >= 2
        ? `This opportunity is not viable at this location, mainly because ${neg}. `
        : `This opportunity is not recommended in its current form. `;
    } else if (verdict === 'YELLOW') {
      if (negatives.length >= 2) {
        result += `This opportunity has potential but faces significant challenges: ${neg}. `;
      } else if (positives.length >= 2) {
        result += `This is a moderate opportunity with some strengths, including ${pos}. `;
      } else {
        result += `This is a balanced opportunity with mixed signals. `;
      }
    } else {
      // GREEN
      result += positives.length >= 2
        ? `This looks like a strong opportunity, driven by ${pos}. `
        : `This is a solid opportunity. `;
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

    // Closer: verdict-aware — RED must never say "You can proceed"
    if (verdict === 'RED') {
      result += `Address the critical issues before considering this location.`;
    } else if (verdict === 'YELLOW') {
      result += `Proceed carefully with a mitigation plan for the weaker areas.`;
    } else {
      result += `You can proceed, but maintaining these advantages will be critical.`;
    }

    return result.trim();
  }

  generate({ metrics, verdict }: generateProps): ReportResult {
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
      summary: this.buildNaturalExplanation(risks, verdict),
    };
  }
}
