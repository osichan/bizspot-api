import { Injectable } from '@nestjs/common';
import { BusinessType, businessTypesData } from 'src/data/business-types.data';
import { NominatimService } from 'src/modules/nominatim/nominatim.service';
import { OverpassService } from 'src/modules/overpass/overpass.service';
import { IMarketDataProvider } from '../market-data.provider.interface';
import { MarketSnapshot } from '../types';
import { DimRiaProvider } from '../sources/dim-ria.service';
import { NbuService } from '../sources/nbu.service';
import { PopulationService } from '../sources/population.service';

@Injectable()
export class UaMarketProvider implements IMarketDataProvider {
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
    const radiusKm = businessTypeData.radius / 1000;
    const areaKm2 = Math.PI * radiusKm * radiusKm;

    const [address, { competitors, trafficMultiplier, commercialDensity }] = await Promise.all([
      this.nominatimService.getLocationInfo({ lat, lng }),
      this.overpassService.getCompetitorAndTrafficCounts({
        lat,
        lng,
        radius: businessTypeData.radius,
        osmTag: businessTypeData.osmTag,
      }),
    ]);

    // Saturation scales with local foot traffic density — geographic, not demographic
    const saturationCompetitors = businessTypeData.saturationDensityPerKm2 * areaKm2 * trafficMultiplier;

    const [uahRent, usdRate, population] = await Promise.all([
      this.dimRiaProvider.getAvgPrice({ city: address.city, state: address.state }),
      this.nbuService.getUsdRate(),
      this.populationService.getMarketSize({
        city: address.city,
        lat,
        lng,
        radius: businessTypeData.radius,
      }),
    ]);

    const avgRent = uahRent / usdRate;

    return {
      population,
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
