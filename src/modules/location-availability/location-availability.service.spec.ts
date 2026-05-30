import { UnprocessableEntityException } from '@nestjs/common'
import { LocationAvailabilityService } from './location-availability.service'
import { AnalysisService } from '../analysis/analysis.service'

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeAvailabilityService = (nominatimResult: object) => {
  const mockNominatim = { getAddressInfo: jest.fn().mockResolvedValue(nominatimResult) }
  return {
    svc: new LocationAvailabilityService(mockNominatim as any),
    mockNominatim,
  }
}

const ua = (region: string, county: string | null, settlement: string) => ({
  country: 'Ukraine',
  countryCode: 'ua',
  region,
  county,
  settlement,
})

// ── LocationAvailabilityService ───────────────────────────────────────────────

describe('LocationAvailabilityService — available locations', () => {
  it('Kyiv — available', async () => {
    const { svc } = makeAvailabilityService(ua('Kyiv City', null, 'Kyiv'))
    const r = await svc.check(50.4501, 30.5234)
    expect(r.available).toBe(true)
    expect(r.reason).toBeNull()
    expect(r.message).toBeNull()
    expect(r.country).toBe('Ukraine')
    expect(r.countryCode).toBe('ua')
  })

  it('Lviv — available', async () => {
    const { svc } = makeAvailabilityService(ua('Lviv Oblast', 'Lviv Raion', 'Lviv'))
    const r = await svc.check(49.8397, 24.0297)
    expect(r.available).toBe(true)
    expect(r.reason).toBeNull()
  })

  it('Odesa — available', async () => {
    const { svc } = makeAvailabilityService(ua('Odesa Oblast', 'Odesa Raion', 'Odesa'))
    const r = await svc.check(46.4825, 30.7233)
    expect(r.available).toBe(true)
    expect(r.reason).toBeNull()
  })
})

describe('LocationAvailabilityService — outside Ukraine', () => {
  it('Poland (Warsaw) — outside_ukraine', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Poland',
      countryCode: 'pl',
      region: 'Masovian Voivodeship',
      county: null,
      settlement: 'Warsaw',
    })
    const r = await svc.check(52.2297, 21.0122)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('outside_ukraine')
    expect(r.country).toBe('Poland')
    expect(r.countryCode).toBe('pl')
  })
})

