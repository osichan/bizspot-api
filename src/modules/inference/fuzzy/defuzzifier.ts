import { FiredRule, FfLevel, MaLevel, RlLevel } from '../types';
import { trapmf, trimf } from './membership';

const SAMPLES = 100;

const MA_OUTPUT: Record<MaLevel, (x: number) => number> = {
  weak: (x) => trapmf(x, -0.1, 0, 0.2, 0.4),
  moderate: (x) => trimf(x, 0.2, 0.5, 0.8),
  strong: (x) => trapmf(x, 0.6, 0.8, 1.0, 1.1),
};

const FF_OUTPUT: Record<FfLevel, (x: number) => number> = {
  non_viable: (x) => trapmf(x, -0.1, 0, 0.15, 0.3),
  risky: (x) => trimf(x, 0.15, 0.35, 0.55),
  viable: (x) => trimf(x, 0.45, 0.65, 0.85),
  stable: (x) => trapmf(x, 0.7, 0.85, 1.0, 1.1),
};

const RL_OUTPUT: Record<RlLevel, (x: number) => number> = {
  low: (x) => trapmf(x, -0.1, 0, 0.15, 0.3),
  moderate: (x) => trimf(x, 0.15, 0.35, 0.55),
  high: (x) => trimf(x, 0.45, 0.65, 0.85),
  critical: (x) => trapmf(x, 0.7, 0.85, 1.0, 1.1),
};

function centroid<TLevel extends string>(
  firedRules: FiredRule<TLevel>[],
  outputSet: Record<TLevel, (x: number) => number>,
): number {
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i <= SAMPLES; i++) {
    const x = i / SAMPLES;
    let aggregated = 0;

    for (const rule of firedRules) {
      const clipped = Math.min(rule.strength, outputSet[rule.consequent](x));
      aggregated = Math.max(aggregated, clipped);
    }

    numerator += x * aggregated;
    denominator += aggregated;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

export function defuzzifyMa(firedRules: FiredRule<MaLevel>[]): number {
  return centroid(firedRules, MA_OUTPUT);
}

export function defuzzifyFf(firedRules: FiredRule<FfLevel>[]): number {
  return centroid(firedRules, FF_OUTPUT);
}

export function defuzzifyRl(firedRules: FiredRule<RlLevel>[]): number {
  return centroid(firedRules, RL_OUTPUT);
}
