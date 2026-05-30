import { adaptiveCompetitorRadius } from './ua-market.provider'
import { PopulationService } from '../sources/population.service'

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
