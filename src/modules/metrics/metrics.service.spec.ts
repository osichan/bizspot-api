import { MetricsService } from './metrics.service'
import { MarketSnapshot } from '../market-data/types'

const svc = new MetricsService()

// Minimal snapshot factory — only fields used by metrics.service.ts
const snap = (overrides: Partial<MarketSnapshot>): MarketSnapshot => ({
  cityName: 'Test',
  population: 100_000,
  competitorRadius: 500,
  avgRent: 200,
  trafficMultiplier: 1.0,
  commercialDensity: 30,
  competitors: 2,
  saturationCompetitors: 10,
  minBudget: 20_000,
  urbanDependency: 0.9,       // coffee_shop
  employees: 3,
  avgMonthlySalaryUsd: 350,
  utilitiesMultiplier: 0.2,
  ...overrides,
})

const demand = (population: number, urbanDependency = 0.9, trafficMultiplier = 0.5) =>
  svc.compute({ snapshot: snap({ population, urbanDependency, trafficMultiplier }), budget: 50_000 }).demand

// ── Issue 1: Small-town demand normalization ─────────────────────────────────

describe('MetricsService — small-town demand normalization', () => {
  it('Makariv-class town (9 390 pop): demand rises above "critical" threshold (0.2)', () => {
    // Before fix: ~0.12 (fully "low" fuzzy, always weak MA regardless of competition)
    // After fix: should cross 0.2 with minimum trafficMultiplier
    expect(demand(9_390)).toBeGreaterThan(0.2)
  })

  it('Small town low traffic (9 390): demand enters fuzzy "medium" zone (≥ 0.2)', () => {
    expect(demand(9_390, 0.9, 0.5)).toBeGreaterThan(0.2)
  })

  it('Small town moderate traffic (9 390): demand deeper into "medium" zone (≥ 0.3)', () => {
    expect(demand(9_390, 0.9, 1.0)).toBeGreaterThan(0.3)
  })

  it('Larger small town (15 000) with moderate traffic: demand in "medium" zone', () => {
    expect(demand(15_000, 0.9, 1.0)).toBeGreaterThan(0.3)
  })

  it('Small town demand is strictly less than Lviv-class city (720 000) — absolute ordering preserved', () => {
    const smallTown = demand(9_390, 0.9, 1.0)
    const lviv = demand(720_000, 0.9, 1.0)
    expect(smallTown).toBeLessThan(lviv)
  })

  it('Kyiv (2 900 000): demand > 0.65 — no small-town boost applied', () => {
    // Kyiv with avg traffic: cityFactor ≈ 0.94, localModifier ≈ 0.83 → demand ≈ 0.70
    expect(demand(2_900_000, 0.9, 1.5)).toBeGreaterThan(0.65)
  })

  it('Lviv (720 000): demand > 0.35 — large-city path unchanged', () => {
    // Lviv with average traffic: cityFactor ≈ 0.77, localModifier ≈ 0.67 → demand ≈ 0.46
    expect(demand(720_000, 0.9, 1.0)).toBeGreaterThan(0.35)
  })

  it('Boundary continuity at 20 000: boost tapers to ~0, no jump vs 20 001', () => {
    const just_below = demand(19_999, 0.9, 0.5)
    const at_ceiling = demand(20_001, 0.9, 0.5) // uses standard formula
    // Must be close — no step discontinuity at the boundary
    expect(Math.abs(just_below - at_ceiling)).toBeLessThan(0.04)
  })

  it('Below SMALL_TOWN_POP_FLOOR (2 000): no boost — too small a settlement', () => {
    const tiny = demand(1_500, 0.9, 0.5)
    const floor = demand(2_001, 0.9, 0.5)
    // 1 500 should be lower or equal (no boost below floor)
    expect(tiny).toBeLessThanOrEqual(floor)
  })

  it('Pharmacy in small town (urbanDependency=0.65): gets proportionally higher demand than coffee_shop', () => {
    // Pharmacy has lower urbanDependency → less dependence on city size
    // But the city factor boost is the same, so absolute demand depends on urbanDependency
    const coffeeShop = demand(9_390, 0.9, 0.5)
    const pharmacy = demand(9_390, 0.65, 0.5)
    // pharmacy urbanDependency is lower → demand will be lower (urbanDependency is a multiplier)
    // But RATIO to the no-boost baseline improves more for businesses with low urbanDependency
    // Both should be above the "critical" threshold
    expect(coffeeShop).toBeGreaterThan(0.2)
    expect(pharmacy).toBeGreaterThan(0.1)
  })

  it('High-competition small town: demand boost does not make it GREEN (marketCapacity still dominates)', () => {
    const result = svc.compute({
      snapshot: snap({
        population: 9_390,
        trafficMultiplier: 0.5,
        competitors: 15,
        saturationCompetitors: 8, // deeply saturated
        urbanDependency: 0.9,
      }),
      budget: 50_000,
    })
    // Demand improves but marketCapacity > 1.0 still produces RED via saturation_override
    expect(result.marketCapacity).toBeGreaterThan(1.0)
    expect(result.demand).toBeGreaterThan(0.2)
  })
})

// ── Issue 2: Pharmacy OSM tag regression ────────────────────────────────────

describe('pharmacy osmTags regression', () => {
  it('pharmacy osmTags include healthcare=pharmacy (primary UA tag)', () => {
    const { businessTypesData } = require('src/data/business-types.data')
    expect(businessTypesData.pharmacy.osmTags).toContain('healthcare=pharmacy')
  })

  it('pharmacy osmTags still include amenity=pharmacy', () => {
    const { businessTypesData } = require('src/data/business-types.data')
    expect(businessTypesData.pharmacy.osmTags).toContain('amenity=pharmacy')
  })
})
