import { UnprocessableEntityException } from '@nestjs/common'
import { LocationAvailabilityService } from './location-availability.service'
import { AnalysisService } from '../analysis/analysis.service'

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeAvailabilityService = (nominatimResult: Awaited<ReturnType<any>>) => {
  const mockNominatim = { getAddressInfo: jest.fn().mockResolvedValue(nominatimResult) }
  return {
    svc: new LocationAvailabilityService(mockNominatim as any),
    mockNominatim,
  }
}

// ── LocationAvailabilityService ───────────────────────────────────────────────

describe('LocationAvailabilityService', () => {
  // ── Available locations ─────────────────────────────────────────────────────

  it('Kyiv — available', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Kyiv Oblast',
      county: 'Pecherskyi District',
      settlement: 'Kyiv',
    })
    const result = await svc.check(50.4501, 30.5234)
    expect(result.available).toBe(true)
    expect(result.reason).toBeNull()
    expect(result.message).toBeNull()
    expect(result.country).toBe('Ukraine')
    expect(result.region).toBe('Kyiv Oblast')
  })

  it('Lviv — available', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Lviv Oblast',
      county: 'Lviv Raion',
      settlement: 'Lviv',
    })
    const result = await svc.check(49.8397, 24.0297)
    expect(result.available).toBe(true)
    expect(result.reason).toBeNull()
  })

  it('Kharkiv city (not in restricted raion) — available', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Kharkiv Oblast',
      county: 'Kharkiv Raion',
      settlement: 'Kharkiv',
    })
    const result = await svc.check(49.9935, 36.2304)
    expect(result.available).toBe(true)
  })

  // ── Outside Ukraine ─────────────────────────────────────────────────────────

  it('Poland coordinates — outside_ukraine', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Poland',
      countryCode: 'pl',
      region: 'Masovian Voivodeship',
      county: null,
      settlement: 'Warsaw',
    })
    const result = await svc.check(52.2297, 21.0122)
    expect(result.available).toBe(false)
    expect(result.reason).toBe('outside_ukraine')
    expect(result.country).toBe('Poland')
  })

  it('Germany coordinates — outside_ukraine', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Germany',
      countryCode: 'de',
      region: 'Bavaria',
      county: null,
      settlement: 'Munich',
    })
    const result = await svc.check(48.1351, 11.582)
    expect(result.available).toBe(false)
    expect(result.reason).toBe('outside_ukraine')
  })

  // ── Restricted territories ──────────────────────────────────────────────────

  it('Crimea — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Crimea',
      county: null,
      settlement: 'Simferopol',
    })
    const result = await svc.check(44.9521, 34.1024)
    expect(result.available).toBe(false)
    expect(result.reason).toBe('restricted_safety_area')
    expect(result.country).toBe('Ukraine')
  })

  it('Crimea via "Republic of Crimea" Nominatim variant — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Republic of Crimea',
      county: null,
      settlement: 'Yalta',
    })
    const result = await svc.check(44.4952, 34.1663)
    expect(result.available).toBe(false)
    expect(result.reason).toBe('restricted_safety_area')
  })

  it('Sevastopol — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Sevastopol',
      county: null,
      settlement: 'Sevastopol',
    })
    const result = await svc.check(44.6166, 33.5254)
    expect(result.available).toBe(false)
    expect(result.reason).toBe('restricted_safety_area')
  })

  it('Donetsk Oblast — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Donetsk Oblast',
      county: null,
      settlement: 'Donetsk',
    })
    const result = await svc.check(48.0, 37.8)
    expect(result.available).toBe(false)
    expect(result.reason).toBe('restricted_safety_area')
  })

  it('Luhansk Oblast — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Luhansk Oblast',
      county: null,
      settlement: 'Luhansk',
    })
    const result = await svc.check(48.574, 39.3078)
    expect(result.available).toBe(false)
    expect(result.reason).toBe('restricted_safety_area')
  })

  it('Melitopol Raion, Zaporizhzhia — restricted_safety_area', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Zaporizhzhia Oblast',
      county: 'Melitopol Raion',
      settlement: 'Melitopol',
    })
    const result = await svc.check(46.85, 35.37)
    expect(result.available).toBe(false)
    expect(result.reason).toBe('restricted_safety_area')
  })

  it('Zaporizhzhia city (not in restricted raion) — available', async () => {
    const { svc } = makeAvailabilityService({
      country: 'Ukraine',
      countryCode: 'ua',
      region: 'Zaporizhzhia Oblast',
      county: 'Zaporizhzhia Raion',
      settlement: 'Zaporizhzhia',
    })
    const result = await svc.check(47.8388, 35.1396)
    expect(result.available).toBe(true)
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

  it('throws UnprocessableEntityException when location is outside Ukraine', async () => {
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

  it('throws UnprocessableEntityException when location is in restricted territory', async () => {
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

  it('UnprocessableEntityException response includes reason and location fields', async () => {
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
    expect(body.reason).toBe('restricted_safety_area')
    expect(body.available).toBe(false)
    expect(body.region).toBe('Luhansk Oblast')
  })

  it('proceeds to market data fetch when location is available (Kyiv)', async () => {
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
    // Market provider throws to stop further execution — we only want to confirm the gate passed
    mockMarketProvider.getSnapshot.mockRejectedValue(new Error('stop'))
    await expect(
      svc.analyze({ lat: 50.4501, lng: 30.5234, businessType: 'coffee_shop', budget: 50000 }),
    ).rejects.toThrow('stop')
    expect(mockMarketProvider.getSnapshot).toHaveBeenCalledTimes(1)
  })
})
