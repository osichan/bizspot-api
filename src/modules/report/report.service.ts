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
    return `${items.slice(0, -1).join(', ')} та ${items.at(-1)}`;
  }

  private getDescription(metric: MetricKey, level: RiskLevel, competitors: number): string {
    // When competitors === 0, use explicit "none found" text only for marketCapacity at low-pressure levels
    if (metric === 'marketCapacity' && (level === 'minimal' || level === 'low') && competitors === 0) {
      return 'конкурентів у зоні не виявлено';
    }
    return METRIC_DESCRIPTIONS[metric][level];
  }

  private buildNaturalExplanation(
    risks: Record<MetricKey, RiskLevel>,
    descriptions: Record<MetricKey, string>,
    verdict: Verdict,
  ): string {
    const entries = Object.entries(risks) as [MetricKey, RiskLevel][];

    const negatives: string[] = [];
    const positives: string[] = [];
    const neutral: string[] = [];

    for (const [metric, level] of entries) {
      const text = descriptions[metric];

      if (NEGATIVE.includes(level)) negatives.push(text);
      else if (POSITIVE.includes(level)) positives.push(text);
      else neutral.push(text);
    }

    const neg = this.formatList(negatives);
    const pos = this.formatList(positives);
    const neu = this.formatList(neutral);

    let result = '';

    // Opener: verdict takes precedence to prevent contradictory messaging
    if (verdict === 'RED') {
      result += negatives.length >= 2
        ? `Ця локація не є доцільною, насамперед через: ${neg}. `
        : `Відкриття бізнесу на цій локації наразі не рекомендується. `;
    } else if (verdict === 'YELLOW') {
      if (negatives.length >= 2) {
        result += `Локація має потенціал, але є суттєві ризики: ${neg}. `;
      } else if (positives.length >= 2) {
        result += `Помірна можливість із рядом переваг, зокрема: ${pos}. `;
      } else {
        result += `Збалансована локація з неоднозначними сигналами. `;
      }
    } else {
      // GREEN
      result += positives.length >= 2
        ? `Перспективна локація з сильними показниками: ${pos}. `
        : `Хороша локація для відкриття бізнесу. `;
    }

    if (neg && pos) {
      result += `Попри переваги (${pos}), є проблемні зони: ${neg}. `;
    } else if (neg && !pos) {
      result += `Основні проблеми: ${neg}. `;
    } else if (pos && !neg) {
      result += `Ключові переваги: ${pos}. `;
    }

    if (neu) {
      result += `Інші показники на середньому рівні: ${neu}. `;
    }

    // Closer: verdict-aware — RED must never say "You can proceed"
    if (verdict === 'RED') {
      result += `Усуньте критичні проблеми перед розглядом цієї локації.`;
    } else if (verdict === 'YELLOW') {
      result += `Діяйте обережно та підготуйте план для слабких зон.`;
    } else {
      result += `Можна рухатись далі — важливо підтримувати ці переваги.`;
    }

    return result.trim();
  }

  generate({ metrics, snapshot, verdict }: generateProps): ReportResult {
    // marketCapacity = saturationRatio ∈ [0, ∞): higher = more saturated = higher risk.
    // Invert to [0,1] where 0 = saturated (critical risk), 1 = empty market (minimal risk).
    const saturationRisk = this.getRiskLevel(1 - Math.min(metrics.marketCapacity, 1));
    const risks: Record<MetricKey, RiskLevel> = {
      demand: this.getRiskLevel(metrics.demand),
      marketCapacity: saturationRisk,
      rent: this.getRiskLevel(metrics.rent),
      budget: this.getRiskLevel(metrics.budget),
    };

    const descriptions: Record<MetricKey, string> = {
      demand: this.getDescription('demand', risks.demand, snapshot.competitors),
      marketCapacity: this.getDescription('marketCapacity', risks.marketCapacity, snapshot.competitors),
      rent: this.getDescription('rent', risks.rent, snapshot.competitors),
      budget: this.getDescription('budget', risks.budget, snapshot.competitors),
    };

    return {
      paybackMonths: '',
      risks: (Object.entries(risks) as [MetricKey, RiskLevel][])
        .filter(([, v]) => NEGATIVE.includes(v))
        .map(([k]) => descriptions[k]),
      summary: this.buildNaturalExplanation(risks, descriptions, verdict),
    };
  }
}
