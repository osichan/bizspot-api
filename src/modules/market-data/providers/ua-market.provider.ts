import { Injectable, Logger } from '@nestjs/common';
import { BusinessType, businessTypesData } from 'src/data/business-types.data';
import { NominatimService } from 'src/modules/nominatim/nominatim.service';
import { OverpassService } from 'src/modules/overpass/overpass.service';
import { IMarketDataProvider } from '../market-data.provider.interface';
import { MarketSnapshot } from '../types';
import { DimRiaProvider } from '../sources/dim-ria.service';
import { NbuService } from '../sources/nbu.service';
import { PopulationService } from '../sources/population.service';

/**
 * Returns the competitor search radius adjusted for settlement size.
 * Small settlements have lower POI density, so a wider radius is needed
 * to capture realistic competition within the same market catchment area.
 *
 * population < 20 000  → max(base, 2 000 m) — small town / suburb
 * population < 100 000 → max(base, 1 200 m) — mid-size city
 * population ≥ 100 000 → base radius         — large city, dense POI coverage
 * population = 0       → max(base, 2 000 m)  — unknown location, assume small
 */
export function adaptiveCompetitorRadius(baseRadius: number, population: number): number {
  if (population < 20_000) return Math.max(baseRadius, 2_000);
  if (population < 100_000) return Math.max(baseRadius, 1_200);
  return baseRadius;
}

@Injectable()
export class UaMarketProvider implements IMarketDataProvider {
  private readonly logger = new Logger(UaMarketProvider.name);

  constructor(
    private readonly overpassService: OverpassService,
    private readonly nominatimService: NominatimService,
    private readonly dimRiaProvider: DimRiaProvider,
    private readonly nbuService: NbuService,
    private readonly populationService: PopulationService,
  ) {}

  async getSnapshot({
    lat,
    lng,
    businessType,
  }: {
    lat: number;
    lng: number;
    businessType: BusinessType;
  }): Promise<MarketSnapshot> {
    const businessTypeData = businessTypesData[businessType];

    // Phase 0: Nominatim — needed for settlement lookup before we can compute adaptive radius
    const address = await this.nominatimService.getLocationInfo({ lat, lng });

    // Synchronous population estimate from the in-memory dataset (no external calls).
    // Used only to determine the competitor search radius — does not affect demand scoring.
    const popEstimate = this.populationService.estimateSync({
      city: address.city,
      state: address.state,
      town: address.town,
      village: address.village,
      suburb: address.suburb,
      settlement: address.settlement,
      district: address.district,
    });
    const competitorRadius = adaptiveCompetitorRadius(businessTypeData.radius, popEstimate);

    if (competitorRadius !== businessTypeData.radius) {
      this.logger.debug(
        `adaptiveRadius businessType=${businessType} baseRadius=${businessTypeData.radius} popEstimate=${popEstimate} competitorRadius=${competitorRadius}`,
      );
    }

    // Phase 1: all external calls in parallel (Overpass + DimRia + NBU + Population)
    const radiusKm = competitorRadius / 1000;
    const areaKm2 = Math.PI * radiusKm * radiusKm;

    const [{ competitors, trafficMultiplier, commercialDensity }, uahRent, usdRate, population] =
      await Promise.all([
        this.overpassService.getCompetitorAndTrafficCounts({
          lat,
          lng,
          radius: competitorRadius,
          osmTags: businessTypeData.osmTags,
        }),
        this.dimRiaProvider.getAvgPrice({ city: address.city, state: address.state }),
        this.nbuService.getUsdRate(),
        this.populationService.getMarketSize({
          city: address.city,
          state: address.state,
          lat,
          lng,
          radius: businessTypeData.radius,
          town: address.town,
          village: address.village,
          suburb: address.suburb,
          settlement: address.settlement,
          district: address.district,
          placeType: address.placeType,
        }),
      ]);

    // Saturation threshold scales with the adaptive competitor radius area, not the base radius.
    // This keeps the saturationRatio meaningful when we widen the search for small towns.
    const saturationCompetitors = businessTypeData.saturationDensityPerKm2 * areaKm2 * trafficMultiplier;

    const avgRent = uahRent / usdRate;

    return {
      cityName: address.settlement ?? address.town ?? address.city,
      population,
      competitorRadius,
      avgRent,
      trafficMultiplier,
      commercialDensity,
      competitors,
      saturationCompetitors,
      minBudget: businessTypeData.minBudget,
      urbanDependency: businessTypeData.urbanDependency,
      employees: businessTypeData.employees,
      avgMonthlySalaryUsd: businessTypeData.avgMonthlySalaryUsd,
      utilitiesMultiplier: businessTypeData.utilitiesMultiplier,
    };
  }
}
