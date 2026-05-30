import { Injectable } from '@nestjs/common';
import { NominatimService } from '../nominatim/nominatim.service';
import { isRestrictedTerritory, normalizeState } from 'src/data/ua-restricted-territories.data';
import { LocationAvailabilityResponseDto } from './dto/location-availability-response.dto';

@Injectable()
export class LocationAvailabilityService {
  constructor(private readonly nominatim: NominatimService) {}

  async check(lat: number, lng: number): Promise<LocationAvailabilityResponseDto> {
    const addr = await this.nominatim.getAddressInfo({ lat, lng });

    const region = addr.region ?? null;
    const district = addr.county ?? null;
    const settlement = addr.settlement ?? null;
    const countryCode = addr.countryCode || null;

    if (addr.countryCode !== 'ua') {
      return {
        available: false,
        reason: 'outside_ukraine',
        message: 'Analysis is currently available only for locations within Ukraine.',
        country: addr.country,
        countryCode,
        region,
        district,
        settlement,
      };
    }

    const normalizedState = normalizeState(region ?? '');
    if (isRestrictedTerritory(normalizedState)) {
      return {
        available: false,
        reason: 'restricted_safety_area',
        message:
          'Standard business analysis is unavailable for this location due to limited market data reliability and safety risks.',
        country: 'Ukraine',
        countryCode: 'ua',
        region,
        district,
        settlement,
      };
    }

    return {
      available: true,
      reason: null,
      message: null,
      country: 'Ukraine',
      countryCode: 'ua',
      region,
      district,
      settlement,
    };
  }
}
