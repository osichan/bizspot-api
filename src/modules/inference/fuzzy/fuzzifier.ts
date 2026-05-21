import { InputMemberships } from '../types';
import { trapmf, trimf } from './membership';

export function fuzzify(metrics: {
  demand: number;
  marketCapacity: number;
  rent: number;
  budget: number;
  runway: number;
}): InputMemberships {
  const { demand, marketCapacity, rent, budget, runway } = metrics;

  return {
    demand: {
      low: trapmf(demand, -0.1, 0, 0.2, 0.4),
      medium: trimf(demand, 0.2, 0.5, 0.8),
      high: trapmf(demand, 0.6, 0.8, 1.0, 1.1),
    },
    // marketCapacity = saturationRatio = competitors / saturationCompetitors
    // high = open market (ratio near 0), critical = structurally overcrowded (ratio > 1.3)
    marketCapacity: {
      high:     trapmf(marketCapacity, -0.1, 0, 0.2, 0.5),
      medium:   trimf(marketCapacity, 0.35, 0.6, 0.85),
      low:      trimf(marketCapacity, 0.8, 1.0, 1.25),
      critical: trapmf(marketCapacity, 1.15, 1.4, 9999, 10000),
    },
    rent: {
      expensive: trapmf(rent, -0.1, 0, 0.2, 0.4),
      normal: trimf(rent, 0.2, 0.5, 0.8),
      cheap: trapmf(rent, 0.6, 0.8, 1.0, 1.1),
    },
    budget: {
      insufficient: trapmf(budget, -0.1, 0, 0.15, 0.3),
      tight: trimf(budget, 0.15, 0.35, 0.55),
      sufficient: trimf(budget, 0.45, 0.65, 0.85),
      strong: trapmf(budget, 0.7, 0.85, 1.0, 1.1),
    },
    // runway in months: short <8mo, medium 5–20mo, long >15mo
    runway: {
      short: trapmf(runway, -1, 0, 4, 8),
      medium: trimf(runway, 5, 11, 20),
      long: trapmf(runway, 15, 20, 9999, 10000),
    },
  };
}
