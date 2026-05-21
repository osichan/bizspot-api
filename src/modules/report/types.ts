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
    critical: 'market is heavily saturated',
    high: 'significant competition in the area',
    moderate: 'competition is manageable',
    low: 'limited competition',
    minimal: 'almost no competition',
  },

  demand: {
    critical: 'very low foot traffic for this business type',
    high: 'below average demand in this area',
    moderate: 'adequate local demand',
    low: 'good demand for this business type',
    minimal: 'strong local demand',
  },

  rent: {
    critical: 'rent will likely exceed your budget',
    high: 'rent is a significant financial pressure',
    moderate: 'rent is manageable but tight',
    low: 'rent is comfortable for this budget',
    minimal: 'rent poses no financial risk',
  },

  budget: {
    critical: 'budget is critically below minimum requirements',
    high: 'budget is below recommended minimum',
    moderate: 'budget is sufficient but leaves little reserve',
    low: 'budget is healthy for this business type',
    minimal: 'budget is well above requirements',
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
