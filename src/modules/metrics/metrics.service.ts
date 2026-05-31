import { Injectable } from '@nestjs/common';
import { MarketSnapshot } from '../market-data/types';
import { NormalizedMetrics } from '../scoring/types';

// Macro anchor: 5M population → cityFactor = 1.0; 1k → 0.0
const LOG_DEMAND_DIVISOR = Math.log10(5_000_000 / 1_000);
// Matches Overpass baseline: average Ukrainian urban district POI density
const BASELINE_DENSITY_PER_KM2 = 30;

// Small-town population tier — must match adaptiveCompetitorRadius boundaries.
const SMALL_TOWN_POP_FLOOR = 2_000;
const SMALL_TOWN_POP_CEILING = 20_000;
// Peak demand boost added at the tier midpoint (~11k pop); tapers to 0 at both boundaries.
// Without this, the 5M log anchor makes small local markets look critically unviable even when
// competition is low and the settlement is real and stable (e.g. Makariv, Irpin, Brovary suburbs).
// A parabolic shape keeps Kyiv/Lviv exactly unchanged while letting 5-18k towns enter
// the fuzzy "medium" demand zone when other conditions are favourable.
const SMALL_TOWN_MAX_DEMAND_BOOST = 0.40;

type computeProps = {
  snapshot: MarketSnapshot;
  budget: number;
};

@Injectable()
export class MetricsService {
  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }

  compute({ snapshot, budget }: computeProps): NormalizedMetrics {
    // Macro: city market size, log-scaled (Kyiv 2.9M → 0.94, Poltava 290k → 0.67)
    let cityFactor = Math.log10(Math.max(snapshot.population, 1_000) / 1_000) / LOG_DEMAND_DIVISOR;

    // Population-tier adjustment for small settlements (2k–20k).
    // Parabola: 0 at both boundaries, peak at midpoint (~11k).
    // Ensures continuity at the 20k boundary with large-city scaling.
    if (snapshot.population > SMALL_TOWN_POP_FLOOR && snapshot.population < SMALL_TOWN_POP_CEILING) {
      const t = (snapshot.population - SMALL_TOWN_POP_FLOOR) / (SMALL_TOWN_POP_CEILING - SMALL_TOWN_POP_FLOOR);
      cityFactor += SMALL_TOWN_MAX_DEMAND_BOOST * 4 * t * (1 - t);
    }

    // Micro: local traffic as modifier, not core driver — keeps city signal alive even in low-traffic zones
    // trafficMultiplier ∈ [0.5, 2.0] → localModifier ∈ [0.5, 1.0]
    const localModifier = 0.5 + 0.5 * ((snapshot.trafficMultiplier - 0.5) / 1.5);
    const demand = this.clamp(cityFactor * snapshot.urbanDependency * localModifier, 0, 1);

    // Raw saturation ratio: 0 = empty market, 1.0 = theoretical capacity, >1 = oversaturated.
    // Passed directly to fuzzy layer — no compression, full resolution preserved.
    const marketCapacity = snapshot.competitors / snapshot.saturationCompetitors;

    // Meso rent: DimRia gives city avg; commercial density adjusts for district pressure
    // clamp [0.7, 1.5]: quiet suburb pays ~70% of city avg, hot center up to 150%
    const rentPressureModifier = this.clamp(
      snapshot.commercialDensity / BASELINE_DENSITY_PER_KM2,
      0.7,
      1.5,
    );
    const adjustedRent = snapshot.avgRent * rentPressureModifier;
    const rent = this.clamp(1 - (adjustedRent * 12) / budget, 0, 1);

    const budgetMetric = this.clamp(budget / (snapshot.minBudget * 2), 0, 1);

    const monthlySalaries = snapshot.employees * snapshot.avgMonthlySalaryUsd;
    const monthlyUtilities = snapshot.avgRent * snapshot.utilitiesMultiplier;
    const monthlyBurn = (snapshot.avgRent + monthlySalaries + monthlyUtilities) * 1.15;
    const remainingCapital = Math.max(0, budget - snapshot.minBudget);
    const runway = monthlyBurn > 0 ? remainingCapital / monthlyBurn : 0;

    return {
      demand,
      marketCapacity,
      rent,
      budget: budgetMetric,
      runway,
      monthlyBurn,
    };
  }
}
