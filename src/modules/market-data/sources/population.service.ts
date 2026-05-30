import { Injectable, Logger } from '@nestjs/common';
import { UA_CITY_POPULATION } from 'src/data/ua-cities.data';
import { OverpassService } from 'src/modules/overpass/overpass.service';
import { CacheService } from '../cache.service';
import { findSettlementPopulation } from './settlement-lookup';

// Below this threshold OSM building data is unreliable for suburbs/towns
const MIN_RELIABLE_OSM = 2_000;

// Conservative estimates by Nominatim place type when OSM data is sparse
const PLACE_TYPE_POPULATION_FALLBACK: Record<string, number> = {
  municipality: 15_000,
  town: 10_000,
  suburb: 8_000,
  borough: 5_000,
  village: 3_000,
};

type GetMarketSizeProps = {
  city: string;
  state: string;
  lat: number;
  lng: number;
  radius: number;
  town?: string;
  village?: string;
  suburb?: string;
  settlement?: string;
  district?: string;
  placeType?: string;
};

export type PopulationLocationProps = Pick<
  GetMarketSizeProps,
  'city' | 'state' | 'town' | 'village' | 'suburb' | 'settlement' | 'district'
>;

@Injectable()
export class PopulationService {
  private readonly logger = new Logger(PopulationService.name);

  constructor(
    private readonly cache: CacheService,
    private readonly overpass: OverpassService,
  ) {}

  /**
   * Synchronous dataset-only population estimate.
   * Checks UA_CITY_POPULATION and the settlement dataset (no external calls).
   * Returns 0 if the location is not found — callers treat 0 as "unknown/small".
   * Used before async Overpass queries to compute adaptive competitor radius.
   */
  estimateSync({ city, state, town, village, suburb, settlement, district }: PopulationLocationProps): number {
    const knownCity = UA_CITY_POPULATION[city];
    if (knownCity !== undefined) return knownCity;
    const candidates = [city, settlement, town, village, suburb].filter(Boolean) as string[];
    return findSettlementPopulation(candidates, state, district)?.population ?? 0;
  }

  async getMarketSize({
    city,
    state,
    lat,
    lng,
    radius,
    town,
    village,
    suburb,
    settlement,
    district,
    placeType,
  }: GetMarketSizeProps): Promise<number> {
    // a) Known major city — authoritative, skip OSM entirely
    const knownCity = UA_CITY_POPULATION[city];
    if (knownCity !== undefined) {
      this.logger.debug(`populationSource=city_known city=${city} pop=${knownCity}`);
      return knownCity;
    }

    // a) Static settlement dataset lookup — try all name variants Nominatim may have returned
    const candidates = [city, settlement, town, village, suburb].filter(Boolean) as string[];
    const settlementResult = findSettlementPopulation(candidates, state, district);

    // c) OSM building population around the selected radius
    const osm = await this.estimateFromOsm({ lat, lng, radius });

    if (settlementResult !== undefined) {
      // OSM undercounts suburbs and towns — use max to avoid penalising known settlements
      const result = Math.max(osm, settlementResult.population);
      this.logger.debug(
        `populationSource=static_settlement candidates=${candidates.join('|')} state=${state} osm=${osm} known=${settlementResult.population} final=${result}`,
      );
      return result;
    }

    // d) Safe fallback by Nominatim place type when OSM data is suspiciously low
    if (osm < MIN_RELIABLE_OSM && placeType) {
      const fallback = PLACE_TYPE_POPULATION_FALLBACK[placeType];
      if (fallback !== undefined) {
        this.logger.debug(
          `populationSource=fallback_place_type placeType=${placeType} osm=${osm} fallback=${fallback}`,
        );
        return fallback;
      }
    }

    this.logger.debug(`populationSource=osm_buildings osm=${osm}`);
    return osm;
  }

  private async estimateFromOsm({
    lat,
    lng,
    radius,
  }: Omit<GetMarketSizeProps, 'city' | 'state'>): Promise<number> {
    const cacheKey = `pop:osm:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.overpass.getBuildingPopulation({ lat, lng, radius });
    this.cache.set(cacheKey, result);
    return result;
  }
}
