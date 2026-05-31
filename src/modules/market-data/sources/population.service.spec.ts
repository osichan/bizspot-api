import { PopulationService } from './population.service'

const makeService = (osmResult: number) => {
  const mockOverpass = { getBuildingPopulation: jest.fn().mockResolvedValue(osmResult) }
  const mockCache = { get: jest.fn().mockReturnValue(null), set: jest.fn() }
  return {
    svc: new PopulationService(mockCache as any, mockOverpass as any),
    mockOverpass,
  }
}

describe('PopulationService — settlement population fallback', () => {
  // ── Regression: Vynnyky (original bug) ───────────────────────────────────

  it('Vynnyky: OSM ~440 overridden by generated dataset — official pop 19 037', async () => {
    // Nominatim EN: town="Vynnyky", state→"lviv", district="Lviv Raion"
    // Two Вінники in Lviv Oblast — district disambiguates to the larger (Lviv Raion)
    const { svc } = makeService(440)
    const pop = await svc.getMarketSize({
      city: 'vynnyky',
      state: 'lviv',
      lat: 49.81683160533214,
      lng: 24.136931371711803,
      radius: 700,
      district: 'Lviv Raion',
    })
    expect(pop).toBe(19_037)
  })

  it('Vynnyky: without district — resolves to highest-pop match in region (19 037)', async () => {
    const { svc } = makeService(440)
    const pop = await svc.getMarketSize({
      city: 'vynnyky',
      state: 'lviv',
      lat: 49.81683160533214,
      lng: 24.136931371711803,
      radius: 700,
    })
    expect(pop).toBe(19_037)
  })

  // ── Other Lviv suburbs ────────────────────────────────────────────────────

  it('Briukhovychi: transliteration match — official pop 6 559', async () => {
    // Two Брюховичі in Lviv Raion (6 559 and 510); sort by pop desc → 6 559
    const { svc } = makeService(300)
    const pop = await svc.getMarketSize({
      city: 'briukhovychi',
      state: 'lviv',
      lat: 49.9025,
      lng: 23.9467,
      radius: 700,
      district: 'Lviv Raion',
    })
    expect(pop).toBe(6_559)
  })

  it('Rudno: manual list overrides generated (OSM name "rudno" ≠ official "рудне")', async () => {
    // Nominatim returns "rudno" but official XLSX has "рудне"
    // The manual ua-settlements.data.ts has alias "rudno" for "рудне" → checked first
    const { svc } = makeService(200)
    const pop = await svc.getMarketSize({
      city: 'rudno',
      state: 'lviv',
      lat: 49.8359,
      lng: 23.8807,
      radius: 700,
      district: 'Lviv Raion',
    })
    expect(pop).toBeGreaterThan(2_000)
    expect(pop).not.toBe(200)
  })

  // ── Dubliany disambiguation ───────────────────────────────────────────────

  it('Dubliany (Lviv Raion): district narrows to official 9 748, not Sambir 1 647', async () => {
    const { svc } = makeService(100)
    const pop = await svc.getMarketSize({
      city: 'dubliany',
      state: 'lviv',
      lat: 49.9027,
      lng: 24.0876,
      radius: 700,
      district: 'Lviv Raion',
    })
    expect(pop).toBe(9_748)
  })

  // ── Horodok duplicate name ────────────────────────────────────────────────

  it('Horodok (Lviv Oblast): region resolves to official 16 085', async () => {
    const { svc } = makeService(0)
    const pop = await svc.getMarketSize({
      city: 'horodok',
      state: 'lviv',
      lat: 49.78,
      lng: 23.65,
      radius: 800,
    })
    expect(pop).toBe(16_085)
  })

  it('Horodok (Khmelnytskyi Oblast): region resolves to official 15 633', async () => {
    const { svc } = makeService(0)
    const pop = await svc.getMarketSize({
      city: 'horodok',
      state: 'khmelnytskyi',
      lat: 49.17,
      lng: 26.58,
      radius: 800,
    })
    expect(pop).toBe(15_633)
  })

  // ── Small village from generated dataset ─────────────────────────────────

  it('Kalnyshivka (Vinnytsia Oblast, unique name): resolves via transliteration', async () => {
    // "Кальнишівка" → KMU translit → "kalnyshivka", pop=196
    const { svc } = makeService(50)
    const pop = await svc.getMarketSize({
      city: 'kalnyshivka',
      state: 'vinnytsia',
      lat: 0,
      lng: 0,
      radius: 500,
    })
    expect(pop).toBe(196)
  })

  // ── Kryvyi Rih regression ─────────────────────────────────────────────────

  it('Kryvyi Rih: resolves to 630 000 without calling Overpass', async () => {
    // Nominatim returns city="Kryvyi Rih" (BGN: "ий"→"yi") → lowercased "kryvyi rih".
    // KMU transliteration produces "kryvyy rih" ("ий"→"yy") — no match in generated dataset.
    // Fix: explicit entry in UA_CITY_POPULATION under key "kryvyi rih".
    const { svc, mockOverpass } = makeService(0)
    const pop = await svc.getMarketSize({
      city: 'kryvyi rih',
      state: 'dnipropetrovsk',
      lat: 47.9068,
      lng: 33.3817,
      radius: 1_200,
    })
    expect(pop).toBe(630_000)
    expect(mockOverpass.getBuildingPopulation).not.toHaveBeenCalled()
  })

  it('Kryvyi Rih estimateSync: returns 630 000 from UA_CITY_POPULATION', () => {
    const { svc } = makeService(0)
    const pop = svc.estimateSync({
      city: 'kryvyi rih',
      state: 'dnipropetrovsk',
    })
    expect(pop).toBe(630_000)
  })

  // ── Major city short-circuit ──────────────────────────────────────────────

  it('Lviv: returns 720 000 without calling Overpass', async () => {
    const { svc, mockOverpass } = makeService(0)
    const pop = await svc.getMarketSize({
      city: 'lviv',
      state: 'lviv',
      lat: 49.84,
      lng: 24.03,
      radius: 700,
    })
    expect(pop).toBe(720_000)
    expect(mockOverpass.getBuildingPopulation).not.toHaveBeenCalled()
  })

  it('Kyiv: returns 2 900 000 without calling Overpass', async () => {
    const { svc, mockOverpass } = makeService(0)
    const pop = await svc.getMarketSize({
      city: 'kyiv',
      state: 'kyiv',
      lat: 50.45,
      lng: 30.52,
      radius: 500,
    })
    expect(pop).toBe(2_900_000)
    expect(mockOverpass.getBuildingPopulation).not.toHaveBeenCalled()
  })

  // ── Unknown village fallback ──────────────────────────────────────────────

  it('Unknown village with placeType=village and OSM < 2000: applies fallback', async () => {
    const { svc } = makeService(100)
    const pop = await svc.getMarketSize({
      city: 'totally-unknown-place',
      state: 'somewhere',
      lat: 50.0,
      lng: 25.0,
      radius: 700,
      placeType: 'village',
    })
    expect(pop).toBe(3_000)
  })

  it('Unknown town with healthy OSM (> 2000): uses OSM directly', async () => {
    const { svc } = makeService(5_000)
    const pop = await svc.getMarketSize({
      city: 'completely-unknown',
      state: 'nowhere',
      lat: 50.0,
      lng: 25.0,
      radius: 700,
    })
    expect(pop).toBe(5_000)
  })

  // ── max(osm, settlement) invariant ────────────────────────────────────────

  it('When OSM exceeds dataset value: max() preserves higher figure', async () => {
    const { svc } = makeService(50_000)
    const pop = await svc.getMarketSize({
      city: 'vynnyky',
      state: 'lviv',
      lat: 49.8168,
      lng: 24.1369,
      radius: 700,
      district: 'Lviv Raion',
    })
    expect(pop).toBe(50_000) // max(50000, 19037) = 50000
  })
})
