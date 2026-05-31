import { adaptiveCompetitorRadius } from './ua-market.provider'
import { PopulationService } from '../sources/population.service'
import { SATURATION_BY_POPULATION } from 'src/data/business-types.data'

// ── adaptiveCompetitorRadius ─────────────────────────────────────────────────

describe('adaptiveCompetitorRadius', () => {
  it('population=0 (unknown) → max(base, 2000)', () => {
    expect(adaptiveCompetitorRadius(500, 0)).toBe(2_000)
    expect(adaptiveCompetitorRadius(700, 0)).toBe(2_000)
    expect(adaptiveCompetitorRadius(4_000, 0)).toBe(4_000) // base > 2000 → base wins
  })

  it('small town < 20 000 → max(base, 2000)', () => {
    expect(adaptiveCompetitorRadius(500, 9_390)).toBe(2_000)   // Makariv coffee_shop
    expect(adaptiveCompetitorRadius(700, 9_390)).toBe(2_000)   // Makariv barbershop
    expect(adaptiveCompetitorRadius(500, 9_390)).toBe(2_000)   // Makariv pharmacy
    expect(adaptiveCompetitorRadius(4_000, 9_390)).toBe(4_000) // car_wash base already > 2000
    expect(adaptiveCompetitorRadius(500, 19_999)).toBe(2_000)
  })

  it('mid-size city 20 000–99 999 → max(base, 1200)', () => {
    expect(adaptiveCompetitorRadius(500, 20_000)).toBe(1_200)
    expect(adaptiveCompetitorRadius(500, 65_167)).toBe(1_200)  // Irpin
    expect(adaptiveCompetitorRadius(1_200, 50_000)).toBe(1_200)
    expect(adaptiveCompetitorRadius(4_000, 50_000)).toBe(4_000) // base > 1200
    expect(adaptiveCompetitorRadius(500, 99_999)).toBe(1_200)
  })

  it('large city ≥ 100 000 → uses base radius unchanged', () => {
    expect(adaptiveCompetitorRadius(500, 100_000)).toBe(500)   // Kyiv coffee_shop
    expect(adaptiveCompetitorRadius(700, 720_000)).toBe(700)   // Lviv barbershop
    expect(adaptiveCompetitorRadius(500, 2_900_000)).toBe(500) // Kyiv pharmacy
    expect(adaptiveCompetitorRadius(4_000, 480_000)).toBe(4_000)
  })
})

// ── PopulationService.estimateSync ───────────────────────────────────────────

describe('PopulationService.estimateSync', () => {
  const makeService = () => {
    const mockOverpass = { getBuildingPopulation: jest.fn() }
    const mockCache = { get: jest.fn(), set: jest.fn() }
    return new PopulationService(mockCache as any, mockOverpass as any)
  }

  it('known major city returns population without any external call', () => {
    const svc = makeService()
    expect(svc.estimateSync({ city: 'kyiv', state: 'kyiv' })).toBe(2_900_000)
    expect(svc.estimateSync({ city: 'lviv', state: 'lviv' })).toBe(720_000)
  })

  it('Makariv found via transliteration in generated dataset', () => {
    const svc = makeService()
    const pop = svc.estimateSync({
      city: 'makariv',
      state: 'kyiv',
      district: 'Buchaskyi Raion',
    })
    expect(pop).toBe(9_390)
  })

  it('unknown location returns 0', () => {
    const svc = makeService()
    expect(svc.estimateSync({ city: 'totally-unknown', state: 'nowhere' })).toBe(0)
  })

  it('Makariv popEstimate < 20 000 → adaptive radius = 2000 for 500m business', () => {
    const svc = makeService()
    const pop = svc.estimateSync({ city: 'makariv', state: 'kyiv' })
    expect(adaptiveCompetitorRadius(500, pop)).toBe(2_000)
  })
})

// ── Pharmacy saturation formula regression ───────────────────────────────────

describe('SATURATION_BY_POPULATION — pharmacy regression (Berehove)', () => {
  const PHARMACY_POP_PER_UNIT = SATURATION_BY_POPULATION['pharmacy']!

  it('pharmacy saturationByPopulation is defined and plausible (1000–3000 per unit)', () => {
    expect(PHARMACY_POP_PER_UNIT).toBeGreaterThanOrEqual(1_000)
    expect(PHARMACY_POP_PER_UNIT).toBeLessThanOrEqual(3_000)
  })

  it('Berehove (23 325 pop, 22 competitors): min(area-based, pop-based) triggers saturation', () => {
    // Berehove: radius=1200m (adaptive for 23k), trafficMultiplier≈1.0
    const radius = 1_200
    const areaKm2 = Math.PI * (radius / 1_000) ** 2  // 4.52 km²
    const areaSaturation = 20 * areaKm2 * 1.0           // 90.4 (old formula)
    const popSaturation = 23_325 / PHARMACY_POP_PER_UNIT // 11.7

    const saturation = Math.min(areaSaturation, popSaturation)
    const marketCapacity = 22 / saturation

    // Old formula: 22/90.4 = 0.24 → open market
    expect(areaSaturation).toBeGreaterThan(50)
    // New formula: pop-based is binding and small
    expect(popSaturation).toBeLessThan(20)
    // Result: market is saturated (marketCapacity > 1.0)
    expect(marketCapacity).toBeGreaterThan(1.0)
  })

  it('Kyiv pharmacy (2 900 000 pop, 500m radius): area-based is binding — large-city unchanged', () => {
    const radius = 500
    const areaKm2 = Math.PI * (radius / 1_000) ** 2  // 0.785 km²
    const areaSaturation = 20 * areaKm2 * 1.0          // 15.7
    const popSaturation = 2_900_000 / PHARMACY_POP_PER_UNIT // 1450

    const saturation = Math.min(areaSaturation, popSaturation)
    // Area-based dominates for large cities — behaviour unchanged
    expect(saturation).toBeCloseTo(areaSaturation, 0)
  })

  it('Makariv pharmacy (9 390 pop, 0 competitors): not saturated, open market signal', () => {
    const radius = 2_000 // adaptive for pop < 20k
    const areaKm2 = Math.PI * (radius / 1_000) ** 2
    const areaSaturation = 20 * areaKm2 * 1.0
    const popSaturation = 9_390 / PHARMACY_POP_PER_UNIT

    const saturation = Math.min(areaSaturation, popSaturation)
    const marketCapacity = 0 / saturation  // 0 competitors

    expect(marketCapacity).toBe(0)   // empty market — open signal preserved
    expect(saturation).toBeCloseTo(popSaturation, 0) // pop-based is binding for small town
  })
})
