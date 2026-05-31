export type TierLabelType =
  | 'Strong opportunity'
  | 'Moderate potential'
  | 'Proceed with caution'
  | 'Not recommended';

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low' | 'minimal';

export type MetricKey = 'demand' | 'marketCapacity' | 'rent' | 'budget';

export type Risks = Record<MetricKey | 'score', RiskLevel>;

export const RISK_LEVEL_RANGES: readonly {
  min: number;
  max: number;
  level: RiskLevel;
}[] = [
  { min: 0.0, max: 0.2, level: 'critical' },
  { min: 0.2, max: 0.4, level: 'high' },
  { min: 0.4, max: 0.6, level: 'moderate' },
  { min: 0.6, max: 0.8, level: 'low' },
  { min: 0.8, max: 1.0, level: 'minimal' },
] as const;

export const METRIC_DESCRIPTIONS = {
  marketCapacity: {
    critical: 'ринок перенасичений конкурентами',
    high: 'висока конкуренція в районі',
    moderate: 'конкуренція на прийнятному рівні',
    low: 'обмежена конкуренція за даними карт',
    // "minimal" means low relative saturation — may still have some competitors
    // Use 'no competitors found' phrasing only when competitors === 0 (handled in report.service.ts)
    minimal: 'конкурентний тиск у зоні є мінімальним',
  },

  demand: {
    critical: 'дуже низький попит для цього типу бізнесу',
    high: 'попит нижче середнього в цьому районі',
    moderate: 'попит на достатньому рівні',
    low: 'хороший попит для цього типу бізнесу',
    minimal: 'сильний місцевий попит',
  },

  rent: {
    critical: 'оренда, ймовірно, перевищить бюджет',
    high: 'оренда створює значне фінансове навантаження',
    moderate: 'оренда прийнятна, але обмежує резерв',
    low: 'оренда комфортна для цього бюджету',
    minimal: 'оренда не становить фінансового ризику',
  },

  budget: {
    critical: 'бюджет критично нижче мінімальних вимог',
    high: 'бюджет нижче рекомендованого мінімуму',
    moderate: 'бюджет достатній, але резерв незначний',
    low: 'бюджет у нормі для цього типу бізнесу',
    minimal: 'бюджет суттєво перевищує вимоги',
  },
} as const satisfies Record<MetricKey, Record<RiskLevel, string>>;

export type Explanation = {
  title: string;
  summary: string;
  pros: string[];
  cons: string[];
  advice: string;
};

export const NEGATIVE: RiskLevel[] = ['critical', 'high'];
export const POSITIVE: RiskLevel[] = ['low', 'minimal'];

export type ReportResult = {
  paybackMonths: string;
  risks: string[];
  summary: string;
};
