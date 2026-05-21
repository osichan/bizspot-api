import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import axios from 'axios';
import { classifyAxiosError, ExternalApiError, REQUEST_TIMEOUT_MS } from 'src/common/external-api';

const MIRRORS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.osm.ch/api/interpreter',
];

const BASELINE_DENSITY_PER_KM2 = 30;
const MIN_MULTIPLIER = 0.5;
const MAX_MULTIPLIER = 2.0;
const AVG_RESIDENTS_PER_BUILDING = 20;

type OverpassResponse = {
  elements: Array<{ tags: { total: string } }>;
};

type GetCompetitorAndTrafficProps = {
  readonly lat: number;
  readonly lng: number;
  readonly radius: number;
  readonly osmTag: string;
};

type GetBuildingCountProps = {
  readonly lat: number;
  readonly lng: number;
  readonly radius: number;
};

@Injectable()
export class OverpassService {
  private readonly logger = new Logger(OverpassService.name);

  private async runQuery(query: string): Promise<OverpassResponse> {
    let lastError: ExternalApiError | undefined;

    for (const url of MIRRORS) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await axios.post<OverpassResponse>(
          url,
          `data=${encodeURIComponent(query)}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'BizSpot/1.0 (oskarsajenko@gmail.com)',
            },
            signal: controller.signal,
          },
        );
        clearTimeout(timer);
        return response.data;
      } catch (err) {
        clearTimeout(timer);
        const classified = classifyAxiosError(err, 'overpass');
        this.logger.warn(`mirror ${url} [${classified.kind}]: ${classified.message}`);
        lastError = classified;
      }
    }

    throw new ExternalApiError('overpass', lastError?.kind ?? 'network_error', 'all mirrors failed');
  }

  async getCompetitorAndTrafficCounts({
    lat,
    lng,
    radius,
    osmTag,
  }: GetCompetitorAndTrafficProps): Promise<{
    competitors: number;
    trafficMultiplier: number;
    commercialDensity: number;
  }> {
    const [key, value] = osmTag.split('=');
    const query = `
      [out:json][timeout:25];
      (
        node["${key}"="${value}"](around:${radius},${lat},${lng});
        way["${key}"="${value}"](around:${radius},${lat},${lng});
        relation["${key}"="${value}"](around:${radius},${lat},${lng});
      )->.competitors;
      (
        node[amenity](around:${radius},${lat},${lng});
        node[shop](around:${radius},${lat},${lng});
      )->.traffic;
      .competitors out count;
      .traffic out count;
    `;

    let data: OverpassResponse;
    try {
      data = await this.runQuery(query);
    } catch (err) {
      if (err instanceof ExternalApiError) {
        this.logger.error(`getCompetitorAndTrafficCounts: ${err.message}`);
        throw new ServiceUnavailableException(`Overpass [${err.kind}]: all mirrors failed`);
      }
      throw err;
    }

    const competitors = Number(data.elements[0]?.tags?.total);
    const poiCount = Number(data.elements[1]?.tags?.total);

    if (isNaN(competitors) || isNaN(poiCount)) {
      throw new ServiceUnavailableException('Overpass [invalid_payload]: unexpected element structure');
    }

    const radiusKm = radius / 1000;
    const areaKm2 = Math.PI * radiusKm * radiusKm;
    const density = poiCount / areaKm2;
    const trafficMultiplier = Math.min(
      Math.max(density / BASELINE_DENSITY_PER_KM2, MIN_MULTIPLIER),
      MAX_MULTIPLIER,
    );

    return { competitors, trafficMultiplier, commercialDensity: density };
  }

  async getBuildingPopulation({
    lat,
    lng,
    radius,
  }: GetBuildingCountProps): Promise<number> {
    const query = `
      [out:json][timeout:25];
      (
        way[building=residential](around:${radius},${lat},${lng});
        way[building=apartments](around:${radius},${lat},${lng});
      );
      out count;
    `;

    let data: OverpassResponse;
    try {
      data = await this.runQuery(query);
    } catch (err) {
      if (err instanceof ExternalApiError) {
        this.logger.error(`getBuildingPopulation: ${err.message}`);
        throw new ServiceUnavailableException(`Overpass [${err.kind}]: all mirrors failed`);
      }
      throw err;
    }

    const buildingCount = Number(data.elements[0]?.tags?.total);

    if (isNaN(buildingCount)) {
      throw new ServiceUnavailableException('Overpass [invalid_payload]: unexpected element structure');
    }

    return buildingCount * AVG_RESIDENTS_PER_BUILDING;
  }
}
