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
  town?: string;
  village?: string;
  suburb?: string;
  district?: string;
  settlement?: string;
  placeType?: string;
};

type NominatimAddress = {
  country?: string;
  country_code?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  borough?: string;
  suburb?: string;
  district?: string;
  county?: string;
  state?: string;
};

type NominatimResponse = {
  type?: string;
  address: NominatimAddress;
};

export type AddressInfo = {
  country: string;
  countryCode: string;
  region: string | null;   // raw oblast name, e.g. "Donetsk Oblast", "Kyiv Oblast"
  county: string | null;   // raw raion/county, e.g. "Melitopol Raion"
  settlement: string | null;
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

      const town = addr.town?.toLowerCase();
      const village = addr.village?.toLowerCase();
      const suburb = addr.suburb?.toLowerCase();
      const district = (addr.district ?? addr.borough)?.toLowerCase();
      // Hromada names (e.g. "Lviv Urban Hromada") are administrative units, not settlement names
      const rawMunicipality = addr.municipality;
      const isMunicipalityHromada = rawMunicipality?.toLowerCase().includes('hromada') ?? false;
      const settlementFromMunicipality = isMunicipalityHromada ? undefined : rawMunicipality;
      const settlement = (addr.town ?? addr.village ?? settlementFromMunicipality)?.toLowerCase();
      const placeType = data.type;

      return { city, state, town, village, suburb, district, settlement, placeType };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ServiceUnavailableException) throw err;

      const classified = classifyAxiosError(err, 'nominatim');
      this.logger.warn(`getLocationInfo [${classified.kind}] lat=${lat} lng=${lng}: ${classified.message}`);
      throw new ServiceUnavailableException(`Nominatim [${classified.kind}]`);
    }
  }

  async getAddressInfo({ lat, lng }: { lat: number; lng: number }): Promise<AddressInfo> {
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

      const settlement =
        addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.suburb ?? null;

      return {
        country: addr.country ?? 'Unknown',
        countryCode: (addr.country_code ?? '').toLowerCase(),
        region: addr.state ?? null,
        county: addr.county ?? null,
        settlement: settlement ?? null,
      };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ServiceUnavailableException) throw err;

      const classified = classifyAxiosError(err, 'nominatim');
      this.logger.warn(`getAddressInfo [${classified.kind}] lat=${lat} lng=${lng}: ${classified.message}`);
      throw new ServiceUnavailableException(`Nominatim [${classified.kind}]`);
    }
  }
}
