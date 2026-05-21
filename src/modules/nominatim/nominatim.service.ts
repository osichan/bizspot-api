import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { classifyAxiosError, ExternalApiError, REQUEST_TIMEOUT_MS } from 'src/common/external-api';

type getLocationInfoProps = {
  readonly lat: number;
  readonly lng: number;
};

type getLocationInfoResponse = {
  city: string;
  state: string;
};

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  borough?: string;
  suburb?: string;
  county?: string;
  state?: string;
};

type NominatimResponse = {
  address: NominatimAddress;
};

@Injectable()
export class NominatimService {
  private readonly logger = new Logger(NominatimService.name);

  constructor(private readonly http: HttpService) {}

  async getLocationInfo({
    lat,
    lng,
  }: getLocationInfoProps): Promise<getLocationInfoResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await firstValueFrom(
        this.http.get(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=en`,
          {
            headers: { 'User-Agent': 'BizSpot/1.0 (oskarsajenko@gmail.com)' },
            signal: controller.signal,
          },
        ),
      );
      clearTimeout(timer);

      const data = response.data as NominatimResponse;
      const addr = data.address;

      if (!addr) {
        throw new ServiceUnavailableException('Nominatim [empty_response]: unable to geocode location');
      }

      const rawCity =
        addr.city ??
        addr.town ??
        addr.village ??
        addr.municipality ??
        addr.borough ??
        addr.suburb ??
        addr.county;

      if (!rawCity) {
        throw new ServiceUnavailableException('Nominatim [empty_response]: no city field in address');
      }

      const city = rawCity.toLowerCase();
      const rawState = addr.state ?? addr.county ?? rawCity;
      const state = rawState.toLowerCase().replace(' oblast', '').trim();

      return { city, state };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ServiceUnavailableException) throw err;

      const classified = classifyAxiosError(err, 'nominatim');
      this.logger.warn(`getLocationInfo [${classified.kind}] lat=${lat} lng=${lng}: ${classified.message}`);
      throw new ServiceUnavailableException(`Nominatim [${classified.kind}]`);
    }
  }
}