describe('LocationAvailabilityService — restricted territories', () => {
  it('Crimea — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService(ua('Crimea', null, 'Simferopol'))
    const r = await svc.check(44.9521, 34.1024)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('Crimea via "Autonomous Republic of Crimea" Nominatim variant — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService(ua('Autonomous Republic of Crimea', null, 'Yalta'))
    const r = await svc.check(44.4952, 34.1663)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('Sevastopol — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService(ua('Sevastopol', null, 'Sevastopol'))
    const r = await svc.check(44.6166, 33.5254)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('Donetsk Oblast — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService(ua('Donetsk Oblast', null, 'Donetsk'))
    const r = await svc.check(48.0, 37.8)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('Luhansk Oblast — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService(ua('Luhansk Oblast', null, 'Luhansk'))
    const r = await svc.check(48.574, 39.3078)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('Zaporizhzhia city — restricted_safety_area (KMU spelling)', async () => {
    const { svc } = makeAvailabilityService(ua('Zaporizhzhia Oblast', 'Zaporizhzhia Raion', 'Zaporizhzhia'))
    const r = await svc.check(47.8388, 35.1396)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('Zaporizhzhia city — restricted_safety_area (Nominatim short spelling "Zaporizhia")', async () => {
    const { svc } = makeAvailabilityService(ua('Zaporizhia Oblast', 'Zaporizhia Raion', 'Zaporizhzhia'))
    const r = await svc.check(47.8388, 35.1396)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('Any point in Zaporizhzhia Oblast — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService(ua('Zaporizhzhia Oblast', 'Melitopol Raion', 'Melitopol'))
    const r = await svc.check(46.85, 35.37)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('Kherson city — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService(ua('Kherson Oblast', 'Kherson Raion', 'Kherson'))
    const r = await svc.check(46.6354, 32.6169)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('Any point in Kherson Oblast — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService(ua('Kherson Oblast', 'Henichesk Raion', 'Henichesk'))
    const r = await svc.check(46.1768, 34.7981)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
  })

  it('restricted response includes correct fields', async () => {
    const { svc } = makeAvailabilityService(ua('Donetsk Oblast', null, 'Kramatorsk'))
    const r = await svc.check(48.7, 37.57)
    expect(r.available).toBe(false)
    expect(r.reason).toBe('restricted_safety_area')
    expect(r.message).toBe(
      'Standard business analysis is unavailable for this location due to limited market data reliability and safety risks.',
    )
    expect(r.country).toBe('Ukraine')
    expect(r.countryCode).toBe('ua')
    expect(r.region).toBe('Donetsk Oblast')
  })
})

// ── AnalysisService — location gate ──────────────────────────────────────────

describe('AnalysisService — location availability gate', () => {
  const buildAnalysisService = (availabilityResult: Awaited<ReturnType<LocationAvailabilityService['check']>>) => {
    const mockLocationAvailability = { check: jest.fn().mockResolvedValue(availabilityResult) }
    const mockMetrics = { compute: jest.fn() }
    const mockInference = { infer: jest.fn() }
    const mockReport = { generate: jest.fn() }
    const mockMarketProvider = { getSnapshot: jest.fn() }
    const mockCsvLogger = { writeNewData: jest.fn() }

    const svc = new AnalysisService(
      mockMetrics as any,
      mockInference as any,
      mockReport as any,
      mockMarketProvider as any,
      mockCsvLogger as any,
      mockLocationAvailability as any,
    )
    return { svc, mockLocationAvailability, mockMarketProvider }
  }

  it('throws 422 for location outside Ukraine', async () => {
    const { svc } = buildAnalysisService({
      available: false,
      reason: 'outside_ukraine',
      message: 'Analysis is currently available only for locations within Ukraine.',
      country: 'Poland',
      countryCode: 'pl',
      region: 'Masovian Voivodeship',
      district: null,
      settlement: 'Warsaw',
    })
    await expect(
      svc.analyze({ lat: 52.2297, lng: 21.0122, businessType: 'coffee_shop', budget: 50000 }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws 422 for restricted territory (Donetsk)', async () => {
    const { svc } = buildAnalysisService({
      available: false,
      reason: 'restricted_safety_area',
      message: 'Standard business analysis is unavailable for this location due to limited market data reliability and safety risks.',
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Donetsk Oblast',
      district: null,
      settlement: 'Donetsk',
    })
    await expect(
      svc.analyze({ lat: 48.0, lng: 37.8, businessType: 'coffee_shop', budget: 50000 }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws 422 for restricted territory (Zaporizhzhia)', async () => {
    const { svc } = buildAnalysisService({
      available: false,
      reason: 'restricted_safety_area',
      message: 'Standard business analysis is unavailable for this location due to limited market data reliability and safety risks.',
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Zaporizhzhia Oblast',
      district: null,
      settlement: 'Zaporizhzhia',
    })
    await expect(
      svc.analyze({ lat: 47.8388, lng: 35.1396, businessType: 'coffee_shop', budget: 50000 }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('throws 422 for restricted territory (Kherson)', async () => {
    const { svc } = buildAnalysisService({
      available: false,
      reason: 'restricted_safety_area',
      message: 'Standard business analysis is unavailable for this location due to limited market data reliability and safety risks.',
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Kherson Oblast',
      district: null,
      settlement: 'Kherson',
    })
    await expect(
      svc.analyze({ lat: 46.6354, lng: 32.6169, businessType: 'coffee_shop', budget: 50000 }),
    ).rejects.toThrow(UnprocessableEntityException)
  })

  it('blocked response has no score or verdict fields', async () => {
    const { svc } = buildAnalysisService({
      available: false,
      reason: 'restricted_safety_area',
      message: 'Standard business analysis is unavailable for this location due to limited market data reliability and safety risks.',
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Luhansk Oblast',
      district: null,
      settlement: 'Luhansk',
    })
    let thrown: UnprocessableEntityException | undefined
    try {
      await svc.analyze({ lat: 48.574, lng: 39.3078, businessType: 'coffee_shop', budget: 50000 })
    } catch (e) {
      thrown = e as UnprocessableEntityException
    }
    expect(thrown).toBeInstanceOf(UnprocessableEntityException)
    const body = thrown!.getResponse() as Record<string, unknown>
    expect(body).not.toHaveProperty('score')
    expect(body).not.toHaveProperty('verdict')
    expect(body.reason).toBe('restricted_safety_area')
    expect(body.available).toBe(false)
  })

  it('does not call market data provider when location is blocked', async () => {
    const { svc, mockMarketProvider } = buildAnalysisService({
      available: false,
      reason: 'restricted_safety_area',
      message: 'Standard business analysis is unavailable for this location due to limited market data reliability and safety risks.',
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Kherson Oblast',
      district: null,
      settlement: 'Kherson',
    })
    await expect(
      svc.analyze({ lat: 46.6354, lng: 32.6169, businessType: 'coffee_shop', budget: 50000 }),
    ).rejects.toThrow(UnprocessableEntityException)
    expect(mockMarketProvider.getSnapshot).not.toHaveBeenCalled()
  })

  it('proceeds to market data fetch for available location (Kyiv)', async () => {
    const { svc, mockMarketProvider } = buildAnalysisService({
      available: true,
      reason: null,
      message: null,
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Kyiv Oblast',
      district: null,
      settlement: 'Kyiv',
    })
    mockMarketProvider.getSnapshot.mockRejectedValue(new Error('stop'))
    await expect(
      svc.analyze({ lat: 50.4501, lng: 30.5234, businessType: 'coffee_shop', budget: 50000 }),
    ).rejects.toThrow('stop')
    expect(mockMarketProvider.getSnapshot).toHaveBeenCalledTimes(1)
  })
})
