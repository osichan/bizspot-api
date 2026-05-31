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
    const negatives: string[] = [];
    const positives: string[] = [];

    for (const [metric, level] of Object.entries(risks) as [MetricKey, RiskLevel][]) {
      const text = descriptions[metric];
      if (NEGATIVE.includes(level)) negatives.push(text);
      else if (POSITIVE.includes(level)) positives.push(text);
    }

    const parts: string[] = [];

    // S1 — verdict-level conclusion (no metric phrases here)
    if (verdict === 'GREEN') {
      parts.push('Локація має високий потенціал для запуску вибраного типу бізнесу.');
    } else if (verdict === 'YELLOW') {
      parts.push('Локація має помірний потенціал, але потребує додаткової перевірки перед запуском.');
    } else {
      parts.push('Ця локація не є доцільною для запуску у поточних умовах.');
    }

    // S2 — metric descriptions listed exactly once, structure varies by verdict
    if (verdict === 'GREEN' && positives.length > 0) {
      parts.push(`Ключові переваги: ${this.formatList(positives)}.`);
    } else if (verdict === 'YELLOW') {
      const sub: string[] = [];
      if (positives.length > 0) sub.push(`Основні переваги: ${this.formatList(positives)}.`);
      if (negatives.length > 0) sub.push(`Водночас варто врахувати ризики: ${this.formatList(negatives)}.`);
      if (sub.length > 0) parts.push(sub.join(' '));
    } else if (verdict === 'RED' && negatives.length > 0) {
      parts.push(`Основні обмеження: ${this.formatList(negatives)}.`);
    }

    // S3 — financial interpretation (analytical vocabulary, does not repeat S2 phrases)
    parts.push(this.buildFinancialSentence(risks.budget, risks.rent, verdict));

    // S4 — market interpretation (analytical vocabulary, does not repeat S2 phrases)
    parts.push(this.buildMarketSentence(risks.demand, risks.marketCapacity, verdict));

    // S5 — recommendation closer
    if (verdict === 'RED') {
      parts.push('Рекомендується змінити локацію, формат бізнесу або бюджет перед повторною оцінкою.');
    } else if (verdict === 'YELLOW') {
      parts.push('Можна розглядати запуск, зберігаючи контроль над витратами та конкурентними перевагами.');
    } else {
      parts.push('Можна розпочинати планування — важливо підтримувати виявлені переваги.');
    }

    return parts.join(' ');
  }

  private buildFinancialSentence(
    budgetLevel: RiskLevel,
    rentLevel: RiskLevel,
    verdict: Verdict,
  ): string {
    const budgetGood = POSITIVE.includes(budgetLevel);
    const budgetBad = NEGATIVE.includes(budgetLevel);
    const rentGood = POSITIVE.includes(rentLevel);
    const rentBad = NEGATIVE.includes(rentLevel);

    if (verdict === 'RED') {
      if (budgetBad && rentBad) return 'Фінансова складова потребує повного перегляду: ані бюджет, ані орендне навантаження не відповідають вимогам проєкту.';
      if (budgetBad) return 'Рівень бюджету суттєво обмежує можливості запуску — без його збільшення реалізація проєкту є ризикованою.';
      if (budgetGood && rentGood) return 'Бюджет та орендне навантаження є прийнятними, однак цього недостатньо для компенсації слабких ринкових показників.';
      return 'Бюджет є достатнім для початкового запуску, однак цього недостатньо для компенсації слабких ринкових показників.';
    }

    if (budgetGood && rentGood) return 'Фінансовий профіль є стабільним — бюджет покриває стартові витрати з запасом, а орендне навантаження залишається прийнятним.';
    if (budgetGood && !rentBad) return 'Бюджет забезпечує прийнятний фінансовий запас, але слід звернути увагу на загальний рівень витрат.';
    if (budgetGood && rentBad) return 'Незважаючи на достатній бюджет, значне орендне навантаження суттєво скорочує фінансовий резерв.';
    if (!budgetBad && rentGood) return 'Оренда не тисне на бюджет, однак незначний фінансовий резерв потребує ретельного контролю витрат.';
    if (!budgetBad && rentBad) return 'Орендне навантаження суттєво обмежує фінансовий резерв, що підвищує ризик за непередбачених витрат.';
    if (budgetBad && rentGood) return 'Попри прийнятне орендне навантаження, недостатній бюджет залишається суттєвим фінансовим ризиком.';
    if (budgetBad && rentBad) return 'Фінансова складова потребує перегляду: як бюджет, так і орендне навантаження становлять суттєві ризики.';
    return 'Бюджет покриває базові потреби, але фінансовий резерв є невеликим — важливо контролювати витрати.';
  }

  private buildMarketSentence(
    demandLevel: RiskLevel,
    marketCapacityLevel: RiskLevel,
    verdict: Verdict,
  ): string {
    const demandGood = POSITIVE.includes(demandLevel);
    const demandBad = NEGATIVE.includes(demandLevel);
    const marketGood = POSITIVE.includes(marketCapacityLevel);
    const marketBad = NEGATIVE.includes(marketCapacityLevel);

    if (demandGood && marketGood) return 'Ринкове середовище виглядає сприятливим завдяки достатньому попиту та помірній конкуренції.';
    if (demandBad && marketBad) {
      if (verdict === 'RED') return 'Висока конкуренція та обмежений попит можуть ускладнити залучення клієнтів і збільшити строк окупності.';
      return 'Обмежений попит і висока конкуренція потребують ретельного аналізу перед прийняттям рішення про запуск.';
    }
    if (demandBad) return 'Попит у вибраній зоні є обмеженим, тому перед запуском варто додатково перевірити реальний потік клієнтів.';
    if (marketBad) return 'Висока конкуренція може ускладнити швидке залучення клієнтів — варто розробити чіткі конкурентні переваги.';
    if (demandGood) return 'Достатній попит у зоні створює сприятливу базу для залучення перших клієнтів.';
    if (marketGood) return 'Помірна конкуренція у зоні дає простір для розвитку та формування лояльної аудиторії.';
    return 'Ринкові показники є задовільними — рекомендується додатково перевірити специфіку конкретного приміщення перед запуском.';
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
