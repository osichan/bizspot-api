import {
  FiredRule,
  InputMemberships,
  FfLevel,
  MaLevel,
  RlLevel,
} from '../types';

type Rule<TLevel extends string> = {
  antecedent: (m: InputMemberships) => number;
  consequent: TLevel;
};

const and = (...values: number[]): number => Math.min(...values);

// ── Market Attractiveness ──────────────────────────────────────────────────
const MA_RULES: Rule<MaLevel>[] = [
  {
    antecedent: (m) => and(m.demand.high, m.marketCapacity.low),
    consequent: 'moderate',
  },
  {
    antecedent: (m) => and(m.demand.high, m.marketCapacity.medium),
    consequent: 'moderate',
  },
  {
    antecedent: (m) => and(m.demand.high, m.marketCapacity.high),
    consequent: 'strong',
  },
  {
    antecedent: (m) => and(m.demand.medium, m.marketCapacity.low),
    consequent: 'moderate',
  },
  {
    antecedent: (m) => and(m.demand.medium, m.marketCapacity.medium),
    consequent: 'moderate',
  },
  {
    antecedent: (m) => and(m.demand.medium, m.marketCapacity.high),
    consequent: 'moderate',
  },
  {
    antecedent: (m) => and(m.demand.low, m.marketCapacity.low),
    consequent: 'weak',
  },
  {
    antecedent: (m) => and(m.demand.low, m.marketCapacity.medium),
    consequent: 'weak',
  },
  {
    antecedent: (m) => and(m.demand.low, m.marketCapacity.high),
    consequent: 'weak',
  },
];

// ── Financial Feasibility ──────────────────────────────────────────────────
const FF_RULES: Rule<FfLevel>[] = [
  {
    antecedent: (m) => and(m.runway.long, m.rent.cheap),
    consequent: 'stable',
  },
  {
    antecedent: (m) => and(m.runway.long, m.rent.normal),
    consequent: 'stable',
  },
  {
    antecedent: (m) => and(m.runway.long, m.rent.expensive),
    consequent: 'viable',
  },
  {
    antecedent: (m) => and(m.runway.medium, m.rent.cheap),
    consequent: 'stable',
  },
  {
    antecedent: (m) => and(m.runway.medium, m.rent.normal),
    consequent: 'viable',
  },
  {
    antecedent: (m) => and(m.runway.medium, m.rent.expensive),
    consequent: 'risky',
  },
  {
    antecedent: (m) => and(m.runway.short, m.rent.cheap),
    consequent: 'viable',
  },
  {
    antecedent: (m) => and(m.runway.short, m.rent.normal),
    consequent: 'risky',
  },
  {
    antecedent: (m) => and(m.runway.short, m.rent.expensive),
    consequent: 'non_viable',
  },
  { antecedent: (m) => m.budget.insufficient, consequent: 'non_viable' },
];

// ── Risk Level ─────────────────────────────────────────────────────────────
const RL_RULES: Rule<RlLevel>[] = [
  { antecedent: (m) => and(m.demand.high, m.budget.strong), consequent: 'low' },
  {
    antecedent: (m) => and(m.demand.high, m.budget.sufficient),
    consequent: 'low',
  },
  {
    antecedent: (m) => and(m.demand.high, m.budget.tight),
    consequent: 'moderate',
  },
  {
    antecedent: (m) => and(m.demand.high, m.budget.insufficient),
    consequent: 'high',
  },
  {
    antecedent: (m) => and(m.demand.medium, m.budget.strong),
    consequent: 'low',
  },
  {
    antecedent: (m) => and(m.demand.medium, m.budget.sufficient),
    consequent: 'moderate',
  },
  {
    antecedent: (m) => and(m.demand.medium, m.budget.tight),
    consequent: 'moderate',
  },
  {
    antecedent: (m) => and(m.demand.medium, m.budget.insufficient),
    consequent: 'high',
  },
  {
    antecedent: (m) => and(m.demand.low, m.budget.strong),
    consequent: 'moderate',
  },
  {
    antecedent: (m) => and(m.demand.low, m.budget.sufficient),
    consequent: 'moderate',
  },
  { antecedent: (m) => and(m.demand.low, m.budget.tight), consequent: 'high' },
  {
    antecedent: (m) => and(m.demand.low, m.budget.insufficient),
    consequent: 'critical',
  },
  {
    antecedent: (m) => and(m.rent.expensive, m.budget.tight),
    consequent: 'high',
  },
  {
    antecedent: (m) => and(m.rent.expensive, m.budget.insufficient),
    consequent: 'critical',
  },
  {
    antecedent: (m) => and(m.marketCapacity.high, m.demand.low),
    consequent: 'critical',
  },
  {
    antecedent: (m) => m.marketCapacity.critical,
    consequent: 'critical',
  },
];

export function fireRules<TLevel extends string>(
  rules: Rule<TLevel>[],
  memberships: InputMemberships,
): FiredRule<TLevel>[] {
  return rules
    .map((rule) => ({
      strength: rule.antecedent(memberships),
      consequent: rule.consequent,
    }))
    .filter((r) => r.strength > 0);
}

export function fireMaRules(m: InputMemberships): FiredRule<MaLevel>[] {
  return fireRules(MA_RULES, m);
}

export function fireFfRules(m: InputMemberships): FiredRule<FfLevel>[] {
  return fireRules(FF_RULES, m);
}

export function fireRlRules(m: InputMemberships): FiredRule<RlLevel>[] {
  return fireRules(RL_RULES, m);
}
