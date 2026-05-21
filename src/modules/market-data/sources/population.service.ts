import { Injectable } from '@nestjs/common';
import { UA_CITY_POPULATION } from 'src/data/ua-cities.data';
import { OverpassService } from 'src/modules/overpass/overpass.service';
import { CacheService } from '../cache.service';

type GetMarketSizeProps = {
  city: string;
  lat: number;
  lng: number;
  radius: number;
};

@Injectable()
export class PopulationService {
  constructor(
    private readonly cache: CacheService,
    private readonly overpass: OverpassService,
  ) {}

  async getMarketSize({ city, lat, lng, radius }: GetMarketSizeProps): Promise<number> {
    const known = UA_CITY_POPULATION[city];
    if (known !== undefined) return known;
    return this.estimateFromOsm({ lat, lng, radius });
  }

  private async estimateFromOsm({
    lat,
    lng,
    radius,
  }: Omit<GetMarketSizeProps, 'city'>): Promise<number> {
    const cacheKey = `pop:osm:${lat.toFixed(4)}:${lng.toFixed(4)}:${radius}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.overpass.getBuildingPopulation({ lat, lng, radius });
    this.cache.set(cacheKey, result);
    return result;
  }
}
